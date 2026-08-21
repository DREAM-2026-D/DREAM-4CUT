import { head } from '@vercel/blob';

// QR 에 담기는 짧은 주소(/p/<id>)를 실제 사진으로 넘겨준다.
// Blob 원본 주소는 100 글자라 그대로 QR 에 넣으면 너무 촘촘해서 못 읽는다.

const NOT_FOUND = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>사진 없음</title></head>
<body style="margin:0;background:#05100d;color:#fff;text-align:center;padding:60px 24px;
 font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif">
<h1 style="font-size:20px;color:#12e3a6;margin:0 0 12px">사진을 찾을 수 없습니다</h1>
<p style="font-size:14px;color:rgba(255,255,255,.7);line-height:1.8;margin:0">
사진은 촬영 후 30분간만 보관됩니다.<br>부스에서 다시 촬영해 주세요.</p>
</body></html>`;

export default async function handler(req, res) {
  const id = String(req.query.id || '').toLowerCase();

  if (!/^[a-z0-9]{4,16}$/.test(id)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(NOT_FOUND);
  }

  try {
    const blob = await head(`cut/${id}.jpg`);
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, blob.url);
  } catch (err) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).send(NOT_FOUND);
  }
}
