// 논문 한 입 — 수집기(서버/서버리스에서 하루 1회 실행하는 걸 가정한 CLI).
// 브라우저가 아니라 여기서만 외부 API를 호출한다(배경 자료 2.4의 제약을 지키기 위함).
// 실행: node collect.mjs [--out ../papers.json] [--limit 5]
// 기본 출력 경로는 "../papers.json" — index.html과 같은 프로젝트 루트다. 앱은 same-origin으로
// 그 파일을 fetch('./papers.json')하므로, 다른 경로로 내보낼 땐 반드시 index.html 옆으로 옮겨야 한다.
//
// 각 소스 어댑터는 fetchX(...) → normalizeX(raw) 순서로 공통 스키마(schema.md)로 모은다.
// AI 변환(초록 → 한국어 5문장·퀴즈·용어)은 이 파일이 하지 않는다 — transform.mjs가 다음 단계다.
// 여기서 만든 결과의 sents/quiz/terms는 비어 있고 needsTransform:true로 표시된다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapCategory, normalizePaper, licenseGate, createRateLimiter } from './lib.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const UA = 'paperbite-collector/0.1 (mailto:contact@example.invalid)'; // 실제 배포 시 연락처로 교체

/* =====================================================================
   레이트 리미트: 소스별 최소 요청 간격. arXiv는 약관대로 "3초에 1요청·단일 연결"을 지킨다.
   ===================================================================== */
const arxivLimiter = createRateLimiter(3000);
const osfLimiter = createRateLimiter(700); // 문서상 분당 100회 수준 — 넉넉히 보수적으로

