# 논문 한 입 — 개선 요청 프롬프트와 현재까지의 자료

작성일: 2026-11-24

## 이 문서 쓰는 법

1. 아래 **1. 프롬프트**를 통째로 복사해서 AI 코딩 도구(Claude Code, Cursor 등)에 붙여넣어요.
2. 같은 대화에 이 문서의 **2. 배경 자료**와 **3. 현재 코드**를 함께 붙여넣어요. 코드는 `index.html` 한 파일이에요.
3. 프롬프트는 단계(A~D)로 나뉘어 있어서, 한 번에 다 시키지 말고 A부터 차례로 시키는 걸 권해요.

---

## 1. 프롬프트 (복사해서 사용)

````text
너는 시니어 프런트엔드 엔지니어이자 학습 앱 UX 디자이너야. 아래 "논문 한 입" 웹앱을 개선해줘.
첨부한 [배경 자료]와 [현재 코드(index.html)]가 현재 상태야.

# 제품
ADHD 성향의 대학생이 관심 분야 논문을 매일 조금씩 읽게 만드는 앱.
듀오링고·말해보카처럼 "짧은 단위(5문장) + 즉각 피드백(점수) + 퀴즈"로 시작의 어려움을 낮춘다.
핵심 원칙: 시작 장벽 최소화, 즉각 피드백, 실패해도 감점·리셋 없음.

# 이번 작업의 최우선 방향: 정적인(차분한) 학술 UI
논문을 읽는 앱이므로, 지금의 화려한 게임 느낌(네온 색, 폭죽, 떠오르는 XP, 이모지, 튀는 버튼)을 없애고
"학술지·논문 리더"처럼 정적이고 차분하게 바꾼다. 단, 즉각 피드백은 '조용하게' 유지한다.

디자인 규칙
- 기본 테마는 라이트(종이 느낌): 배경 #FBFAF7, 표면 #FFFFFF, 본문 #1F2328, 보조 #5B6470, 테두리 #D9D6CF,
  강조색은 잉크 블루 #2B4A7A 한 가지만. 성공 #2F6B4F, 오류 #9B3B3B, 주의 #8A6D1F. 다크 테마는 선택 옵션.
  모든 텍스트 대비 4.5:1 이상.
- 타이포: 읽는 본문은 세리프(Noto Serif KR), UI 라벨·버튼은 산세리프(Noto Sans KR). 본문 20px / 줄간격 1.8,
  한 줄 길이 최대 약 40자(영문 70자 내외). 글자 크기 3단계 조절.
- 모양: 그림자 최소, 1px 얇은 테두리, 둥근 모서리 6~8px. 큰 색 면 버튼 대신 테두리형/잉크 블루 단색 버튼.
- 이모지·폭죽·떠오르는 점수·마스코트·소리 기본값 모두 제거. 소리는 옵션(기본 꺼짐).
- 모션은 150ms 이하의 opacity/색 전환만. prefers-reduced-motion이면 모션 없음.
- 점수·보상은 "기록"처럼 보이게: 상단에 `오늘 5/5문장 · 누적 128점 · 총 12일`, 주간 기록표(월~일 칸), 텍스트 위주.
  레벨 칭호(새싹 독자 등) 같은 장난스러운 문구는 "Lv.3" 같은 중립 표기로 바꾼다.
- 논문 정보는 인용 형식으로: `저자 · 연도 · 출처 · 원문 링크`, "인용 복사" 버튼 포함.
- 한국어 문구는 담백한 문어체 해요/합니다체로 통일하고, 감탄·응원 문구는 짧고 건조하게.

# 고쳐야 할 항목 (1~6)

## 1. 화면(단순화·가독성)
- 홈: "오늘의 논문 1편 + [읽기 시작] 주 버튼 1개"만 눈에 띄게. 분야·세부 분야·모드·길이는 "범위 설정"
  접이식(기본 접힘, 현재 선택을 한 줄로 요약 표시). 주간 기록·오늘 미션·내 노트는 하단 보조 영역.
- 점수 피드백: 화면 중앙에 떠오르는 효과 삭제. 점수 표시 옆에 "+10"이 150ms 나타났다 사라지는 정도.
- 원문 링크는 작은 보조 링크/아이콘 버튼으로 줄이고 시작 버튼과 경쟁하지 않게.
- 라이선스 배지 문구를 결과 중심 3종으로: "가공 가능(CC BY)", "요약·링크만", "확인 필요".
  색에만 의존하지 말고 텍스트로 구분, 누르면 이유를 설명하는 작은 패널.
- 읽기 화면: 카드 상단 빈 공간 제거(상단 정렬), 핵심 용어 굵게(데이터에 `terms` 배열 추가).
- 설정 패널: 테마(라이트/다크), 글자 크기, 소리(기본 꺼짐).
- 진행 칸 표시는 지금 방식 유지(읽은 칸만 가득, 현재 칸은 테두리). 색은 잉크 블루 단색, 애니메이션 제거.

## 2. 사용 편의
- 이어 읽기: 진행 상태(논문, 문장 위치, 모드, 퀴즈 위치, 시도 횟수)를 저장·복원하고 홈에 "이어서 읽기" 표시.
- 읽는 중 "이전 문장", "그만 읽기" 제공(중도 종료해도 이미 받은 점수·기록 유지).
- 읽기 길이 선택: 1 / 3 / 5 / 10문장. 1문장만 읽어도 "오늘 읽음"으로 인정(누적 일수 +1).
  점수는 문장당 10, 완료 보너스는 선택한 길이 기준으로.
- 영어 원문 병기: 문장별 "원문 보기" 토글, 전문 용어(`terms`)를 누르면 한 줄 뜻풀이.
- 읽은 논문 이력, 즐겨찾기, "나중에 읽기" 화면.
- 온보딩 3장(건너뛰기 가능) + 하루 목표 선택(1문장 / 5문장 / 퀴즈까지).

## 3. 동기부여·보상 (정적 UI 안에서)
- 즉각 피드백은 유지하되 조용하게: 칸 채움, 체크 표시, 점수 숫자 갱신, 선택적 소리.
- 알림: PWA Web Push로 구현. 사용자가 시각 선택, 문구는 중립적이고 짧게("오늘의 논문 1문장"),
  죄책감·비난 문구 금지, 끄기·일시중지 쉽게. 푸시 불가 환경은 캘린더(.ics) 내려받기로 대체.
- 연속일(스트릭) 대신 누적 일수 + 주간 기록표 유지. 기록이 0으로 리셋되지 않아야 한다.
- 주간 목표(예: 이번 주 3일)와 "쉬어가기"(목표 면제) 지원.
- XP 상점·마스코트·깜짝 보상은 정적 UI 방향과 충돌하므로 이번에는 구현하지 말고, 나중에 "옵션(기본 꺼짐)"으로
  붙일 수 있게 데이터 구조만 열어둔다.
- 타임어택은 선택형 유지. 시간 초과 감점 없음, 오답 후 재도전은 시간 제한 없음.

## 4. 학습 효과
- 틀린 문제 복습 큐: 첫 시도에서 틀린 문제를 1일 / 3일 / 7일 간격(3단계 Leitner)으로 재출제.
  홈에 "복습 N개" 카드. 복습 정답은 문제당 하루 1회 10점.
- 퀴즈 유형 추가: O/X, 핵심 단어 선택, 문장 순서 맞추기. 문제 스키마에 `type` 필드.
- 난이도 선택: 한국어 요약 / 영어 초록 / (CC BY·CC0인 경우에만) 서론 일부.
- 정리 노트: 검색, 논문별 묶기, Markdown 복사 내보내기.
- 기존 규칙 유지: 정답을 맞혀야 점수, 틀리면 감점 없이 재도전, 해설은 정답 후에만 공개.

## 5. 콘텐츠·데이터
- 수집기(서버 또는 서버리스, 하루 1회): arXiv, OSF Preprints(SocArXiv·PsyArXiv·MediArXiv 등), CORE, OpenAlex에서 수집해
  공통 스키마(제목, 저자, 날짜, 출처, URL, 초록, 라이선스, 분류, 태그)로 정규화해 JSON으로 캐시.
  브라우저가 외부 API를 직접 호출하지 않는다(CORS·호출 제한 때문).
  arXiv API는 3초에 1요청·단일 연결을 지킨다. OSF·CORE는 토큰/키 필요 여부를 확인하고, OpenAlex는 약관을 확인해 보고한다.
- 세부 분야는 소스의 실제 분류(arXiv 카테고리, OpenAlex topic, OSF subjects)를 한국어 라벨로 매핑하고, 키워드 검색 추가.
- AI 변환: 초록 → 쉬운 한국어 5문장 + 퀴즈 3문항 + 용어 풀이.
  라이선스 게이트: CC0·CC BY(BY-SA는 동일조건 고지)만 결과를 저장·공유 가능.
  그 외·미확인 라이선스는 사용자별 일회성 생성만 하고 저장하지 않거나 링크만 제공.
  모든 카드에 "AI 요약, 원문 아님" 표시와 원문 링크. 요약에 나온 숫자·고유명사가 초록에 실제로 있는지 자동 점검.
- 한국어 논문(KCI): 별도 어댑터. 초록 제공 여부와 운영 승인 조건을 먼저 확인하고, 구현 전 확인 결과를 보고.
- 앱 이름·로고·문구에서 arXiv 등이 후원·보증하는 것처럼 보이지 않게 점검.

## 6. 플랫폼·안정성
- 계정(가장 단순한 방식) + 서버 동기화. 로컬 우선(오프라인 가능), 충돌 시 최신 값 우선 병합.
- PWA: 설치, 오프라인 캐시, 푸시.
- 접근성 WCAG 2.2 AA: 대비 4.5:1, 키보드만으로 전부 조작, 포커스 표시, 스크린리더 라벨,
  글자 200% 확대에서도 깨지지 않기.
- 측정(개인정보 최소, 동의 후 수집, 끄기 가능): 첫 문장까지 전환율, 5문장 완료율, 퀴즈 정답률, D1/D3 재방문.
  이벤트 이름과 스키마를 제안.

