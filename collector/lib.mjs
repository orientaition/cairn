// 논문 한 입 — 수집기 공용 로직(순수 함수). 네트워크 없이 그대로 단위 테스트한다.
// collect.mjs(네트워크·오케스트레이션)와 앱의 PAPERS 데이터가 공유하는 "공통 스키마"의 규칙이 여기 있다.

/* =====================================================================
   라이선스 게이트
   규칙(handoff.md 5번): CC0·CC BY(BY-SA는 동일조건 고지)만 결과를 저장·공유할 수 있다.
   그 외·미확인 라이선스는 사용자별 일회성 생성만 하고 저장하지 않거나 링크만 제공한다.
   ===================================================================== */
export function licenseGate(code) {
  if (code === 'cc0') return { persist: true, shareAlikeNotice: false, label: 'CC0' };
  if (code === 'ccby') return { persist: true, shareAlikeNotice: false, label: 'CC BY' };
  if (code === 'ccbysa') return { persist: true, shareAlikeNotice: true, label: 'CC BY-SA' };
  // ccbyncsa, ccbyncnd, arx(arXiv 비독점 라이선스), unk(미확인) 등은 전부 저장 금지
  return { persist: false, shareAlikeNotice: false, label: code || 'unknown' };
}

/* =====================================================================
   사실 점검(자동 점검): 생성된 한국어 요약에 나온 숫자·영문 고유명사가
   원문 초록에 실제로 있는지 확인한다. 없는 숫자·이름이 섞여 있으면 "환각"일 수 있다.
   한계(ponytail): 단순 포함 검사라, 숫자를 "10만"처럼 한글 단위로 바꿔 쓰면 오탐한다.
   더 정교하게 하려면 숫자 정규화(100,000 ↔ 10만)가 필요하다 — 지금은 생성 프롬프트에서
   "숫자는 원문 표기 그대로 아라비아 숫자로 쓰라"고 지시해 이 한계를 우회한다.
   ===================================================================== */
function extractFacts(text) {
  const nums = text.match(/\d[\d,.]*%?/g) || [];
  const propers = text.match(/\b[A-Z][A-Za-z0-9-]{2,}\b/g) || [];
  return [...new Set([...nums, ...propers])];
}
export function factCheckSummary(abstract, summarySentences) {
  const summaryText = (summarySentences || []).join(' ');
  const facts = extractFacts(summaryText);
  const missing = facts.filter(f => !abstract.includes(f));
  return { ok: missing.length === 0, missing, checked: facts };
}

/* =====================================================================
   분야 분류 매핑: 소스마다 다른 분류 체계(arXiv 카테고리 코드, OpenAlex topic,
   OSF subject)를 앱이 이미 쓰고 있는 한국어 세부 분야 라벨로 옮긴다.
   ===================================================================== */
export const ARXIV_CATEGORY_MAP = {
  'cs.CR': { field: 'sci', tag: '디지털 포렌식·로그' },
  'cs.CY': { field: 'sci', tag: 'AI와 사회' },
  'cs.AI': { field: 'sci', tag: 'AI와 사회' },
  'cs.LG': { field: 'sci', tag: 'AI와 사회' },
  'cs.CL': { field: 'sci', tag: 'AI와 사회' },
  'cs.DC': { field: 'sci', tag: '시스템·커널' },
  'cs.OS': { field: 'sci', tag: '시스템·커널' },
  'cs.NI': { field: 'sci', tag: 'IoT' },
  'cs.DB': { field: 'sci', tag: '디지털 포렌식·로그' },
};