async function getJSON(url, headers) {
  const res = await fetch(url, { headers: Object.assign({ 'User-Agent': UA, Accept: 'application/json' }, headers || {}) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}
async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.text();
}

/* =====================================================================
   arXiv 어댑터 — 메타데이터(제목·초록·저자·분류)는 CC0, 전문은 별개(저장하지 않는다).
   ===================================================================== */
function decodeEntities(s) {
  return String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
export function parseArxivFeed(xml) {
  const blocks = xml.split('<entry>').slice(1).map(s => '<entry>' + s.split('</entry>')[0] + '</entry>');
  return blocks.map(e => {
    const tag = name => { const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(e); return m ? m[1].trim() : null; };
    const id = tag('id');
    const idMatch = /abs\/([\w.-]+?)(v\d+)?$/.exec(id || '');
    const categories = [...e.matchAll(/<category term="([^"]+)"/g)].map(m => m[1]);
    const licMatch = /<arxiv:license href="([^"]+)"/.exec(e);
    const authors = [...e.matchAll(/<name>([^<]+)<\/name>/g)].map(m => decodeEntities(m[1]));
    const published = tag('published');
    return {
      arxivId: idMatch ? idMatch[1] : null,
      title: decodeEntities(tag('title') || '').replace(/\s+/g, ' ').trim(),
      abstractRaw: decodeEntities(tag('summary') || '').replace(/\s+/g, ' ').trim(),
      authors: authors.length ? authors.join(', ') : null,
      date: published ? published.slice(0, 7) : null,
      url: id ? id.replace(/^http:/, 'https:') : null,
      categories,
      licenseHref: licMatch ? licMatch[1] : null,
    };
  });
}
export function mapArxivLicense(href) {
  if (!href) return 'arx'; // 명시적 CC 라이선스가 없으면 arXiv 비독점 라이선스로 간주
  if (/publicdomain\/zero/.test(href)) return 'cc0';
  if (/licenses\/by-sa/.test(href)) return 'ccbysa';
  if (/licenses\/by-nc-sa/.test(href)) return 'ccbyncsa';
  if (/licenses\/by-nc-nd/.test(href)) return 'ccbyncnd';
  if (/licenses\/by\//.test(href)) return 'ccby';
  return 'unk';
}
function normalizeArxivEntry(e) {
  const tagSet = new Set();
  let field = 'sci';
  for (const c of e.categories) {
    const m = mapCategory('arxiv', c);
    if (m.field) field = m.field;
    m.tags.forEach(t => tagSet.add(t));
  }
  return normalizePaper({
    id: 'arx-' + e.arxivId, field, tags: [...tagSet], source: 'arXiv',
    title: e.title, authors: e.authors, date: e.date,
    lic: mapArxivLicense(e.licenseHref), url: e.url, abstractRaw: e.abstractRaw,
  });
}
async function fetchArxiv(category, limit) {
  const url = `https://export.arxiv.org/api/query?search_query=cat:${encodeURIComponent(category)}&sortBy=submittedDate&sortOrder=descending&max_results=${limit}`;
  const xml = await arxivLimiter(() => getText(url)); // 단일 연결 + 3초 간격을 리미터가 강제한다
  return parseArxivFeed(xml).map(normalizeArxivEntry);
}

/* =====================================================================
   OpenAlex 어댑터 — 메타데이터는 CC0(help.openalex.org/data/licenses). 인증 없이도 쓸 수
   있지만(casual use), 무료 API 키를 mailto로 등록하면 하루 예산이 10배로 늘어난다.
   ===================================================================== */
function reconstructAbstract(invIndex) {
  if (!invIndex) return '';
  const words = [];
  for (const [word, positions] of Object.entries(invIndex)) for (const p of positions) words[p] = word;
  return words.join(' ').replace(/\s+/g, ' ').trim();
}
function normalizeOpenAlexWork(w) {
  const topicNames = (w.topics || []).map(t => t.display_name);
  const tagSet = new Set();
  for (const name of topicNames) mapCategory('openalex', name).tags.forEach(t => tagSet.add(t));
  const licRaw = (w.best_oa_location && w.best_oa_location.license) || (w.primary_location && w.primary_location.license) || null;
  const lic = licRaw === 'cc0' ? 'cc0' : licRaw === 'cc-by' ? 'ccby' : licRaw === 'cc-by-sa' ? 'ccbysa' : 'unk';
  const url = (w.best_oa_location && w.best_oa_location.landing_page_url) || (w.primary_location && w.primary_location.landing_page_url) || w.id;
  return normalizePaper({
    id: 'openalex-' + String(w.id || '').split('/').pop(), field: null, tags: [...tagSet],
    source: 'OpenAlex', title: w.display_name, authors: (w.authorships || []).map(a => a.author && a.author.display_name).filter(Boolean).join(', ') || null,
    date: w.publication_date ? w.publication_date.slice(0, 7) : (w.publication_year ? String(w.publication_year) : null),
    lic, url, abstractRaw: reconstructAbstract(w.abstract_inverted_index),
  });
}
async function fetchOpenAlex(searchTerm, limit) {
  const url = `https://api.openalex.org/works?filter=title.search:${encodeURIComponent(searchTerm)}&per-page=${limit}`;
  const j = await getJSON(url);
  return (j.results || []).filter(w => w.abstract_inverted_index).map(normalizeOpenAlexWork);
}

/* =====================================================================
   OSF Preprints 어댑터 — 공개 데이터는 토큰 없이 읽을 수 있다(developer.osf.io 확인).
   라이선스 이름은 별도 리소스라서, 같은 라이선스 id는 캐시해 재요청을 줄인다.
   ===================================================================== */
const licenseNameCache = new Map();
async function resolveOsfLicense(licenseHref) {
  if (!licenseHref) return 'unk';
  if (licenseNameCache.has(licenseHref)) return licenseNameCache.get(licenseHref);
  let code = 'unk';
  try {
    const j = await osfLimiter(() => getJSON(licenseHref));
    const url = (j.data && j.data.attributes && j.data.attributes.url) || '';
    const name = (j.data && j.data.attributes && j.data.attributes.name) || '';
    if (/publicdomain\/zero/.test(url) || /CC0/i.test(name)) code = 'cc0';
    else if (/licenses\/by-sa/.test(url)) code = 'ccbysa';
    else if (/licenses\/by-nc-sa/.test(url)) code = 'ccbyncsa';
    else if (/licenses\/by-nc-nd/.test(url)) code = 'ccbyncnd';
    else if (/licenses\/by\//.test(url)) code = 'ccby';
  } catch (e) { /* 라이선스 조회 실패 시 미확인으로 남긴다 */ }
  licenseNameCache.set(licenseHref, code);
  return code;
}
const OSF_SOURCE_LABEL = { socarxiv: 'SocArXiv', psyarxiv: 'PsyArXiv', mediarxiv: 'MediArXiv', lawarxiv: 'LawArXiv', edarxiv: 'EdArXiv' };
function osfAuthorNames(preprint) {
  const rows = (preprint.embeds && preprint.embeds.contributors && preprint.embeds.contributors.data) || [];
  return rows.filter(c => c.attributes && c.attributes.bibliographic)
    .sort((a, b) => a.attributes.index - b.attributes.index)
    .map(c => c.embeds && c.embeds.users && c.embeds.users.data && c.embeds.users.data.attributes && c.embeds.users.data.attributes.full_name)
    .filter(Boolean);
}
async function fetchOsf(provider, limit) {
  const url = `https://api.osf.io/v2/preprints/?filter[provider]=${encodeURIComponent(provider)}&page[size]=${limit}&sort=-date_created&embed=contributors`;
  const j = await osfLimiter(() => getJSON(url));
  const out = [];
  for (const p of j.data || []) {
    const a = p.attributes;
    const subjects = (a.subjects || []).flat().map(s => s.text);
    const tagSet = new Set(); subjects.forEach(s => mapCategory('osf', s).tags.forEach(t => tagSet.add(t)));
    const licHref = p.relationships.license && p.relationships.license.links.related.href;
    const lic = await resolveOsfLicense(licHref);
    const authors = osfAuthorNames(p);
    out.push(normalizePaper({
      // OSF의 description 필드는 저자가 쓴 원문이 HTML 엔티티(&gt; 등)로 섞여 올 때가 있어 디코딩한다
      id: 'osf-' + provider + '-' + p.id, field: 'soc', tags: [...tagSet],
      source: OSF_SOURCE_LABEL[provider] || 'OSF Preprints', title: decodeEntities(a.title), authors: authors.length ? authors.join(', ') : null,
      date: a.date_published ? a.date_published.slice(0, 7) : null,
      lic, url: p.links.html, abstractRaw: decodeEntities(a.description || ''),
    }));
  }
  return out;
}

/* =====================================================================
   CORE 어댑터 — 상업적 이용도 가능하지만(core.ac.uk/services/api 안내), 안정적인 예약 작업엔
   무료 키 등록이 필요하다. 키가 없으면 건너뛰고 그 이유를 로그로 남긴다(조용히 실패하지 않는다).
   ===================================================================== */
async function fetchCore(query, limit) {
  const key = process.env.CORE_API_KEY;
  if (!key) { console.log('[core] CORE_API_KEY가 없어 건너뜁니다. core.ac.uk/services/api 에서 무료 키를 받아 설정하세요.'); return []; }
  const j = await getJSON(`https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(query)}&limit=${limit}`, { Authorization: `Bearer ${key}` });
  return (j.results || []).map(w => normalizePaper({
    id: 'core-' + w.id, field: null, tags: ['기타'], source: 'CORE',
    title: w.title, authors: (w.authors || []).map(a => a.name).join(', ') || null,
    date: w.publishedDate ? String(w.publishedDate).slice(0, 7) : null,
    lic: 'unk', url: (w.sourceFulltextUrls && w.sourceFulltextUrls[0]) || w.doi || null, abstractRaw: w.abstract || '',
  }));
}

/* =====================================================================
   오케스트레이션
   ===================================================================== */
async function main() {
  const args = process.argv.slice(2);
  const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : '../papers.json';
  const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 5;

  const jobs = [
    fetchArxiv('cs.CR', limit),
    fetchOpenAlex('inequality', limit),
    fetchOsf('psyarxiv', limit),
    fetchCore('digital humanities', limit),
  ];
  const settled = await Promise.allSettled(jobs);
  const papers = [];
  settled.forEach((r, i) => {
    const names = ['arXiv(cs.CR)', 'OpenAlex', 'OSF(psyarxiv)', 'CORE'];
    if (r.status === 'fulfilled') { papers.push(...r.value); console.log(`[ok] ${names[i]}: ${r.value.length}건`); }
    else console.error(`[fail] ${names[i]}: ${r.reason}`);
  });

  const withGate = papers.map(p => {
    const gate = licenseGate(p.lic);
    return Object.assign({}, p, {
      sents: [], quiz: [], terms: [], en: [], needsTransform: true,
      // 저장 불가 라이선스는 초록 원문을 결과 파일에 남기지 않는다(링크만 제공)
      abstractRaw: gate.persist ? p.abstractRaw : '',
      canPersist: gate.persist, shareAlikeNotice: gate.shareAlikeNotice,
    });
  });

  fs.writeFileSync(path.join(DIR, out), JSON.stringify(withGate, null, 2) + '\n');
  console.log(`\n총 ${withGate.length}건 → ${out} (저장 가능 ${withGate.filter(p => p.canPersist).length}건 / 링크만 ${withGate.filter(p => !p.canPersist).length}건)`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main().catch(e => { console.error(e); process.exitCode = 1; });
}
