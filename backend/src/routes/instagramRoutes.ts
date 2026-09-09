// 인스타그램 공개 API — 서버가 1시간마다 받아 둔 캐시만 돌려준다. 토큰은 절대 나가지 않는다.
import { Router, Request, Response } from 'express';
import { getInstagramPosts } from '../utils/instagram';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const { posts, username, fetchedAt } = await getInstagramPosts();
    res.json({ posts, username, fetchedAt });
  } catch {
    res.json({ posts: [], username: null, fetchedAt: null }); // 실패해도 홈이 깨지지 않게 빈 목록
  }
});

export default router;
