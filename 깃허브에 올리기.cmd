@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 인생네컷 - 깃허브에 올리기

echo.
echo ============================================
echo    인생네컷 배포본을 깃허브에 올립니다
echo ============================================
echo.

where git >nul 2>&1
if errorlevel 1 goto nogit

git remote get-url origin >nul 2>&1
if errorlevel 1 goto ask

echo 이미 연결된 저장소가 있습니다:
git remote get-url origin
echo.
goto push


:ask
echo 먼저 https://github.com/new 에서 저장소를 만들어 주세요.
echo.
echo    - 이름은 jnu-photobooth 처럼 원하는 대로
echo    - Public 선택
echo    - README, .gitignore, license 는 체크하지 마세요
echo.
echo 만든 뒤 주소를 복사해서 아래에 붙여넣으세요.
echo 예시  https://github.com/JMIN-22/jnu-photobooth.git
echo.
set "REPO="
set /p "REPO=저장소 주소: "

if not defined REPO goto empty

git remote add origin "%REPO%"
if errorlevel 1 goto badurl
goto push


:push
echo.
echo 올리는 중입니다.
echo 로그인 창이 뜨면 깃허브 계정으로 로그인해 주세요.
echo.

git branch -M main
git push -u origin main
if errorlevel 1 goto pushfail

echo.
echo ============================================
echo    올리기 완료
echo ============================================
echo.
echo 다음은 브라우저에서 하시면 됩니다.
echo.
echo   1. https://vercel.com 접속, Continue with GitHub 으로 로그인
echo   2. Add New 에서 Project 선택, 방금 만든 저장소 옆 Import
echo   3. 설정 건드리지 말고 Deploy
echo   4. 프로젝트의 Storage 탭에서 Create Database, Blob 선택해 생성
echo      만든 뒤 Connect to Project 로 이 프로젝트에 연결
echo   5. Deployments 탭에서 맨 위 배포의 점 세개 메뉴, Redeploy
echo.
echo   4번과 5번을 빼먹으면 촬영은 되는데 QR 이 안 나옵니다.
echo.
goto end


:nogit
echo [오류] git 이 설치되어 있지 않습니다.
echo        https://git-scm.com 에서 설치한 뒤 다시 실행해 주세요.
echo.
goto end


:empty
echo.
echo 주소가 비어 있어 중단합니다.
echo.
goto end


:badurl
echo.
echo [오류] 저장소 주소를 등록하지 못했습니다.
echo        주소를 다시 확인하고 실행해 주세요.
echo.
goto end


:pushfail
echo.
echo ============================================
echo    올리지 못했습니다
echo ============================================
echo.
echo   위에 표시된 메시지를 확인해 주세요. 흔한 경우는 두 가지입니다.
echo.
echo   [1] Permission to ... denied to ... 라고 나온 경우
echo       저장소 주인 계정과 이 PC 에 로그인된 계정이 다릅니다.
echo       해결 방법 중 하나를 고르세요.
echo.
echo       가. 저장소 주인 계정으로 깃허브에 로그인해서
echo           저장소 Settings - Collaborators 에서 이 PC 계정을 추가
echo.
echo       나. 이 PC 의 깃허브 로그인을 저장소 주인 계정으로 바꾸기
echo           아래를 입력해 저장된 로그인을 지운 뒤 다시 실행하면
echo           로그인 창이 새로 뜹니다.
echo             cmdkey /delete:LegacyGeneric:target=git:https://github.com
echo.
echo       다. 이 PC 에 로그인된 계정으로 저장소를 새로 만들어 사용
echo.
echo   [2] Repository not found 라고 나온 경우
echo       주소가 틀렸습니다. 아래로 지우고 다시 실행하세요.
echo         git remote remove origin
echo.
goto end


:end
pause
