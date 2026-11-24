// 수집기 단위 테스트 — 네트워크 없이 순수 로직만 검증한다. 실행: node collector/test.mjs
import assert from 'node:assert/strict';
import {
  licenseGate, factCheckSummary, mapCategory, keywordTags, searchPapers,
  createRateLimiter, normalizePaper, validatePaper,
} from './lib.mjs';
import { parseArxivFeed, mapArxivLicense } from './collect.mjs';
import { transformPaper, buildPrompt } from './transform.mjs';

let pass = 0;
function t(name, fn) {
  try { fn(); console.log('  ok   ' + name); pass++; }
  catch (e) { console.error('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
}
async function ta(name, fn) {
  try { await fn(); console.log('  ok   ' + name); pass++; }
  catch (e) { console.error('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
}

console.log('\n라이선스 게이트');
t('CC0·CC BY·CC BY-SA만 저장 가능, 나머지는 전부 불가', () => {
  assert.equal(licenseGate('cc0').persist, true);
  assert.equal(licenseGate('ccby').persist, true);
  const sa = licenseGate('ccbysa'); assert.equal(sa.persist, true); assert.equal(sa.shareAlikeNotice, true);
  for (const code of ['ccbyncsa', 'ccbyncnd', 'arx', 'unk', 'nonsense', undefined]) {
    assert.equal(licenseGate(code).persist, false, code + '는 저장 불가여야 함');
  }
});
t('CC BY는 동일조건 고지가 필요 없다', () => {
  assert.equal(licenseGate('ccby').shareAlikeNotice, false);
});

console.log('\n사실 점검(환각 가드)');
t('원문에 있는 숫자·고유명사만 쓰면 통과', () => {
  const abstract = 'We propose LLM-PEA and test GPT-4o, reaching 92% accuracy on 1,000 emails.';
  const sents = ['연구진은 LLM-PEA를 제안했어요.', 'GPT-4o로 실험해 92% 정확도를 92%, 1,000개 이메일에서 얻었어요.'];
  assert.equal(factCheckSummary(abstract, sents).ok, true);
});
t('원문에 없는 숫자가 섞이면 걸러낸다', () => {
  const abstract = 'Accuracy reached 92% across 1,000 emails using GPT-4o.';
  const sents = ['정확도는 99.9%로 10,000개 이메일에서 확인됐어요.'];
  const r = factCheckSummary(abstract, sents);
  assert.equal(r.ok, false);
  assert.ok(r.missing.includes('99.9%') || r.missing.some(m => m.includes('99.9')));
});
t('빈 요약도 죽지 않는다', () => {
  assert.equal(factCheckSummary('abstract text', []).ok, true);
});

console.log('\n분야·태그 매핑');
t('arXiv 카테고리 코드는 고정 표로 매핑된다', () => {
  assert.deepEqual(mapCategory('arxiv', 'cs.CR'), { field: 'sci', tags: ['디지털 포렌식·로그'] });
  assert.deepEqual(mapCategory('arxiv', 'cs.CY'), { field: 'sci', tags: ['AI와 사회'] });
});
t('모르는 arXiv 코드는 키워드 폴백(기타)으로 떨어진다', () => {
  const m = mapCategory('arxiv', 'math.PR');
  assert.equal(m.field, null);
  assert.deepEqual(m.tags, ['기타']);
});
t('자유 텍스트(OpenAlex·OSF)는 키워드 규칙으로 태그를 고른다', () => {
  assert.deepEqual(keywordTags('A study of phishing emails'), ['AI 보안·피싱']);
  assert.deepEqual(keywordTags('Income inequality and meritocracy beliefs'), ['불평등·사회학']);
  assert.deepEqual(keywordTags('완전히 관련 없는 주제'), ['기타']);
});
t('키워드 검색은 제목·출처·태그를 훑는다', () => {
  const papers = [
    { title: 'Phishing Detection', source: 'arXiv', tags: ['AI 보안·피싱'] },
    { title: 'Sleep and Memory', source: 'PsyArXiv', tags: ['수면·기억'] },
  ];
  assert.equal(searchPapers(papers, 'phish').length, 1);
  assert.equal(searchPapers(papers, 'PSYARXIV').length, 1);
  assert.equal(searchPapers(papers, '').length, 2);
});

console.log('\n레이트 리미터');
await (async () => {
  let now = 0;
  const clock = { now: () => now, sleep: ms => new Promise(r => { now += ms; r(); }) };
  const schedule = createRateLimiter(3000, clock);
  const order = [];
  await Promise.all([
    schedule(() => order.push(['a', now])),
    schedule(() => order.push(['b', now])),
    schedule(() => order.push(['c', now])),
  ]);
  t('호출 3개가 최소 3000ms 간격으로 순서대로 실행된다', () => {
    assert.equal(order.length, 3);
    assert.ok(order[1][1] - order[0][1] >= 3000);
    assert.ok(order[2][1] - order[1][1] >= 3000);
  });
})();

console.log('\n스키마 정규화');
t('필드가 비어 있어도 기본값으로 채워 유효성 검사를 통과한다', () => {
  const p = normalizePaper({ id: 'x-1', title: 't', url: 'https://x', lic: 'ccby' });
  assert.equal(p.field, 'sci');
  assert.deepEqual(p.tags, ['기타']);
  assert.equal(validatePaper(p).ok, true);
});
t('알 수 없는 라이선스 코드는 unk로 떨어지고, 빈 id/url은 검증에서 걸린다', () => {
  const p = normalizePaper({ title: 't', lic: 'weird-code' });
  assert.equal(p.lic, 'unk');
  const v = validatePaper(p);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some(e => e.includes('id')));
  assert.ok(v.errors.some(e => e.includes('url')));
});

console.log('\narXiv 어댑터(파싱)');
const SAMPLE_ATOM = `<feed xmlns:arxiv="http://arxiv.org/schemas/atom">
<entry>
  <id>http://arxiv.org/abs/2611.31178v1</id>
  <title>Code-Based Message Authentication</title>
  <summary>We study message authentication with 92% accuracy.</summary>
  <category term="cs.CR" scheme="http://arxiv.org/schemas/atom"/>
  <published>2026-11-23T18:33:23Z</published>
  <author><name>Hsuan-Po Liu</name></author>
  <author><name>Hessam Mahdavifar</name></author>
</entry>
<entry>
  <id>http://arxiv.org/abs/2611.00001v2</id>
  <title>Open Licensed Paper</title>
  <summary>An openly licensed study.</summary>
  <category term="cs.CY" scheme="http://arxiv.org/schemas/atom"/>
  <published>2026-11-20T00:00:00Z</published>
  <arxiv:license href="http://creativecommons.org/licenses/by/4.0/"/>
  <author><name>Jane Doe</name></author>
</entry>
</feed>`;
t('Atom 피드에서 id·제목·초록·분류·저자·날짜를 뽑아낸다', () => {
  const [e1] = parseArxivFeed(SAMPLE_ATOM);
  assert.equal(e1.arxivId, '2611.31178');
  assert.equal(e1.title, 'Code-Based Message Authentication');
  assert.ok(e1.abstractRaw.includes('92% accuracy'));
  assert.deepEqual(e1.categories, ['cs.CR']);
  assert.equal(e1.authors, 'Hsuan-Po Liu, Hessam Mahdavifar');
  assert.equal(e1.date, '2026-11');
  assert.equal(e1.url, 'https://arxiv.org/abs/2611.31178v1');
});
t('명시적 CC 라이선스가 없으면 arx(비독점)로, 있으면 해당 코드로 매핑한다', () => {
  const [e1, e2] = parseArxivFeed(SAMPLE_ATOM);
  assert.equal(mapArxivLicense(e1.licenseHref), 'arx');
  assert.equal(mapArxivLicense(e2.licenseHref), 'ccby');
});
t('CC0·BY-SA·NC 계열 href도 올바른 코드로 매핑된다', () => {
  assert.equal(mapArxivLicense('http://creativecommons.org/publicdomain/zero/1.0/'), 'cc0');
  assert.equal(mapArxivLicense('http://creativecommons.org/licenses/by-sa/4.0/'), 'ccbysa');
  assert.equal(mapArxivLicense('http://creativecommons.org/licenses/by-nc-nd/4.0/'), 'ccbyncnd');
});

console.log('\nAI 변환 파이프라인(가짜 summarizeFn — 실제 LLM 호출 없음)');
await ta('저장 가능한 라이선스 + 사실 점검 통과 → ok:true', async () => {
  const paper = { lic: 'ccby', abstractRaw: 'Accuracy reached 92% using GPT-4o.' };
  const fakeSummarize = async () => ({ sents: ['92%의 정확도를 GPT-4o로 얻었어요.'], quiz: [], terms: [] });
  const r = await transformPaper(paper, fakeSummarize);
  assert.equal(r.ok, true);
  assert.equal(r.persist, true);
});
await ta('환각(없는 숫자)이 섞이면 ok:false로 막는다', async () => {
  const paper = { lic: 'ccby', abstractRaw: 'Accuracy reached 92% using GPT-4o.' };
  const fakeSummarize = async () => ({ sents: ['정확도는 99.9%였어요.'], quiz: [], terms: [] });
  const r = await transformPaper(paper, fakeSummarize);
  assert.equal(r.ok, false);
  assert.ok(r.missing.length > 0);
});
await ta('저장 불가 라이선스는 일회성(persist:false)으로 표시된다', async () => {
  const paper = { lic: 'arx', abstractRaw: 'Accuracy reached 92%.' };
  const fakeSummarize = async () => ({ sents: ['정확도는 92%였어요.'], quiz: [], terms: [] });
  const r = await transformPaper(paper, fakeSummarize);
  assert.equal(r.ok, true);
  assert.equal(r.persist, false);
});
await ta('초록이 없으면 변환하지 않는다', async () => {
  const r = await transformPaper({ lic: 'ccby', abstractRaw: '' }, async () => ({ sents: [] }));
  assert.equal(r.ok, false);
});
t('프롬프트 템플릿에 초록이 끼워진다', () => {
  const p = buildPrompt('hello world');
  assert.ok(p.includes('hello world'));
  assert.ok(p.includes('JSON'));
});

console.log(`\n${pass}개 통과`);
