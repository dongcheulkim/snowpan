// 사장님·직원 답장 문구 (2026-09-24) — 매장별 공유, 최대 20개·500자. 채팅에서 '문구' 버튼으로 바로 넣는다.
import { Router, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { canManageShop, isStaffShopType } from '../utils/shopAccess';
import { sanitizeText } from '../utils/sanitize';

const router = Router();
const MAX_PER_SHOP = 20;
const MAX_LEN = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanText(raw: unknown, res: Response): string | null {
  if (typeof raw !== 'string') { res.status(400).json({ error: '문구를 입력해 주세요.' }); return null; }
  if (raw.length > MAX_LEN) { res.status(400).json({ error: `문구는 ${MAX_LEN}자까지 저장할 수 있어요.` }); return null; }
  const text = sanitizeText(raw, MAX_LEN);
  if (!text) { res.status(400).json({ error: '문구를 입력해 주세요.' }); return null; }
  return text;
}

router.get('/shops/:shopType/:shopId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { shopType, shopId } = req.params;
    if (!isStaffShopType(shopType) || !UUID_RE.test(shopId)) { res.status(400).json({ error: '매장 정보가 올바르지 않아요.' }); return; }
    if (!(await canManageShop(req.user, shopType, shopId))) { res.status(403).json({ error: '매장 사장님이나 직원만 볼 수 있어요.' }); return; }
    const rows = await prisma.shopReplyTemplate.findMany({ where: { shopType, shopId }, orderBy: { createdAt: 'asc' }, select: { id: true, text: true, createdAt: true } });
    res.json(rows);
  } catch (e) { console.error('Reply templates list error:', e); res.status(500).json({ error: '답장 문구를 불러오지 못했어요.' }); }
});

router.post('/shops/:shopType/:shopId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { shopType, shopId } = req.params;
    if (!isStaffShopType(shopType) || !UUID_RE.test(shopId)) { res.status(400).json({ error: '매장 정보가 올바르지 않아요.' }); return; }
    if (!(await canManageShop(req.user, shopType, shopId))) { res.status(403).json({ error: '매장 사장님이나 직원만 저장할 수 있어요.' }); return; }
    const text = cleanText(req.body?.text, res); if (!text) return;
    const count = await prisma.shopReplyTemplate.count({ where: { shopType, shopId } });
    if (count >= MAX_PER_SHOP) { res.status(400).json({ error: `답장 문구는 ${MAX_PER_SHOP}개까지 저장할 수 있어요.` }); return; }
    const row = await prisma.shopReplyTemplate.create({ data: { shopType, shopId, text, createdBy: req.user!.id }, select: { id: true, text: true, createdAt: true } });
    res.status(201).json(row);
  } catch (e) { console.error('Reply template create error:', e); res.status(500).json({ error: '답장 문구를 저장하지 못했어요.' }); }
});

async function loadManaged(req: AuthRequest, res: Response): Promise<{ id: string; shopType: string; shopId: string } | null> {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) { res.status(404).json({ error: '문구를 찾을 수 없어요.' }); return null; }
  const row = await prisma.shopReplyTemplate.findUnique({ where: { id }, select: { id: true, shopType: true, shopId: true } });
  if (!row) { res.status(404).json({ error: '문구를 찾을 수 없어요.' }); return null; }
  if (!(await canManageShop(req.user, row.shopType, row.shopId))) { res.status(403).json({ error: '매장 사장님이나 직원만 고칠 수 있어요.' }); return null; }
  return row;
}

router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const row = await loadManaged(req, res); if (!row) return;
    const text = cleanText(req.body?.text, res); if (!text) return;
    const updated = await prisma.shopReplyTemplate.update({ where: { id: row.id }, data: { text }, select: { id: true, text: true, createdAt: true } });
    res.json(updated);
  } catch (e) { console.error('Reply template update error:', e); res.status(500).json({ error: '답장 문구를 고치지 못했어요.' }); }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const row = await loadManaged(req, res); if (!row) return;
    await prisma.shopReplyTemplate.delete({ where: { id: row.id } });
    res.json({ message: '지웠어요.' });
  } catch (e) { console.error('Reply template delete error:', e); res.status(500).json({ error: '답장 문구를 지우지 못했어요.' }); }
});

export default router;