# 작업 방식
1. 먼저 코드를 읽고 변경 계획(파일 구조, 데이터 스키마 v2, 저장 데이터 마이그레이션)을 15줄 이내로 보고한 뒤
   합리적인 기본값으로 진행해. 질문은 꼭 필요한 것만 최대 3개.
2. 단계별로 진행하고 각 단계가 끝날 때 멈춰서 결과를 보고해.
   - A단계: 정적 UI 리디자인 + 1번 + 2번
   - B단계: 4번(복습 큐, 퀴즈 유형, 난이도, 노트)
   - C단계: 5번(수집기, AI 변환, 라이선스 게이트)
   - D단계: 3번의 알림 + 6번(계정, PWA, 접근성, 측정)
3. 기존 규칙은 그대로 유지해(배경 자료 2.2 참고). 규칙을 바꾸면 이유와 함께 알려줘.
4. 저장 키 `paperbite.v1` 데이터는 v2로 마이그레이션해서 기존 기록이 사라지지 않게.
5. 외부·사용자 텍스트는 모두 textContent로 렌더하고 innerHTML을 쓰지 마.
6. 기존 테스트(문장 분리, 빈칸 퀴즈 생성, 전체 흐름)를 유지·확장하고, 새 기능마다 테스트를 추가해.
   모바일 390px 폭 스크린샷으로 화면이 깨지지 않는지 확인해.

# 하지 말 것
- 폭죽, 떠오르는 점수, 이모지 남발, 마스코트, 비난형 알림, 연속 기록 리셋.
- 논문 전문이나 초록 원문을 라이선스 확인 없이 저장·재배포.
- 브라우저에서 arXiv 등 외부 API를 사용자별로 직접·반복 호출.
- 요청하지 않은 기능 추가(위 목록 밖의 아이디어는 마지막에 제안만).

# 완료 기준
- 첫 화면에 주 버튼이 하나이고, 시작까지 탭 1번.
- 읽기 중간에 앱을 닫았다 열면 같은 문장에서 이어진다.
- 1문장만 읽어도 오늘 기록이 남는다.
- 오답은 감점 없이 재도전, 정답 후에만 해설이 보이고 점수가 들어간다.
- 틀린 문제가 1·3·7일 뒤 복습 큐에 나타난다.
- 라이선스가 CC BY/CC0가 아닌 논문은 요약·링크 외 가공 결과가 저장되지 않는다.
- 접근성 점검(대비, 키보드, 스크린리더)을 통과한다.
- 모든 기존·신규 테스트가 통과한다.
````

---

## 2. 배경 자료 (지금까지의 웹 관련 내용)

### 2.1 제품 컨셉

- 듀오링고·말해보카처럼 매일 관심 분야 논문을 조금씩 읽고, 다 읽거나 문제를 풀면 포인트를 받는 앱.
- ADHD 기준: 즉각 보상, 시작 장벽 낮추기("딱 5문장만"), 선택형 타임어택, 연속 기록이 끊겨도 부담 없게(누적 일수 방식).
- 분야는 큰 범위(이공 / 사회·심리 / 인문)와 세부 분야(복수 선택)로 고른다.

### 2.2 현재 동작 규칙 (유지할 것)

| 항목 | 규칙 |
| --- | --- |
| 읽기 | 문장 1개 넘길 때 +10점. 5문장 완료 +20점 |
| 타임어택(읽기) | 5문장을 60초 안에 읽으면 남은 초 × 2점 보너스. 시간이 끝나도 감점 없고 이후 일반 모드로 계속 |
| 퀴즈 | 3지선다. **정답을 맞혀야 점수**. 첫 시도 정답 20점 + 콤보 보너스(min(콤보−1, 3) × 5) + 타임어택 시 ceil(남은 초 / 3). 오답은 그 보기를 비활성화하고 다시 고르게 함(감점 없음). 재도전 정답은 10점 |
| 퀴즈(퍼펙트) | 2문제 이상을 모두 첫 시도에 맞히면 +30점 |
| 퀴즈 타임어택 | 문제당 15초. 초과하면 오답 처리, 재도전부터는 시간 제한 없음 |
| 한 줄 정리 | 5자 이상 입력 시 +20점 |
| 중복 보상 | 같은 날 같은 논문의 같은 단계는 한 번만 점수 지급(다시 하면 0점, "복습") |
| 레벨 | `floor(XP / 150) + 1` |
| 기록 | 누적 일수(리셋 없음), 이번 주 월~일 도장. 읽기·퀴즈·정리 중 하나라도 하면 그날 기록 |
| 진행 바 | 칸 단위(읽은 칸만 가득, 현재 칸은 테두리) |
| 필터 | 큰 분야 + 세부 분야 태그(복수 선택, OR 조건), 태그별 편수 표시, 큰 분야를 바꾸면 없는 태그 자동 해제 |
| 오늘의 논문 | 날짜 + 다시 뽑기 횟수로 목록에서 순환 선택 |
| 내 논문 붙여넣기 | 영어/한국어 초록을 붙여넣으면 첫 5문장으로 읽기 카드, 핵심 단어를 가린 빈칸 퀴즈(최대 3문항) 자동 생성. 저장하지 않음 |
| 문장 분리 | 약어(e.g., et al., Fig. 등) 보호. 짧은 조각은 앞 문장에 병합(영문 25자, 한글 10자 미만) |
| 저장 | `localStorage` 키 `paperbite.v1` (xp, days, done, notes, sound, field, tags, mode). 실패해도 동작 |

### 2.3 논문 소스 조사 결과

**arXiv** (이공)
- 메타데이터(제목, 초록, 저자, 분류)는 CC0이라 가져와 저장·가공·공유할 수 있다.
- 전문·PDF는 arXiv가 저작권자가 아니라서, 저작권자나 제출 라이선스가 허용하지 않으면 자체 서버에서 제공하면 안 된다.
- 레거시 API는 "3초에 1요청 이하, 단일 연결", 여러 기기로 우회 금지. 한도는 바뀔 수 있다.
- 명시적 출처 표기 의무는 없지만 arXiv가 보증·후원하는 것처럼 보이면 안 된다. 상업적 이용은 약관에 직접 언급이 없어서 문의하라고 안내한다.
- 논문별 라이선스는 저자가 선택한다: CC BY 4.0, CC BY-SA 4.0, CC BY-NC-SA 4.0, CC BY-NC-ND 4.0, arXiv 비독점 라이선스(재사용 제한), CC0.
- 출처: https://info.arxiv.org/help/api/tou.html , https://info.arxiv.org/help/license/index.html

**OSF Preprints** (사회·심리·인문 일부)
- PsyArXiv(심리), SocArXiv(사회과학), LawArXiv(법), EdArXiv(교육), MediArXiv(미디어·영화·커뮤니케이션), BodoArXiv(중세학) 등이 OSF 인프라에서 운영된다.
- 라이선스는 논문마다 다르고, 라이선스가 없으면 저자가 모든 권리를 가진 상태라 허락 없이 가공할 수 없다.
- REST API가 있다. 인증 없이 읽을 수 있다는 설명과 토큰이 필요하다는 가이드가 엇갈려서 직접 확인이 필요하다.
- OSF 페이지는 자바스크립트로 그려져서 단순 페이지 가져오기로는 초록을 얻기 어렵다.
- 출처: https://help.osf.io/article/408-preprint-analytics , https://help.osf.io/article/686-preprint-services

**CORE** (오픈액세스 집계, 인문 포함)
- 전 세계 오픈액세스 논문의 메타데이터와 전문을 API로 무료 제공하고, 약관 범위에서 상업적 이용도 가능하다고 안내한다. API 키 등록이 필요하다.
- 출처: https://www.core.ac.uk/services/api

**OpenAlex**
- 분야 분류와 오픈액세스 여부 필터에 좋은 후보지만, 이번 조사에서 데이터 라이선스와 호출 제한은 확인하지 못했다. 사용 전 약관 확인 필요.

**KCI (한국어 논문)**
- 공공데이터포털에 한국연구재단 KCI 인용정보 API(무료, REST/XML)가 있다. 인용정보 위주이고 초록 제공 여부는 확인하지 못했다.
- 심의 유형이 "개발 허용 / 운영 불허"로 표시되어 있어서 실서비스는 별도 승인이 필요할 가능성이 크다.
- 출처: https://www.data.go.kr/en/data/15084727/openapi.do

### 2.4 개발 환경에서 확인한 제약 (Claude 위에서 계속 만들 경우)

- 게시된 페이지(artifact)는 다른 사이트로 `fetch`/`XMLHttpRequest`/`WebSocket`을 보낼 수 없다(보안 정책으로 차단). 그래서 페이지 안에서 arXiv·OSF를 직접 호출할 수 없다.
- 작업 환경의 셸에서도 `export.arxiv.org` 접속이 403으로 막혀 있었다(허용 도메인 설정에 따라 달라질 수 있음).
- 웹 가져오기 도구는 초록을 원문 그대로 복사해 주지 않았다. 그래서 샘플 13편의 5문장은 초록에서 확인한 내용을 바탕으로 **쉬운 한국어로 새로 쓴 요약**이다(원문 아님).
- 페이지가 쓸 수 있는 기능(capability): `db`(로그인 사용자별 저장), `user`, `sample`(Claude에게 질문), `downloads` 등. 실시간 논문 수집은 이 방식으로 해결되지 않고 별도 서버가 필요하다.
- 기록은 현재 브라우저 `localStorage`에만 저장되어 기기를 바꾸면 사라진다.

### 2.5 현재 샘플 데이터

- 이공 4편(arXiv: 피싱 탐지 LLM, IoT 로그 무결성 머클 트리, Nitro 위조 방지 로깅, 타임스탬프 조작과 포렌식), 사회·심리 5편(SocArXiv 3편, PsyArXiv 수면 2편), 인문 4편(MediArXiv 1편, OSF 1편, PsyArXiv 1편, Digital Enlightenment Studies 1편).
- 각 논문에 `tags`(세부 분야), 5문장 요약, 2문항 퀴즈(옵션 첫 번째가 정답이며 실행 시 섞음), 원문 링크, 라이선스 코드(`ccby` / `arx` / `unk`)가 있다. 저자·날짜가 비어 있는 카드가 많고, CC BY로 확인된 것은 1편뿐이다.

### 2.6 테스트

