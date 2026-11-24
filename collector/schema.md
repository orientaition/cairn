# 공통 스키마 (수집기 → 앱)

수집기가 arXiv·OSF·OpenAlex·CORE에서 모은 자료를 하나의 모양으로 맞춘 것. 앱의 `PAPERS` 배열과
같은 필드를 쓰므로, `collector/collect.mjs`가 만든 `papers.json`을 그대로 앱에 이어 붙일 수 있다.

```ts
type LicenseCode = 'cc0' | 'ccby' | 'ccbysa' | 'ccbyncsa' | 'ccbyncnd' | 'arx' | 'unk';

type Paper = {
  id: string;            // 소스 접두사 + 원본 id, 예: "arx-2611.31208", "osf-psyarxiv-mh6jw_v1"
  field: 'sci' | 'soc' | 'hum';
  tags: string[];         // 앱이 이미 쓰는 한국어 세부 분야 라벨(collector/lib.mjs의 매핑 결과)
  source: string;         // 화면에 보일 출처명: "arXiv" · "SocArXiv" · "OpenAlex" · "CORE" 등
  title: string;
  authors: string | null; // "홍길동, 김철수" 형태. 조회가 안 되면 null(지어내지 않는다)
  date: string | null;    // "YYYY-MM" 또는 "YYYY"
  lic: LicenseCode;
  url: string | null;     // 원문 링크
  abstractRaw: string;    // 원문 초록. licenseGate(lic).persist가 false면 저장 단계에서 빈 문자열로 비운다
  collectedAt: string;    // ISO 타임스탬프

  // 다음 단계(AI 변환, transform.mjs)가 채우는 필드 — 수집 직후에는 비어 있다
  needsTransform: boolean;
  sents: string[];        // 쉬운 한국어 5문장(원문 아님, 다시 쓴 요약)
  quiz: object[];         // 퀴즈 1~3문항(type: mc/ox/word/order — 앱의 퀴즈 스키마와 동일)
  terms: { t: string; d: string }[];
  en: string[];           // 영어 원문 문장 분리본(라이선스가 되는 경우에만 채움)

  // 라이선스 게이트 결과(licenseGate, collector/lib.mjs)
  canPersist: boolean;        // true여야 결과를 캐시 파일에 저장·공유할 수 있다
  shareAlikeNotice: boolean;  // true면 "동일조건 변경 가능(CC BY-SA)" 같은 고지를 화면에 띄워야 한다
};
```

## 라이선스 코드 ↔ 처리 규칙 (`collector/lib.mjs`의 `licenseGate`)

| 코드 | 의미 | 저장·공유 | 비고 |
| --- | --- | --- | --- |
| `cc0` | 퍼블릭 도메인 | 가능 | OpenAlex 메타데이터 전체가 이 코드(help.openalex.org/data/licenses) |
| `ccby` | 저작자 표시 | 가능 | |
| `ccbysa` | 저작자 표시 + 동일조건 | 가능 | 결과 화면에 "동일조건" 고지 필요 |
| `ccbyncsa` / `ccbyncnd` | 비상업·변경금지 포함 | **불가** | 사용자별 일회성 생성만, 캐시에 쓰지 않음 |
| `arx` | arXiv 비독점 라이선스(기본값) | **불가** | 저자가 따로 CC 라이선스를 고르지 않은 대다수 arXiv 논문 |
| `unk` | 라이선스를 못 찾음 | **불가** | OSF는 라이선스가 없는 논문이 흔함(저자가 전권 보유) |

## 분야(세부 태그) 매핑

- arXiv: 2단계 카테고리 코드(`cs.CR`, `cs.CY`, …)를 고정 표로 매핑한다 — `ARXIV_CATEGORY_MAP`.
- OpenAlex · OSF: 분류가 자유 텍스트(토픽명·subject명)라서 키워드 규칙(`KEYWORD_TAG_RULES`)으로
  맞는 게 있으면 쓰고, 없으면 `'기타'`로 떨어진다. **한계**: OSF의 `subjects`는 "Social and
  Behavioral Sciences"처럼 상위 분류라 세밀한 키워드와 잘 안 맞을 때가 많다 — 운영하면서
  규칙을 넓히거나 초록 키워드를 함께 보는 방식으로 보완할 수 있다.
- 키워드 검색(`searchPapers`)은 고정 태그 밖의 논문도 제목·출처·태그 텍스트로 찾게 해 준다.

## 파이프라인 순서

1. **수집** (`collect.mjs`, 서버에서 하루 1회): 소스별 어댑터 → `normalizePaper` → `licenseGate`로
   저장 가능 여부 결정 → `papers.json`.
2. **AI 변환** (`transform.mjs`, 저장 가능한 건만): 초록 → 한국어 5문장 + 퀴즈 + 용어 →
   `factCheckSummary`로 숫자·고유명사 환각 점검 → 통과한 것만 `sents`/`quiz`/`terms` 채움.
3. **앱**: `papers.json`을 같은 출처(same-origin) 정적 파일로 받아 내장 `PAPERS`와 합친다
   (브라우저가 arXiv 등을 직접 호출하지 않는다는 제약을 지킨다).
