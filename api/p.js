import { head } from '@vercel/blob';

// QR 을 스캔하면 열리는 페이지. 여기서는 사진을 소모하지 않는다.
// 실제 수령은 학생이 [사진 받기] 를 눌러 /api/claim 을 호출할 때 일어난다.
// (QR 스캐너나 메신저가 링크를 미리 불러와도 토큰이 타지 않게 하려는 것)

const CUT_PREFIX = 'cut/';
const USED_PREFIX = 'used/';

function page(state, id) {
  const body = {
    ready: `
      <p class="sub">아래 버튼을 누르면 사진을 받을 수 있어요.</p>
      <button id="get">사진 받기</button>
      <p class="warn">이 QR 은 <b>한 번만</b> 사용할 수 있습니다.</p>`,
    used: `
      <p class="sub big">이미 다운로드된 사진입니다.</p>
      <p class="warn">일회성 QR 이라 다시 받을 수 없습니다.<br>부스에서 다시 촬영해 주세요.</p>`,
    expired: `
      <p class="sub big">사진을 찾을 수 없습니다.</p>
      <p class="warn">사진은 촬영 후 30분간만 보관됩니다.<br>부스에서 다시 촬영해 주세요.</p>`
  }[state];

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>인생네컷 받기</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#05100d;color:#fff;text-align:center;
 font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
 padding:34px 18px calc(40px + env(safe-area-inset-bottom,0px));-webkit-font-smoothing:antialiased}
h1{margin:0 0 6px;font-size:19px;font-weight:900;color:#12e3a6;letter-spacing:.02em}
.sub{margin:0 0 22px;font-size:15px;color:rgba(255,255,255,.78);line-height:1.7}
.sub.big{font-size:18px;font-weight:800;color:#fff;margin-top:26px}
.warn{margin:18px 0 0;font-size:13px;color:rgba(255,255,255,.55);line-height:1.8}
button{appearance:none;border:0;border-radius:999px;padding:17px 40px;font-size:17px;
 font-weight:800;background:#12e3a6;color:#04231d;font-family:inherit}
button:active{transform:scale(.97)}
button:disabled{opacity:.5}
img{max-width:100%;height:auto;border-radius:12px;display:block;margin:22px auto 0;
 box-shadow:0 10px 40px rgba(0,0,0,.55)}
.tip{margin:20px auto 0;max-width:420px;font-size:13.5px;line-height:1.9;
 color:rgba(255,255,255,.65);background:rgba(255,255,255,.06);
 border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px 16px}
.tip b{color:#fff}
</style></head><body>
<h1>2026 제주대학교 통합체전</h1>
<div id="box">${body}</div>
<script>
var btn = document.getElementById('get');
if (btn) btn.addEventListener('click', async function () {
  btn.disabled = true; btn.textContent = '받는 중...';
  try {
    var r = await fetch('/api/claim?id=${id}');
    if (!r.ok) {
      var msg = r.status === 410 ? '이미 다운로드된 사진입니다.'
              : r.status === 404 ? '사진이 만료되었습니다.'
              : '사진을 받지 못했습니다.';
      document.getElementById('box').innerHTML =
        '<p class="sub big">' + msg + '</p>' +
        '<p class="warn">부스에서 다시 촬영해 주세요.</p>';
      return;
    }
    var blob = await r.blob();
    var url = URL.createObjectURL(blob);
    document.getElementById('box').innerHTML =
      '<img src="' + url + '" alt="인생네컷">' +
      '<div class="tip"><b>아이폰</b> — 사진을 꾹 누르고 <b>사진에 추가</b><br>' +
      '<b>안드로이드</b> — 사진을 꾹 누르고 <b>이미지 다운로드</b><br>' +
      '<span style="color:rgba(255,255,255,.45)">이 화면을 벗어나면 다시 받을 수 없어요</span></div>';
  } catch (e) {
    btn.disabled = false; btn.textContent = '다시 시도';
  }
});
</script>
</body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const id = String(req.query.id || '').toLowerCase();
  if (!/^[a-z0-9]{4,16}$/.test(id)) {
    return res.status(400).send(page('expired', ''));
  }

  // 이미 받아갔는지 먼저 확인 (여기서는 소모하지 않는다)
  try {
    await head(`${USED_PREFIX}${id}.txt`);
    return res.status(200).send(page('used', id));
  } catch (e) { /* 아직 안 받아감 */ }

  try {
    await head(`${CUT_PREFIX}${id}.jpg`);
    return res.status(200).send(page('ready', id));
  } catch (e) {
    return res.status(404).send(page('expired', id));
  }
}