- 순수 함수 단위 테스트: 문장 분리(약어, 소수점, 짧은 조각 병합, 한글 기준), 빈칸 퀴즈 생성(보기 3개 중복 없음, 정답 숨김, 시드 고정), 레벨 계산.
- 흐름 테스트(jsdom): 읽기 5문장 → 점수 → 퀴즈(오답 재도전, 퍼펙트) → 정리 → 결과, 복습 시 0점, 새로고침 후 저장 유지, 타임어택 보너스, 붙여넣기 흐름, 분야·세부 분야 필터, 진행 칸(읽은 수 = 채워진 칸), "null" 같은 글자가 화면에 찍히지 않는지, `innerHTML` 미사용.
- 시각 확인: 헤드리스 Chrome으로 390px 폭 스크린샷.

---

## 3. 현재 코드 (index.html 전체)

````html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>논문 한 입 – 매일 5문장 논문 읽기</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#12142b; --card:#1b1e3d; --card2:#252a54; --line:#323868;
  --text:#f1f3ff; --muted:#a3a9d4; --accent:#c6f432; --accent-ink:#172000; --accent-dk:#8fb61a;
  --pink:#ff7aa8; --blue:#6dd0ff; --ok:#4be08a; --warn:#ffcc4d; --bad:#ff7070;
  --r:20px;
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--text);font-family:'Noto Sans KR',system-ui,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;line-height:1.55;-webkit-text-size-adjust:100%}
body{min-height:100vh;min-height:100dvh}
.app{max-width:480px;margin:0 auto;padding:14px 16px 40px}
button{font:inherit;color:inherit;cursor:pointer}
:focus-visible{outline:3px solid var(--blue);outline-offset:2px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* top bar */
.top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px}
.brand{font-weight:900;font-size:19px;letter-spacing:-.02em;background:none;border:0;padding:4px 0;display:flex;gap:6px;align-items:center}
.brand b{color:var(--accent)}
.stats{display:flex;gap:6px;align-items:center}
.pill{background:var(--card);border:1px solid var(--line);border-radius:99px;padding:4px 10px;font-size:13px;font-weight:700;white-space:nowrap}
.pill.xp{color:var(--accent)}
.iconbtn{background:var(--card);border:1px solid var(--line);border-radius:99px;width:34px;height:34px;display:grid;place-items:center;font-size:15px;padding:0}

