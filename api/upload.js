import { put, list, del } from '@vercel/blob';

// 초상권 때문에 사진은 찍은 사람만 가져갈 수 있어야 하고, 오래 남으면 안 된다.
//  - addRandomSuffix 로 URL 을 추측할 수 없게 만든다 (링크를 받은 사람만 접근)
//  - 목록을 노출하는 엔드포인트를 두지 않는다
//  - 업로드가 있을 때마다 만료된 사진을 지운다 (Blob 에는 TTL 이 없다)
const KEEP_MINUTES = 30;
const MAX_BYTES = 12 * 1024 * 1024;

async function sweepExpired() {
  const cutoff = Date.now() - KEEP_MINUTES * 60 * 1000;
  let cursor;
  const doomed = [];
  do {
    const page = await list({ prefix: 'cut/', cursor, limit: 1000 });
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

    const blob = await put('cut/photo.jpg', body, {
      access: 'public',          // URL 을 아는 사람만 접근 (아래 addRandomSuffix)
      addRandomSuffix: true,     // 추측 불가능한 경로
      contentType: 'image/jpeg',
      cacheControlMaxAge: KEEP_MINUTES * 60
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ url: blob.url, keepMinutes: KEEP_MINUTES, swept });
  } catch (err) {
    console.error('upload', err);
    const msg = String(err && err.message) === 'too large' ? 'too large' : 'failed';
    return res.status(msg === 'too large' ? 413 : 500).json({ error: msg });
  }
}
