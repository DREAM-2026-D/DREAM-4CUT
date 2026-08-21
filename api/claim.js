import { head, put, del } from '@vercel/blob';

// 일회성 수령 처리.
//
// 왜 페이지 접속(GET /p/<id>)이 아니라 이 엔드포인트에서 소모시키는가:
// QR 스캐너 앱이나 메신저가 링크를 미리 불러오는(preview/prefetch) 경우가 흔하다.
// 페이지를 여는 것만으로 토큰을 태우면, 정작 학생은 사진을 못 받고 "이미 받음"만 본다.
// 그래서 학생이 [사진 받기] 를 직접 눌렀을 때만 소모한다.
//
// 상태 저장: 서버리스는 요청마다 다른 인스턴스라 메모리(Map)를 쓸 수 없다.
// 이미 쓰고 있는 Blob 저장소에 used/<id>.txt 를 남겨 "사용됨" 표시로 삼는다.

const USED_PREFIX = 'used/';
const CUT_PREFIX = 'cut/';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const id = String(req.query.id || '').toLowerCase();
  if (!/^[a-z0-9]{4,16}$/.test(id)) {
    return res.status(400).json({ error: 'bad_id' });
  }

  // 1) 이미 받아간 사진인가
  try {
    await head(`${USED_PREFIX}${id}.txt`);
    return res.status(410).json({ error: 'used' });
  } catch (e) {
    // 없으면 정상 (아직 안 받아감)
  }

  // 2) 사진이 남아 있는가 (30분 지나면 정리됨)
  let blob;
  try {
    blob = await head(`${CUT_PREFIX}${id}.jpg`);
  } catch (e) {
    return res.status(404).json({ error: 'expired' });
  }

  try {
    // 3) 삭제하기 전에 내용을 먼저 읽어둔다
    const r = await fetch(blob.url);
    if (!r.ok) throw new Error('fetch ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());

    // 4) 사용 표시를 먼저 남긴다.
    //    동시에 두 번 스캔되어도 두 번째는 위 1번에서 걸러지게 하려는 것.
    //    (완벽한 원자적 처리는 아니다 - 아래 주석 참고)
    await put(`${USED_PREFIX}${id}.txt`, String(Date.now()), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'text/plain'
    });

    // 5) 원본 삭제 - 초상권상 받아간 뒤에는 남기지 않는다
    await del(blob.url).catch(() => {});

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', String(buf.length));
    return res.status(200).send(buf);
  } catch (err) {
    console.error('claim', err);
    return res.status(500).json({ error: 'failed' });
  }
}
