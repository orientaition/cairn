# 논문 한 입 — 지금까지 한 것 / 나중에 할 것

작성일: 2026-11-24. "나중에 할 것"은 설계만 해두고 코드는 아직 안 짰다.

## 1. 지금까지 한 것 (완료)

### 앱 (paperbite_index.html)
- 정적인 학술지 UI(라이트/다크, 글자 크기 3단계), 복습 큐(1·3·7일 Leitner), 퀴즈 4종(객관식·OX·핵심
  단어·순서 맞추기), 난이도(한국어 요약/영어 초록/서론), 노트 검색·내보내기
- PWA(설치·오프라인 캐시 — 실제 배포 사이트에서 설치 가능·오프라인 동작 확인함), 로컬 알림 + .ics
  캘린더, 계정 대신 내보내기/가져오기(기기 설정은 안 섞고 진행 기록만 병합)
- 접근성(명암비 4.5:1 검증, 키보드만으로 전부 조작, 200% 확대 대응), 측정(opt-in, 이벤트 스키마 제안)
- **웹에서 논문 찾기**: OpenAlex(브라우저 직접, CORS 지원 확인함) + arXiv·OSF(Cloudflare Worker
  프록시 `cairn.rladlrrua12.workers.dev` 경유) 실시간 검색. 결과는 AI 변환 없이 원문 문장 +
  알고리즘 빈칸 퀴즈(`makeCloze`)로 바로 읽기 가능, 저장(즐겨찾기 아닌 별도 `savedSearches`)도 가능
- PC 반응형 2단 레이아웃(홈 화면만 — 왼쪽 범위 설정+논문, 오른쪽 기록)

### 수집기 (collector/)
- arXiv(cs.CR 등), OpenAlex, OSF(PsyArXiv·SocArXiv·MediArXiv·LawArXiv) 실제 수집 코드 — 전부
  실행해서 실제 데이터로 검증함
- 라이선스 게이트(CC0·CC BY·CC BY-SA만 저장) + 사실 점검(숫자·고유명사 환각 가드)
- 논문 10편을 실제로 수집해 직접 한국어 요약+퀴즈로 변환, 기존 13편에 더해 총 23편 반영함
- CORE는 어댑터 코드는 있지만 API 키가 없어서 건너뛰는 상태(`CORE_API_KEY` 없으면 스킵)

### 배포
- GitHub 저장소(`orientaition/cairn`, 공개) + GitHub Pages 자동 배포(`main` push 트리거)
- GitHub Actions로 수집기 하루 1회 자동 실행(`collect-papers.yml`) → 커밋 → 배포까지 자동 연결

---

## 2. 나중에 할 것 (설계만, 코드는 아직)

### 2.1 CORE API — 키 발급 + 전 분야 확장
- 지금은 `fetchCore('digital humanities', limit)` 하나만 하드코딩돼 있고, 키가 없어 실행도 안 됨.
- 할 일: core.ac.uk에서 무료 키 발급 → `CORE_API_KEY`를 GitHub Actions 시크릿에 등록 →
  arXiv/OpenAlex처럼 **이공·사회·인문 여러 검색어로 나눠서 수집**하도록 쿼리를 다중화.
  (CORE 자체가 전 분야 오픈액세스 집계소라 "이공계만"인 건 쿼리를 하나만 썼기 때문 — 소스 자체의
  한계는 아님.)

### 2.2 국회도서관 (National Assembly Library)
- **실현 가능성: 높음.** data.go.kr 공공데이터포털에 Open API가 있음(도서자료·학위논문·국내외
  기사 검색 + 전거데이터). 회원가입 → 인증키 신청 → 무료 발급.
- 할 일: 어댑터 추가(collector/collect.mjs 패턴 그대로), 한국어 논문이라 **AI 변환 프롬프트를
  "쉬운 한국어로 바꾸기"가 아니라 "더 쉬운 한국어로 풀어쓰기"로 조정** 필요(번역이 아니라 쉬운 말
  바꾸기).
