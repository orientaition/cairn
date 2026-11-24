# C단계 조사 보고 — 소스별 인증·호출 제한·라이선스

작성일: 2026-11-24. 아래는 실제로 각 API를 호출해 본 결과(이 보고서를 쓴 세션 기준)와
공식 문서를 함께 확인한 내용이다. 호출 제한·요금제는 바뀔 수 있으니 운영 전 다시 확인할 것.

## arXiv

- 메타데이터(제목·초록·저자·분류)는 CC0 — 가져와 가공·공유할 수 있다.
- 레거시 API 약관: **3초에 1요청, 단일 연결, 여러 기기로 우회 금지**. `collect.mjs`의
  `createRateLimiter(3000)`로 강제한다.
- 라이선스: Atom 응답에 `<arxiv:license href="...">`가 있는 논문만 CC 라이선스가 명시돼 있고,
  없으면 **arXiv 비독점 라이선스**(저장·재배포 불가로 취급)로 간주한다. 실제로 `cs.CR` 최신
  논문 샘플(3건)에서는 셋 다 `arxiv:license` 태그가 없었다 — 명시적 CC 선택은 소수라는 뜻.
- 출처: https://info.arxiv.org/help/api/tou.html , https://info.arxiv.org/help/license/index.html

## OSF Preprints (SocArXiv·PsyArXiv 등)

- **공개 데이터는 토큰 없이 읽힌다** — 실제로 인증 헤더 없이 `GET /v2/preprints/?filter[provider]=psyarxiv`
  를 호출해 실제 논문 데이터를 받았다(200 OK). developer.osf.io도 "public read access requires no
  authentication"이라고 안내한다.
- 호출 제한: 문서마다 수치가 다르게 적혀 있어(분당 100회 vs 시간당 100회 등) 공식 수치가
  엇갈린다 — 운영 전 429 응답을 관찰하며 보수적으로(수백 ms 간격) 맞추는 게 안전하다.
  `collect.mjs`는 일단 700ms 간격을 둔다.
- 라이선스는 논문마다 다르고 **없는 경우가 흔하다**(저자가 전권 보유, 가공 불가). 라이선스 이름은
  `relationships.license`가 가리키는 `/v2/licenses/{id}/` 리소스를 따로 불러야 알 수 있다 —
  같은 라이선스 id가 반복되므로 `collect.mjs`가 캐시해 둔다.
- 저자명은 preprint 응답 자체엔 없고 `?embed=contributors`를 붙여야 함께 온다(실제 확인함).
- 출처: https://developer.osf.io/ , https://help.osf.io/article/408-preprint-analytics

## CORE

- `/v3/search/works`는 **API 키 없이도 낮은 공유 한도로 응답한다**(실제로 키 없이 200 OK, 결과
  7,807,717건 중 10건 확인). 다만 공식 안내는 "키 없이도 쓸 수 있지만, 안정적인 사용은 무료 키
  등록을 권장/요구"로 엇갈려 있다 — 학술/비상업 키는 무료, 상업적 이용도 약관 범위에서 가능.
- 결론: 하루 1회 예약 작업처럼 **지속적으로 쓰려면 무료 키 등록이 사실상 필수**로 보고, `collect.mjs`는
  `CORE_API_KEY` 환경변수가 없으면 아예 건너뛰고 이유를 로그로 남긴다(키 없이 조용히 실패하지 않음).
- 출처: https://core.ac.uk/services/api , https://api.core.ac.uk/docs/v3

## OpenAlex

- 메타데이터는 **CC0**(퍼블릭 도메인) — "no personal-use-only carve-out, no permission to ask".
  단, MAG 스냅숏만 예외적으로 ODC-BY.
- 인증 없이도 쓸 수 있다("casual use ... no key at all"). 초당 요청 한도는 **키 없음 10 / 무료 키 30 /
  Member 50**이고, 무료 키는 mailto 하나만 등록하면 된다(10배 예산 증가 + 커서 페이징에 필요).
- 라이선스 필드(`best_oa_location.license`)는 `cc-by`, `cc0` 같은 소문자 코드이지만, **없는 논문이
  더 많다**(실제 확인: OA 논문도 license가 null인 경우가 흔함) — 없으면 `unk`로 보수적으로 처리한다.
- 출처: https://help.openalex.org/how-to-use-the-api/rate-limits-and-authentication ,
  https://help.openalex.org/data/licenses

## KCI(한국연구재단 인용정보, 공공데이터포털)

- 활용신청 심의 유형: **개발 단계는 자동 승인, 운영(실서비스) 단계는 수동 심의** — 즉 지금 바로
  개발·테스트는 가능하지만, 실제로 사용자에게 서비스하려면 별도 승인 절차를 거쳐야 한다.
- **초록(abstract) 제공 여부는 확인하지 못했다** — 이 서비스가 공개한 응답 필드는 인용 지수·통계·
  서지 정보 중심이고, 초록 텍스트를 주는지는 문서에 명시돼 있지 않다. 실제로 테스트 키를 받아
  샘플 호출을 해 봐야 확정할 수 있다(이번 조사에서는 호출하지 않았다 — 키 발급·개인 계정 연동이
  필요해 이 환경에서 진행하지 않음).
- 결론: **KCI 어댑터는 구현하지 않았다.** 초록이 없다면 "쉬운 한국어 5문장" 변환 자체가 불가능하므로,
  어댑터를 만들기 전에 (1) 테스트 키로 응답 필드를 직접 확인하고 (2) 운영 승인 절차를 먼저 밟아야 한다.
- 출처: https://www.data.go.kr/en/data/15084727/openapi.do , https://www.kci.go.kr/kciportal/aboutNew.kci

## 앱 표기 점검

- 홈 화면의 라이선스 배지·"이 앱에 대해" 문구는 이미 "AI 요약, 원문 아님"과 원문 링크를 달고 있고,
  arXiv·OSF 로고나 이름을 앱 브랜딩에 쓰지 않는다 — 소스가 후원·보증하는 것처럼 보이는 요소 없음.
  수집기가 새 소스를 추가할 때도 `source` 필드는 "저작권자 표기"로만 쓰고 로고를 넣지 않을 것.