// OSF·OpenAlex는 분류가 자유 텍스트라서, 코드표 대신 키워드 규칙으로 태그를 고른다.
export const KEYWORD_TAG_RULES = [
  [/phishing/i, 'AI 보안·피싱'],
  [/tamper|forensic|log integrity|audit log/i, '디지털 포렌식·로그'],
  [/\biot\b|edge device/i, 'IoT'],
  [/kernel|operating system|ebpf/i, '시스템·커널'],
  [/inequality|meritocracy/i, '불평등·사회학'],
  [/machine learning|artificial intelligence|\bai\b/i, 'AI와 사회'],
  [/sleep|memory|associative/i, '수면·기억'],
  [/education|learning science|mathemat/i, '교육·학습'],
  [/ethic|philosoph/i, '철학·윤리'],
  [/history of (science|ideas)|intellectual history/i, '역사·지성사'],
  [/digital humanities/i, '디지털 인문학'],
];
export function keywordTags(text) {
  const t = String(text || '');
  const hit = KEYWORD_TAG_RULES.filter(([re]) => re.test(t)).map(([, tag]) => tag);
  return hit.length ? [...new Set(hit)] : ['기타'];
}
export function mapCategory(source, value) {
  if (source === 'arxiv' && ARXIV_CATEGORY_MAP[value]) {
    const m = ARXIV_CATEGORY_MAP[value];
    return { field: m.field, tags: [m.tag] };
  }
  return { field: null, tags: keywordTags(value) }; // field는 호출자가 출처별 기본값으로 보강
}

/* =====================================================================
   키워드 검색: 고정 태그 밖의 논문도 찾을 수 있게 제목·태그·출처를 가볍게 훑는다.
   ===================================================================== */
export function searchPapers(papers, keyword) {
  const k = String(keyword || '').trim().toLowerCase();
  if (!k) return papers;
  return papers.filter(p =>
    (p.title || '').toLowerCase().includes(k) ||
    (p.source || '').toLowerCase().includes(k) ||
    (p.tags || []).some(t => t.toLowerCase().includes(k))
  );
}

/* =====================================================================
   레이트 리미터: "3초에 1요청, 단일 연결"처럼 소스별로 다른 간격을 강제한다.
   테스트는 실제 setTimeout 대신 clock을 주입해 시간을 흉내 낸다.
   ===================================================================== */
export function createRateLimiter(minGapMs, clock = { now: () => Date.now(), sleep: ms => new Promise(r => setTimeout(r, ms)) }) {
  let last = -Infinity;
  let chain = Promise.resolve();
  return function schedule(fn) {
    chain = chain.then(async () => {
      const wait = Math.max(0, minGapMs - (clock.now() - last));
      if (wait > 0) await clock.sleep(wait);
      last = clock.now();
      return fn();
    });
    return chain;
  };
}

/* =====================================================================
   공통 스키마로 정규화 + 최소 유효성 검사(schema.md 참고)
   ===================================================================== */
const LIC_CODES = new Set(['cc0', 'ccby', 'ccbysa', 'ccbyncsa', 'ccbyncnd', 'arx', 'unk']);
export function normalizePaper(raw) {
  const field = raw.field === 'sci' || raw.field === 'soc' || raw.field === 'hum' ? raw.field : 'sci';
  const lic = LIC_CODES.has(raw.lic) ? raw.lic : 'unk';
  return {
    id: String(raw.id || ''),
    field,
    tags: Array.isArray(raw.tags) && raw.tags.length ? raw.tags : ['기타'],
    source: raw.source || '출처 미확인',
    title: raw.title || '(제목 없음)',
    authors: raw.authors || null,
    date: raw.date || null,
    lic,
    url: raw.url || null,
    abstractRaw: raw.abstractRaw || '',
    collectedAt: raw.collectedAt || new Date().toISOString(),
  };
}
export function validatePaper(p) {
  const errors = [];
  if (!p.id) errors.push('id 없음');
  if (!p.title) errors.push('title 없음');
  if (!p.url) errors.push('url 없음');
  if (!LIC_CODES.has(p.lic)) errors.push('lic 코드가 공통 스키마 밖: ' + p.lic);
  return { ok: errors.length === 0, errors };
}
