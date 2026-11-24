// 논문 한 입 테스트 — 의존성 없음. 실행: node test.mjs
// 1) 순수 함수 단위 테스트 (index.html의 PURE 블록을 그대로 꺼내 실행)
// 2) 흐름 테스트 + 390px 스크린샷 (설치된 Chrome을 CDP로 조작. 없으면 건너뜀)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(DIR, 'paperbite_index.html');
const html = fs.readFileSync(FILE, 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PAPERS_JSON = path.join(DIR, 'papers.json');
// papers.json은 이제 수집기가 만든 실제 콘텐츠가 들어있는 진짜 파일이라, 테스트가 끝나고
// 그냥 지워버리면 안 된다 — 있던 내용을 기억해 뒀다가 테스트가 끝나면 그대로 되돌린다.
async function withTempPapersJson(content, fn) {
  const had = fs.existsSync(PAPERS_JSON);
  const backup = had ? fs.readFileSync(PAPERS_JSON) : null;
  fs.writeFileSync(PAPERS_JSON, JSON.stringify(content));
  try { await fn(); }
  finally { if (had) fs.writeFileSync(PAPERS_JSON, backup); else fs.rmSync(PAPERS_JSON, { force: true }); }
}

let pass = 0;
function t(name, fn) {
  try { fn(); console.log('  ok   ' + name); pass++; }
  catch (e) { console.error('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
}

/* ---------- PURE 블록 꺼내기 ---------- */
const src = html.split('/*PURE_START*/')[1].split('/*PURE_END*/')[0];
const names = ['hash', 'mulberry32', 'shuffle', 'splitSentences', 'makeCloze', 'levelInfo',
  'lenBonus', 'timeLimit', 'markTerms', 'citation', 'migrate', 'LENS', 'DEFAULTS',
  'addDaysUTC', 'reviewAdvance', 'resolveDifficulty', 'readingSource', 'notesMarkdown',
  'contrastRatio', 'buildIcs', 'mergeState', 'reconstructAbstract', 'truncateText'];
const P = new Function(src + '\nreturn {' + names.join(',') + '};')();

console.log('\n순수 함수');

t('문장 분리: 약어를 문장 끝으로 보지 않는다', () => {
  const s = P.splitSentences('We use LLMs, e.g. GPT-4o, for detection. Results are strong across datasets and tasks.');
  assert.equal(s.length, 2);
  assert.ok(s[0].includes('e.g. GPT-4o'));
});
t('문장 분리: et al. / Fig. 보호', () => {
  const s = P.splitSentences('Hasan et al. proposed a framework for phishing detection. See Fig. 3 for the full pipeline diagram.');
  assert.equal(s.length, 2);
});
t('문장 분리: 소수점은 끊지 않는다', () => {
  const s = P.splitSentences('Precision reached 1.0 on every corrupted subset we tested in the study.');
  assert.equal(s.length, 1);
});
t('문장 분리: 짧은 조각은 앞 문장에 병합', () => {
  const s = P.splitSentences('This is a reasonably long opening sentence about logs. Ok. Another sufficiently long closing sentence here.');
  assert.equal(s.length, 2);
  assert.ok(s[0].endsWith('Ok.'));
});
t('문장 분리: 한글 기준(10자)으로 병합', () => {
  const s = P.splitSentences('타임스탬프는 사건을 복원하는 핵심 단서예요. 그렇죠. 조작되면 신뢰도가 크게 흔들려요.');
  assert.equal(s.length, 2);
});
t('문장 분리: 빈 입력', () => {
  assert.deepEqual(P.splitSentences(''), []);
  assert.deepEqual(P.splitSentences(null), []);
});

const SENTS = [
  'Phishing emails remain one of the most damaging intrusion vectors in modern enterprise networks.',
  'We propose a detection framework that evaluates several commercial language models under varied prompts.',
  'Experiments indicate that substantial hardening is required before deployment in production mail systems.'
];
t('빈칸 퀴즈: 보기 3개가 서로 다르고 정답이 가려진다', () => {
  const qs = P.makeCloze(SENTS, 7, 3);
  assert.ok(qs.length >= 1);
  for (const q of qs) {
    assert.equal(q.options.length, 3);
    assert.equal(new Set(q.options.map(o => o.toLowerCase())).size, 3);
    assert.ok(q.ctx.includes('_____'));
    const answer = q.options[q.answer];
    assert.ok(!q.ctx.toLowerCase().includes(answer.toLowerCase()), '정답이 본문에 남아 있음');
  }
});
t('빈칸 퀴즈: 같은 시드면 같은 결과', () => {
  assert.deepEqual(P.makeCloze(SENTS, 7), P.makeCloze(SENTS, 7));
});
t('빈칸 퀴즈: 최대 문항 수를 넘지 않는다', () => {
  assert.ok(P.makeCloze(SENTS, 3, 2).length <= 2);
});

t('레벨: 150점마다 한 단계', () => {
  assert.deepEqual(P.levelInfo(0), { lv: 1, cur: 0, need: 150 });
  assert.deepEqual(P.levelInfo(149), { lv: 1, cur: 149, need: 150 });
  assert.deepEqual(P.levelInfo(150), { lv: 2, cur: 0, need: 150 });
  assert.equal(P.levelInfo(455).lv, 4);
});

t('길이 규칙: 5문장은 기존 값(완료 +20, 60초)을 유지', () => {
  assert.equal(P.lenBonus(5), 20);
  assert.equal(P.timeLimit(5), 60);
});
t('길이 규칙: 1문장도 보너스가 0이 아니다', () => {
  assert.deepEqual(P.LENS, [1, 3, 5, 10]);
  assert.equal(P.lenBonus(1), 5);
  assert.equal(P.lenBonus(3), 12);
  assert.equal(P.lenBonus(10), 40);
  assert.equal(P.timeLimit(1), 12);
});

t('용어 표시: 용어당 첫 등장만 쪼개고 글자는 그대로 남는다', () => {
  const text = '머클 트리는 가볍고, 머클 트리를 또 쓴다.';
  const segs = P.markTerms(text, [{ t: '머클 트리', d: '해시로 묶은 구조' }]);
  assert.equal(segs.map(s => s.s).join(''), text);
  assert.equal(segs.filter(s => s.term).length, 1);
  assert.equal(segs.filter(s => s.term)[0].def, '해시로 묶은 구조');
});
t('용어 표시: 없는 용어·빈 용어는 무시', () => {
  assert.deepEqual(P.markTerms('짧은 문장', [{ t: 'eBPF', d: 'x' }, { t: '', d: 'y' }]), [{ s: '짧은 문장' }]);
  assert.deepEqual(P.markTerms('짧은 문장', null), [{ s: '짧은 문장' }]);
});
t('용어 표시: 여러 용어가 순서대로 쪼개진다', () => {
  const segs = P.markTerms('커널과 eBPF', [{ t: 'eBPF', d: 'a' }, { t: '커널', d: 'b' }]);
  assert.deepEqual(segs.map(s => s.s), ['커널', '과 ', 'eBPF']);
});

t('인용 형식: 저자 · 연도 · 제목 · 출처 · URL', () => {
  const c = P.citation({ authors: 'Mijs', date: '2019', title: 'The Paradox of Inequality', source: 'SocArXiv', url: 'https://osf.io/x' });
  assert.equal(c, 'Mijs (2019). The Paradox of Inequality. SocArXiv. https://osf.io/x');
});
t('인용 형식: 빈 값은 미확인으로 표기하고 null을 찍지 않는다', () => {
  const c = P.citation({ authors: null, date: null, title: 'T', source: null, url: null });
  assert.ok(!c.includes('null'));
  assert.ok(c.includes('저자 미확인') && c.includes('연도 미확인'));
});

t('마이그레이션: v1 기록이 v2로 그대로 넘어온다', () => {
  const v1 = { xp: 320, days: ['2026-11-20', '2026-11-21'], done: { '2026-11-21': { a: { read: 1 } } }, notes: [{ text: 'n' }], sound: true, field: 'soc', tags: ['수면·기억'], mode: 'time' };
  const v2 = P.migrate(v1);
  assert.equal(v2.v, 2);
  assert.equal(v2.xp, 320);
  assert.deepEqual(v2.days, v1.days);
  assert.deepEqual(v2.done, v1.done);
  assert.equal(v2.notes.length, 1);
  assert.equal(v2.field, 'soc');
  assert.deepEqual(v2.tags, ['수면·기억']);
  assert.equal(v2.mode, 'time');
  assert.equal(v2.len, 5);          // 새 기본값이 채워진다
  assert.equal(v2.onboarded, true); // 이미 기록이 있으면 온보딩을 다시 보이지 않는다
});
t('마이그레이션: 기록이 없는 v1은 온보딩을 본다', () => {
  assert.equal(P.migrate({ xp: 0, days: [] }).onboarded, false);
});
t('마이그레이션: v2는 그대로 두고 빠진 필드만 채운다', () => {
  const v2 = P.migrate({ v: 2, xp: 10, theme: 'dark' });
  assert.equal(v2.xp, 10);
  assert.equal(v2.theme, 'dark');
  assert.equal(v2.len, 5);
});
t('마이그레이션: 망가진 값에도 죽지 않는다', () => {
  assert.equal(P.migrate(null), null);
  const v2 = P.migrate({ xp: 'x', days: 'nope', tags: null, done: 5 });
  assert.equal(v2.xp, 0);
  assert.deepEqual(v2.days, []);
  assert.deepEqual(v2.tags, []);
  assert.deepEqual(v2.done, {});
});

t('복습 큐: 날짜 더하기는 UTC 기준으로 월 경계를 넘는다', () => {
  assert.equal(P.addDaysUTC('2026-11-30', 1), '2026-12-01');
  assert.equal(P.addDaysUTC('2026-11-24', 7), '2026-12-01');
});
t('복습 큐: Leitner 3단계 — 정답이면 다음 박스로, 오답이면 1박스로 리셋', () => {
  const e1 = { id: 'x', pid: 'x', qi: 0, box: 1, due: '2026-11-20' };
  const e2 = P.reviewAdvance(e1, true, '2026-11-24');
  assert.deepEqual(e2, { id: 'x', pid: 'x', qi: 0, box: 2, due: '2026-11-27' }); // +3일
  const e3 = P.reviewAdvance(e2, true, '2026-11-27');
  assert.equal(e3.box, 3);
  assert.equal(e3.due, '2026-12-04'); // +7일
  const graduated = P.reviewAdvance(e3, true, '2026-12-04');
  assert.equal(graduated, null, '3단계를 모두 통과하면 큐에서 제거(졸업)');
});
t('복습 큐: 오답이면 박스와 상관없이 1박스·+1일로 리셋', () => {
  const e = { id: 'x', pid: 'x', qi: 0, box: 3, due: '2026-11-24' };
  const reset = P.reviewAdvance(e, false, '2026-11-24');
  assert.equal(reset.box, 1);
  assert.equal(reset.due, '2026-11-25');
});

t('난이도 폴백: 영어 원문이 없으면 한국어로 되돌아간다', () => {
  assert.equal(P.resolveDifficulty({ sents: ['a'] }, 'en'), 'ko');
  assert.equal(P.resolveDifficulty({ sents: ['a'], en: ['b'] }, 'en'), 'en');
});
t('난이도 폴백: 서론은 CC BY·CC0이고 자료가 있을 때만', () => {
  assert.equal(P.resolveDifficulty({ lic: 'arx', intro: ['x'] }, 'intro'), 'ko', '라이선스가 맞지 않음');
  assert.equal(P.resolveDifficulty({ lic: 'ccby' }, 'intro'), 'ko', '자료가 없음');
  assert.equal(P.resolveDifficulty({ lic: 'ccby', intro: ['x'] }, 'intro'), 'intro');
  assert.equal(P.resolveDifficulty({ lic: 'cc0', intro: ['x'] }, 'intro'), 'intro');
});
t('난이도 폴백: readingSource가 실제로 쓸 문장 배열을 돌려준다', () => {
  const paper = { sents: ['ko1'], en: ['en1'] };
  assert.deepEqual(P.readingSource(paper, 'en'), { sents: ['en1'], lang: 'en', effective: 'en' });
  assert.deepEqual(P.readingSource(paper, 'ko'), { sents: ['ko1'], lang: 'ko', effective: 'ko' });
});

t('노트 내보내기: 논문별로 묶은 Markdown을 만든다', () => {
  const md = P.notesMarkdown([
    { id: 'p1', title: '논문 A', date: '2026-11-20', text: '첫 노트' },
    { id: 'p2', title: '논문 B', date: '2026-11-21', text: '다른 논문' },
    { id: 'p1', title: '논문 A', date: '2026-11-22', text: '두 번째 노트' },
  ]);
  assert.ok(md.startsWith('# 내 노트'));
  assert.ok(md.indexOf('## 논문 A') < md.indexOf('## 논문 B'));
  assert.ok(md.includes('- 2026-11-20 — 첫 노트'));
  assert.ok(md.includes('- 2026-11-22 — 두 번째 노트'));
  assert.equal((md.match(/## /g) || []).length, 2, '같은 논문은 한 번만 묶여야 함');
});
t('노트 내보내기: 빈 목록도 죽지 않는다', () => {
  assert.equal(P.notesMarkdown([]), '# 내 노트\n');
});

t('접근성: 실제로 쓰는 색 조합이 WCAG AA(4.5:1) 명암비를 만족한다', () => {
  const light = { bg: '#FBFAF7', surface: '#FFFFFF', text: '#1F2328', muted: '#5B6470', accent: '#2B4A7A', ok: '#2F6B4F', bad: '#9B3B3B', warn: '#8A6D1F' };
  const dark = { bg: '#15171A', surface: '#1C1F23', text: '#E8EAED', muted: '#A8AFB9', accent: '#9CC0F0', ok: '#86CBA2', bad: '#E39B9B', warn: '#D7BE78' };
  for (const theme of [light, dark]) {
    for (const k of ['text', 'muted', 'ok', 'bad', 'warn']) {
      assert.ok(P.contrastRatio(theme[k], theme.bg) >= 4.5, `${k}/bg = ${P.contrastRatio(theme[k], theme.bg).toFixed(2)}`);
      assert.ok(P.contrastRatio(theme[k], theme.surface) >= 4.5, `${k}/surface = ${P.contrastRatio(theme[k], theme.surface).toFixed(2)}`);
    }
  }
  assert.ok(P.contrastRatio('#FFFFFF', light.accent) >= 4.5);
  assert.ok(P.contrastRatio('#15171A', dark.accent) >= 4.5);
});
t('접근성: 같은 색은 명암비 1', () => {
  assert.equal(P.contrastRatio('#112233', '#112233'), 1);
});

t('.ics: 매일 반복되는 일정을 만들고 특수문자를 이스케이프한다', () => {
  const ics = P.buildIcs('09:30', '오늘의 논문, 1문장; 읽기', '2026-11-24');
  assert.ok(ics.includes('DTSTART:20261124T093000'));
  assert.ok(ics.includes('DTEND:20261124T094000'));
  assert.ok(ics.includes('RRULE:FREQ=DAILY'));
  assert.ok(ics.includes('SUMMARY:오늘의 논문\\, 1문장\\; 읽기'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
  assert.ok(ics.trim().endsWith('END:VCALENDAR'));
});
t('.ics: 자정을 넘기는 시각은 DTEND 날짜도 다음날로 밀린다(끝이 시작보다 뒤여야 함)', () => {
  const ics = P.buildIcs('23:55', '알림', '2026-11-24');
  assert.ok(ics.includes('DTSTART:20261124T235500'));
  assert.ok(ics.includes('DTEND:20261125T000500'));
});

t('계정 병합: 더 많이 진행된 쪽을 기준으로 하되 목록은 합쳐서 하나도 잃지 않는다', () => {
  const a = { xp: 100, days: ['2026-11-20', '2026-11-22'], done: { '2026-11-20': { p1: { read: 1 } } }, notes: [{ id: 'p1', title: 't', date: '2026-11-20', text: 'a' }], fav: ['p1'], later: [], history: [{ pid: 'p1', date: '2026-11-20' }], review: [{ id: 'p1#0', pid: 'p1', qi: 0, box: 1, due: '2026-11-25' }] };
  const b = { xp: 250, days: ['2026-11-21'], done: { '2026-11-21': { p2: { quiz: 1 } } }, notes: [{ id: 'p2', title: 't2', date: '2026-11-21', text: 'b' }], fav: ['p2'], later: ['p3'], history: [{ pid: 'p2', date: '2026-11-21' }], review: [{ id: 'p1#0', pid: 'p1', qi: 0, box: 2, due: '2026-11-27' }] };
  const m = P.mergeState(a, b);
  assert.equal(m.xp, 250, '더 큰 쪽의 점수를 기준으로 삼는다');
  assert.deepEqual(m.days, ['2026-11-20', '2026-11-21', '2026-11-22'], '날짜는 합집합');
  assert.deepEqual(Object.keys(m.done).sort(), ['2026-11-20', '2026-11-21']);
  assert.equal(m.notes.length, 2);
  assert.deepEqual(m.fav.sort(), ['p1', 'p2']);
  assert.deepEqual(m.later, ['p3']);
  assert.equal(m.history.length, 2);
  assert.equal(m.review.length, 1, '같은 복습 항목은 하나로');
  assert.equal(m.review[0].box, 2, '더 앞선(박스가 높은) 쪽이 남는다');
});
t('계정 병합: 빈 값과 병합해도 죽지 않고 원래 값을 보존한다', () => {
  const a = { xp: 50, days: ['2026-11-20'], done: {}, notes: [], fav: [], later: [], history: [], review: [] };
  const m = P.mergeState(a, {});
  assert.equal(m.xp, 50);
  assert.deepEqual(m.days, ['2026-11-20']);
});

console.log('\n정적 점검');
t('innerHTML을 쓰지 않는다', () => {
  assert.ok(!/\.innerHTML/.test(html));
  assert.ok(!/outerHTML|insertAdjacentHTML|document\.write/.test(html));
});
t('폭죽·떠오르는 점수·마스코트가 남아 있지 않다', () => {
  assert.ok(!/confetti|floatxp|floatXP/i.test(html));
});
t('이모지를 쓰지 않는다(체크 기호 ✓ 는 허용)', () => {
  const emoji = (html.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu) || [])
    .filter(c => c !== '✓' && c !== '✔');
  assert.deepEqual(emoji, []);
});
t('모션은 150ms 이하이고 reduced-motion을 존중한다', () => {
  const durs = (html.match(/transition:[^;'"}]+/g) || []).join(' ').match(/([\d.]+)s/g) || [];
  for (const d of durs) assert.ok(parseFloat(d) <= 0.15, '150ms를 넘는 전환: ' + d);
  assert.ok(html.includes('prefers-reduced-motion'));
});
t('기본 테마 색이 종이 테마다', () => {
  assert.ok(html.includes('--bg:#FBFAF7') && html.includes('--accent:#2B4A7A'));
});
t('PWA: manifest·서비스 워커·아이콘 파일이 있고 head에서 연결된다', () => {
  assert.ok(html.includes('rel="manifest" href="manifest.webmanifest"'));
  assert.ok(html.includes("navigator.serviceWorker.register('./sw.js')"));
  assert.ok(fs.existsSync(path.join(DIR, 'manifest.webmanifest')));
  assert.ok(fs.existsSync(path.join(DIR, 'sw.js')));
  assert.ok(fs.existsSync(path.join(DIR, 'icon.svg')));
  const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
});
t('알림: 오늘 이미 읽었으면 다시 알리지 않는 가드가 있다', () => {
  assert.ok(html.includes('S.days.includes(todayKey())'), 'maybeNotify에 "오늘 이미 읽음" 가드가 있어야 함');
});
t('계정 병합: 테마·알림·측정 같은 기기별 설정은 합치지 않고 진행 기록 7개 필드만 돌려준다', () => {
  const keys = Object.keys(P.mergeState({ xp: 1, theme: 'dark', notifyOn: true }, { xp: 2 })).sort();
  assert.deepEqual(keys, ['days', 'done', 'fav', 'history', 'later', 'notes', 'review', 'xp']);
});

t('웹 검색: OpenAlex 역색인 초록을 문장으로 복원한다', () => {
  const inv = { Hello: [0], world: [1], this: [2], is: [3], a: [4], test: [5] };
  assert.equal(P.reconstructAbstract(inv), 'Hello world this is a test');
  assert.equal(P.reconstructAbstract(null), '');
});
t('웹 검색: 긴 텍스트는 단어 중간을 끊지 않고 자른다', () => {
  const s = P.truncateText('hello world this is long', 13);
  assert.ok(s.endsWith('…'));
  assert.ok(!s.includes('h…') && s.length <= 14);
  assert.equal(P.truncateText('short', 100), 'short');
});

/* =====================================================================
   흐름 테스트 (Chrome CDP)
   ===================================================================== */
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));

if (!CHROME) {
  console.log('\n흐름 테스트: Chrome을 찾지 못해 건너뜁니다.');
  console.log(`\n${pass}개 통과`);
} else {
  await flow();
}

async function flow() {
  // 로컬 서버 (file:// 에서는 localStorage가 막힐 수 있음)
  const server = http.createServer((req, res) => {
    const name = req.url === '/' ? '/paperbite_index.html' : req.url.split('?')[0];
    const f = path.join(DIR, path.basename(name));
    if (!fs.existsSync(f)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(f));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';

  const port = 9222 + Math.floor(Math.random() * 200);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + port,
    '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars', '--window-size=390,844', base], { stdio: 'ignore' });

  let ws, id = 0;
  const waiters = new Map();
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(x => x.type === 'page' && x.webSocketDebuggerUrl);
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
        ws.onmessage = ev => {
          const m = JSON.parse(ev.data);
          if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); }
        };
        break;
      }
    } catch { }
    await sleep(250);
  }
  if (!ws) { console.error('\n흐름 테스트: Chrome에 붙지 못했습니다.'); process.exitCode = 1; chrome.kill(); server.close(); return; }

  const send = (method, params = {}) => new Promise(r => { const n = ++id; waiters.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  const ev = async expr => {
    const { result } = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    if (result.result && result.result.subtype === 'error') throw new Error(result.result.description);
    return result.result.value;
  };
  const text = () => ev('document.body.innerText');
  const click = label => ev(`(()=>{const b=[...document.querySelectorAll('button,a,summary')].find(x=>x.textContent.trim().includes(${JSON.stringify(label)}));if(!b)return false;b.click();return true;})()`);
  const state = () => ev(`JSON.parse(localStorage.getItem('paperbite.v2')||'null')`);
  const waitFor = async (expr, ms = 4000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if (await ev(expr)) return true; } catch { } await sleep(80); }
    return false;
  };
  // Page.reload은 명령 수신만 알려주므로, 새 화면이 그려질 때까지 기다린다
  const reload = () => send('Page.reload').then(() => waitFor(`!!document.querySelector('#view').firstChild && !!document.querySelector('#top').firstChild`));
  const reset = async patch => {
    await ev(`localStorage.clear();localStorage.setItem('paperbite.v2',JSON.stringify(Object.assign({v:2,xp:0,days:[],done:{},notes:[],sound:false,theme:'light',fs:1,field:'all',tags:[],mode:'read',len:5,goal:5,onboarded:true,resume:null,fav:[],later:[],history:[],day:{k:'',sent:0},review:[],ext:{}},${JSON.stringify(patch || {})})))`);
    await reload();
    await waitFor(`document.body.innerText.includes('오늘의 논문')`);
  };
  const ta = async (name, fn) => {
    try { await fn(); console.log('  ok   ' + name); pass++; }
    catch (e) { console.error('  FAIL ' + name + '\n       ' + (e.message || e)); process.exitCode = 1; }
  };
  // 보이는 보기 중 정답을 찾을 때까지 눌러 본다 (mc/ox/word 공통 — 셋 다 .opt 버튼 구조가 같다)
  const answerChoiceCorrectly = async () => {
    for (const k of [0, 1, 2]) {
      const n = await ev(`document.querySelectorAll('#opts .opt').length`);
      if (k >= n) break;
      const disabled = await ev(`(()=>{const o=document.querySelectorAll('#opts .opt')[${k}];return !o||o.disabled;})()`);
      if (disabled) continue;
      await ev(`document.querySelectorAll('#opts .opt')[${k}].click()`); await sleep(150);
      if (await ev(`document.body.innerText.includes('정답입니다')`)) return true;
    }
    return false;
  };
  // 현재 문제가 지정한 유형 라벨이 아니면 정답을 맞히고 다음 문제로 넘어가길 반복한다
  const reachQuizType = async (label, maxSteps = 6) => {
    for (let i = 0; i < maxSteps; i++) {
      if ((await text()).includes(label)) return true;
      await answerChoiceCorrectly();
      await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/다음 문제|결과 보기/.test(x.textContent));if(b)b.click();})()`);
      await sleep(150);
    }
    return (await text()).includes(label);
  };
  const readSentences = async n => { for (let i = 0; i < n; i++) { await ev(`document.querySelector('#next').click()`); await sleep(110); } };
  // field+tags로 좁힌 풀 안에 같은 태그를 쓰는 논문이 늘어나도(새 수집 콘텐츠 등) 깨지지 않게,
  // 넉넉한 횟수만큼 "다른 논문"을 눌러가며 제목으로 특정 논문을 찾는다(풀 크기를 가정하지 않는다).
  const selectPaperByTitle = async (titleSubstr, maxTries = 15) => {
    for (let i = 0; i < maxTries; i++) {
      if ((await ev(`document.querySelector('.h2').textContent`)).includes(titleSubstr)) return true;
      await click('다른 논문'); await sleep(150);
    }
    return (await ev(`document.querySelector('.h2').textContent`)).includes(titleSubstr);
  };
  // 퀴즈 문항 수와 상관없이 전부 정답으로 끝까지 진행한다(결과 화면까지)
  const finishQuizAllCorrect = async (maxSteps = 6) => {
    for (let i = 0; i < maxSteps; i++) {
      const hasOpts = await ev(`!!document.querySelector('#opts .opt')`);
      if (!hasOpts) return;
      await answerChoiceCorrectly();
      await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/다음 문제|결과 보기/.test(x.textContent));if(b)b.click();})()`);
      await sleep(150);
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await sleep(700);

  console.log('\n흐름 (Chrome)');

  await ta('첫 실행에 온보딩 3장이 뜨고 건너뛸 수 있다', async () => {
    await ev(`localStorage.clear()`); await reload();
    assert.ok((await text()).includes('안내 1 / 3'));
    assert.equal(await click('건너뛰기'), true);
    await sleep(150);
    assert.ok((await text()).includes('오늘의 논문'));
  });

  await ta('홈의 주 버튼은 하나이고 시작까지 탭 1번', async () => {
    await reset();
    assert.equal(await ev(`document.querySelectorAll('.btn.primary').length`), 1);
    assert.ok(await ev(`document.querySelector('.btn.primary').textContent.includes('읽기 시작')`));
    assert.ok(await ev(`!document.querySelector('details.scope').open`), '범위 설정이 기본 접힘이어야 함');
  });

  await ta('5문장 읽기 = 50 + 완료 20 = 70점, 오늘 기록 남음', async () => {
    await reset();
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    for (let i = 0; i < 5; i++) { await ev(`document.querySelector('#next').click()`); await sleep(120); }
    const s = await state();
    assert.equal(s.xp, 70);
    assert.equal(s.day.sent, 5);
    assert.equal(s.days.length, 1);
    assert.equal(s.resume, null, '완료하면 이어 읽기 기록이 지워져야 함');
    assert.equal(s.history.length, 1);
  });

  await ta('1문장만 읽어도 오늘 기록이 남는다 (10 + 5점)', async () => {
    await reset({ len: 1, goal: 1 });
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    assert.ok(await ev(`document.body.innerText.includes('문장 1 / 1')`));
    await ev(`document.querySelector('#next').click()`); await sleep(150);
    const s = await state();
    assert.equal(s.xp, 15);
    assert.equal(s.days.length, 1);
  });

  await ta('중간에 그만 읽어도 점수가 남고, 다시 열면 같은 문장에서 이어진다', async () => {
    await reset();
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    await ev(`document.querySelector('#next').click()`); await sleep(120);
    await ev(`document.querySelector('#next').click()`); await sleep(120);
    assert.equal(await click('그만 읽기'), true); await sleep(150);
    let s = await state();
    assert.equal(s.xp, 20);
    assert.equal(s.resume.i, 2);
    await reload();
    assert.ok((await text()).includes('이어서 읽기'));
    assert.ok((await text()).includes('3번째 문장부터'));
    assert.equal(await click('이어서 읽기'), true); await sleep(200);
    assert.ok(await ev(`document.body.innerText.includes('문장 3 / 5')`));
  });

  await ta('이전 문장으로 돌아갈 수 있다', async () => {
    assert.equal(await click('이전 문장'), true); await sleep(150);
    assert.ok(await ev(`document.body.innerText.includes('문장 2 / 5')`));
  });

  await ta('용어를 누르면 한 줄 뜻풀이가 보인다', async () => {
    await reset({ field: 'sci' });
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(200);
    const hasTerm = await ev(`!!document.querySelector('.sent .term')`);
    if (hasTerm) {
      await ev(`document.querySelector('.sent .term').click()`); await sleep(100);
      assert.ok(await ev(`!!document.querySelector('.gloss')`));
    } else {
      // 이 논문 첫 문장에 용어가 없으면 다음 문장에서 확인
      await ev(`document.querySelector('#next').click()`); await sleep(150);
      assert.ok(await ev(`!!document.querySelector('.sent .term')`), '어느 문장에도 용어가 없음');
    }
  });

  await ta('퀴즈: 오답은 감점 없이 재도전, 재도전 정답은 10점', async () => {
    await reset();
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    for (let i = 0; i < 5; i++) { await ev(`document.querySelector('#next').click()`); await sleep(110); }
    assert.equal(await click('퀴즈 풀기'), true); await sleep(200);
    const before = (await state()).xp;
    // 틀린 보기를 하나 고른다 (첫 보기가 정답이면 다른 보기로)
    await ev(`document.querySelectorAll('.opt')[0].click()`); await sleep(150);
    let wrongFirst = await ev(`document.body.innerText.includes('다시 골라')`);
    if (!wrongFirst) {
      // 첫 보기가 정답이었다 → 다음 문제에서 다시 시도
      await click('다음 문제'); await sleep(200);
      await ev(`document.querySelectorAll('.opt')[0].click()`); await sleep(150);
      wrongFirst = await ev(`document.body.innerText.includes('다시 골라')`);
    }
    assert.ok(wrongFirst, '오답 안내가 보여야 함');
    assert.ok((await state()).xp >= before, '오답으로 점수가 깎이면 안 됨');
    const mid = (await state()).xp;
    // 남은 보기를 눌러 정답을 찾는다
    for (const k of [1, 2]) {
      await ev(`(()=>{const o=document.querySelectorAll('.opt')[${k}];if(o&&!o.disabled)o.click();})()`);
      await sleep(150);
      if (await ev(`document.body.innerText.includes('재도전 정답')`)) break;
    }
    assert.ok(await ev(`document.body.innerText.includes('재도전 정답')`), '재도전 정답 안내가 보여야 함');
    assert.equal((await state()).xp - mid, 10);
    assert.ok(await ev(`!!document.querySelector('.why')`), '해설은 정답 후에만 보인다');
  });

  await ta('복습(같은 날 같은 논문)은 점수가 0', async () => {
    await reset();
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    for (let i = 0; i < 5; i++) { await ev(`document.querySelector('#next').click()`); await sleep(110); }
    const after = (await state()).xp;
    await reload();
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    for (let i = 0; i < 5; i++) { await ev(`document.querySelector('#next').click()`); await sleep(110); }
    assert.equal((await state()).xp, after);
  });

  await ta('OX 퀴즈는 O/X 두 보기로 렌더되고 정답이면 점수가 들어간다', async () => {
    await reset({ field: 'sci', tags: ['AI 보안·피싱'] }); // arx-2512.10104(피싱) 하나로 좁힌다
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    await readSentences(5);
    await click('퀴즈 풀기'); await sleep(200);
    assert.ok(await reachQuizType('OX 퀴즈'), 'OX 문제에 도달하지 못함');
    assert.equal(await ev(`document.querySelectorAll('#opts .opt').length`), 2);
    const before = (await state()).xp;
    assert.ok(await answerChoiceCorrectly());
    assert.ok((await state()).xp > before);
  });

  await ta('핵심 단어 선택 문제 유형이 표시된다', async () => {
    await reset({ field: 'soc', tags: ['불평등·사회학'] }); // 이 태그를 쓰는 논문 중 soc-dcr9b를 찾아간다
    assert.ok(await selectPaperByTitle('Income Inequality and Belief'), 'soc-dcr9b를 찾지 못함');
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    await readSentences(5);
    await click('퀴즈 풀기'); await sleep(200);
    assert.ok(await reachQuizType('핵심 단어'), '핵심 단어 문제에 도달하지 못함');
  });

  await ta('문장 순서 맞추기: 오답은 다시 배열, 재도전 정답은 첫 시도로 잘못 채점되지 않는다', async () => {
    await reset({ field: 'hum', tags: ['디지털 인문학'] }); // 이 태그를 쓰는 논문 중 순서 맞추기 문제가 있는 hum-des5를 찾아간다
    assert.ok(await selectPaperByTitle("Leibniz's dream"), 'hum-des5를 찾지 못함');
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    await readSentences(5);
    await click('퀴즈 풀기'); await sleep(200);
    assert.ok(await reachQuizType('순서 맞추기'), '순서 맞추기 문제에 도달하지 못함');
    const total = await ev(`document.querySelectorAll('#opts .opt').length`);
    assert.equal(total, 4);
    const perm = await ev(`window.__pbTest().quiz[window.__pbTest().qi].perm`);
    const order = []; for (let target = 0; target < total; target++) order.push(perm.indexOf(target));
    // 일부러 역순(항등 순열이 아닌 한 반드시 오답)으로 눌러 재도전 상황을 만든다
    const wrongOrder = [...order].reverse();
    const beforeAny = (await state()).xp;
    for (const pos of wrongOrder) { await ev(`document.querySelectorAll('#opts .opt')[${pos}].click()`); await sleep(120); }
    await sleep(200);
    assert.ok((await text()).includes('아니에요') || (await text()).includes('다시 골라'), '오답 안내가 보여야 함');
    assert.equal(await ev(`document.querySelectorAll('#opts .opt').length`), total, '다시 배열할 수 있게 버튼이 재생성돼야 함');
    assert.equal((await state()).xp, beforeAny, '오답은 감점도 가점도 없어야 함');
    const before = (await state()).xp;
    for (const pos of order) { await ev(`document.querySelectorAll('#opts .opt')[${pos}].click()`); await sleep(150); }
    assert.ok((await text()).includes('재도전 정답입니다'), '오답 후 정답은 "재도전 정답"으로 표시돼야 함(첫 시도로 잘못 표시되면 안 됨)');
    assert.equal((await state()).xp - before, 10, '재도전 정답은 +10점만 받아야 한다(첫 시도 점수로 부풀려지면 안 됨)');
  });
  await ta('문장 순서 맞추기: 첫 시도에 바로 맞히면 첫 시도 점수(+20 이상)를 받는다', async () => {
    await reset({ field: 'hum', tags: ['디지털 인문학'] });
    assert.ok(await selectPaperByTitle("Leibniz's dream"), 'hum-des5를 찾지 못함');
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    await readSentences(5);
    await click('퀴즈 풀기'); await sleep(200);
    assert.ok(await reachQuizType('순서 맞추기'));
    const total = await ev(`document.querySelectorAll('#opts .opt').length`);
    const perm = await ev(`window.__pbTest().quiz[window.__pbTest().qi].perm`);
    const order = []; for (let target = 0; target < total; target++) order.push(perm.indexOf(target));
    const before = (await state()).xp;
    for (const pos of order) { await ev(`document.querySelectorAll('#opts .opt')[${pos}].click()`); await sleep(150); }
    assert.ok((await text()).includes('정답입니다') && !(await text()).includes('재도전'));
    assert.ok((await state()).xp - before >= 20, '첫 시도 정답은 20점 이상(콤보 보너스 포함 가능)이어야 함');
  });

  await ta('퀴즈 첫 시도 오답은 복습 큐(1일 뒤)에 등록된다', async () => {
    await reset({ field: 'sci', tags: ['AI 보안·피싱'] });
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    await readSentences(5);
    await click('퀴즈 풀기'); await sleep(200);
    const answerIdx = await ev(`window.__pbTest().quiz[0].answer`);
    const wrongIdx = answerIdx === 0 ? 1 : 0;
    await ev(`document.querySelectorAll('#opts .opt')[${wrongIdx}].click()`); await sleep(150);
    assert.ok((await text()).includes('다시 골라'));
    const rev = (await state()).review;
    assert.equal(rev.length, 1);
    assert.equal(rev[0].pid, 'arx-2512.10104');
    assert.equal(rev[0].qi, 0);
    assert.equal(rev[0].box, 1);
  });

  await ta('복습 세션: 오늘 맞히면 +10점이고 다음 박스(+3일)로 넘어간다', async () => {
    await reset({ review: [{ id: 'arx-2512.10104#0', pid: 'arx-2512.10104', qi: 0, box: 1, due: '2000-01-01' }] });
    assert.ok((await text()).includes('틀렸던 문제 1개'), '홈에 복습 카드가 보여야 함');
    assert.equal(await click('복습하기'), true); await sleep(200);
    assert.ok((await text()).includes('복습 1 / 1'));
    const before = (await state()).xp;
    // 박스 전진을 확인하려면 '첫 시도'에 바로 맞혀야 하므로(오답이면 1박스로 리셋) 정답 인덱스를 직접 읽어 누른다
    const ansIdx = await ev(`window.__pbTest().quiz[0].answer`);
    await ev(`document.querySelectorAll('#opts .opt')[${ansIdx}].click()`); await sleep(150);
    assert.ok((await text()).includes('복습 +10'));
    assert.equal(await click('복습 마치기'), true); await sleep(300);
    assert.equal((await state()).xp - before, 10);
    const todayStr = await ev(`(()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());})()`);
    const rev = (await state()).review;
    assert.equal(rev.length, 1);
    assert.equal(rev[0].box, 2);
    assert.equal(rev[0].due, P.addDaysUTC(todayStr, 3));
  });

  await ta('노트: 검색·논문별 묶기·Markdown 내보내기', async () => {
    await reset({ field: 'sci', tags: ['AI 보안·피싱'] });
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    await readSentences(5);
    assert.equal(await click('한 줄로 정리하기'), true); await sleep(200);
    await ev(`(()=>{const ta=document.querySelector('textarea');ta.value='LLM 피싱 탐지는 아직 보강이 필요하다';ta.dispatchEvent(new Event('input'));})()`);
    assert.equal(await click('저장'), true); await sleep(200); // 저장 후 viewMenu로 이동(홈 버튼 없음)
    assert.equal(await click('서재'), true); await sleep(200); // 상단 바의 서재 버튼은 모든 화면에 있다
    assert.ok((await text()).includes('LLM 피싱 탐지는 아직 보강이 필요하다'));
    await ev(`(()=>{const i=document.querySelector('input[type=search]');i.value='존재하지않는검색어XYZ';i.dispatchEvent(new Event('input'));})()`); await sleep(150);
    assert.ok((await text()).includes('검색 결과가 없어요'));
    await ev(`(()=>{const i=document.querySelector('input[type=search]');i.value='';i.dispatchEvent(new Event('input'));})()`); await sleep(150);
    assert.ok((await text()).includes('LLM 피싱 탐지는 아직 보강이 필요하다'));
    assert.equal(await click('Markdown으로 내보내기'), true);
  });

  await ta('난이도: 영어 자료가 없으면 한국어 요약으로 자동 폴백한다', async () => {
    await reset({ difficulty: 'en' });
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(200);
    assert.ok((await text()).includes('아직 영어 원문이 없어'));
    assert.ok(await ev(`document.querySelector('.sent').lang==='ko'`));
  });

  await ta('진행 칸: 읽은 수만큼 채워지고 현재 칸은 테두리', async () => {
    await reset();
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    await ev(`document.querySelector('#next').click()`); await sleep(150);
    assert.equal(await ev(`document.querySelectorAll('.pip').length`), 5);
    assert.equal(await ev(`document.querySelectorAll('.pip.done').length`), 1);
    assert.equal(await ev(`document.querySelectorAll('.pip.cur').length`), 1);
  });

  await ta('새로고침 후에도 점수·기록이 남는다', async () => {
    const s1 = await state();
    await reload();
    const s2 = await state();
    assert.equal(s2.xp, s1.xp);
    assert.deepEqual(s2.days, s1.days);
  });

  await ta('v1 저장 데이터를 열면 기록이 살아서 넘어온다', async () => {
    await ev(`localStorage.clear();localStorage.setItem('paperbite.v1',JSON.stringify({xp:455,days:['2026-11-20'],done:{},notes:[{id:'x',title:'t',text:'old note',date:'2026-11-20'}],sound:true,field:'hum',tags:[],mode:'read'}))`);
    await reload();
    assert.ok((await text()).includes('누적 455점'));
    assert.ok((await text()).includes('Lv.4'));
    assert.ok(!(await text()).includes('안내 1 / 3'), '쓰던 사람에게 온보딩을 다시 보이면 안 됨');
    const s = await state();
    assert.equal(s.v, 2);
    assert.equal(s.notes[0].text, 'old note');
  });

  await ta('화면에 null·undefined가 찍히지 않는다', async () => {
    await reset({ field: 'soc' });
    let body = await text();
    assert.ok(!/\bnull\b|\bundefined\b|\bNaN\b/.test(body), '홈: ' + body.slice(0, 120));
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(200);
    body = await text();
    assert.ok(!/\bnull\b|\bundefined\b|\bNaN\b/.test(body), '읽기: ' + body.slice(0, 120));
  });

  await ta('설정에서 다크 테마와 글자 크기가 적용된다', async () => {
    await reset();
    assert.equal(await click('설정'), true); await sleep(200);
    assert.equal(await click('다크'), true); await sleep(150);
    assert.equal(await ev(`document.documentElement.getAttribute('data-theme')`), 'dark');
    assert.equal(await click('크게'), true); await sleep(150);
    assert.equal(await ev(`document.documentElement.getAttribute('data-fs')`), '2');
    assert.equal(await ev(`getComputedStyle(document.documentElement).getPropertyValue('--fs').trim()`), '24px');
    assert.equal((await state()).sound, false, '소리는 기본 꺼짐');
  });

  await ta('라이선스 배지는 결과 중심 3종이고 이유 패널이 열린다', async () => {
    await reset();
    const badge = await ev(`document.querySelector('.badge[class*=lic-]').textContent`);
    assert.ok(/가공 가능\(CC BY\)|요약·링크만|확인 필요/.test(badge), badge);
    await ev(`document.querySelector('.badge[class*=lic-]').click()`); await sleep(120);
    assert.ok(await ev(`!!document.querySelector('#licwhy .why')`));
  });

  await ta('접근성: 글자 200% 확대(좁은 뷰포트)에서도 가로 스크롤이 생기지 않는다', async () => {
    await reset();
    await send('Emulation.setDeviceMetricsOverride', { width: 195, height: 422, deviceScaleFactor: 1, mobile: true });
    await sleep(200);
    const over = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(150);
    assert.ok(over <= 0, '200% 확대 상당 폭에서 가로 넘침 ' + over + 'px');
  });

  await ta('접근성: 순서 맞추기 문제도 숫자 키만으로 풀 수 있다', async () => {
    await reset({ field: 'hum', tags: ['디지털 인문학'] });
    assert.ok(await selectPaperByTitle("Leibniz's dream"), 'hum-des5를 찾지 못함');
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    await readSentences(5);
    await click('퀴즈 풀기'); await sleep(200);
    assert.ok(await reachQuizType('순서 맞추기'));
    const total = await ev(`document.querySelectorAll('#opts .opt').length`);
    const perm = await ev(`window.__pbTest().quiz[window.__pbTest().qi].perm`);
    const order = []; for (let target = 0; target < total; target++) order.push(perm.indexOf(target) + 1); // 1-베이스 키
    const before = (await state()).xp;
    for (const key of order) { await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'${key}'}))`); await sleep(150); }
    assert.ok((await text()).includes('정답입니다'));
    assert.ok((await state()).xp > before);
  });

  await ta('측정(선택): 꺼진 기본값에서는 기록하지 않고, 켜면 로컬에만 쌓인다', async () => {
    await reset();
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    await readSentences(5);
    assert.equal((await state()).analytics.length, 0, '기본값(꺼짐)에서는 이벤트가 쌓이면 안 됨');
    await click('홈으로'); await sleep(150);
    await click('설정'); await sleep(150);
    assert.equal(await click('측정 꺼짐'), true); await sleep(150);
    assert.ok((await state()).measure, '측정이 켜져야 함');
    await click('홈으로'); await sleep(150);
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    await readSentences(5);
    const ev1 = (await state()).analytics;
    assert.ok(ev1.some(x => x.e === 'read_start'));
    assert.ok(ev1.some(x => x.e === 'read_first_sentence'));
    assert.ok(ev1.some(x => x.e === 'read_complete'));
    assert.ok(ev1.every(x => !JSON.stringify(x.p).match(/피싱|LLM-PEA|논문/)), '이벤트에 본문 텍스트가 담기면 안 됨(개인정보 최소)');
    await click('설정'); await sleep(150);
    assert.ok((await text()).includes('전환율'), '측정을 켜면 요약 패널이 보여야 함');
  });

  await ta('알림: 시각을 바꾸고 켜면 저장되고, .ics 내려받기 버튼이 동작한다', async () => {
    await reset();
    await click('설정'); await sleep(150);
    await ev(`(()=>{const i=document.getElementById('notify-time-input');i.value='07:30';i.dispatchEvent(new Event('change'));})()`);
    assert.equal((await state()).notifyTime, '07:30');
    assert.equal(await click('알림 꺼짐'), true); await sleep(150);
    assert.ok((await state()).notifyOn);
    assert.equal(await click('캘린더 파일'), true); await sleep(150);
    assert.ok((await text()).includes('캘린더 파일을 내려받았어요'));
  });

  await ta('계정: 내보낸 백업을 다른 기기 것과 합치면 더 큰 점수를 기준으로 기록이 합쳐진다', async () => {
    await reset({ xp: 50, days: ['2026-11-20'] });
    await click('설정'); await sleep(150);
    const incoming = { v: 2, xp: 300, days: ['2026-11-22'], done: {}, notes: [], fav: [], later: [], history: [], review: [] };
    await ev(`(()=>{
      const dt=new DataTransfer();
      dt.items.add(new File([${JSON.stringify(JSON.stringify(incoming))}],'backup.json',{type:'application/json'}));
      const input=document.querySelector('input[type=file]');
      input.files=dt.files;
      input.dispatchEvent(new Event('change'));
    })()`);
    await sleep(300);
    const s = await state();
    assert.equal(s.xp, 300, '더 많이 진행된 쪽의 점수를 기준으로 합쳐야 함');
    assert.ok(s.days.includes('2026-11-20') && s.days.includes('2026-11-22'), '날짜는 양쪽 다 남아야 함');
    assert.ok((await text()).includes('합쳤어요'));
  });

  await ta('키워드 검색: Enter(change)로 확정하면 조건에 맞는 논문만 남는다', async () => {
    await reset();
    assert.ok(await ev(`!!document.querySelector('input[aria-label="논문 키워드 검색"]')`), '검색창이 있어야 함');
    await ev(`(()=>{const i=document.querySelector('input[aria-label="논문 키워드 검색"]');i.value='phishing';i.dispatchEvent(new Event('change'));})()`);
    await sleep(200);
    assert.ok((await text()).includes('Phishing Email Detection'), '검색어와 맞는 논문이 오늘의 논문으로 나와야 함');
  });
  await ta('키워드 검색: 아무것도 안 걸리면 안내만 보이고 죽지 않는다', async () => {
    await reset({ keyword: '존재하지않는검색어ZZZ999' });
    assert.ok((await text()).includes('조건에 맞는 논문이 없어요'));
    assert.equal(await ev(`document.querySelector('.btn.primary')`), null, '시작 버튼이 없어야 함(시작할 논문이 없으므로)');
    assert.equal(await click('검색 지우기'), true); await sleep(150);
    assert.ok(await ev(`!!document.querySelector('.btn.primary')`), '검색을 지우면 시작 버튼이 다시 보여야 함');
  });

  await ta('수집기 출력(collector/papers.json)이 있으면 자동으로 섞여서 홈에 나타난다', async () => {
    const extra = [{
      id: 'ext-test-1', field: 'sci', tags: ['기타'], source: '테스트 수집기',
      title: '수집기로 들어온 테스트 논문', authors: '테스터', date: '2026-11',
      lic: 'ccby', url: 'https://example.com/ext', terms: [],
      sents: ['첫 문장입니다.', '둘째 문장입니다.', '셋째 문장입니다.', '넷째 문장입니다.', '다섯째 문장입니다.'],
      quiz: [{ type: 'mc', q: '테스트 질문?', opts: ['정답', '오답1', '오답2'], why: '테스트' }],
      needsTransform: false, canPersist: true,
    }];
    await withTempPapersJson(extra, async () => {
      await reset({ field: 'sci', tags: [] });
      let found = false;
      for (let i = 0; i < 12 && !found; i++) {
        found = (await text()).includes('수집기로 들어온 테스트 논문');
        if (!found) { await click('다른 논문'); await sleep(150); }
      }
      assert.ok(found, '수집기가 넣은 논문이 풀에 섞여 결국 한 번은 보여야 함');
    });
  });

  await ta('수집기 출력에 변환이 안 된(needsTransform) 논문이 섞여 있으면 걸러낸다', async () => {
    const extra = [{ id: 'ext-test-2', field: 'sci', tags: ['기타'], source: 'x', title: '아직 변환 안 됨', lic: 'ccby', needsTransform: true, sents: [] }];
    await withTempPapersJson(extra, async () => {
      await reset({ field: 'sci', tags: [] });
      await sleep(400);
      let seen = false;
      for (let i = 0; i < 6; i++) { if ((await text()).includes('아직 변환 안 됨')) { seen = true; break; } await click('다른 논문'); await sleep(120); }
      assert.equal(seen, false, 'needsTransform인 항목은 보이면 안 됨');
    });
  });

  await ta('범위 설정 패널은 칩을 눌러도 펼친 상태가 유지된다', async () => {
    await reset();
    await ev(`document.querySelector('details.scope summary').click()`); await sleep(150);
    assert.ok(await ev(`document.querySelector('details.scope').open`));
    await ev(`document.querySelector('.chip').click()`); await sleep(150);
    assert.ok(await ev(`document.querySelector('details.scope').open`), '칩을 눌러도 패널이 닫히면 안 됨');
  });

  await ta('계정 합치기는 테마·알림·측정 같은 기기 설정은 건드리지 않는다', async () => {
    await reset({ xp: 50, theme: 'dark', notifyOn: true, measure: true });
    await click('설정'); await sleep(150);
    const incoming = { v: 2, xp: 500, days: ['2026-01-01'], done: {}, notes: [], fav: [], later: [], history: [], review: [], theme: 'light', notifyOn: false, measure: false };
    await ev(`(()=>{
      const dt=new DataTransfer();
      dt.items.add(new File([${JSON.stringify(JSON.stringify(incoming))}],'backup.json',{type:'application/json'}));
      const input=document.querySelector('input[type=file]');
      input.files=dt.files; input.dispatchEvent(new Event('change'));
    })()`);
    await sleep(300);
    const s = await state();
    assert.equal(s.xp, 500, '점수는 더 큰 쪽 기준으로 합쳐져야 함');
    assert.equal(s.theme, 'dark', '테마는 이 기기 것을 유지해야 함');
    assert.equal(s.notifyOn, true, '알림 설정은 이 기기 것을 유지해야 함');
    assert.equal(s.measure, true, '측정 동의는 이 기기 것을 유지해야 함');
  });

  await ta('라이선스 배지: CC BY-SA는 "가공 가능"으로 표시되고 동일조건 고지가 보인다', async () => {
    const extra = [{
      id: 'ext-sa-1', field: 'sci', tags: ['기타'], source: '테스트', title: 'BY-SA 테스트 논문',
      authors: null, date: null, lic: 'ccbysa', url: 'https://example.com/sa', shareAlikeNotice: true,
      sents: ['하나.', '둘.', '셋.', '넷.', '다섯.'], quiz: [{ type: 'mc', q: 'q?', opts: ['a', 'b', 'c'], why: 'w' }],
      terms: [], needsTransform: false, canPersist: true,
    }];
    await withTempPapersJson(extra, async () => {
      await reset({ field: 'sci', tags: [] });
      let found = false;
      for (let i = 0; i < 12 && !found; i++) { found = (await text()).includes('BY-SA 테스트 논문'); if (!found) { await click('다른 논문'); await sleep(150); } }
      assert.ok(found, 'BY-SA 테스트 논문을 찾지 못함');
      assert.ok((await text()).includes('가공 가능(CC BY-SA)'), 'CC BY-SA가 확인 필요로 잘못 표시되면 안 됨');
      await ev(`document.querySelector('.badge[class*=lic-]').click()`); await sleep(150);
      assert.ok((await text()).includes('동일조건 고지'));
    });
  });

  await ta('측정: 오늘 이미 끝낸 퀴즈를 다시 풀어도 정답률 분모가 늘지 않는다', async () => {
    await reset({ measure: true, field: 'sci', tags: ['AI 보안·피싱'] }); // mc/mc/ox만 있는 논문으로 고정
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    await readSentences(5);
    await click('퀴즈 풀기'); await sleep(200);
    await finishQuizAllCorrect();
    await sleep(200);
    const firstCount = (await state()).analytics.filter(x => x.e === 'quiz_answer').length;
    assert.ok(firstCount > 0, '첫 판은 측정이 쌓여야 함');
    await reload(); // viewMenu/viewResult를 거치지 않고 홈으로 바로 돌아간다
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(150);
    await readSentences(5);
    await click('퀴즈 풀기'); await sleep(200); // 오늘 두 번째(복습, 점수 없음)
    await finishQuizAllCorrect();
    await sleep(200);
    const replayCount = (await state()).analytics.filter(x => x.e === 'quiz_answer').length;
    assert.equal(replayCount, firstCount, '같은 날 복습 플레이는 측정에 새로 쌓이면 안 됨');
  });

  await ta('웹에서 논문 찾기: OpenAlex 실시간 검색 결과가 뜬다', async () => {
    await reset();
    assert.equal(await click('웹에서 논문 찾기'), true); await sleep(200);
    await ev(`document.querySelector('input[aria-label="웹 논문 검색"]').value='inequality'`);
    await ev(`document.querySelector('input[aria-label="웹 논문 검색"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))`);
    await waitFor(`!document.body.innerText.includes('찾는 중')`, 8000);
    const body = await text();
    assert.ok(/\d+건 찾았어요|실패했어요|결과가 없어요/.test(body), '검색 상태 메시지가 보여야 함: ' + body.slice(0, 200));
  });

  await ta('웹 검색 결과: 초록이 충분하면 "읽기 시작"으로 원문+빈칸 퀴즈를 바로 읽을 수 있다(AI 아님, 저장 안 됨)', async () => {
    await reset();
    assert.equal(await click('웹에서 논문 찾기'), true); await sleep(200);
    await ev(`document.querySelector('input[aria-label="웹 논문 검색"]').value='inequality'`);
    await ev(`document.querySelector('input[aria-label="웹 논문 검색"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))`);
    await waitFor(`!document.body.innerText.includes('찾는 중')`, 8000);
    const hasReadBtn = await ev(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('읽기 시작'))`);
    assert.ok(hasReadBtn, '초록이 있는 OpenAlex 결과 중 하나는 읽기 시작 버튼이 있어야 함');
    await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('읽기 시작')).click()`); await sleep(200);
    assert.ok((await text()).includes('문장 1 /'), '읽기 화면으로 들어가야 함');
    assert.equal(await ev(`document.querySelector('.sent').lang`), 'en', '원문 그대로(영어)라 en으로 표시돼야 함');
    await readSentences(5);
    await click('퀴즈 풀기'); await sleep(200);
    assert.ok((await text()).includes('빈칸에 들어갈 말은') || (await text()).includes('퀴즈'), '알고리즘 빈칸 퀴즈가 떠야 함');
    const s = await state();
    assert.equal((s.history || []).some(x => x.pid && x.pid.startsWith('live:')), false, '검색 결과로 읽은 건 서재(history)에 저장되면 안 됨');
  });

  await ta('웹에서 논문 찾기: 검색 프록시(arXiv·OSF)가 배포돼 있으면 결과를 돌려준다', async () => {
    const PLACEHOLDER = 'https://paperbite-search-proxy.workers.dev';
    const configured = html.includes('SEARCH_PROXY_URL=') && !html.includes(`SEARCH_PROXY_URL='${PLACEHOLDER}'`);
    if (!configured) { console.log('    skip: SEARCH_PROXY_URL이 아직 플레이스홀더라 건너뜀'); return; }
    await reset();
    assert.equal(await click('웹에서 논문 찾기'), true); await sleep(200);
    await ev(`document.querySelector('input[aria-label="웹 논문 검색"]').value='memory'`);
    await ev(`document.querySelector('input[aria-label="웹 논문 검색"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))`);
    await waitFor(`!document.body.innerText.includes('찾는 중')`, 10000);
    assert.ok((await text()).includes('arXiv') || (await text()).includes('OSF'), '프록시로 가져온 결과가 하나는 보여야 함');
  });

  await ta('390px 폭에서 가로 스크롤이 생기지 않는다', async () => {
    await reset();
    const over = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    assert.ok(over <= 0, '가로 넘침 ' + over + 'px');
  });

  await ta('390px 스크린샷 저장', async () => {
    await reset();
    const shots = { 'shot-home.png': null };
    const { result } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(DIR, 'shot-home.png'), Buffer.from(result.data, 'base64'));
    await ev(`document.querySelector('.btn.primary').click()`); await sleep(250);
    const r2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(DIR, 'shot-read.png'), Buffer.from(r2.result.data, 'base64'));
    assert.ok(Object.keys(shots).length === 1);
  });

  ws.close(); chrome.kill(); server.close();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { }
  console.log(`\n${pass}개 통과`);
}
