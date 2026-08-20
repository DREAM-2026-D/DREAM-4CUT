# 2026 제주대학교 통합체전 인생네컷 — 배포용

아이패드로 부스를 운영하기 위한 배포본입니다.

## 왜 배포가 필요한가

iOS Safari는 **https 주소가 아니면 카메라를 열어주지 않습니다.** 노트북에서 띄운
`http://192.168.x.x:5174` 같은 주소로는 아이패드에서 촬영이 되지 않습니다.
Vercel에 올리면 진짜 인증서가 붙은 https 주소가 생기므로, 아이패드에 인증서를
설치하는 번거로운 과정 없이 바로 됩니다.

## 사진 처리 방식 (초상권)

찍은 사람만 가져갈 수 있어야 하므로 이렇게 설계했습니다.

- 사진 주소에 **무작위 문자열**이 붙습니다. 링크를 받은 사람만 열 수 있고,
  주소를 추측하거나 목록을 훑어볼 수 없습니다.
- 사진 목록을 보여주는 기능을 **아예 만들지 않았습니다.**
- **30분이 지난 사진은 자동으로 지워집니다.** 다음 사람이 촬영할 때마다
  만료된 사진을 정리합니다. (`api/upload.js` 의 `KEEP_MINUTES`)
- 검색엔진 수집을 막아두었습니다 (`vercel.json` 의 `X-Robots-Tag`).

보관 시간을 바꾸려면 `api/upload.js` 의 `KEEP_MINUTES` 값을 고치세요.
행사가 끝나면 Vercel 대시보드의 Blob 스토어에서 남은 파일을 지우거나,
프로젝트를 삭제하면 전부 정리됩니다.

## 배포 절차

이 PC에는 Node/npm이 없으므로 `npx vercel` 은 쓰지 않습니다.
GitHub에 올린 뒤 Vercel 웹에서 가져오는 방식이라 **아무것도 설치할 필요가 없습니다.**

이 폴더는 이미 git 저장소로 준비되어 있고 첫 커밋도 되어 있습니다.

### 1단계 — GitHub에 새 저장소 만들기

https://github.com/new 에서 만듭니다.

- Repository name: `jnu-photobooth` (원하는 이름)
- **Public** 선택 (Vercel 무료 플랜은 공개 저장소에서 편합니다)
- README·.gitignore·license는 **체크하지 않기** (이미 있습니다)

### 2단계 — 올리기

`deploy` 폴더에서 (주소의 `JMIN-22` 와 저장소 이름은 본인 것으로):

```bash
git remote add origin https://github.com/JMIN-22/jnu-photobooth.git
git branch -M main
git push -u origin main
```

로그인 창이 뜨면 GitHub 계정으로 로그인합니다.

### 3단계 — Vercel에서 가져오기

1. https://vercel.com 에서 **Continue with GitHub** 으로 가입/로그인
2. **Add New… → Project**
3. 방금 만든 저장소 옆 **Import**
4. 설정은 건드리지 말고 **Deploy** (Framework Preset은 Other 그대로)

1~2분 뒤 `https://jnu-photobooth.vercel.app` 같은 주소가 나옵니다.

### 4단계 — 사진 저장소 연결 (이걸 빼면 QR이 안 됩니다)

1. Vercel 대시보드 → 방금 만든 프로젝트 → **Storage** 탭
2. **Create Database** → **Blob** 선택 → 이름 정하고 **Create**
3. 만들어진 스토어에서 **Connect to Project** → 이 프로젝트 선택
4. **Deployments** 탭 → 맨 위 배포의 **⋯ → Redeploy**

연결하면 필요한 환경변수가 자동으로 들어가므로 직접 입력할 것은 없습니다.
4번의 재배포를 해야 환경변수가 적용됩니다.

### 5단계 — 아이패드에서 열기

나온 https 주소를 아이패드 Safari에서 엽니다.
공유 버튼 → **홈 화면에 추가** 하면 주소창 없이 전체화면으로 쓸 수 있습니다.

### 나중에 수정한 내용을 반영하려면

`deploy` 폴더에서:

```bash
git add -A
git commit -m "수정 내용"
git push
```

푸시하면 Vercel이 자동으로 다시 배포합니다.

## 확인할 것

- 아이패드에서 카메라 권한 허용 팝업이 뜨는지
- 촬영 후 사진 아래에 QR이 나오는지
- 다른 휴대폰으로 QR을 찍어 사진이 열리고, 꾹 눌러 저장되는지

QR이 안 읽히면 QR 옆에 주소가 글자로도 나오니 직접 입력해도 됩니다.

## 무료 범위

Vercel Hobby 플랜 기준 Blob 저장 용량은 월 1GB입니다. 사진 한 장이 약 0.5MB이고
30분 뒤 삭제되므로, 축제 규모에서는 넉넉합니다.

## 노트북 부스와의 관계

같은 `index.html` 이 두 환경에서 모두 동작합니다.

- **배포본** — `/api/upload` 로 사진을 올리고 링크를 받아 QR을 만듭니다
- **노트북 부스** — 업로드 경로가 없으므로, 브라우저가 `photos` 폴더에 직접 쓰고
  로컬 서버가 내보냅니다 (Chrome/Edge 전용)

아이패드에는 폴더 접근 기능이 없어서 배포본에서만 QR이 동작합니다.
