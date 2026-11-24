# 배포 가이드

지금까지는 로컬 파일이에요. 이 문서는 실제 주소에 올려서 PWA 설치·오프라인·알림이 진짜로
동작하게 만드는 단계예요. 서비스 워커(PWA의 핵심)는 **HTTPS 또는 localhost에서만** 동작하니,
`file://`로 열어서는 설치·오프라인 기능이 끝까지 확인되지 않아요 — 아래 호스팅 중 하나에 올려야 해요.

## 왜 파일명을 바꿔야 하나요

개발 중인 파일 이름은 `paperbite_index.html`인데, 거의 모든 정적 호스팅은 폴더 루트에서
`index.html`을 자동으로 찾아요. 그래서 배포 직전에 `node deploy/build.mjs`를 돌려
`index.html`로 이름을 바꾼 `dist/` 폴더를 만들어요(manifest.webmanifest·sw.js 안의 파일명
참조도 같이 바꿔 써요). **`dist/`는 매번 새로 만들어지는 결과물이니 직접 고치지 마세요.**

```
node deploy/build.mjs
# dist/index.html, dist/manifest.webmanifest, dist/sw.js, dist/icon.svg 생성
# collector/collect.mjs로 만든 papers.json이 프로젝트 루트에 있으면 그것도 같이 담아요
```

## 1) GitHub Pages (추천 — 수집기 자동화와 같은 저장소에서 끝남)

**주의**: GitHub Pages는 **무료 플랜의 비공개 저장소에서는 켤 수 없어요**(Pro 이상 필요).
저장소가 비공개라면 먼저 **Settings → General → Danger Zone → Change visibility → Public**으로
바꾸거나 Pro로 올려야 아래 단계가 동작해요.

1. 이 폴더를 GitHub 저장소로 올려요(`git init && git add -A && git commit && git push`).
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정해요.
3. `.github/workflows/deploy.yml`은 **`main`에 푸시할 때마다 자동으로** `node deploy/build.mjs`로
   `dist/`를 만들어 배포해요. 저장소 **Actions 탭 → 배포 (GitHub Pages) → Run workflow**로 수동
   실행도 가능해요. 몇 분 뒤 Pages가 알려주는 주소(`https://<계정>.github.io/<저장소>/`)로
   들어가면 돼요. (저장소가 비공개일 땐 무료 플랜에서 이 배포가 전부 실패하니, 그 경우엔
   `on: push` 트리거를 지우고 수동 실행만 쓰거나 공개로 바꾸세요.)
4. 수집기를 자동으로 매일 돌리고 싶으면 `.github/workflows/collect-papers.yml`을 그대로 두세요
   — 하루 1회 arXiv·OpenAlex·OSF(+ 키가 있으면 CORE)를 모으고, `ANTHROPIC_API_KEY`가 있으면
   AI 변환까지 마친 뒤 `papers.json`을 `main`에 커밋해요. 그 커밋도 결국 `main`에 대한 push라서
   3번의 배포가 자동으로 이어 돌아요 — 수집부터 배포까지 완전히 자동이에요.
   - 시크릿 등록: 저장소 **Settings → Secrets and variables → Actions**에서
     `CORE_API_KEY`(core.ac.uk에서 무료 발급, 선택), `ANTHROPIC_API_KEY`(선택, 없으면
     수집만 되고 변환은 다음 기회로 보류돼요)를 추가하세요.

## 2) Netlify / Cloudflare Pages (저장소 없이 바로 올리고 싶을 때)

1. `node deploy/build.mjs`로 `dist/` 폴더를 만들어요.
2. Netlify Drop(app.netlify.com/drop) 또는 Cloudflare Pages의 "Upload assets"에
   `dist/` 폴더를 그대로 드래그해서 올려요. 둘 다 기본 HTTPS를 제공해요.
3. 논문을 새로 수집할 때마다 1~2를 반복하거나, 저장소를 연결해 자동 빌드로 바꿀 수 있어요
   (두 서비스 모두 "빌드 명령 `node deploy/build.mjs`, 배포 폴더 `dist`"로 설정하면 됨).

## 확인할 것

- 처음 배포 후, 실제 주소에서 설정 → "앱으로 설치하기" 버튼이 뜨는지(브라우저가
  `beforeinstallprompt`를 지원해야 보여요), 새로고침 후에도 오프라인에서 열리는지 확인하세요.
- `manifest.webmanifest`의 `start_url`/`scope`는 `deploy/build.mjs`가 이미 `index.html` 기준으로
  맞춰 써요. 배포 경로가 저장소 루트가 아니라 하위 폴더(예: GitHub Pages의 `/저장소명/`)라면
  `scope`를 그 경로로 맞춰야 할 수도 있어요(대부분의 경우 상대 경로라 자동으로 맞음).
- CORE 키·Anthropic 키 없이도 사이트 자체는 완전히 동작해요 — 그 경우 수집기는 arXiv·OpenAlex·OSF만
  모으고, AI 변환이 안 된 항목은 앱이 알아서 걸러내고 보여주지 않아요(`needsTransform` 플래그).

## 로컬에서 PWA 기능만 먼저 확인하고 싶다면

```
npx serve .          # 또는 python -m http.server 등 아무 정적 서버
# http://localhost:PORT/paperbite_index.html 로 접속 — localhost는 HTTPS 없이도 서비스 워커가 동작함
```
