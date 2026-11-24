// AI 변환 일괄 실행 — collect.mjs가 만든 papers.json 중 아직 변환 안 됐고(needsTransform)
// 저장 가능한(canPersist) 것만 골라 Claude로 변환해 같은 파일에 다시 쓴다.
// 실행: node collector/transform-batch.mjs [파일 경로(기본 ../papers.json)]
// ANTHROPIC_API_KEY가 없으면 변환 없이 조용히 끝낸다 — collect.mjs만 돌아도 앱은 깨지지 않는다
// (needsTransform인 항목은 앱이 걸러내고 보여주지 않는다).
// 주의: 이 파일의 Claude 호출 코드는 이 세션에서 실제 키로 호출해 보지는 않았다 — 공식 Messages API
// 형식대로 작성했지만, 실제 운영 전에 한 번은 직접 실행해 응답을 확인할 것.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformPaper } from './transform.mjs';
import { createRateLimiter } from './lib.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const limiter = createRateLimiter(1000); // 한 번에 한 요청씩, 여유 있게 1초 간격

async function summarizeWithClaude(abstractRaw, prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  return limiter(async () => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const text = (data.content || []).map(b => b.text || '').join('');
    const match = text.match(/\{[\s\S]*\}/); // 모델이 JSON 앞뒤로 설명을 붙여도 가장 큰 중괄호 블록만 쓴다
    if (!match) throw new Error('LLM 응답에서 JSON을 찾지 못함: ' + text.slice(0, 200));
    return JSON.parse(match[0]);
  });
}

async function main() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.log('[transform] ANTHROPIC_API_KEY가 없어 건너뜁니다. 수집된 항목은 needsTransform 상태로 남아요.'); return; }

  const rel = process.argv[2] || '../papers.json';
  const file = path.resolve(DIR, rel);
  if (!fs.existsSync(file)) { console.log('[transform] ' + file + ' 이 없어요. collect.mjs를 먼저 실행하세요.'); return; }
  const papers = JSON.parse(fs.readFileSync(file, 'utf8'));

  let changed = 0, failed = 0;
  for (const p of papers) {
    if (!p.needsTransform || !p.canPersist) continue;
    const r = await transformPaper(p, summarizeWithClaude).catch(e => ({ ok: false, reason: String(e) }));
    if (r.ok) {
      Object.assign(p, { sents: r.sents, quiz: r.quiz, terms: r.terms, needsTransform: false, abstractRaw: '' });
      changed++;
      console.log(`[ok] ${p.id}: ${p.title.slice(0, 50)}`);
    } else {
      failed++;
      console.log(`[skip] ${p.id}: ${r.reason}`);
    }
  }
  fs.writeFileSync(file, JSON.stringify(papers, null, 2) + '\n');
  console.log(`\n변환 완료: ${changed}건 성공, ${failed}건 보류(다음 실행에서 다시 시도)`);
}

main().catch(e => { console.error(e); process.exitCode = 1; });
