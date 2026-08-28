import { put, list, del } from '@vercel/blob';

// 초상권 때문에 사진은 찍은 사람만 가져갈 수 있어야 하고, 오래 남으면 안 된다.
//  - 주소에 무작위 id 를 써서 추측할 수 없게 한다 (링크를 받은 사람만 접근)
//  - 목록을 노출하는 엔드포인트를 두지 않는다
//  - 업로드가 있을 때마다 만료된 사진을 지운다 (Blob 에는 TTL 이 없다)
const KEEP_MINUTES = 30;
const MAX_BYTES = 4 * 1024 * 1024;   // Vercel 함수 본문 한도가 4.5MB

// QR 이 촘촘하면 카메라가 못 읽는다. Blob 원본 주소는 100 글자라
// 짧은 /p/<id> 주소를 만들어 그쪽을 QR 에 담는다.
const ID_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789';   // 헷갈리는 l,o,0,1 제외
const ID_LEN = 8;

// QR 주소는 요청이 들어온 주소가 아니라 항상 이 주소로 만든다.
// 부스가 미리보기(preview) 배포 주소로 열려 있으면 그 주소에는 Vercel 로그인이
// 걸려 있어서, 요청 host 를 그대로 쓰면 QR 을 찍은 사람이 로그인 화면을 본다.
// 사진 찍는 사람에게 Vercel 계정이 있을 리 없으니 무조건 프로덕션으로 보낸다.
const PUBLIC_HOST = 'dream-4-cut.vercel.app';

function makeId() {
  let s = '';
  for (let i = 0; i < ID_LEN; i++) {
    s += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return s;
}

// 아무도 [다시 찍기] 를 안 눌렀을 때를 대비한 자동 정리.
// 평상시에는 다음 팀이 시작할 때 api/revoke 가 즉시 지운다.
async function sweepExpired() {
  const cutoff = Date.now() - KEEP_MINUTES * 60 * 1000;
  let cursor;
  const doomed = [];
  do {
    const page = await list({ prefix: "cut/", cursor, limit: 1000 });
    for (const b of page.blobs) {
      if (new Date(b.uploadedAt).getTime() < cutoff) doomed.push(b.url);
    }
    cursor = page.cursor;
  } while (cursor);
  if (doomed.length) await del(doomed);
  return doomed.length;
}

// 실행 환경에 따라 본문이 이미 버퍼로 들어와 있을 수도, 스트림일 수도 있다
async function readBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body instanceof Uint8Array) return Buffer.from(req.body);

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BYTES) throw new Error('too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method' });
  }

  try {
    const body = await readBody(req);
    if (body.length < 500) return res.status(400).json({ error: 'empty' });

    // 만료분 정리는 실패해도 업로드를 막지 않는다
    let swept = 0;
    try { swept = await sweepExpired(); } catch (e) { console.warn('sweep', e); }

    const id = makeId();
    await put(`cut/${id}.jpg`, body, {
      access: 'public',
      addRandomSuffix: false,      // 짧은 주소를 쓰려면 경로를 우리가 정해야 한다
      allowOverwrite: true,
      contentType: 'image/jpeg',
      cacheControlMaxAge: KEEP_MINUTES * 60
    });

    // 로컬에서 열어볼 때만 현재 주소를 쓴다
    const rawHost = req.headers['x-forwarded-host'] || req.headers.host || '';
    const local = /^(localhost|127\.0\.0\.1|\[?::1\]?|192\.168\.|10\.)/.test(rawHost);
    const host = local ? rawHost : PUBLIC_HOST;
    const proto = local ? (req.headers['x-forwarded-proto'] || 'http').split(',')[0] : 'https';

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      id,

      url: `${proto}://${host}/p/${id}`,
      keepMinutes: KEEP_MINUTES,
      swept
    });
  } catch (err) {
    console.error('upload', err);
    const msg = String(err && err.message) === 'too large' ? 'too large' : 'failed';
    return res.status(msg === 'too large' ? 413 : 500).json({ error: msg });
  }
}
