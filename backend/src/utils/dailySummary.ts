// 관리자 하루 요약 (2026-09-17, 사용자 요청 "관리자 하루 요약 메일").
// 매일 아침(기본 09:00 KST) 신고·승인 대기·답 없는 문의·어제 새로 생긴 것들을 세어
// 관리자 전원에게 알림·푸시로 보내고, SMTP(Gmail 앱 비밀번호 등)가 설정돼 있으면 메일도, 디스코드 웹훅이 있으면 거기도 보낸다.
// 앱을 안 열어도 놓치지 않게 하는 게 목적이라 "0건"이어도 보낸다.
import prisma from '../config/database';
import { createNotification } from '../controllers/notificationController';
import { sendPushToUser } from './push';
import { sendEmail } from './email';
import { sendDiscord } from './discord';
import { getAdminIds } from './supportInbox';
import { fmtKstDate } from './kst';

const LAST_KEY = 'dailySummary.lastDate';
const HOUR_KST = Number(process.env.DAILY_SUMMARY_HOUR ?? 9);

export interface DailySummary {
  date: string;
  pendingReports: number;
  pendingApprovals: { shops: number; lessons: number; accommodations: number; claims: number; competitions: number; agencies: number; total: number };
  unansweredSupport: number; // 손님이 마지막으로 말하고 1시간 넘게 답이 없는 고객센터 방
  last24h: { users: number; products: number; posts: number; chatRooms: number };
}

function kstNow(): Date { return new Date(Date.now() + 9 * 60 * 60 * 1000); }

export async function buildDailySummary(): Promise<DailySummary> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const adminIds = await getAdminIds();
  const [pendingReports, ski, repair, rental, lessons, accommodations, claims, competitions, agencies, users, products, posts, chatRooms] = await Promise.all([
    prisma.report.count({ where: { status: 'pending' } }),
    prisma.skiShop.count({ where: { approved: false } }),
    prisma.repairShop.count({ where: { approved: false } }),
    prisma.rental.count({ where: { approved: false } }),
    prisma.lesson.count({ where: { approved: false } }),
    prisma.accommodation.count({ where: { approved: false } }),
    prisma.shopClaim.count({ where: { status: 'pending' } }),
    prisma.competition.count({ where: { status: 'pending' } }),
    prisma.travelAgency.count({ where: { approved: false } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.product.count({ where: { createdAt: { gte: since }, category: 'used' } }),
    prisma.post.count({ where: { createdAt: { gte: since } } }),
    prisma.chatRoom.count({ where: { createdAt: { gte: since } } }),
  ]);
  // 답 없는 고객센터 방: 관리자가 참여한 방 중 마지막 메시지가 손님 것이고 1시간이 지난 방
  let unansweredSupport = 0;
  if (adminIds.length) {
    const rooms = await prisma.chatRoom.findMany({
      where: { OR: [{ user1Id: { in: adminIds } }, { user2Id: { in: adminIds } }] },
      select: { id: true, messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { senderId: true, createdAt: true } } },
      take: 500,
    });
    const cutoff = Date.now() - 60 * 60 * 1000;
    unansweredSupport = rooms.filter((r) => r.messages[0] && !adminIds.includes(r.messages[0].senderId) && r.messages[0].createdAt.getTime() < cutoff).length;
  }
  const shops = ski + repair + rental;
  return {
    date: fmtKstDate(new Date()),
    pendingReports,
    pendingApprovals: { shops, lessons, accommodations, claims, competitions, agencies, total: shops + lessons + accommodations + claims + competitions + agencies },
    unansweredSupport,
    last24h: { users, products, posts, chatRooms },
  };
}

export function summaryText(s: DailySummary): string {
  const a = s.pendingApprovals;
  const lines = [
    `신고 대기 ${s.pendingReports}건`,
    `승인 대기 ${a.total}건 (매장 ${a.shops}, 레슨 ${a.lessons}, 숙소 ${a.accommodations}, 소유권 이전 ${a.claims}, 시합 ${a.competitions}, 여행사 ${a.agencies})`,
    `답 없는 문의 ${s.unansweredSupport}건`,
    `지난 24시간: 가입 ${s.last24h.users}, 중고 매물 ${s.last24h.products}, 글 ${s.last24h.posts}, 새 채팅 ${s.last24h.chatRooms}`,
  ];
  return lines.join('\n');
}

export async function sendDailySummary(): Promise<DailySummary> {
  const s = await buildDailySummary();
  const title = `오늘 할 일 요약 (${s.date})`;
  const text = summaryText(s);
  const todo = s.pendingReports + s.pendingApprovals.total + s.unansweredSupport;
  const short = todo === 0 ? '처리할 것이 없어요.' : `처리할 것 ${todo}건: 신고 ${s.pendingReports} · 승인 ${s.pendingApprovals.total} · 문의 ${s.unansweredSupport}`;
  const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true, email: true } });
  for (const a of admins) {
    await createNotification(a.id, 'system', title, text, '/admin');
    sendPushToUser(a.id, title, short, '/admin').catch(() => {});
  }
  const html = `<div style="font-family:-apple-system,'Noto Sans KR',sans-serif;max-width:480px;margin:0 auto;padding:24px"><h2 style="margin:0 0 12px">${title}</h2><pre style="white-space:pre-wrap;font:14px/1.6 inherit;background:#f8fafc;padding:16px;border-radius:12px">${text}</pre><p><a href="https://snowpan.kr/admin">관리자 대시보드 열기</a></p></div>`;
  for (const a of admins) if (a.email) sendEmail(a.email, `[스노우판] ${title}`, html).catch(() => {});
  sendDiscord(title, text, '/admin').catch(() => {});
  return s;
}

export function smtpConfigured(): boolean { return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS); }

// 5분마다 시각을 보고, KST 기준 정해진 시(기본 9시)에 그날 아직 안 보냈으면 보낸다 (재시작·슬립에도 하루 한 번만).
export function startDailySummaryScheduler(): void {
  const tick = async () => {
    try {
      const now = kstNow();
      if (now.getUTCHours() !== HOUR_KST) return;
      const today = now.toISOString().slice(0, 10);
      const last = await prisma.adminSetting.findUnique({ where: { key: LAST_KEY } });
      if (last?.value === today) return;
      await prisma.adminSetting.upsert({ where: { key: LAST_KEY }, create: { key: LAST_KEY, value: today }, update: { value: today } });
      await sendDailySummary();
      console.log('[daily-summary] sent', today);
    } catch (e) { console.error('[daily-summary] error:', e); }
  };
  setInterval(() => { tick().catch(() => {}); }, 5 * 60 * 1000);
}