- 출처: [도서관정보나루 Open API](https://www.data4library.kr/apiUtilization), [국회도서관 공공데이터포털](https://www.data.go.kr/data/15098174/openapi.do)

### 2.3 사이언스온(ScienceON, KISTI)
- **실현 가능성: 중간.** Open API 있음(논문검색·논문상세검색·연구자검색·보고서검색), 회원가입 후
  키 발급.
- **걸리는 점**: 인증키 등록 시 **MAC 주소 + 공인 IP를 미리 등록**해야 호출 가능. GitHub Actions
  러너는 실행마다 IP가 바뀌는 구조라 이 방식과 안 맞음 — 실행 전에 매번 IP를 재등록하는 추가 단계가
  필요하거나, 고정 IP가 있는 다른 실행 환경(자체 서버 등)으로 옮겨야 할 수 있음. 구현 전에 API
  문서에서 동적 IP 허용 여부를 한 번 더 확인해야 함.
- 출처: [ScienceON API Gateway](https://scienceon.kisti.re.kr/apigateway/api/way/service/arti/serviceArtiSearchApi.do), [공공데이터포털 ScienceON 논문검색](https://www.data.go.kr/data/15117315/openapi.do)

### 2.4 RISS (학술연구정보서비스, KERIS) — 사용자가 직접 확인 예정
- **실현 가능성: 낮음(현재는).** API 센터가 있고 RISS 통합검색 API 등을 제공하지만, 안내문에
  "공익 목적의 **비영리 기관(대학)**을 대상으로 제공(향후 민간 확대 예정)"이라고 명시돼 있음 —
  개인 개발자·비영리 아닌 서비스가 지금 바로 키를 받을 수 있는지 불확실함.
- **다음 할 일: 사용자가 직접 API 센터에 개인 자격으로 신청해서 키가 실제로 나오는지 확인하기로 함.**
  그 결과에 따라 구현 여부·방식을 다시 정한다. 스크래핑은 이용약관상 금지(자동 접근 시 접속 차단·
  세션 종료 조치 가능) — API 없이 우회하지 않는다.
- 출처: [RISS API 센터](https://www.riss.kr/apicenter/apiMain.do), [RISS 이용약관](https://www.riss.kr/etc/clause.html)

### 2.5 ResearchGate — 보류 권장
- **실현 가능성: 사실상 불가.** 공식 API가 없고, 이용약관이 스크립트·봇·크롤러로 콘텐츠·데이터·
  프로필을 수집하는 것을 명시적으로 금지함. 우회 수집은 약관 위반.
- 대안: 이미 쓰고 있는 OpenAlex·Crossref 같은 공식 메타데이터 API로 비슷한 논문을 찾는 편이 안전함.
- 출처: [ResearchGate 이용약관](https://researchgate.in/pages/terms.html)

### 2.6 Google Scholar — 보류 권장
- **실현 가능성: 사실상 불가.** 공식 API가 없고, robots.txt가 `/scholar`·`/search` 경로를 모든
  봇에 막아 두고 있으며 이용약관도 자동 수집을 금지함. 시중의 "Google Scholar API"는 전부 비공식
  유료 프록시(ToS 위반 소지).
- 대안: 이미 연동한 OpenAlex 외에 Semantic Scholar API(공식, 무료)를 추가하면 Google Scholar가
  주는 것과 비슷한 인용·메타데이터를 합법적으로 얻을 수 있음 — 이쪽을 다음 후보로 검토.
- 출처: [robots.txt 설명](https://en.wikipedia.org/wiki/Robots.txt), 관련 업계 가이드 다수

### 구현 순서 제안
1. CORE 키 발급 + 전 분야 쿼리 확장 (이미 있는 코드 틀에 바로 적용 가능, 가장 쉬움)
2. 국회도서관 어댑터 (공공데이터포털이라 패턴이 익숙함)
3. 사이언스온 (IP 등록 방식 확인 후)
4. RISS (사용자가 개인 신청 가능 여부 확인한 뒤)
5. ResearchGate·Google Scholar는 **공식 API가 생기기 전까지 보류**

---

## 3. 여기서 더 개선할 것 (새 소스 연동과 별개로, 지금 있는 것 다듬기)

### 앱
- **웹 검색 결과에 라이선스 표시가 없음**: 수집기 쪽(collect.mjs)은 라이선스를 판별하는데, 브라우저에서
  직접 돌리는 `searchOpenAlexLive`는 license 필드를 아예 안 가져옴 — 검색 결과 카드에 "라이선스
  확인 안 됨"만 뜨고 실제로 CC BY인지 아닌지 구분이 안 됨. OpenAlex 응답엔 라이선스 정보가 있으니
  가져와서 표시만 하면 됨(저장 가능 여부 자체는 그대로 "확인 전"으로 둬도 됨).
- **순서 맞추기 퀴즈를 검색 결과에도 알고리즘으로 만들 수 있음**: 지금 `buildAlgoPaper`는 빈칸
  퀴즈(`makeCloze`)만 만드는데, 문장 몇 개를 섞어서 "원래 순서대로 배열하기" 퀴즈도 AI 없이 바로
  만들 수 있음(이미 있는 `order` 타입 렌더링 재사용). 퀴즈 다양성이 늘어남.
- **서재 화면이 섹션이 많아지는 중**: 즐겨찾기·나중에 읽기·읽은 논문·저장한 검색 결과·노트, 다섯
  개가 세로로 쌓여 있음. 탭이나 접이식으로 바꾸면 더 깔끔해질 수 있음(PC 2단 레이아웃을 서재에도
  적용하는 것도 같이 고려).
- **다크 모드에서 새 요소 재점검**: 웹 검색 카드의 저장 버튼, 2단 레이아웃의 sticky 사이드바 등
  새로 추가한 요소들의 다크 테마 대비를 아직 스크린샷으로 따로 확인 안 했음.

### 수집기
- **arXiv 카테고리 매핑표가 작음**: `ARXIV_CATEGORY_MAP`에 cs 계열 몇 개만 있음(cs.CR/CY/AI/LG/CL/
  DC/OS/NI/DB). 물리학·생물학 등 다른 분야 카테고리를 추가하면 "이공" 커버리지가 넓어짐.
- **키워드 태그 규칙이 작아서 '기타'로 많이 떨어짐**: `KEYWORD_TAG_RULES`가 지금 있는 샘플 주제
  위주라, 새로 수집되는 논문 상당수가 세부 분야 '기타'로 분류됨. 규칙을 넓히거나, 못 맞추면 초록
  키워드 몇 개를 그대로 태그로 쓰는 폴백을 추가하는 것도 방법.
- **transform-batch.mjs의 Claude 호출을 실제로 한 번도 안 돌려봄**: 코드는 공식 Messages API 형식에
  맞게 짰지만 이 세션엔 키가 없어 라이브 테스트를 못 했음. `ANTHROPIC_API_KEY`를 등록한 뒤 한 번은
  직접 실행해서 응답 파싱이 제대로 되는지 확인 필요(이미 파일 주석에도 적어둠).

### 배포·인프라
- **arXiv 레이트리밋이 완벽한 전역 제한이 아님**: Cloudflare Worker가 10분 캐시로만 완화하고 있어서,
  방문자가 많아지면 결국 Durable Object(유료)로 업그레이드해야 "3초에 1요청"을 정말로 보장할 수 있음.
- **GitHub Actions 시크릿 등록 여부 재확인**: `CORE_API_KEY`·`ANTHROPIC_API_KEY`를 등록했는지,
  등록 안 했으면 수집기가 변환 없이 메타데이터만 쌓는 상태로 계속 돈다는 점을 가끔 점검.

### 테스트
- **테스트가 외부 API를 실제로 호출해서 점점 느려지고 불안정해짐**(현재 100개 이상, 그중 일부는
  arXiv·OSF·OpenAlex·Worker를 실제로 침). "순수 함수만 빠르게 도는 모드"와 "네트워크 포함 전체
  모드"를 나눠서, 평소엔 빠른 쪽만 돌리고 배포 전에만 전체를 돌리는 방식으로 바꾸면 더 편해질 수 있음.
