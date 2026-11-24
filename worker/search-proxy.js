// 논문 한 입 — 실시간 외부 검색 프록시 (Cloudflare Worker)
// arXiv·OSF는 브라우저에서 CORS로 직접 못 불러서(헤더 확인함, collector/REPORT.md 참고) 여기서
// 대신 불러 CORS 헤더를 붙여 돌려준다. OpenAlex는 자체 CORS(Access-Control-Allow-Origin: *)를
// 지원해서 이 프록시를 거치지 않고 앱이 직접 부른다(paperbite_index.html의 searchOpenAlexLive 참고).
//
// 호출: GET /search?source=arxiv|osf&q=<검색어>&limit=<1~10>
// 응답: { results: [{id,title,abstract,authors,date,url,source,lic}] } — 원문 그대로이며
// AI 변환·사실 검증을 거치지 않았으므로 "바로 읽기"엔 쓰지 않고 제목·초록·링크 제공에만 쓴다.
//
// 한계(ponytail): arXiv 약관의 "3초에 1요청"을 전 세계 모든 사용자에 걸쳐 완벽히 지키려면
// Durable Object 같은 전역 상태가 필요한데 무료 플랜엔 없다. 지금은 Workers Cache API로 같은
// 검색어를 10분간 캐싱해 중복 호출을 줄이는 선에서 완화한다 — 완벽한 전역 레이트리밋은 아니다.
// 트래픽이 커지면 Durable Object나 Cloudflare Queues로 업그레이드할 것.

const CACHE_TTL = 600; // 10분
const UA = 'paperbite-search-proxy/0.1 (mailto:contact@example.invalid)';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
function json(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: Object.assign({ 'content-type': 'application/json' }, corsHeaders(origin)) });
}
function decodeEntities(s) {
  return String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function parseArxivFeed(xml) {
  const blocks = xml.split('<entry>').slice(1).map(s => '<entry>' + s.split('</entry>')[0] + '</entry>');
  return blocks.map(e => {
    const tag = name => { const m = new RegExp('<' + name + '>([\\s\\S]*?)</' + name + '>').exec(e); return m ? m[1].trim() : null; };
    const id = tag('id');
    const idMatch = /abs\/([\w.-]+?)(v\d+)?$/.exec(id || '');
    const licMatch = /<arxiv:license href="([^"]+)"/.exec(e);
    const authors = [...e.matchAll(/<name>([^<]+)<\/name>/g)].map(m => decodeEntities(m[1]));
    const published = tag('published');
    return {
      id: 'arx-' + (idMatch ? idMatch[1] : Math.random().toString(36).slice(2)),
      title: decodeEntities(tag('title') || '').replace(/\s+/g, ' ').trim(),
      abstract: decodeEntities(tag('summary') || '').replace(/\s+/g, ' ').trim(),
      authors: authors.length ? authors.join(', ') : null,
      date: published ? published.slice(0, 7) : null,
      url: id ? id.replace(/^http:/, 'https:') : null,
      source: 'arXiv',
      lic: licMatch ? '라이선스 명시됨(원문에서 확인)' : 'arXiv 비독점 라이선스',
    };
  });
}
async function searchArxiv(q, limit) {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&max_results=${limit}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA }, cf: { cacheTtl: CACHE_TTL, cacheEverything: true } });
  if (!res.ok) throw new Error('arXiv ' + res.status);
  return parseArxivFeed(await res.text());
}

async function searchOsf(q, limit) {
  const url = `https://api.osf.io/v2/preprints/?filter%5Btitle%5D=${encodeURIComponent(q)}&page%5Bsize%5D=${limit}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, cf: { cacheTtl: CACHE_TTL, cacheEverything: true } });
  if (!res.ok) throw new Error('OSF ' + res.status);
  const j = await res.json();
  return (j.data || []).map(p => ({
    id: 'osf-' + p.id,
    title: decodeEntities(p.attributes.title),
    abstract: decodeEntities(p.attributes.description || ''),
    authors: null,
    date: p.attributes.date_published ? p.attributes.date_published.slice(0, 7) : null,
    url: p.links.html,
    source: 'OSF Preprints',
    lic: '원문에서 라이선스 확인 필요',
  }));
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin');
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(origin) });

    const url = new URL(request.url);
    const source = url.searchParams.get('source');
    const q = (url.searchParams.get('q') || '').trim();
    const limit = Math.min(10, Math.max(1, Number(url.searchParams.get('limit')) || 5));

    if (!q) return json({ error: '검색어(q)가 필요해요.' }, 400, origin);
    if (q.length > 100) return json({ error: '검색어가 너무 길어요.' }, 400, origin);

    try {
      let results;
      if (source === 'arxiv') results = await searchArxiv(q, limit);
      else if (source === 'osf') results = await searchOsf(q, limit);
      else return json({ error: 'source는 arxiv 또는 osf여야 해요.' }, 400, origin);
      return json({ results }, 200, origin);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 502, origin);
    }
  },
};
