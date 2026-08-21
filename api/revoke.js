import { head, del } from '@vercel/blob';

// 부스에서 [다시 찍기] 를 누르면 호출된다. 방금 팀의 사진을 즉시 지운다.
//
// 초상권상 사진이 부스를 떠난 뒤에도 남아 있으면 안 되므로, 다음 팀이 시작하는
// 시점에 확실히 없앤다. 아무도 안 눌러도 30분 뒤 자동 삭제된다(api/upload).
//
// 인증을 두지 않은 이유: id 를 아는 사람은 어차피 사진을 볼 수 있고, 이 요청으로
// 할 수 있는 일은 "지우는 것" 뿐이라 남의 사진을 훔쳐볼 수단이 되지 않는다.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const id = String(req.query.id || '').toLowerCase();
  if (!/^[a-z0-9]{4,16}$/.test(id)) {
    return res.status(400).json({ error: 'bad_id' });
  }

  try {
    const blob = await head(`cut/${id}.jpg`);
    await del(blob.url);
    return res.status(200).json({ ok: true, deleted: true });
  } catch (err) {
    // 이미 없으면(만료 등) 성공으로 본다 - 부스 화면이 이 응답을 기다리지 않는다
    return res.status(200).json({ ok: true, deleted: false });
  }
}
