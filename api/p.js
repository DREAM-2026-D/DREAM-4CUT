import { head } from '@vercel/blob';

// QR 을 스캔하면 열리는 페이지.
// 부스에 서 있는 동안에는 같이 찍은 사람들이 각자 받아갈 수 있어야 하므로
// 횟수 제한을 두지 않는다. 대신 부스에서 [다시 찍기] 를 누르면 즉시 삭제되고
// (api/revoke), 아무도 안 눌러도 30분 뒤 자동 삭제된다.

function shell(inner) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>인생네컷 받기</title><style>
*{box-sizing:border-box}
body{margin:0;background:#05100d;color:#fff;text-align:center;
 font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
 padding:26px 16px calc(34px + env(safe-area-inset-bottom,0px));-webkit-font-smoothing:antialiased}
h1{margin:0 0 4px;font-size:18px;font-weight:900;color:#12e3a6;letter-spacing:.02em}
.sub{margin:0 0 18px;font-size:14px;color:rgba(255,255,255,.72);line-height:1.7}
.sub.big{font-size:18px;font-weight:800;color:#fff;margin-top:30px}
img{max-width:100%;height:auto;border-radius:12px;display:block;margin:0 auto 20px;
 box-shadow:0 10px 40px rgba(0,0,0,.55)}
.tip{margin:0 auto;max-width:420px;font-size:14px;line-height:1.95;
 color:rgba(255,255,255,.7);background:rgba(255,255,255,.06);
 border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:15px 16px}
.tip b{color:#fff}
.note{margin:16px 0 0;font-size:12.5px;color:rgba(255,255,255,.45);line-height:1.8}
</style></head><body>
<h1>2026 제주대학교 통합체전</h1>
${inner}
</body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const id = String(req.query.id || '').toLowerCase();
  const gone = shell(`
    <p class="sub big">사진을 찾을 수 없습니다.</p>
    <p class="sub">부스에서 다음 팀이 시작했거나<br>보관 시간(30분)이 지났습니다.</p>
    <p class="note">부스에서 다시 촬영해 주세요.</p>`);

  if (!/^[a-z0-9]{4,16}$/.test(id)) return res.status(400).send(gone);

  try {
    const blob = await head(`cut/${id}.jpg`);
    return res.status(200).send(shell(`
      <p class="sub">사진을 꾹 눌러 저장하세요</p>
      <img src="${blob.url}" alt="인생네컷">
      <div class="tip">
        <b>아이폰</b> — 사진을 꾹 누르고 <b>사진에 추가</b><br>
        <b>안드로이드</b> — 사진을 꾹 누르고 <b>이미지 다운로드</b>
      </div>
      <p class="note">같이 찍은 친구들도 지금 QR 을 찍으면 받을 수 있어요.<br>
      부스에서 다음 팀이 시작하면 사라집니다.</p>`));
  } catch (err) {
    return res.status(404).send(gone);
  }
}
