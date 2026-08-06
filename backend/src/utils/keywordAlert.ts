import prisma from '../config/database';
import { createNotification } from '../controllers/notificationController';
import { sendPushToUser } from './push';

// 새 중고매물이 등록되면, 매물명·브랜드에 저장 키워드가 포함된 사용자에게 알림.
// 판매자 본인은 제외. 실패해도 매물 등록 흐름을 막지 않게 호출부에서 await 없이 fire-and-forget.
export async function notifyKeywordMatches(product: { id: string; name: string; brand?: string | null; userId: string; vertical?: string }): Promise<void> {
  try {
    // 키워드 알림은 현재 snow 전용 (키워드 관리 UI 가 스노우판에만 있음) —
    // run/bike/golf 매물이 스노우 유저에게 잘못 알림 가는 것 방지.
    if (product.vertical && product.vertical !== 'snow') return;
    const haystack = `${product.name || ''} ${product.brand || ''}`.toLowerCase();
    if (!haystack.trim()) return;

    // 초기 규모에선 전량 조회 후 메모리 매칭. 커지면 인덱스/역색인으로 전환.
    const searches = await prisma.savedSearch.findMany({ select: { userId: true, keyword: true } });
    if (searches.length === 0) return;

    // 매칭된 사용자 집합 (판매자 제외, 중복 제거).
    const matchedUserIds = new Set<string>();
    for (const s of searches) {
      if (s.userId === product.userId) continue;
      if (matchedUserIds.has(s.userId)) continue;
      if (s.keyword && haystack.includes(s.keyword)) matchedUserIds.add(s.userId);
    }
    if (matchedUserIds.size === 0) return;

    const title = '키워드 알림';
    const message = `관심 키워드에 맞는 매물이 올라왔어요: ${product.name}`;
    const link = `/used/${product.id}`;

    await Promise.all([...matchedUserIds].map(async (uid) => {
      await createNotification(uid, 'system', title, message, link).catch(() => {});
      await sendPushToUser(uid, title, message, link).catch(() => {});
    }));
  } catch (error) {
    console.error('notifyKeywordMatches error:', error);
  }
}
