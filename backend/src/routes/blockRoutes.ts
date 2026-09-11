// 사용자 차단 API — 앱스토어 지침 1.2(사용자 생성 콘텐츠 앱은 신고 + 차단 필수).
// POST /blocks/:userId 차단, DELETE /blocks/:userId 해제, GET /blocks 내 차단 목록, GET /blocks/status/:userId 내가 차단했는지.
import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateUUIDParam } from '../middleware/validateUUID';
import { displayName } from '../utils/displayName';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await prisma.userBlock.findMany({
      where: { blockerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { blocked: { select: { id: true, name: true, nickname: true, profileImage: true, role: true } } },
    });
    res.json(rows.map((r) => ({
      id: r.blocked.id,
      name: r.blocked.role === 'deleted' ? '탈퇴한 회원' : displayName(r.blocked),
      profileImage: r.blocked.profileImage,
      blockedAt: r.createdAt,
    })));
  } catch (error) {
    console.error('List blocks error:', error);
    res.status(500).json({ error: '차단 목록을 불러오지 못했어요.' });
  }
});

router.get('/status/:userId', validateUUIDParam('userId'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const row = await prisma.userBlock.findUnique({ where: { blockerId_blockedId: { blockerId: req.user!.id, blockedId: req.params.userId } }, select: { id: true } });
    res.json({ blocked: !!row });
  } catch {
    res.status(500).json({ error: '조회 실패' });
  }
});

router.post('/:userId', validateUUIDParam('userId'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!.id;
    const target = req.params.userId;
    if (target === me) { res.status(400).json({ error: '자기 자신은 차단할 수 없어요.' }); return; }
    const user = await prisma.user.findUnique({ where: { id: target }, select: { id: true, role: true } });
    if (!user) { res.status(404).json({ error: '사용자를 찾을 수 없어요.' }); return; }
    if (user.role === 'admin') { res.status(400).json({ error: '고객센터는 차단할 수 없어요.' }); return; }
    await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: me, blockedId: target } },
      create: { blockerId: me, blockedId: target },
      update: {},
    });
    res.json({ blocked: true });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: '차단 처리에 실패했어요.' });
  }
});

router.delete('/:userId', validateUUIDParam('userId'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.userBlock.deleteMany({ where: { blockerId: req.user!.id, blockedId: req.params.userId } });
    res.json({ blocked: false });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: '차단 해제에 실패했어요.' });
  }
});

export default router;
