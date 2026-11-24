// 배포용 dist/ 폴더를 만든다. 실행: node deploy/build.mjs
// 정적 호스팅(그 어떤 것도)은 보통 폴더 루트의 "index.html"을 찾으므로, 개발 중 파일명
// paperbite_index.html을 index.html로 바꿔 복사한다. manifest.webmanifest와 sw.js가
// 그 파일명을 참조하므로 같이 바꿔 쓴다. collector가 만든 papers.json이 있으면 함께 담는다.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

function copyText(srcName, destName, renameRefs) {
  let text = fs.readFileSync(path.join(ROOT, srcName), 'utf8');
  if (renameRefs) text = text.split('paperbite_index.html').join('index.html');
  fs.writeFileSync(path.join(DIST, destName), text);
}

copyText('paperbite_index.html', 'index.html', false);
copyText('manifest.webmanifest', 'manifest.webmanifest', true);
copyText('sw.js', 'sw.js', true);
fs.copyFileSync(path.join(ROOT, 'icon.svg'), path.join(DIST, 'icon.svg'));

const papersJson = path.join(ROOT, 'papers.json');
if (fs.existsSync(papersJson)) {
  fs.copyFileSync(papersJson, path.join(DIST, 'papers.json'));
  console.log('papers.json도 담았어요(수집기 출력).');
} else {
  console.log('papers.json이 없어요 — 내장 샘플 13편만으로 배포돼요. 수집기를 돌리면 더해져요.');
}

console.log('dist/ 폴더를 만들었어요. 이 폴더 안 내용을 그대로 정적 호스팅에 올리면 돼요.');