/* generic */
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:16px;margin-bottom:14px}
.h2{font-size:18px;line-height:1.4;font-weight:700;margin:6px 0 4px;word-break:keep-all;overflow-wrap:anywhere}
.muted{color:var(--muted)}
.small{font-size:13px}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.between{justify-content:space-between}
.badge{display:inline-flex;gap:4px;align-items:center;border-radius:99px;padding:2px 10px;font-size:12px;font-weight:700;background:var(--card2);border:1px solid var(--line)}
.badge.open{color:var(--ok);border-color:#2c7a4f}
.badge.limited{color:var(--warn);border-color:#8a6d1f}
.badge.unknown{color:var(--muted)}
.label{font-size:12px;font-weight:700;color:var(--accent);letter-spacing:.06em}

.btn{display:block;width:100%;border:0;border-radius:18px;padding:14px 16px;font-weight:700;font-size:16px;text-align:center;background:var(--card2);border:1px solid var(--line);transition:transform .06s}
.btn:active{transform:translateY(2px)}
.btn.primary{background:var(--accent);color:var(--accent-ink);border:0;font-weight:900;font-size:20px;padding:20px 16px;box-shadow:0 6px 0 var(--accent-dk)}
.btn.primary:active{transform:translateY(5px);box-shadow:0 1px 0 var(--accent-dk)}
.btn.ghost{background:transparent}
.btn.sm{display:inline-block;width:auto;padding:8px 14px;font-size:14px;border-radius:14px}
.btn[disabled]{opacity:.45;cursor:not-allowed}
.stack>*+*{margin-top:10px}

/* chips + segmented */
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.chip{background:var(--card);border:1px solid var(--line);border-radius:99px;padding:6px 12px;font-size:14px;font-weight:500}
.chip[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700}
.chips.sub{align-items:center;margin-top:-4px}
.chiplabel{font-size:12px;color:var(--muted);font-weight:700;margin-right:2px}
.chip.s{font-size:13px;padding:5px 10px}
.chip .n{opacity:.65;font-weight:400;margin-left:4px;font-size:12px}
.seg{display:grid;grid-template-columns:1fr 1fr;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:4px;gap:4px}
.seg button{border:0;background:transparent;border-radius:12px;padding:10px;font-weight:700;font-size:15px}
.seg button[aria-pressed="true"]{background:var(--card2);box-shadow:inset 0 0 0 2px var(--accent)}

/* week */
.week{display:flex;justify-content:space-between;margin:2px 0 14px}
.day{display:grid;justify-items:center;gap:4px;font-size:12px;color:var(--muted)}
.dot{width:32px;height:32px;border-radius:50%;border:2px dashed var(--line);display:grid;place-items:center;font-size:15px}
.dot.on{background:var(--accent);border:2px solid var(--accent);color:var(--accent-ink);font-weight:900}
.day.today span{color:var(--text);font-weight:700}

/* missions */
.mission{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--line);font-size:15px}
.mission:first-of-type{border-top:0}
.mission .ck{width:22px;height:22px;border-radius:50%;border:2px solid var(--line);display:inline-grid;place-items:center;margin-right:8px;font-size:13px}
.mission.done .ck{background:var(--ok);border-color:var(--ok);color:#06240f}
.mission.done .nm{color:var(--muted);text-decoration:line-through}
.xpt{font-weight:700;color:var(--accent);font-size:13px}

/* read */
.pips{display:flex;gap:6px;margin:4px 0 14px}
.pip{flex:1;height:12px;border-radius:99px;background:var(--card2);position:relative;overflow:hidden}
.pip::after{content:'';position:absolute;inset:0;background:var(--accent);transform:scaleX(0);transform-origin:left}
.pip.done::after{transform:scaleX(1)}
.pip.just::after{animation:pf .35s ease-out}
.pip.cur{box-shadow:inset 0 0 0 2px var(--accent)}
@keyframes pf{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.sent{font-size:22px;line-height:1.6;font-weight:500;word-break:keep-all;overflow-wrap:anywhere;min-height:180px;display:flex;align-items:center}
.sent.en{font-size:19px;word-break:normal}
.cheer{text-align:center;color:var(--muted);font-size:14px;min-height:22px;margin:4px 0 12px}
.timer{height:8px;border-radius:99px;background:var(--card2);overflow:hidden;margin-bottom:12px}
.timer i{display:block;height:100%;width:100%;background:var(--pink);transition:width .1s linear}
.timer.off i{background:var(--line)}
.tl{font-size:13px;font-weight:700;color:var(--pink)}

/* quiz */
.opt{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;background:var(--card2);border:2px solid var(--line);border-radius:16px;padding:14px;margin-top:10px;font-size:16px;font-weight:500}
.opt .n{flex:0 0 24px;height:24px;border-radius:8px;background:var(--bg);display:grid;place-items:center;font-size:13px;font-weight:700;color:var(--muted)}
.opt.correct{border-color:var(--ok);background:#143824}
.opt.wrong{border-color:var(--bad);background:#411c25}
.opt[disabled]{cursor:default}
.ctx{font-size:17px;line-height:1.7;margin:6px 0 4px;padding:12px;border-radius:14px;background:var(--bg);word-break:normal}
.why{margin-top:12px;padding:12px;border-radius:14px;background:var(--bg);font-size:14px}
textarea{width:100%;min-height:110px;border-radius:14px;border:2px solid var(--line);background:var(--bg);color:var(--text);padding:12px;font:inherit;font-size:16px;resize:vertical}
textarea:focus-visible{outline:none;border-color:var(--accent)}

/* result / level */
.bar{height:12px;border-radius:99px;background:var(--bg);overflow:hidden;margin:8px 0}
.bar i{display:block;height:100%;background:var(--accent);border-radius:99px;transition:width .6s}
.big{font-size:44px;font-weight:900;color:var(--accent);line-height:1.1}
.center{text-align:center}

/* fx */
#fx{position:fixed;inset:0;pointer-events:none;z-index:50}
.floatxp{position:fixed;left:50%;top:38%;transform:translateX(-50%);font-weight:900;font-size:28px;color:var(--accent);text-shadow:0 2px 0 #000;pointer-events:none;z-index:60;animation:fl .9s ease-out forwards}
@keyframes fl{0%{opacity:0;transform:translate(-50%,10px) scale(.7)}20%{opacity:1;transform:translate(-50%,0) scale(1.15)}100%{opacity:0;transform:translate(-50%,-70px) scale(1)}}
.toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:var(--text);color:#101226;padding:10px 16px;border-radius:99px;font-weight:700;font-size:14px;z-index:70;max-width:92vw;text-align:center}
details{margin-top:6px}
summary{cursor:pointer;color:var(--muted);font-size:13px}
a{color:var(--blue)}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<div class="app">
  <div class="top" id="top"></div>
  <main id="view"></main>
</div>
<canvas id="fx" aria-hidden="true"></canvas>
<div class="sr" id="live" aria-live="polite"></div>

<script>
(() => {
'use strict';

/* =====================================================================
   PURE helpers (also unit-tested outside the browser)
   ===================================================================== */
/*PURE_START*/
function hash(str){ let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function shuffle(arr,rng){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

const ABBR=['e.g.','i.e.','et al.','vs.','Fig.','Figs.','Eq.','No.','Dr.','cf.','approx.','U.S.','Inc.','etc.'];
function splitSentences(text){
  let t=String(text||'').replace(/\s+/g,' ').trim();
  if(!t) return [];
  ABBR.forEach(a=>{ t=t.split(a).join(a.replace(/\./g,'\u0001')); });
  const out=[]; let start=0; const re=/[.!?]["”')\]]*\s+/g; let m;
  while((m=re.exec(t))){
    const end=m.index+m[0].length, next=t[end];
    if(next && /[A-Z0-9가-힣“"'(\[]/.test(next)){ out.push(t.slice(start,end).trim()); start=end; }
  }
  out.push(t.slice(start).trim());
  const merged=[];
  for(const s of out){
    if(!s) continue;
    const min=/[가-힣]/.test(s)?10:25; // 한글은 글자 수가 적어서 기준을 낮춤
    if(merged.length && s.length<min) merged[merged.length-1]+=' '+s; else merged.push(s);
  }
  return merged.map(s=>s.replace(/\u0001/g,'.'));
}

const STOP=new Set(('about above after again against all also although among and any are because been before being below between both but can could did does doing down during each either even every for from further had has have having here how however into its itself just more most much must neither nor not only other our out over own same should since some such than that the their them then there these they this those through thus too under until upon very was were what when where which while who whom why will with within without would your across often their towards toward using used based achieve achieves provide provides present presents propose proposes paper study results show shows').split(' '));
const escRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function matchCase(w,ref){
  if(/^[A-Z]{2,}$/.test(ref)) return w.toUpperCase();
  if(/^[A-Z]/.test(ref)) return w.charAt(0).toUpperCase()+w.slice(1);
  return w.charAt(0).toLowerCase()+w.slice(1);
}
function makeCloze(sents,seed=1,maxQ=3){
  const rng=mulberry32(seed);
  const pool=[...new Set(sents.join(' ').match(/[A-Za-z][A-Za-z-]{4,}/g)||[])].filter(w=>!STOP.has(w.toLowerCase()));
  const order=sents.map((s,i)=>({s,i})).filter(o=>o.s.length>=40).sort((a,b)=>b.s.length-a.s.length);
  const picked=[];
  for(const o of order){
    if(picked.length>=maxQ) break;
    const cands=(o.s.match(/[A-Za-z][A-Za-z-]{5,}/g)||[]).filter(w=>!STOP.has(w.toLowerCase())&&w.length<=16);
    if(!cands.length) continue;
    let best=null,bs=-1;
    for(const w of cands){
      const pos=o.s.indexOf(w);
      const sc=w.length+(pos>0&&/^[A-Z]/.test(w)?4:0)+(/[A-Z]{2,}/.test(w)?3:0);
      if(sc>bs){bs=sc;best=w;}
    }
    const lb=best.toLowerCase(), low=o.s.toLowerCase();
    const dis=pool.filter(w=>{const l=w.toLowerCase();return l!==lb&&Math.abs(w.length-best.length)<=3&&l.slice(0,4)!==lb.slice(0,4)&&!low.includes(l);});
    if(dis.length<2) continue;
    shuffle(dis,rng);
    const opts=[best,matchCase(dis[0],best),matchCase(dis[1],best)];
    const idx=shuffle([0,1,2],rng);
    const blanked=o.s.replace(new RegExp('\\b'+escRe(best)+'\\b','gi'),'_____');
    picked.push({i:o.i,q:'빈칸에 들어갈 말은?',ctx:blanked,options:idx.map(k=>opts[k]),answer:idx.indexOf(0),why:'정답: '+best,orig:o.s});
  }
  return picked.sort((a,b)=>a.i-b.i);
}
const LV_XP=150;
const TITLES=['새싹 독자','초록 탐험가','인용 수집가','논문 사냥꾼','리뷰어 2','연구실 지박령'];
function levelInfo(xp){ const lv=Math.floor(xp/LV_XP)+1; return {lv,cur:xp%LV_XP,need:LV_XP,title:TITLES[Math.min(lv-1,TITLES.length-1)]}; }
/*PURE_END*/

/* =====================================================================
   SAMPLE DATA  – 5-sentence Korean summaries written from each abstract.
   (원문 초록이 아님. 실제 서비스에서는 소스 API에서 받은 초록으로 대체)
   quiz: opts[0] 이 정답 (렌더링 때 섞음)
   ===================================================================== */
const FIELDS={sci:{label:'이공',emoji:'🧪'},soc:{label:'사회·심리',emoji:'🧠'},hum:{label:'인문',emoji:'📜'},paste:{label:'내 논문',emoji:'📋'}};
const LIC={
  ccby:{t:'CC BY 4.0',lv:'open',tip:'출처만 밝히면 번역·요약·가공이 자유로운 라이선스'},
  arx:{t:'arXiv 비독점 라이선스',lv:'limited',tip:'재사용이 제한됨 — 요약과 원문 링크 위주로'},
  unk:{t:'라이선스 원문 확인',lv:'unknown',tip:'이 샘플에서는 라이선스를 확인하지 못함 — 요약과 원문 링크만 사용'}
};
const PAPERS=[
 {id:'arx-2512.10104',field:'sci',tags:['AI 보안·피싱'],source:'arXiv',title:'Phishing Email Detection Using Large Language Models',authors:'Hasan 외',date:'2025-12',lic:'arx',url:'https://arxiv.org/abs/2512.10104',
  sents:['피싱 이메일은 가장 흔하고 피해가 큰 사이버 침입 경로 중 하나예요.','LLM을 쓰는 시스템이 늘면서, 그 구조를 노리는 새로운 피싱 위협도 함께 커지고 있어요.','연구진은 LLM으로 피싱 메일을 탐지하는 프레임워크 ‘LLM-PEA’를 제안했어요.','GPT-4o, Claude Sonnet 4, Grok-3 세 모델을 여러 프롬프트 설계로 시험해 실용성과 한계를 따져봤어요.','결론: 이메일 보안에 쓰려면 LLM을 훨씬 단단히 보강해야 하고, 특히 여러 공격 기법을 섞은 협공에 약해요.'],
  quiz:[{q:'연구진이 제안한 프레임워크 이름은?',opts:['LLM-PEA','MailShield','SpamNet'],why:'세 번째 문장: 프레임워크 이름은 LLM-PEA.'},
        {q:'논문이 짚은 가장 큰 약점은?',opts:['여러 공격 기법을 섞은 협공에 취약','한국어 메일은 탐지할 수 없음','탐지에 며칠이 걸림'],why:'다섯 번째 문장: 복합(multi-vector) 공격에 대비한 보강이 필요하다고 해요.'}]},
 {id:'arx-2605.00065',field:'sci',tags:['디지털 포렌식·로그','IoT'],source:'arXiv',title:'Lightweight Tamper-Evident Log Integrity Verification for IoT Edge Environments',authors:'Yagiz 외',date:'2026-04',lic:'unk',url:'https://arxiv.org/abs/2605.00065',
  sents:['IoT 기기가 남기는 감사 로그는 사고 후 포렌식과 규정 준수의 기본 재료예요.','그런데 위조 방지에 블록체인을 쓰면 합의 비용과 네트워크 의존 때문에 작은 기기엔 너무 무거워요.','이 논문은 블록체인 없이 머클 트리와 자원에 맞춘 청킹으로 위조 흔적을 잡는 가벼운 파이프라인을 제안해요.','합성 데이터 실험에서 10만 건 기준 초당 13만 건 넘게 처리했고, 검증은 약 22ms, 증명 크기는 평균 1,006바이트였어요.','로그의 1%~50%가 손상된 경우에도 위조 탐지의 정밀도·재현율·F1이 모두 1.0이었다고 보고해요.'],
  quiz:[{q:'블록체인 대신 쓴 핵심 자료구조는?',opts:['머클 트리','해시 테이블','연결 리스트'],why:'세 번째 문장: 머클 트리 커밋(Merkle-tree commitments)이에요.'},
        {q:'블록체인 방식이 IoT 엣지에서 부담스러운 이유로 든 것은?',opts:['합의 오버헤드와 네트워크 의존, 배포 복잡도','암호 강도가 약해서','로그가 너무 적어서'],why:'두 번째 문장 참고.'}]},
 {id:'arx-2509.03821',field:'sci',tags:['디지털 포렌식·로그','시스템·커널'],source:'arXiv',title:'Rethinking Tamper-Evident Logging: A High-Performance, Co-Designed Auditing System',authors:null,date:'2025-09',lic:'unk',url:'https://arxiv.org/abs/2509.03821',
  sents:['기존의 위조 방지 로깅 시스템은 부하가 큰 환경에서 오버헤드가 크고 데이터 손실이 심해요.','게다가 위조 탐지가 거칠어서, 어디가 바뀌었는지 세밀하게 알려주지 못해요.','설치하려면 커널 코드를 다시 컴파일해야 하는 것도 큰 불편이에요.','이 논문은 고성능 감사 로깅 시스템 ‘Nitro’를 만들었고, eBPF 기술로 커널 재컴파일을 피해요.','또 로깅 시스템을 위한 새로운 정의 틀과, 그 목표를 만족하는 실용적인 암호학적 구성으로 보안을 정당화해요.'],
  quiz:[{q:'Nitro가 커널 재컴파일을 피하려고 쓴 기술은?',opts:['eBPF','가상 머신','하이퍼바이저'],why:'네 번째 문장: eBPF를 써서 재컴파일이 필요 없어요.'},
        {q:'기존 시스템의 문제로 언급되지 않은 것은?',opts:['로그를 영어로만 저장함','부하가 높을 때 데이터 손실','거친(coarse) 위조 탐지'],why:'앞의 두 문장에 나온 것은 ‘데이터 손실’과 ‘거친 탐지’예요.'}]},
 {id:'arx-2501.00175',field:'sci',tags:['디지털 포렌식·로그'],source:'arXiv',title:'Strategies and Challenges of Timestamp Tampering for Improved Digital Forensic Event Reconstruction',authors:'Vanini 외',date:'2025-01',lic:'unk',url:'https://arxiv.org/abs/2501.00175',
  sents:['디지털 포렌식에서 타임스탬프는 사건을 시간순으로 복원하는 핵심 단서예요.','하지만 타임스탬프는 필수 정보가 아니라서, 실행 중인 시스템에서도 사용자가 여러 방법으로 조작할 수 있어요.','조작된 시간이 섞이면 타임라인 분석 결과의 신뢰도가 크게 흔들려요.','연구진은 ‘라이브’ 시스템에서 사용자가 타임스탬프를 조작하는 문제를 파고들었어요.','디지털 증거 조작이 어렵다는 기존 연구에서 더 나아가, ‘왜 어려운가’를 질적 사용자 연구로 살펴봤어요.'],
  quiz:[{q:'타임스탬프 조작이 문제인 이유는?',opts:['타임라인 분석 결과의 신뢰성을 떨어뜨림','디스크 용량이 늘어남','네트워크가 느려짐'],why:'세 번째 문장 참고.'},
        {q:'연구진이 사용한 방법은?',opts:['질적 사용자 연구','대규모 설문','악성코드 샘플 분석'],why:'다섯 번째 문장: 질적(qualitative) 사용자 연구.'}]},
 {id:'soc-dcr9b',field:'soc',tags:['불평등·사회학'],source:'SocArXiv',title:'The Paradox of Inequality: Income Inequality and Belief in Meritocracy go Hand in Hand',authors:'Mijs',date:'2019',lic:'unk',url:'https://osf.io/preprints/socarxiv/dcr9b_v1',
  sents:['불평등은 커지고 있는데, 사람들의 우려가 커진다는 증거는 별로 없어요.','오히려 불평등한 사회의 시민이 평등한 사회의 시민보다 덜 걱정하는 경향이 있어요.','저자는 이 역설을 ‘성공은 능력에 따라 결정된다’는 믿음이 커졌기 때문이라고 설명해요.','25년치 국제사회조사(ISSP) 데이터를 분석했어요.','사회가 더 불평등할수록, 시민들은 소득 격차가 능력에 따른 당연한 결과라고 믿을 가능성이 더 높았어요.'],
  quiz:[{q:'저자가 말하는 역설의 핵심은?',opts:['불평등이 클수록 능력주의 믿음도 강함','불평등이 커지면 시민이 즉각 항의함','불평등이 클수록 이민이 늘어남'],why:'다섯 번째 문장 참고.'},
        {q:'분석에 쓴 데이터는?',opts:['25년치 ISSP 데이터','한국 인구총조사','소셜미디어 게시글'],why:'네 번째 문장.'}]},
 {id:'soc-37jt5',field:'soc',tags:['불평등·사회학'],source:'SocArXiv',title:'The paradox of local inequality: Meritocratic beliefs in unequal localities',authors:'Morris 외',date:null,lic:'unk',url:'https://osf.io/preprints/socarxiv/37jt5_v1',
  sents:['불평등은 커지고 소득 증가는 상위층에 몰리는데도, 사람들은 능력주의를 강하게 믿어요.','이 퍼즐을 두고 서로 엇갈리는 이론과 증거가 있어요.','연구진은 영국 가구 종단조사(UKHLS) 데이터를 썼어요.','미국 밖에서 지역 소득 불평등과 능력주의 믿음의 관계를 평가한 첫 연구예요.','국가 수준에서 확인된 ‘불평등이 클수록 능력주의 믿음이 강하다’는 관계가 지역 수준에서는 단순하게 이어지지 않았어요.'],
  quiz:[{q:'이 연구가 쓴 데이터는?',opts:['영국 가구 종단조사(UKHLS)','미국 종합사회조사','한국복지패널'],why:'세 번째 문장.'},
        {q:'무엇을 확인했나?',opts:['국가 수준의 관계가 지역 수준으로 단순히 이어지지 않음','지역 불평등이 클수록 반드시 능력주의 믿음이 강함','불평등과 믿음은 아무 관계 없음'],why:'다섯 번째 문장 참고.'}]},
 {id:'soc-bq43y',field:'soc',tags:['불평등·사회학','AI와 사회'],source:'SocArXiv',title:'Machine Learning and the Reproduction of Inequality',authors:'Alegria & Yeh',date:'2023',lic:'unk',url:'https://osf.io/preprints/socarxiv/bq43y/',
  sents:['이 글은 ChatGPT 같은 대중적인 머신러닝 응용을 예로 들어요.','사회학 독자도 알 수 있게 머신러닝의 기본 논리를 설명해요.','그리고 이런 도구가 인종·성별 불평등을 재생산한다고 지적해요.','경로는 네 가지예요: 데이터의 편향, 엉뚱하거나 어긋난 데이터 사용, 사회적 과정을 본뜨도록 최적화된 알고리즘, 취약한 공동체를 겨냥한 사용.','겉보기엔 객관적인 데이터 기반 방식인데도 불평등이 이어진다는 점이 핵심이에요.'],
  quiz:[{q:'머신러닝이 불평등을 재생산하는 경로가 아닌 것은?',opts:['컴퓨터 전력 부족','데이터의 편향','취약한 공동체를 겨냥한 사용'],why:'네 번째 문장의 네 가지 경로에 전력 문제는 없어요.'},
        {q:'논문이 말한 이런 도구의 겉모습은?',opts:['겉보기엔 객관적인 데이터 기반 방식','명백히 편파적인 방식','사람이 전부 수작업으로 판단'],why:'다섯 번째 문장.'}]},
 {id:'soc-836jh',field:'soc',tags:['수면·기억'],source:'PsyArXiv',title:'No evidence that overnight sleep improves associative inference',authors:null,date:null,lic:'unk',url:'https://osf.io/preprints/psyarxiv/836jh_v1',
  sents:['수면이 학습한 연관 기억을 지켜준다는 건 알려져 있어요.','하지만 거기서 새로운 추론까지 끌어내는 데 도움이 되는지는 증거가 엇갈려요.','이 연구는 같은 과제에서 12시간 밤샘 수면 간격과 같은 길이의 낮 간격을 비교했어요.','온라인 실험에서 참가자는 겹치는 물체 쌍(A–B, B–C)을 배우고, 지연 테스트에서만 A–C 관계를 추론하도록 요청받았어요.','결과는, 두 집단 모두 쌍 기억이 줄었고 추론 정확도는 우연 수준에 가까웠어요.'],
  quiz:[{q:'제목이 말하는 결론은?',opts:['밤 수면이 연관 추론을 개선했다는 증거가 없음','수면이 추론을 크게 개선함','낮잠이 가장 효과적임'],why:'제목이 곧 결론이에요: No evidence…'},
        {q:'참가자가 추론해야 했던 관계는?',opts:['A–C','A–B','B–B'],why:'네 번째 문장.'}]},
 {id:'soc-3fhbk',field:'soc',tags:['수면·기억','교육·학습'],source:'PsyArXiv',title:'Sleep supports consolidation of newly learned mathematical concepts',authors:null,date:null,lic:'unk',url:'https://osf.io/preprints/psyarxiv/3fhbk_v2',
  sents:['수학적 인지에서는 개념을 이해하는 게 아주 중요하다고 봐요.','수면이 새로 배운 정보의 정착(공고화)을 돕는 건 잘 알려져 있지만, 수학 개념에서는 아직 탐구가 부족했어요.','세 실험에 152명이 참가해, p값·t검정·z점수 중 하나의 강의를 본 뒤 수면 조건과 각성 조건으로 나뉘었어요.','수면 조건은 밤 9시에 강의를 보고 바로 회상한 뒤, 12시간 후 다시 회상했어요.','세 실험 모두에서 수면 조건은 지식을 유지했고, 각성 조건은 두 번째 회상에서 눈에 띄게 떨어졌어요.'],
  quiz:[{q:'참가자 수는?',opts:['152명','52명','1,520명'],why:'세 번째 문장.'},
        {q:'결과는?',opts:['수면 집단은 유지, 각성 집단은 하락','둘 다 하락','각성 집단이 더 좋음'],why:'다섯 번째 문장.'}]},
 {id:'hum-qsxj3',field:'hum',tags:['AI와 사회','철학·윤리'],source:'MediArXiv',title:'AI Ethics as Subordinated Innovation Network',authors:null,date:null,lic:'unk',url:'https://osf.io/preprints/mediarxiv/qsxj3',
  sents:['AI 윤리는 AI 연구를 이끄는 빅테크가 데이터 집약 기술의 사회 문제에 대한 해법으로 내놓은 거예요.','목표는 자본주의적 AI 생산과 윤리를 화해시키는 거고요.','그런데 AI 윤리는 사업은 그대로 두고 겉만 꾸미는 ‘윤리 세탁(ethics washing)’이라는 비판을 받아요.','저자는 이 윤리 세탁 논지를 비판적으로 따져보고 그 너머로 가려고 해요.','AI 윤리의 기준이 빅테크에 의해 미리 간접적으로 정해지므로, 사업과 윤리의 모순을 풀겠다는 목표는 사실상 풀 수 없다고 주장해요.'],
  quiz:[{q:'‘윤리 세탁’ 비판의 요지는?',opts:['사업은 그대로 두고 겉만 꾸미는 수단이라는 것','윤리 교육이 너무 많다는 것','규제가 너무 약하다는 것'],why:'세 번째 문장.'},
        {q:'저자의 주장은?',opts:['AI 윤리는 윤리 세탁이지만 그것만은 아님','윤리 세탁 비판은 근거가 없음','AI 윤리를 폐지해야 함'],why:'네·다섯 번째 문장: 윤리 세탁 논지를 넘어서려 한다고 해요.'}]},
 {id:'hum-hgajv',field:'hum',tags:['철학·윤리','AI와 사회'],source:'OSF Preprints',title:'Philosophy of Brain-Computer Interface',authors:null,date:null,lic:'unk',url:'https://osf.io/preprints/osf/hgajv',
  sents:['뇌-컴퓨터 인터페이스(BCI)는 단순한 기술 진보가 아니라 존재론적 단절이라고 이 논문은 말해요.','인간 인지와 학습의 근본 구조를 흔든다는 거예요.','기존 정의는 임상 기능과 응용에 초점을 두고, 윤리 논의도 결과 중심의 규범윤리 틀에 갇혀 있어요.','정작 BCI의 매체-형식적 특성, 즉 자연스러운 감각운동 경로를 건너뛰고 뇌와 세계를 직접 잇는 능력은 철학적으로 검토되지 않았어요.','특히 인간 인지의 근본 조건을 다시 짜게 될 가능성이 중요하다고 짚어요.'],
  quiz:[{q:'저자가 BCI를 규정한 표현은?',opts:['존재론적 단절','단순한 의료 기기','윤리적으로 중립인 도구'],why:'첫 문장.'},
        {q:'기존 논의의 한계로 든 것은?',opts:['임상 기능과 결과 중심 윤리에 갇힘','기술적 실현 가능성을 무시함','역사적 사례가 부족함'],why:'세 번째 문장.'}]},
 {id:'hum-ep3ub',field:'hum',tags:['철학·윤리','역사·지성사'],source:'PsyArXiv',title:'The network science of philosophy',authors:null,date:null,lic:'unk',url:'https://osf.io/ep3ub_v1/',
  sents:['철학은 근대 과학보다 수천 년 앞선, 가장 오래된 제도적 지식 생산 방식 중 하나예요.','과학 연구에서는 발견의 패턴이 개인의 통찰만이 아니라 사회 구조에도 좌우된다는 게 밝혀져 있어요.','과학은 공저와 인용으로 협력과 영향 구조를 볼 수 있지만, 철학의 영향과 상호작용은 글 속에 암묵적으로만 있어요.','그래서 철학의 지적 활력이 사회 구조와 어떤 관계인지는 아직 불분명했어요.','연구진은 역사학·사회학 연구를 토대로, 고대 인도부터 이어지는 수천 명 철학자 공동체의 사회 구조를 정량화했어요.'],
  quiz:[{q:'과학에서 협력·영향 구조를 추정하는 데 쓰는 것은?',opts:['공저와 인용','특허 수','연구비 규모'],why:'세 번째 문장.'},
        {q:'이 연구가 다룬 대상은?',opts:['철학자 공동체의 사회 구조','현대 물리학자의 논문 수','철학 교과서 판매량'],why:'다섯 번째 문장.'}]},
 {id:'hum-des5',field:'hum',tags:['디지털 인문학','역사·지성사'],source:'Digital Enlightenment Studies',title:"Digital rhetoric, literae humaniores and Leibniz's dream",authors:'W. McCarty',date:'2023',lic:'ccby',url:'https://digitalenlightenmentstudies.org/articles/10.61147/des.5',
  sents:['이 글은 학술지 『Digital Enlightenment Studies』의 창간을 알리는 에세이예요.','학술 편집에 디지털 방법을 쓰면 어떤 결과가 따르는지, 그걸 어떻게 이해해야 하는지를 물어요.','그 질문을 디지털 인문학의 역사와 철학이라는 넓은 맥락에 놓아요.','초기의 ‘함께 생각하는 도구’들, 모델링 기계로서의 컴퓨터, 초기 디지털 컴퓨팅의 설계를 차례로 짚어요.','그리고 디지털 인문학이 인문학 ‘안에’ 머물지 말고 인문학의 ‘일부’가 되라고 촉구해요.'],
  quiz:[{q:'이 글의 성격은?',opts:['학술지 창간 에세이','실험 보고서','서평'],why:'첫 문장.'},
        {q:'저자의 촉구는?',opts:['디지털 인문학이 인문학의 일부가 되기','인문학을 컴퓨터과학에 흡수하기','디지털 방법 폐기하기'],why:'다섯 번째 문장.'}]}
];

/* =====================================================================
   STATE (localStorage는 이 브라우저 전용 · 실패해도 동작)
   ===================================================================== */
const KEY='paperbite.v1';
let memCopy=null;
function loadState(){
  let s=null;
  try{ const raw=localStorage.getItem(KEY); if(raw) s=JSON.parse(raw); }catch(e){}
  s=s||memCopy||{};
  return Object.assign({xp:0,days:[],done:{},notes:[],sound:true,field:'all',tags:[],mode:'read'},s);
}
const S=loadState();
function saveState(){
  const keys=Object.keys(S.done).sort(); while(keys.length>14) delete S.done[keys.shift()];
  S.notes=S.notes.slice(0,30);
  memCopy=JSON.parse(JSON.stringify(S));
  try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){}
}

const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayKey=()=>ymd(new Date());
function weekDays(){
  const d=new Date(), dow=(d.getDay()+6)%7;
  return Array.from({length:7},(_,i)=>{ const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()-dow+i); return {key:ymd(x),label:'월화수목금토일'[i],today:ymd(x)===todayKey()}; });
}
const isDone=(pid,st)=>!!(S.done[todayKey()]&&S.done[todayKey()][pid]&&S.done[todayKey()][pid][st]);
function markDone(pid,st){ const t=todayKey(); S.done[t]=S.done[t]||{}; S.done[t][pid]=S.done[t][pid]||{}; S.done[t][pid][st]=1; saveState(); }
function markDay(){ const t=todayKey(); if(!S.days.includes(t)){ S.days.push(t); S.days=S.days.slice(-400); saveState(); } }

/* =====================================================================
   DOM helpers + fx
   ===================================================================== */
const $=s=>document.querySelector(s);
function h(tag,props,...kids){
  const el=document.createElement(tag);
  if(props) for(const [k,v] of Object.entries(props)){
    if(k==='class') el.className=v;
    else if(k==='on') for(const [ev,fn] of Object.entries(v)) el.addEventListener(ev,fn);
    else if(v===true) el.setAttribute(k,'');
    else if(v!==false&&v!=null) el.setAttribute(k,v);
  }
  for(const kid of kids.flat(Infinity)){ if(kid==null||kid===false) continue; el.append(kid.nodeType?kid:document.createTextNode(String(kid))); }
  return el;
}
let ac=null;
function tone(f,d=.12,type='sine',vol=.08,when=0){
  if(!S.sound) return;
  try{
    ac=ac||new (window.AudioContext||window.webkitAudioContext)();
    const t=ac.currentTime+when, o=ac.createOscillator(), g=ac.createGain();
    o.type=type; o.frequency.value=f; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+d+.02);
  }catch(e){}
}
const sfx={tick(){tone(660,.09)},ok(){tone(660,.1);tone(880,.14,'sine',.08,.09)},bad(){tone(210,.2,'triangle',.07)},win(){[523,659,784,1046].forEach((f,i)=>tone(f,.16,'sine',.08,i*.09))}};
function confetti(n=90){
  try{ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return; }catch(e){}
  const c=$('#fx'), ctx=c.getContext('2d'); c.width=innerWidth; c.height=innerHeight;
  const cols=['#c6f432','#ff7aa8','#6dd0ff','#ffcc4d','#ffffff'];
  const ps=Array.from({length:n},()=>({x:c.width/2,y:c.height*.45,vx:(Math.random()-.5)*12,vy:-Math.random()*13-3,s:4+Math.random()*6,c:cols[Math.floor(Math.random()*cols.length)],r:Math.random()*6}));
  let f=0;
  (function step(){
    ctx.clearRect(0,0,c.width,c.height);
    ps.forEach(p=>{p.vy+=.45;p.x+=p.vx;p.y+=p.vy;p.r+=.2;ctx.fillStyle=p.c;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6);ctx.restore();});
    if(++f<100) requestAnimationFrame(step); else ctx.clearRect(0,0,c.width,c.height);
  })();
}
function floatXP(n){ if(!n) return; const e=h('div',{class:'floatxp'},'+'+n+' XP'); document.body.append(e); setTimeout(()=>e.remove(),950); }
let toastT=null;
function toast(msg){
  $('#live').textContent=msg;
  document.querySelectorAll('.toast').forEach(e=>e.remove());
  const e=h('div',{class:'toast',role:'status'},msg); document.body.append(e);
  clearTimeout(toastT); toastT=setTimeout(()=>e.remove(),2600);
}

/* =====================================================================
   GAME LOGIC
   ===================================================================== */
let home={offset:0};
let ses=null;          // current session
let timers=[];
function clearTimers(){ timers.forEach(clearInterval); timers=[]; }

function fieldPool(){ return S.field==='all'?PAPERS:PAPERS.filter(p=>p.field===S.field); }
function tagList(){
  const m=new Map();
  fieldPool().forEach(p=>(p.tags||[]).forEach(t=>m.set(t,(m.get(t)||0)+1)));
  return [...m.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko'));
}
function activeTags(){ const have=new Set(tagList().map(x=>x[0])); return S.tags.filter(t=>have.has(t)); }
function pool(){ const f=fieldPool(), tg=activeTags(); return tg.length?f.filter(p=>(p.tags||[]).some(t=>tg.includes(t))):f; }
function pickPaper(){
  const list=pool(), d=new Date();
  const dayNum=Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);
  return list[(dayNum+home.offset)%list.length];
}
function award(n){
  if(!n) return;
  const before=levelInfo(S.xp).lv;
  S.xp+=n; if(ses) ses.gain+=n; saveState(); floatXP(n); renderTop();
  const after=levelInfo(S.xp);
  if(after.lv>before){ setTimeout(()=>{ sfx.win(); confetti(60); toast(`레벨 업! Lv.${after.lv} ${after.title}`); },350); }
}
function newSession(paper,mode){
  clearTimers();
  ses={paper,mode,i:0,gain:0,stages:{},timeLeft:60,qi:0,correct:0,combo:0,quiz:null,answered:false,repeat:{read:isDone(paper.id,'read'),quiz:isDone(paper.id,'quiz'),note:isDone(paper.id,'note')}};
  if(!paper.quiz) ses.quiz=paper.cloze||[];
  else ses.quiz=paper.quiz.map(q=>{ const rng=mulberry32(hash(paper.id+q.q+todayKey())); const idx=shuffle([0,1,2].slice(0,q.opts.length),rng); return {q:q.q,options:idx.map(k=>q.opts[k]),answer:idx.indexOf(0),why:q.why}; });
}

/* =====================================================================
   VIEWS
   ===================================================================== */
const view=$('#view');
function mount(...nodes){ clearTimers(); view.replaceChildren(...nodes.flat().filter(Boolean)); window.scrollTo(0,0); }

function renderTop(){
  const L=levelInfo(S.xp);
  $('#top').replaceChildren(
    h('button',{class:'brand','aria-label':'홈으로',on:{click:goHome}},'🍙 ',h('span',null,'논문 ',h('b',null,'한 입'))),
    h('div',{class:'stats'},
      h('span',{class:'pill xp',title:'경험치'},'⭐ '+S.xp),
      h('span',{class:'pill',title:L.title},'Lv.'+L.lv),
      h('button',{class:'iconbtn','aria-label':S.sound?'소리 끄기':'소리 켜기','aria-pressed':String(S.sound),on:{click:()=>{S.sound=!S.sound;saveState();renderTop();if(S.sound)sfx.tick();}}},S.sound?'🔊':'🔇')
    )
  );
}

function licBadge(p){ const L=LIC[p.lic]; const icon=L.lv==='open'?'✅':L.lv==='limited'?'🔒':'❔'; return h('span',{class:'badge '+L.lv,title:L.tip},icon+' '+L.t); }
function paperCard(p,withLink=true){
  const F=FIELDS[p.field];
  return h('div',{class:'card'},
    h('div',{class:'row'},h('span',{class:'badge'},F.emoji+' '+F.label),h('span',{class:'badge'},p.source),licBadge(p)),
    h('div',{class:'h2'},p.title),
    h('div',{class:'muted small'},[p.authors,p.date].filter(Boolean).join(' · ')||'저자·날짜는 원문 링크에서 확인'),
    withLink&&p.url&&p.url.startsWith('https://')?h('div',{style:'margin-top:8px'},h('a',{href:p.url,target:'_blank',rel:'noopener noreferrer'},'원문 보기 ↗')):null
  );
}

function goHome(){ ses=null; viewHome(); }
function viewHome(){
  renderTop();
  const p=pickPaper(), t=todayKey();
  const week=weekDays();
  const total=S.days.length;
  const mission=(k,label,xp)=>{ const d=isDone(p.id,k); return h('div',{class:'mission'+(d?' done':'')},h('span',null,h('span',{class:'ck'},d?'✓':''),h('span',{class:'nm'},label)),h('span',{class:'xpt'},'+'+xp)); };
  const chip=(k,l)=>h('button',{class:'chip','aria-pressed':String(S.field===k),on:{click:()=>{S.field=k;S.tags=activeTags();home.offset=0;saveState();viewHome();}}},l);
  const tl=tagList(), act=activeTags();
  const tagChip=(t,n)=>h('button',{class:'chip s','aria-pressed':String(act.includes(t)),on:{click:()=>{S.tags=act.includes(t)?act.filter(x=>x!==t):[...act,t];home.offset=0;saveState();viewHome();}}},t,h('span',{class:'n'},n));
  const notes=S.notes.slice(0,5);
  mount(
    h('div',{class:'row between',style:'margin-bottom:6px'},
      h('div',null,h('div',{class:'label'},'TODAY'),h('div',{class:'muted small'},`총 ${total}일 읽었어요 · 쉬어도 기록은 안 사라져요`)),
    ),
    h('div',{class:'week','aria-label':'이번 주 읽은 날'},week.map(d=>h('div',{class:'day'+(d.today?' today':'')},h('div',{class:'dot'+(S.days.includes(d.key)?' on':'')},S.days.includes(d.key)?'✓':''),h('span',null,d.label)))),
    h('div',{class:'chips'},chip('all','전체'),chip('sci','🧪 이공'),chip('soc','🧠 사회·심리'),chip('hum','📜 인문')),
    h('div',{class:'chips sub',role:'group','aria-label':'세부 분야 (여러 개 선택 가능)'},h('span',{class:'chiplabel'},'세부 분야'),
      h('button',{class:'chip s','aria-pressed':String(act.length===0),on:{click:()=>{S.tags=[];home.offset=0;saveState();viewHome();}}},'전체'),
      tl.map(([t,n])=>tagChip(t,n))),
    h('div',{class:'muted small',style:'margin:-2px 0 10px'},`조건에 맞는 논문 ${pool().length}편 · 세부 분야는 여러 개 고를 수 있어요`),
    paperCard(p),
    h('div',{class:'seg',role:'group','aria-label':'모드'},
      h('button',{'aria-pressed':String(S.mode==='read'),on:{click:()=>{S.mode='read';saveState();viewHome();}}},'🙂 편하게'),
      h('button',{'aria-pressed':String(S.mode==='time'),on:{click:()=>{S.mode='time';saveState();viewHome();}}},'⏱ 타임어택')),
    h('div',{class:'stack',style:'margin-top:12px'},
      h('button',{class:'btn primary',on:{click:()=>startPaper(p)}},S.mode==='time'?'⏱ 60초 안에 5문장!':'딱 5문장만 읽기 →'),
      h('div',{class:'row'},
        h('button',{class:'btn sm ghost',on:{click:()=>{home.offset++;viewHome();}}},'🎲 다른 논문'),
        h('button',{class:'btn sm ghost',on:{click:viewPaste}},'📋 내 논문 붙여넣기'))),
    h('div',{class:'card',style:'margin-top:14px'},
      h('div',{class:'label',style:'margin-bottom:4px'},'오늘 이 논문 미션'),
      mission('read','5문장 읽기',50),mission('quiz','퀴즈 맞히기',70),mission('note','한 줄 정리',20)),
    notes.length?h('details',null,h('summary',null,`📝 내 한 줄 정리 (${S.notes.length})`),h('div',{class:'stack',style:'margin-top:8px'},notes.map(n=>h('div',{class:'card',style:'margin:0;padding:12px'},h('div',{class:'small muted'},n.date+' · '+n.title),h('div',null,n.text))))):null,
    h('details',null,h('summary',null,'이 앱에 대해'),
      h('p',{class:'small muted'},'이 샘플의 5문장은 각 초록을 바탕으로 쉬운 한국어로 새로 쓴 요약이에요(원문 아님). 라이선스 배지는 가공 가능 여부를 보여주는 표시이고, 원문은 링크에서 확인하세요. 진행 기록은 이 브라우저에만 저장돼요. 실제 서비스에서는 arXiv·OSF·CORE API에서 받은 초록을 같은 흐름에 연결해요.'))
  );
}

function startPaper(p){ newSession(p,S.mode); ses.inProgress=true; viewRead(); }

const CHEER=['시작이 반이에요 🙌','벌써 2문장! 🔥','반 넘었어요!','한 문장 남았어요 💪','완료!'];
function viewRead(){
  const p=ses.paper, total=p.sents.length, i=ses.i;
  const en=p.field==='paste';
  const pips=h('div',{class:'pips',role:'img','aria-label':`${i}/${total}문장 읽음`},p.sents.map((_,k)=>h('div',{class:'pip'+(k<i?' done':k===i?' cur':'')+(k===i-1?' just':'')})));
  const timerWrap=ses.mode==='time'?h('div',null,h('div',{class:'row between'},h('span',{class:'tl'},'⏱ 타임어택'),h('span',{class:'tl',id:'tl'},Math.ceil(ses.timeLeft)+'초')),h('div',{class:'timer'+(ses.timeLeft<=0?' off':'')},h('i',{id:'tbar',style:`width:${Math.max(0,ses.timeLeft/60*100)}%`}))):null;
  const nextBtn=h('button',{class:'btn primary',id:'next',on:{click:onNext}},i<total-1?'다음 ▶':'마지막! 완료 ✓');
  mount(
    h('div',{class:'muted small',style:'margin-bottom:6px'},p.title.length>70?p.title.slice(0,68)+'…':p.title),
    pips, timerWrap,
    h('div',{class:'card'},h('div',{class:'label'},`문장 ${i+1} / ${total}`+(ses.repeat.read?' · 복습(XP 없음)':'')),h('div',{class:'sent'+(en?' en':''),lang:en?'en':'ko'},p.sents[i])),
    h('div',{class:'cheer'},CHEER[Math.min(i,4)]&&total===5?CHEER[i]:(i===total-1?'완료!':'계속 가요 🙂')),
    nextBtn,
    h('div',{class:'center muted small',style:'margin-top:10px'},'탭하거나 Space · Enter · → 키로 다음')
  );
  if(ses.mode==='time'&&i===0&&!ses.t0){ ses.t0=performance.now(); }
  if(ses.mode==='time'&&ses.timeLeft>0){
    timers.push(setInterval(()=>{
      const el=Math.max(0,60-(performance.now()-ses.t0)/1000); ses.timeLeft=el;
      const bar=$('#tbar'), tl=$('#tl'); if(bar) bar.style.width=(el/60*100)+'%'; if(tl) tl.textContent=Math.ceil(el)+'초';
      if(el<=0){ clearTimers(); ses.mode='read'; if(bar) bar.parentElement.classList.add('off'); if(tl) tl.textContent='시간 끝'; toast('시간 끝! 괜찮아요, 읽은 XP는 그대로예요'); }
    },100));
  }
}
function onNext(){
  if(!ses) return;
  const total=ses.paper.sents.length;
  sfx.tick();
  if(!ses.repeat.read) award(10);
  ses.i++;
  if(ses.i>=total) finishRead(); else viewRead();
}
function finishRead(){
  clearTimers();
  const timed=ses.mode==='time'&&ses.timeLeft>0;
  if(!ses.repeat.read){
    award(20);
    if(timed){ const b=Math.round(ses.timeLeft)*2; if(b>0){ award(b); toast(`⏱ 남은 시간 보너스 +${b}`); } }
  }
  markDone(ses.paper.id,'read'); markDay(); ses.stages.read=true;
  sfx.win(); confetti(); viewMenu();
}

function viewMenu(){
  renderTop();
  const p=ses.paper, st=ses.stages, hasQuiz=ses.quiz&&ses.quiz.length>0;
  const btns=[];
  if(hasQuiz&&!st.quiz) btns.push(h('button',{class:'btn primary',on:{click:startQuiz}},'🎯 퀴즈 풀기'+(ses.repeat.quiz?' (복습)':' (최대 +90)')));
  if(!st.note) btns.push(h('button',{class:btns.length?'btn':'btn primary',on:{click:viewNote}},'✍️ 한 줄로 정리하기'+(ses.repeat.note?' (복습)':' (+20)')));
  btns.push(h('button',{class:'btn ghost',on:{click:viewResult}},'오늘은 여기까지'));
  const msg=st.quiz?'퀴즈까지 끝! 한 줄 정리로 마무리할까요?':'5문장 읽기 완료! 🎉';
  mount(
    h('div',{class:'card center'},h('div',{class:'big'},'+'+ses.gain+' XP'),h('div',{class:'h2'},msg),h('div',{class:'muted small'},'지금까지 이번 판에서 번 경험치예요')),
    h('div',{class:'stack'},btns),
    h('div',{style:'margin-top:14px'},paperCard(p))
  );
}

function startQuiz(){ ses.qi=0; ses.correct=0; ses.combo=0; ses.perfect=true; viewQuiz(); }
function viewQuiz(){
  const Q=ses.quiz[ses.qi], n=ses.quiz.length; ses.answered=false; ses.tries=0;
  const timed=ses.mode==='time';
  ses.qLeft=15; ses.qT0=performance.now();
  const opts=Q.options.map((o,k)=>h('button',{class:'opt','data-i':k,on:{click:()=>choose(k)}},h('span',{class:'n'},k+1),h('span',null,o)));
  mount(
    h('div',{class:'pips',role:'img','aria-label':`${ses.qi}/${n}문제 완료`},ses.quiz.map((_,k)=>h('div',{class:'pip'+(k<ses.qi?' done':k===ses.qi?' cur':'')+(k===ses.qi-1?' just':'')}))),
    timed?h('div',null,h('div',{class:'row between'},h('span',{class:'tl'},'⏱ 문제당 15초'),h('span',{class:'tl',id:'tl'},'15초')),h('div',{class:'timer'},h('i',{id:'tbar'}))):null,
    h('div',{class:'card'},h('div',{class:'label'},`퀴즈 ${ses.qi+1} / ${n}`+(ses.combo>1?`  🔥 ${ses.combo}콤보`:'')),
      h('div',{class:'h2',style:'font-size:20px'},Q.q),
      Q.ctx?h('div',{class:'ctx',lang:'en'},Q.ctx):null,
      h('div',{id:'opts'},opts),
      h('div',{id:'fb'})),
    h('div',{class:'center muted small'},'정답을 맞혀야 점수를 받아요 · 틀려도 감점 없이 다시 고를 수 있어요 · 1 2 3 키로도 선택')
  );
  if(timed){
    timers.push(setInterval(()=>{
      const el=Math.max(0,15-(performance.now()-ses.qT0)/1000); ses.qLeft=el;
      const bar=$('#tbar'), tl=$('#tl'); if(bar) bar.style.width=(el/15*100)+'%'; if(tl) tl.textContent=Math.ceil(el)+'초';
      if(el<=0) wrongAttempt(-1);
    },100));
  }
}
function wrongAttempt(k){
  clearTimers(); ses.tries++; ses.combo=0; ses.perfect=false; sfx.bad();
  if(k>=0){ const b=document.querySelectorAll('.opt')[k]; if(b){ b.disabled=true; b.classList.add('wrong'); } }
  const tl=$('#tl'), tb=$('#tbar'); if(tl) tl.textContent='다시 도전은 시간 제한 없어요'; if(tb) tb.parentElement.classList.add('off');
  $('#fb').replaceChildren(h('div',{class:'why',role:'alert'},h('b',null,k===-1?'⏱ 시간 초과! 다시 골라보세요 🙂':'아깝! 다시 골라보세요 🙂'),h('div',{class:'muted',style:'margin-top:4px'},'틀려도 감점은 없어요. 맞히면 점수를 받아요.')));
}
function choose(k){
  if(ses.answered) return;
  const Q=ses.quiz[ses.qi], last=ses.qi>=ses.quiz.length-1;
  if(k!==Q.answer){ wrongAttempt(k); return; }
  ses.answered=true; clearTimers();
  document.querySelectorAll('.opt').forEach((b,i)=>{ b.disabled=true; if(i===Q.answer) b.classList.add('correct'); });
  let line;
  if(ses.tries===0){
    ses.correct++; ses.combo++;
    if(!ses.repeat.quiz) award(20+Math.min(ses.combo-1,3)*5+(ses.mode==='time'?Math.ceil(ses.qLeft/3):0));
    line=ses.combo>1?`정답! 🔥 ${ses.combo}콤보`:'정답! 👏';
  } else {
    if(!ses.repeat.quiz) award(10);
    line='다시 도전해서 맞혔어요! 💪'+(ses.repeat.quiz?'':' (+10)');
  }
  sfx.ok();
  $('#fb').replaceChildren(
    h('div',{class:'why'},h('b',null,line),Q.orig?h('div',{class:'muted',style:'margin-top:6px',lang:'en'},Q.orig):null,Q.why?h('div',{class:'muted',style:'margin-top:6px'},Q.why):null),
    h('button',{class:'btn primary',id:'qnext',style:'margin-top:12px;font-size:18px;padding:16px',on:{click:nextQ}},last?'결과 보기 ✓':'다음 문제 ▶')
  );
}
function nextQ(){
  if(!ses.answered) return;
  if(ses.qi>=ses.quiz.length-1){
    if(!ses.repeat.quiz&&ses.perfect&&ses.quiz.length>=2){ award(30); toast('한 번에 전부 정답! 퍼펙트 +30'); }
    markDone(ses.paper.id,'quiz'); ses.stages.quiz=true; markDay();
    if(ses.perfect){ sfx.win(); confetti(); } else sfx.tick();
    viewMenu();
  } else { ses.qi++; viewQuiz(); }
}

function viewNote(){
  const ta=h('textarea',{placeholder:'이 논문을 한 줄로 말하면? (5자 이상)','aria-label':'한 줄 정리',maxlength:'200'});
  const save=h('button',{class:'btn primary',disabled:true,on:{click:()=>{
    const text=ta.value.trim(); if(text.length<5) return;
    if(!ses.repeat.note) award(20);
    S.notes.unshift({id:ses.paper.id,title:ses.paper.title.slice(0,50),text,date:todayKey()}); saveState();
    markDone(ses.paper.id,'note'); ses.stages.note=true; markDay(); sfx.ok(); confetti(40); viewMenu();
  }}},'저장하기 ✓');
  ta.addEventListener('input',()=>{ save.disabled=ta.value.trim().length<5; });
  mount(
    h('div',{class:'card'},h('div',{class:'label'},'한 줄 정리'),h('div',{class:'h2'},'친구에게 말하듯, 이 논문이 뭐라고 했나요?'),h('div',{class:'muted small',style:'margin-bottom:8px'},'완벽하지 않아도 돼요. “~했더니 ~라더라” 정도면 충분!'),ta),
    h('div',{class:'stack'},save,h('button',{class:'btn ghost',on:{click:viewMenu}},'건너뛰기'))
  );
  ta.focus();
}

function viewResult(){
  renderTop();
  const L=levelInfo(S.xp), total=S.days.length;
  const msg=ses.gain>0?(ses.stages.quiz&&ses.correct===ses.quiz.length?'완벽해요! 오늘의 한 입 클리어 🏆':'오늘도 해냈어요! 시작한 것만으로 이미 승리 🎉'):'복습 완료! 한 번 더 본 것도 대단해요 🙂';
  const inProg=ses;
  mount(
    h('div',{class:'card center'},h('div',{class:'muted small'},'이번 판 획득'),h('div',{class:'big'},'+'+ses.gain+' XP'),h('div',{class:'h2'},msg),
      h('div',{class:'row between small muted',style:'margin-top:10px'},h('span',null,`Lv.${L.lv} ${L.title}`),h('span',null,`${L.cur} / ${L.need}`)),
      h('div',{class:'bar'},h('i',{style:`width:${L.cur/L.need*100}%`})),
      h('div',{class:'small'},`📅 총 ${total}일째 읽는 중`)),
    h('div',{class:'stack'},
      h('button',{class:'btn primary',on:{click:()=>{ if(ses.paper.field==='paste'){ viewPaste(); return; } home.offset++; goHome(); }}},'한 입 더! 다른 논문 🎲'),
      h('button',{class:'btn',on:{click:goHome}},'홈으로')),
    h('div',{style:'margin-top:14px'},paperCard(ses.paper))
  );
  ses.inProgress=false;
}

function viewPaste(){
  renderTop();
  const ta=h('textarea',{style:'min-height:170px','aria-label':'영어 초록',lang:'en',placeholder:'arXiv·OSF 등에서 복사한 영어(또는 한국어) 초록을 붙여넣으세요.\n처음 5문장으로 읽기 카드를, 핵심 단어를 가린 빈칸 퀴즈를 만들어줘요.'});
  const msg=h('div',{class:'small',style:'color:var(--warn);min-height:20px;margin-top:6px',role:'alert'});
  mount(
    h('div',{class:'card'},h('div',{class:'label'},'내 논문 붙여넣기'),h('div',{class:'h2'},'읽고 싶은 논문 초록을 넣어보세요'),h('div',{class:'muted small',style:'margin-bottom:8px'},'개인 학습용이에요. 붙여넣은 글은 저장하지 않고, 이 화면에서만 써요.'),ta,msg),
    h('div',{class:'stack'},
      h('button',{class:'btn primary',on:{click:()=>{
        const sents=splitSentences(ta.value);
        if(sents.length<3){ msg.textContent='문장이 3개 이상 필요해요. 초록 전체를 붙여넣어 주세요.'; return; }
        const use=sents.slice(0,5), id='paste:'+hash(use.join('|'));
        const paper={id,field:'paste',source:'직접 붙여넣기',title:use[0].length>60?use[0].slice(0,58)+'…':use[0],authors:null,date:null,lic:'unk',url:null,sents:use,cloze:makeCloze(use,hash(id))};
        startPaper(paper);
      }}},'5문장 모드 시작 →'),
      h('button',{class:'btn ghost',on:{click:goHome}},'← 돌아가기'))
  );
  ta.focus();
}

/* keyboard */
document.addEventListener('keydown',e=>{
  if(!ses||!ses.paper) return;
  const t=e.target; if(t&&(t.tagName==='TEXTAREA'||t.tagName==='INPUT')) return;
  if(t&&t.tagName==='BUTTON') return; // 버튼에 포커스가 있으면 브라우저 기본 동작에 맡김
  if(document.querySelector('#next')){ if([' ','Enter','ArrowRight'].includes(e.key)){ e.preventDefault(); onNext(); } return; }
  if(document.querySelector('.opt')){
    if(!ses.answered&&['1','2','3'].includes(e.key)){ const k=+e.key-1, b=document.querySelectorAll('.opt')[k]; if(b&&!b.disabled) choose(k); }
    else if(ses.answered&&(e.key==='Enter'||e.key==='ArrowRight')){ e.preventDefault(); nextQ(); }
  }
});

renderTop();
viewHome();
})();
</script>
</body>
</html>
````
