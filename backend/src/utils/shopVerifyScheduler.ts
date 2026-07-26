import prisma from '../config/database';
import { notifyAdmins } from '../controllers/notificationController';
import { naverConfigured, naverLocalSearch, matchShopWithNaver } from './naverSearch';

// === AI 직원 ===
// 대기 중인 스키샵/정비샵을 주기적으로 확인 → 네이버 지역검색으로 더블체크 →
//   검증 통과 시: (AI_SHOP_AUTOAPPROVE=true 면 자동 승인) + 관리자 알림
//   불일치 시: 대기 유지 + "수동 확인 필요" 알림
// claim(소유권 이전)은 소유자 검증이 필요하므로 절대 자동화하지 않음 (사람 최종 판단).

const INTERVAL_MS = 10 * 60 * 1000; // 10분마다
const BATCH = 10;

async function processOne(
  type: 'skishop' | 'repair',
  shop: { id: string; name: string; phone: string | null; address: string; resort?: string | null },
  autoApprove: boolean,
): Promise<void> {
  // 상호 + (있으면) 지역으로 검색 정확도 향상.
  const query = shop.resort ? `${shop.name}` : shop.name;
  const places = await naverLocalSearch(query);
  const result = matchShopWithNaver(shop, places);

  const data: any = { aiReviewedAt: new Date(), aiVerified: result.verified, aiNote: result.note };
  const willApprove = result.verified && autoApprove;
  if (willApprove) data.approved = true;

  if (type === 'skishop') await prisma.skiShop.update({ where: { id: shop.id }, data });
  else await prisma.repairShop.update({ where: { id: shop.id }, data });

  const label = type === 'skishop' ? '스키샵' : '정비샵';
  if (willApprove) {
    await notifyAdmins('system', `🤖 AI 직원: ${label} 자동 승인`, `"${shop.name}" — ${result.note}`, '/admin-approval').catch(() => {});
  } else if (result.verified) {
    await notifyAdmins('system', `🤖 AI 직원: ${label} 검증 완료 (승인 대기)`, `"${shop.name}" — ${result.note}`, '/admin-approval').catch(() => {});
  } else {
    await notifyAdmins('system', `🤖 AI 직원: ${label} 수동 확인 필요`, `"${shop.name}" — ${result.note}`, '/admin-approval').catch(() => {});
  }
}

export async function verifyPendingShops(): Promise<void> {
  if (!naverConfigured()) return; // 네이버 키 미설정 → 조용히 스킵

  const autoApprove = process.env.AI_SHOP_AUTOAPPROVE === 'true';
  try {
    const skiShops = await prisma.skiShop.findMany({
      where: { approved: false, aiReviewedAt: null },
      select: { id: true, name: true, phone: true, address: true, resort: true },
      take: BATCH,
    });
    for (const s of skiShops) await processOne('skishop', s, autoApprove);

    const repairShops = await prisma.repairShop.findMany({
      where: { approved: false, aiReviewedAt: null },
      select: { id: true, name: true, phone: true, address: true },
      take: BATCH,
    });
    for (const s of repairShops) await processOne('repair', s, autoApprove);
  } catch (err) {
    console.error('AI 직원 검증 에러:', err);
  }
}

export function startShopVerifyScheduler(): void {
  if (!naverConfigured()) {
    console.log('🤖 AI 직원: NAVER_CLIENT_ID/SECRET 미설정 → 대기 (키 넣으면 자동 시작)');
    return;
  }
  verifyPendingShops();
  setInterval(verifyPendingShops, INTERVAL_MS);
  console.log(`🤖 AI 직원 시작됨 (10분 주기, 자동승인=${process.env.AI_SHOP_AUTOAPPROVE === 'true'})`);
}
