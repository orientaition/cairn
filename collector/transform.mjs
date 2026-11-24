// 논문 한 입 — AI 변환(초록 → 쉬운 한국어 5문장 + 퀴즈 3문항 + 용어 풀이).
// 이 파일은 실제 LLM을 호출하지 않는다. summarizeFn(abstract, prompt)을 주입받는 구조라서
// 운영자가 어떤 모델을 붙이든(Claude API 등) 같은 게이트(라이선스 → 변환 → 사실 점검)를 통과시킬 수 있다.
import { licenseGate, factCheckSummary } from './lib.mjs';

export const PROMPT_TEMPLATE = `너는 ADHD 성향 대학생을 위해 논문 초록을 쉬운 한국어로 바꾸는 편집자야.
아래 초록을 읽고 다음 형식의 JSON만 출력해:

{
  "sents": ["문장1", "문장2", "문장3", "문장4", "문장5"],
  "quiz": [
    {"q":"질문", "opts":["정답","오답1","오답2"], "why":"정답 근거(몇 번째 문장인지)"}
  ],
  "terms": [{"t":"전문 용어", "d":"한 줄 뜻풀이"}]
}

규칙:
- sents는 정확히 5문장, 해요체, 한 문장 40자 내외, 초록에 없는 내용을 지어내지 않는다.
- 초록에 나온 숫자·영문 고유명사·모델명(예: 22%, GPT-4o, 1,006바이트)은 생성 문장에도
  "원문 표기 그대로" 아라비아 숫자/로마자로 적는다(자동 점검이 그대로 문자열 대조하기 때문).
- quiz는 2~3문항, 3지선다, opts[0]이 정답(렌더링 때 섞는다), 오답도 그럴듯하게 만들되 틀린 것으로.
- terms는 초록에 등장한 전문 용어만, 최대 4개.
- 확실하지 않은 내용은 문장에 넣지 말고 빼라(빈 추측 금지).

초록:
"""{{ABSTRACT}}"""`;

export function buildPrompt(abstractRaw) {
  return PROMPT_TEMPLATE.replace('{{ABSTRACT}}', abstractRaw || '');
}

/**
 * @param {object} paper - collect.mjs가 만든 정규화된 논문 1건
 * @param {(abstractRaw:string, prompt:string)=>Promise<{sents:string[],quiz:object[],terms:object[]}>} summarizeFn
 */
export async function transformPaper(paper, summarizeFn) {
  const gate = licenseGate(paper.lic);
  if (!paper.abstractRaw) return { ok: false, reason: '초록이 없어서 변환할 수 없음' };

  const draft = await summarizeFn(paper.abstractRaw, buildPrompt(paper.abstractRaw));
  const check = factCheckSummary(paper.abstractRaw, draft.sents || []);
  if (!check.ok) {
    return { ok: false, reason: '자동 점검 실패 — 원문에 없는 숫자·고유명사가 섞였을 수 있음', missing: check.missing };
  }
  return {
    ok: true,
    // CC0·CC BY·CC BY-SA가 아니면 이 자리에서만 보여주고 캐시에 쓰지 않는다(일회성)
    persist: gate.persist,
    shareAlikeNotice: gate.shareAlikeNotice,
    sents: draft.sents,
    quiz: draft.quiz || [],
    terms: draft.terms || [],
  };
}
