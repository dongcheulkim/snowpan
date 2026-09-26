import { Request, Response } from 'express';
import { cleanupShopRows } from '../utils/shopRows';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { createNotification } from './notificationController';
import { sendPushToUser } from '../utils/push';
import { alertUser } from '../utils/ownerAlerts';
import { sendSupportMessage, cleanReason, rejectChatText, withReason } from '../utils/supportMessage';
import { cacheGet, cacheSet, cacheDel, cacheDelPrefix } from '../utils/cache';
import { invalidateUserTokens } from '../utils/tokens';
import { disconnectUser } from '../realtime';
import { isHttpUrl, isAllowedImageUrl } from '../utils/validate';
import bcrypt from 'bcryptjs';

// ===== 신고 관리 =====
export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const reports = await prisma.report.findMany({
      include: { reporter: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    // 신고 대상 이름·경로 해석 — 관리자가 어떤 매장/글이 신고됐는지 바로 확인·이동 가능하게.
    const byType: Record<string, string[]> = {};
    for (const r of reports) (byType[r.type] ||= []).push(r.targetId);
    const names: Record<string, Record<string, string>> = {};
    const put = (type: string, rows: { id: string; label: string }[]) => {
      names[type] = Object.fromEntries(rows.map((x) => [x.id, x.label]));
    };
    if (byType.product) put('product', (await prisma.product.findMany({ where: { id: { in: byType.product } }, select: { id: true, name: true } })).map(x => ({ id: x.id, label: x.name })));
    if (byType.post) put('post', (await prisma.post.findMany({ where: { id: { in: byType.post } }, select: { id: true, title: true } })).map(x => ({ id: x.id, label: x.title })));
    if (byType.user) put('user', (await prisma.user.findMany({ where: { id: { in: byType.user } }, select: { id: true, name: true, nickname: true } })).map(x => ({ id: x.id, label: x.nickname || x.name })));
    if (byType.skishop) put('skishop', (await prisma.skiShop.findMany({ where: { id: { in: byType.skishop } }, select: { id: true, name: true } })).map(x => ({ id: x.id, label: x.name })));
    if (byType.repair) put('repair', (await prisma.repairShop.findMany({ where: { id: { in: byType.repair } }, select: { id: true, name: true } })).map(x => ({ id: x.id, label: x.name })));
    if (byType.rental) put('rental', (await prisma.rental.findMany({ where: { id: { in: byType.rental } }, select: { id: true, name: true } })).map(x => ({ id: x.id, label: x.name })));
    if (byType.lesson) put('lesson', (await prisma.lesson.findMany({ where: { id: { in: byType.lesson } }, select: { id: true, name: true } })).map(x => ({ id: x.id, label: x.name })));
    if (byType.accommodation) put('accommodation', (await prisma.accommodation.findMany({ where: { id: { in: byType.accommodation } }, select: { id: true, name: true } })).map(x => ({ id: x.id, label: x.name })));
    // 작성자(대상 소유자) — 관리자가 누구 글인지 보고 경고·삭제를 판단하게 (2026-09-15)
    const owners = await reportTargetOwners(reports.map((r) => ({ type: r.type, targetId: r.targetId })));
    const ownerIds = [...new Set(Object.values(owners).filter((v): v is string => !!v))];
    const ownerRows = ownerIds.length ? await prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true, nickname: true } }) : [];
    const ownerById = Object.fromEntries(ownerRows.map((u) => [u.id, { id: u.id, name: u.nickname || u.name }]));
    // 같은 대상에 쌓인 신고 수 — 여러 명이 신고한 글을 먼저 보게
    const countByTarget: Record<string, number> = {};
    for (const r of reports) countByTarget[`${r.type}:${r.targetId}`] = (countByTarget[`${r.type}:${r.targetId}`] || 0) + 1;
    const rank = (s: string) => (s === 'pending' ? 0 : 1);
    res.json(reports
      .map((r) => ({
        ...r,
        targetName: names[r.type]?.[r.targetId] || null, // null = 이미 삭제된 대상
        targetPath: REPORT_PATH[r.type] ? REPORT_PATH[r.type](r.targetId) : null,
        targetOwner: ownerById[owners[`${r.type}:${r.targetId}`] || ''] || null,
        reportCount: countByTarget[`${r.type}:${r.targetId}`],
      }))
      .sort((a, b) => rank(a.status) - rank(b.status) || +new Date(b.createdAt) - +new Date(a.createdAt)));
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: '신고 조회 중 오류가 발생했습니다.' });
  }
};

const REPORT_PATH: Record<string, (id: string) => string> = {
  product: (id) => `/used/${id}`, post: (id) => `/community/post/${id}`, user: (id) => `/seller/${id}`,
  skishop: (id) => `/skishop/${id}`, repair: (id) => `/repair/${id}`, rental: (id) => `/rental/${id}`,
  lesson: (id) => `/lesson/${id}`, accommodation: (id) => `/accommodation/${id}`,
};
const REPORT_LABEL: Record<string, string> = { product: '중고 매물', post: '게시글', user: '회원', skishop: '스키·보드샵', repair: '정비샵', rental: '렌탈샵', lesson: '레슨', accommodation: '숙소' };

// 신고 대상의 소유자(작성자) userId — key "type:targetId". 삭제된 대상은 없음.
async function reportTargetOwners(items: { type: string; targetId: string }[]): Promise<Record<string, string | null>> {
  const byType: Record<string, string[]> = {};
  for (const it of items) (byType[it.type] ||= []).push(it.targetId);
  const out: Record<string, string | null> = {};
  const put = (type: string, rows: { id: string; userId: string | null }[]) => { for (const r of rows) out[`${type}:${r.id}`] = r.userId; };
  if (byType.post) put('post', await prisma.post.findMany({ where: { id: { in: byType.post } }, select: { id: true, userId: true } }));
  if (byType.product) put('product', await prisma.product.findMany({ where: { id: { in: byType.product } }, select: { id: true, userId: true } }));
  if (byType.user) for (const id of byType.user) out[`user:${id}`] = id;
  if (byType.skishop) put('skishop', await prisma.skiShop.findMany({ where: { id: { in: byType.skishop } }, select: { id: true, userId: true } }));
  if (byType.repair) put('repair', await prisma.repairShop.findMany({ where: { id: { in: byType.repair } }, select: { id: true, userId: true } }));
  if (byType.rental) put('rental', await prisma.rental.findMany({ where: { id: { in: byType.rental } }, select: { id: true, userId: true } }));
  if (byType.lesson) put('lesson', await prisma.lesson.findMany({ where: { id: { in: byType.lesson } }, select: { id: true, userId: true } }));
  if (byType.accommodation) put('accommodation', await prisma.accommodation.findMany({ where: { id: { in: byType.accommodation } }, select: { id: true, userId: true } }));
  return out;
}

// 신고 처리 — 사용자 요청 2026-09-15 "왜 신고했는지 보고 삭제할지 놔둘지 고객센터에서 고를 수 있어야".
// body.action: 'delete'(게시글·중고 매물 삭제 + 작성자 알림) | 'warn'(작성자에게 안내만) | 'keep'(문제 없음·유지, 기본값)
// body.note: 작성자에게 함께 보낼 문구(선택, 500자). 같은 대상에 쌓인 대기 신고는 한꺼번에 같은 결과로 처리하고 신고자 전원에게 결과를 알린다.
export const resolveReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { id } = req.params;
    const rawAction = req.body?.action;
    const action: 'delete' | 'warn' | 'keep' = rawAction === undefined ? 'keep' : rawAction; // 옛 호출({status:'resolved'})은 유지 처리
    if (!['delete', 'warn', 'keep'].includes(action)) { res.status(400).json({ error: 'action 은 delete, warn, keep 중 하나여야 합니다.' }); return; }
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) { res.status(404).json({ error: '신고를 찾을 수 없습니다.' }); return; }
    if (report.status === 'resolved') { res.json({ ...report, message: '이미 처리된 신고예요.', resolvedCount: 0 }); return; }
    if (action === 'delete' && !['post', 'product'].includes(report.type)) {
      res.status(400).json({ error: '삭제 처리는 게시글·중고 매물만 가능해요. 회원은 유저관리, 매장은 승인관리에서 처리해 주세요.' });
      return;
    }
    const label = REPORT_LABEL[report.type] || report.type;
    const ownerId = (await reportTargetOwners([{ type: report.type, targetId: report.targetId }]))[`${report.type}:${report.targetId}`] || null;
    const targetExists = ownerId !== null || report.type === 'user';

    // 1) 대상 삭제 (게시글·중고 매물) — 이미 지워졌으면 그대로 결과만 기록
    if (action === 'delete' && targetExists) {
      if (report.type === 'post') await prisma.post.delete({ where: { id: report.targetId } });
      else { await prisma.product.update({ where: { id: report.targetId }, data: { deletedAt: new Date() } }); await prisma.wishlist.deleteMany({ where: { productId: report.targetId } }).catch(() => {}); cacheDelPrefix('products:'); cacheDelPrefix('market:'); cacheDelPrefix('home:hotdeals'); }
    }

    // 2) 같은 대상의 대기 신고 전부 같은 결과로
    const siblings = await prisma.report.findMany({ where: { type: report.type, targetId: report.targetId, status: 'pending' }, select: { id: true, reporterId: true } });
    const resolution = action === 'delete' ? 'deleted' : action === 'warn' ? 'warned' : 'kept';
    await prisma.report.updateMany({ where: { id: { in: siblings.map((s) => s.id) } }, data: { status: 'resolved', resolution, adminNote: note || null, resolvedAt: new Date() } });

    // 3) 작성자 알림 (삭제·경고) — 신고자가 누군지는 절대 안 알려줌
    const suffix = note ? ` 안내: ${note}` : '';
    if (ownerId && ownerId !== req.user!.id) {
      if (action === 'delete') {
        await createNotification(ownerId, 'system', `${label}이(가) 삭제되었어요`, `신고가 접수되어 검토한 결과 "${report.reason}" 사유로 ${label}을(를) 삭제했어요.${suffix} 이용약관을 확인해 주세요.`, '/terms');
        sendPushToUser(ownerId, `${label}이(가) 삭제되었어요`, `"${report.reason}" 사유로 삭제됐어요.`, '/notifications').catch(() => {});
      } else if (action === 'warn') {
        await createNotification(ownerId, 'system', '커뮤니티 규칙 안내', `${label}에 대한 신고가 접수되어 검토했어요. 사유: ${report.reason}.${suffix} 같은 일이 반복되면 ${label}이(가) 삭제되거나 이용이 제한될 수 있어요.`, targetExists && REPORT_PATH[report.type] ? REPORT_PATH[report.type](report.targetId) : '/terms');
        sendPushToUser(ownerId, '커뮤니티 규칙 안내', `${label} 신고 검토 결과를 확인해 주세요.`, '/notifications').catch(() => {});
      }
    }
    // 4) 신고자 전원에게 결과
    const resultMsg = action === 'delete' ? `신고하신 ${label}이(가) 삭제 처리되었어요. 알려 주셔서 감사해요.`
      : action === 'warn' ? `신고하신 ${label}의 작성자에게 규칙 안내를 보냈어요. 알려 주셔서 감사해요.`
      : `신고하신 ${label}을(를) 검토했지만 규정 위반이 확인되지 않아 그대로 두었어요. 알려 주셔서 감사해요.`;
    for (const rid of new Set(siblings.map((s) => s.reporterId))) {
      if (rid === req.user!.id) continue;
      await createNotification(rid, 'system', '신고 처리 결과', resultMsg, '/help');
    }
    const updated = await prisma.report.findUnique({ where: { id } });
    res.json({ ...updated, message: action === 'delete' ? `${label}을(를) 삭제하고 신고를 처리했어요.` : action === 'warn' ? '작성자에게 안내를 보내고 신고를 처리했어요.' : '문제 없음으로 처리했어요.', resolvedCount: siblings.length });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ error: '신고 처리 중 오류가 발생했습니다.' });
  }
};

// 처리 완료된 신고 기록 삭제 — 사용자 요청 2026-09-22 "신고관리에도 이미 완료된 것 삭제할 수 있게".
// 대기중 신고는 먼저 처리(삭제·경고·유지)해야 지울 수 있다. 처리 결과(게시글 삭제·알림)는 이미 반영됐으므로 기록만 사라진다.
export const deleteReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { id } = req.params;
    const report = await prisma.report.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!report) { res.status(404).json({ error: '신고를 찾을 수 없습니다.' }); return; }
    if (report.status !== 'resolved') { res.status(400).json({ error: '아직 처리하지 않은 신고는 지울 수 없어요. 먼저 삭제·경고·유지 중 하나로 처리해 주세요.' }); return; }
    await prisma.report.delete({ where: { id } });
    res.json({ message: '신고 기록을 삭제했어요.' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: '삭제 중 오류가 발생했어요.' });
  }
};

// ===== 통계 =====
function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }

    // 1) 누적 카운트
    const [users, products, posts, chatRooms] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.post.count(),
      prisma.chatRoom.count(),
    ]);

    // 2) 동시접속자 (Socket.IO connection 수). 미들웨어에서 io 를 app.locals 에 셋팅했음.
    const io = req.app.get('io');
    let concurrent = 0;
    let concurrentUsers = 0;
    try {
      // engine.clientsCount = 활성 socket 연결 수 (인증 안 된 연결 포함 가능)
      concurrent = io?.engine?.clientsCount ?? 0;
      // 로그인 유저 룸 (`user:<id>`) 의 distinct 카운트
      const rooms = io?.sockets?.adapter?.rooms;
      if (rooms) {
        let n = 0;
        for (const key of rooms.keys()) {
          if (typeof key === 'string' && key.startsWith('user:')) n++;
        }
        concurrentUsers = n;
      }
    } catch { /* ignore */ }

    // 3) DAU/방문 통계 — 최근 14일
    const days = 14;
    const today = todayKST();
    // KST 오늘 00:00(UTC 로 환산)을 기준으로 14일 창 — 서버가 UTC 라서
    // UTC 자정 기준으로 잡으면 KST 00~09시 사이 "오늘" 버킷이 통째로 빠지던 문제.
    const kstTodayStart = new Date(`${today}T00:00:00+09:00`);
    const since = new Date(kstTodayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    const sinceStr = (() => { const d = new Date(since.getTime() + 9 * 60 * 60 * 1000); return d.toISOString().slice(0, 10); })();

    const [newUsers, newProducts, visits] = await Promise.all([
      prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.product.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.dailyVisit.findMany({
        where: { date: { gte: sinceStr } },
        select: { date: true, ip: true, count: true },
      }),
    ]);

    // 일별 버킷 — KST 기준
    const buckets: { date: string; users: number; products: number; visitors: number; pageviews: number }[] = [];
    const dateList: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      dateList.push(kstDate);
      buckets.push({ date: kstDate.slice(5), users: 0, products: 0, visitors: 0, pageviews: 0 });
    }

    const kstKeyOfDate = (d: Date) => new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).slice(5);
    for (const u of newUsers) {
      const b = buckets.find(x => x.date === kstKeyOfDate(new Date(u.createdAt)));
      if (b) b.users++;
    }
    for (const p of newProducts) {
      const b = buckets.find(x => x.date === kstKeyOfDate(new Date(p.createdAt)));
      if (b) b.products++;
    }
    // visits — date 가 이미 'YYYY-MM-DD' KST. distinct ip 카운트 + pageview 합계
    const visitorsByDate = new Map<string, Set<string>>();
    const pageviewsByDate = new Map<string, number>();
    for (const v of visits) {
      const set = visitorsByDate.get(v.date) || new Set();
      set.add(v.ip);
      visitorsByDate.set(v.date, set);
      pageviewsByDate.set(v.date, (pageviewsByDate.get(v.date) || 0) + v.count);
    }
    for (const b of buckets) {
      const fullDate = dateList.find(d => d.slice(5) === b.date);
      if (fullDate) {
        b.visitors = visitorsByDate.get(fullDate)?.size || 0;
        b.pageviews = pageviewsByDate.get(fullDate) || 0;
      }
    }

    // 4) 핵심 지표 요약
    const todayBucket = buckets.find(b => b.date === today.slice(5)) || { visitors: 0, pageviews: 0 };
    const last7 = buckets.slice(-7);
    const wau = new Set<string>();
    for (const v of visits) {
      const dayIndex = dateList.indexOf(v.date);
      if (dayIndex >= dateList.length - 7) wau.add(v.ip);
    }

    // 카테고리별 누적 조회수 — 어느 카테고리가 인기 있는지 랭킹용.
    // (렌탈·레슨·숙소는 2026-09-06 부터 집계 시작 — 그 전 조회는 없음)
    const [pv, sv, rv, rev, lev, av, cv, ov] = await Promise.all([
      prisma.product.aggregate({ _sum: { viewCount: true }, where: { category: 'used' } }),
      prisma.skiShop.aggregate({ _sum: { viewCount: true } }),
      prisma.repairShop.aggregate({ _sum: { viewCount: true } }),
      prisma.rental.aggregate({ _sum: { viewCount: true } }),
      prisma.lesson.aggregate({ _sum: { viewCount: true } }),
      prisma.accommodation.aggregate({ _sum: { viewCount: true } }),
      prisma.post.aggregate({ _sum: { views: true } }),
      prisma.overseasResort.aggregate({ _sum: { viewCount: true } }),
    ]);
    const pollV = await prisma.poll.aggregate({ _sum: { views: true } });
    const categoryViews = [
      { key: 'used', label: '중고거래', views: pv._sum.viewCount || 0 },
      { key: 'skishop', label: '스키샵', views: sv._sum.viewCount || 0 },
      { key: 'repair', label: '정비', views: rv._sum.viewCount || 0 },
      { key: 'rental', label: '렌탈', views: rev._sum.viewCount || 0 },
      { key: 'lesson', label: '레슨', views: lev._sum.viewCount || 0 },
      { key: 'accommodation', label: '숙소', views: av._sum.viewCount || 0 },
      { key: 'community', label: '커뮤니티', views: (cv._sum.views || 0) + (pollV._sum.views || 0) },
      { key: 'overseas', label: '스키장 투어', views: ov._sum.viewCount || 0 },
    ].sort((a, b) => b.views - a.views);

    // DB 용량 — Render Basic-256mb(스토리지 1GB) 한도 추적용. 실패해도 통계는 정상 반환.
    let dbSizeBytes: number | null = null;
    try {
      const r = await prisma.$queryRaw<{ size: bigint }[]>`SELECT pg_database_size(current_database()) AS size`;
      dbSizeBytes = Number(r[0]?.size ?? 0) || null;
    } catch { /* ignore */ }

    res.json({
      // 누적
      users, products, posts, chatRooms,
      // 실시간
      live: { concurrent, concurrentUsers },
      // 오늘
      today: { visitors: todayBucket.visitors, pageviews: todayBucket.pageviews },
      // 최근 7일
      week: { uniqueVisitors: wau.size, pageviews: last7.reduce((s, b) => s + b.pageviews, 0) },
      // 14일 차트 데이터
      daily: buckets,
      // 카테고리별 누적 조회수 (인기 랭킹)
      categoryViews,
      // DB 사용량 (bytes)
      dbSizeBytes,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.' });
  }
};

// ===== 유저 관리 =====
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const users = await prisma.user.findMany({
      select: { id: true, name: true, nickname: true, email: true, role: true, phone: true, createdAt: true, withdrawnName: true, withdrawnEmail: true, withdrawnPhone: true, withdrawnAt: true },
      orderBy: { createdAt: 'desc' },
    });
    // 전화번호 마스킹 — 가운데 4자리 가림 (010-1234-5678 → 010-****-5678).
    // admin 권한이라도 list 화면에선 평문 노출 X. 신고 처리 등 필요 시 별도 단건 조회로.
    const maskPhone = (p: string | null) => (p ? p.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1****$3') : p);
    const masked = users.map((u) => ({
      ...u,
      phone: maskPhone(u.phone),
      withdrawnPhone: maskPhone(u.withdrawnPhone), // 탈퇴 회원의 원래 번호도 같은 마스킹
    }));
    res.json(masked);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: '유저 목록 조회 중 오류가 발생했습니다.' });
  }
};

export const banUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { id } = req.params;
    if (id === req.user!.id) { res.status(400).json({ error: '본인 계정은 정지할 수 없습니다.' }); return; }
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) { res.status(404).json({ error: '유저를 찾을 수 없습니다.' }); return; }
    // 관리자 계정은 정지 대상에서 제외 (해제 시 user 로 강등되어 권한 소실되는 문제 포함).
    if (target.role === 'admin') { res.status(400).json({ error: '관리자 계정은 정지할 수 없습니다.' }); return; }
    const newRole = target.role === 'banned' ? 'user' : 'banned';
    const user = await prisma.user.update({ where: { id }, data: { role: newRole } });
    if (newRole === 'banned') { invalidateUserTokens(id); disconnectUser(id); }
    const msg = newRole === 'banned' ? '계정이 정지되었습니다.' : '계정 정지가 해제되었습니다.';
    await createNotification(id, 'system', newRole === 'banned' ? '계정 정지' : '정지 해제', msg);
    res.json({ id: user.id, name: user.name, role: user.role, message: msg });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: '유저 정지 중 오류가 발생했습니다.' });
  }
};

// 관리자: 사용자 강제 탈퇴 — 사용자 본인 탈퇴와 동일하게 PII 익명화 처리.
// 거래·후기·게시글은 전자상거래법 5년 보관 의무로 유지.
export const adminDeleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { id } = req.params;
    if (id === req.user!.id) { res.status(400).json({ error: '본인 계정은 사용자 화면에서 탈퇴해주세요.' }); return; }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) { res.status(404).json({ error: '유저를 찾을 수 없습니다.' }); return; }
    if (target.role === 'deleted') { res.status(400).json({ error: '이미 탈퇴 처리된 계정입니다.' }); return; }

    const stamp = Date.now();
    const anonEmail = `deleted_${id}@snowpan.local`;
    const anonPhone = `deleted_${stamp}_${id.slice(0, 8)}`;
    const lockedHash = `__admin_deleted_${stamp}__${Math.random().toString(36).slice(2)}`;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          email: anonEmail,
          phone: anonPhone,
          name: '탈퇴한 회원',
          nickname: null,
          profileImage: null,
          fcmToken: null,
          activeBadge: null,
          phoneVerified: false,
          password: lockedHash,
          role: 'deleted',
          withdrawnName: target.name,
          withdrawnEmail: target.email,
          withdrawnPhone: target.phone,
          withdrawnAt: new Date(),
        },
      });
      await tx.product.updateMany({ where: { userId: id, status: 'selling' }, data: { status: 'sold' } });
    });
    invalidateUserTokens(id);
    disconnectUser(id);

    res.json({ success: true, message: '계정이 익명화 처리되었습니다.' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: '사용자 삭제 중 오류가 발생했습니다.' });
  }
};

// ===== 공개 배너 API =====
export const getPublicBanners = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'banners:public';
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const banners = await prisma.banner.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      take: 5,
    });
    // adBookingId — 광고 클릭 추적용(프론트가 클릭 시 이 id 로 카운트). 광고주 식별정보 아님.
    const cleaned = banners.map(b => ({ ...b, adBookingId: b.tag.startsWith('ad:') ? b.tag.slice(3) : null, tag: b.tag.startsWith('ad:') ? 'AD' : b.tag }));
    cacheSet(cacheKey, cleaned, 30);
    res.json(cleaned);
  } catch (error) {
    console.error('Get public banners error:', error);
    res.status(500).json({ error: '배너 조회 중 오류가 발생했습니다.' });
  }
};

// 승인 대기 중인 렌탈 목록 조회 (관리자만)
export const getPendingRentals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const rentals = await prisma.rental.findMany({
      where: { approved: false },
      include: {
        resort: true,
        user: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rentals);
  } catch (error) {
    console.error('Get pending rentals error:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
};

// 승인 대기 중인 레슨 목록 조회 (관리자만)
export const getPendingLessons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const lessons = await prisma.lesson.findMany({
      where: { approved: false },
      include: {
        resort: true,
        user: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(lessons);
  } catch (error) {
    console.error('Get pending lessons error:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
};

// 렌탈 승인 (관리자만)
export const approveRental = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const { id } = req.params;

    const rental = await prisma.rental.update({
      where: { id },
      data: { approved: true },
      include: {
        resort: true,
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    await createNotification(rental.userId, 'approve', '렌탈 승인', `'${rental.name}' 렌탈이 승인되었습니다.${'앱을 설치하면 예약·문의 알림을 바로 받을 수 있어요.'}`, '/rental');
    alertUser(rental.userId, { kind: 'approval', title: '렌탈샵이 공개됐어요', text: `'${rental.name}' 등록이 승인돼 지금부터 손님에게 보여요.`, link: `/rental/${rental.id}`, fallbackPhone: rental.phone }).catch(() => {});
    sendPushToUser(rental.userId, '렌탈 승인', `'${rental.name}' 렌탈이 승인되었습니다.`, '/rental').catch(() => {});
    res.json({ ...rental, message: '렌탈이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve rental error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

// 레슨 승인 (관리자만)
export const approveLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const { id } = req.params;
    // 승인하면서 '사업자 확인' 배지 부여 여부 (사업자등록증을 확인한 관리자가 체크) — 2026-09-23
    const bv = req.body?.businessVerified;
    const badgeData = bv === undefined ? {} : { businessVerified: !!bv, businessVerifiedAt: bv ? new Date() : null };

    const lesson = await prisma.lesson.update({
      where: { id },
      data: { approved: true, ...badgeData },
      include: {
        resort: true,
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    if (bv) createNotification(lesson.userId, 'approve', '사업자 확인 배지가 붙었어요', `'${lesson.name}' 레슨에 사업자 확인 배지가 표시돼요.`, `/lesson/${lesson.id}`).catch(() => {});
    await createNotification(lesson.userId, 'approve', '레슨 승인', `'${lesson.name}' 레슨이 승인되었습니다. 앱을 설치하면 예약·문의 알림을 바로 받을 수 있어요.`, '/lesson');
    alertUser(lesson.userId, { kind: 'approval', title: '레슨이 공개됐어요', text: `'${lesson.name}' 등록이 승인돼 지금부터 손님에게 보여요.`, link: `/lesson/${lesson.id}`, fallbackPhone: lesson.phone }).catch(() => {});
    sendPushToUser(lesson.userId, '레슨 승인', `'${lesson.name}' 레슨이 승인되었습니다.`, '/lesson').catch(() => {});
    res.json({ ...lesson, message: '레슨이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve lesson error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

// 렌탈 거부/삭제 (관리자만)
export const rejectRental = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const { id } = req.params;

    const rental = await prisma.rental.findUnique({ where: { id } });
    const rentalUserId = rental?.userId;
    const rentalName = rental?.name;
    await prisma.rental.deleteMany({ where: { id } }); // 멱등 — 더블클릭 P2025 500 방지
    cleanupShopRows('rental', id).catch((e) => console.warn('shop rows cleanup failed:', e instanceof Error ? e.message : e)); // 직원·찜·문구·채팅 연결 정리

    // 거부 사유(선택) — 알림에 붙이고, sendChat 이 false 가 아니면 고객센터 1:1 채팅으로도 전달
    const reason = cleanReason(req.body?.reason);
    if (rentalUserId) {
      const msg = withReason(`'${rentalName}' 렌탈샵 등록이 거부되었습니다.`, reason);
      await createNotification(rentalUserId, 'reject', '렌탈샵 거부', msg);
      alertUser(rentalUserId, { kind: 'approval', title: '렌탈샵 등록을 확인해 주세요', text: msg, link: '/mypage/shops' }).catch(() => {});
      sendPushToUser(rentalUserId, '렌탈샵 거부', msg).catch(() => {});
      if (reason && req.body?.sendChat !== false) sendSupportMessage(rentalUserId, rejectChatText('렌탈샵', rentalName || '', reason)).catch(() => {});
    }
    res.json({ message: '렌탈이 거부되었습니다.' });
  } catch (error) {
    console.error('Reject rental error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};

// 레슨 거부/삭제 (관리자만)
export const rejectLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
      return;
    }

    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({ where: { id } });
    const lessonUserId = lesson?.userId;
    const lessonName = lesson?.name;
    await prisma.lesson.deleteMany({ where: { id } }); // 멱등 — 더블클릭 P2025 500 방지
    cleanupShopRows('lesson', id).catch((e) => console.warn('shop rows cleanup failed:', e instanceof Error ? e.message : e)); // 직원·찜·문구·채팅 연결 정리

    if (lessonUserId) {
      const reason = cleanReason(req.body?.reason);
      const msg = withReason(`'${lessonName}' 레슨 등록이 거부되었습니다.`, reason);
      await createNotification(lessonUserId, 'reject', '레슨 거부', msg);
      alertUser(lessonUserId, { kind: 'approval', title: '레슨 등록을 확인해 주세요', text: msg, link: '/mypage/shops' }).catch(() => {});
      sendPushToUser(lessonUserId, '레슨 거부', msg).catch(() => {});
      if (reason && req.body?.sendChat !== false) sendSupportMessage(lessonUserId, rejectChatText('레슨', lessonName || '', reason)).catch(() => {});
    }
    res.json({ message: '레슨이 거부되었습니다.' });
  } catch (error) {
    console.error('Reject lesson error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};

// ===== 숙소 =====
export const getPendingAccommodations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const items = await prisma.accommodation.findMany({
      where: { approved: false },
      include: { resort: true, user: { select: { name: true, phone: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    console.error('Get pending accommodations error:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
};

export const approveAccommodation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const item = await prisma.accommodation.update({ where: { id: req.params.id }, data: { approved: true } });
    await createNotification(item.userId, 'approve', '숙소 승인', `'${item.name}' 숙소가 승인되었습니다. 앱을 설치하면 예약·문의 알림을 바로 받을 수 있어요.`, '/accommodation');
    alertUser(item.userId, { kind: 'approval', title: '숙소가 공개됐어요', text: `'${item.name}' 등록이 승인돼 지금부터 손님에게 보여요.`, link: `/accommodation/${item.id}` }).catch(() => {});
    sendPushToUser(item.userId, '숙소 승인', `'${item.name}' 숙소가 승인되었습니다.`, '/accommodation').catch(() => {});
    res.json({ ...item, message: '숙소가 승인되었습니다.' });
  } catch (error) {
    console.error('Approve accommodation error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

export const rejectAccommodation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const accom = await prisma.accommodation.findUnique({ where: { id: req.params.id } });
    const accomUserId = accom?.userId;
    const accomName = accom?.name;
    await prisma.accommodation.delete({ where: { id: req.params.id } });
    cleanupShopRows('accommodation', String(req.params.id)).catch((e) => console.warn('shop rows cleanup failed:', e instanceof Error ? e.message : e)); // 직원·찜·문구·채팅 연결 정리
    const reason = cleanReason(req.body?.reason);
    if (accomUserId) {
      const msg = withReason(`'${accomName}' 숙소 등록이 거부되었습니다.`, reason);
      await createNotification(accomUserId, 'reject', '숙소 거부', msg);
      alertUser(accomUserId, { kind: 'approval', title: '숙소 등록을 확인해 주세요', text: msg, link: '/mypage/shops' }).catch(() => {});
      sendPushToUser(accomUserId, '숙소 거부', msg).catch(() => {});
      if (reason && req.body?.sendChat !== false) sendSupportMessage(accomUserId, rejectChatText('숙소', accomName || '', reason)).catch(() => {});
    }
    res.json({ message: '숙소가 거부되었습니다.' });
  } catch (error) {
    console.error('Reject accommodation error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};

// ===== 자격증 뱃지 =====
export const getPendingBadges = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    // 신속처리(priority) 쿠폰 사용자 요청을 상단으로.
    const items = await prisma.badgeRequest.findMany({
      where: { status: 'pending' },
      include: { user: { select: { id: true, name: true, phone: true, email: true } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(items);
  } catch (error) {
    console.error('Get pending badges error:', error);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
};

export const approveBadge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { badgeType } = req.body || {};
    const data: any = { status: 'approved' };
    if (badgeType) data.badgeType = badgeType;
    const item = await prisma.badgeRequest.update({ where: { id: req.params.id }, data });
    await createNotification(item.userId, 'badge', '자격증 승인', `자격증 인증이 승인되었습니다.`, '/mypage');
    sendPushToUser(item.userId, '자격증 승인', '자격증 인증이 승인되었습니다.', '/mypage').catch(() => {});
    res.json({ ...item, message: '자격증이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve badge error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

export const rejectBadge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const badge = await prisma.badgeRequest.update({ where: { id: req.params.id }, data: { status: 'rejected' } });
    const reason = cleanReason(req.body?.reason);
    const msg = withReason('자격증 인증이 거부되었습니다.', reason);
    await createNotification(badge.userId, 'badge', '자격증 거부', msg);
    sendPushToUser(badge.userId, '자격증 거부', msg).catch(() => {});
    if (reason && req.body?.sendChat !== false) {
      sendSupportMessage(badge.userId, `[자격증 인증 거부]\n사유: ${reason}\n\n자격증 종류와 급수가 보이게 다시 찍어 올려 주시면 확인해 드릴게요. 궁금한 점은 이 채팅으로 물어봐 주세요.`).catch(() => {});
    }
    res.json({ message: '자격증이 거부되었습니다.' });
  } catch (error) {
    console.error('Reject badge error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};

// ===== 광고 신청 관리 (Admin) =====
export const getAdRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const items = await prisma.adRequest.findMany({
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    console.error('Get ad requests error:', error);
    res.status(500).json({ error: '광고 신청 목록 조회 중 오류가 발생했습니다.' });
  }
};

export const approveAdRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    // 승인 전 재검증 (심층 방어) — 신청 시점 검증을 우회한 구데이터/직접 주입이
    // 공개 배너로 나가는 것 차단
    const pending = await prisma.adRequest.findUnique({ where: { id: req.params.id } });
    if (!pending) { res.status(404).json({ error: '신청을 찾을 수 없습니다.' }); return; }
    if (!isHttpUrl(pending.url)) {
      res.status(400).json({ error: '신청의 링크가 http(s) 주소가 아니라 승인할 수 없습니다.' });
      return;
    }
    if (pending.image && !isAllowedImageUrl(pending.image)) {
      res.status(400).json({ error: '신청의 이미지가 허용된 저장소가 아니라 승인할 수 없습니다.' });
      return;
    }
    const item = await prisma.adRequest.update({ where: { id: req.params.id }, data: { status: 'approved', adminNote: null } });

    // 승인된 광고를 배너에 자동 추가
    const maxOrder = await prisma.banner.aggregate({ _max: { order: true } });
    await prisma.banner.create({
      data: {
        title: item.title,
        description: item.description,
        tag: 'AD',
        url: item.url,
        image: item.image,
        order: (maxOrder._max.order || 0) + 1,
        active: true,
      },
    });
    cacheDel('banners:public'); // 배너 캐시 초기화

    await createNotification(item.userId, 'approve', '광고 신청 승인', `'${item.title}' 광고 신청이 승인되었습니다.`, '/mypage');
    sendPushToUser(item.userId, '광고 신청 승인', `'${item.title}' 광고 신청이 승인되었습니다.`, '/mypage').catch(() => {});
    res.json({ ...item, message: '광고 신청이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve ad request error:', error);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
};

export const rejectAdRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { adminNote } = req.body as { adminNote?: string };
    const item = await prisma.adRequest.update({ where: { id: req.params.id }, data: { status: 'rejected', adminNote: adminNote || null } });
    await createNotification(item.userId, 'reject', '광고 신청 거부', `'${item.title}' 광고 신청이 거부되었습니다.`);
    sendPushToUser(item.userId, '광고 신청 거부', `'${item.title}' 광고 신청이 거부되었습니다.`).catch(() => {});
    res.json({ ...item, message: '광고 신청이 거부되었습니다.' });
  } catch (error) {
    console.error('Reject ad request error:', error);
    res.status(500).json({ error: '거부 중 오류가 발생했습니다.' });
  }
};

// ===== 앱 심사용 테스트 계정 =====
// 구글 플레이·앱스토어 심사관은 카카오 계정을 만들 수 없어 이메일 로그인 계정이 필요하다(로그인 화면의 "이메일로 로그인" 링크).
// 휴대폰 인증 게이트를 거치지 않고 관리자가 직접 만들거나 비밀번호를 다시 설정한다. 일반 유저 권한이며 role 은 항상 'user'.
export const createReviewAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const nickname = typeof req.body?.nickname === 'string' && req.body.nickname.trim() ? req.body.nickname.trim().slice(0, 20) : '심사용계정';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: '이메일 형식이 올바르지 않습니다.' }); return; }
    if (password.length < 8 || password.length > 72) { res.status(400).json({ error: '비밀번호는 8~72자여야 합니다.' }); return; }
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (existing && existing.role !== 'user') { res.status(400).json({ error: '일반 유저 계정만 심사용으로 쓸 수 있습니다.' }); return; }
    const hashed = await bcrypt.hash(password, 12);
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { password: hashed, tokenVersion: { increment: 1 } } });
      res.json({ email, created: false });
      return;
    }
    // 닉네임 유니크 — 겹치면 숫자 붙임
    let nick = nickname;
    for (let i = 2; await prisma.user.findFirst({ where: { nickname: { equals: nick, mode: 'insensitive' } }, select: { id: true } }); i++) nick = `${nickname}${i}`;
    await prisma.user.create({
      data: { email, password: hashed, name: '앱 심사용 계정', nickname: nick, role: 'user', phoneVerified: false, termsAgreedAt: new Date(), privacyAgreedAt: new Date() },
    });
    res.json({ email, created: true });
  } catch (error) {
    console.error('Review account error:', error);
    res.status(500).json({ error: '심사용 계정을 만들지 못했습니다.' });
  }
};

// 레슨 '사업자 확인' 배지 켜기/끄기 — 승인 뒤에도 바꿀 수 있게 (2026-09-23)
export const setLessonBusinessBadge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') { res.status(403).json({ error: '관리자만 접근할 수 있습니다.' }); return; }
    const { id } = req.params;
    const verified = !!req.body?.verified;
    const lesson = await prisma.lesson.findUnique({ where: { id }, select: { id: true, name: true, userId: true, businessVerified: true } });
    if (!lesson) { res.status(404).json({ error: '레슨을 찾을 수 없어요.' }); return; }
    const updated = await prisma.lesson.update({ where: { id }, data: { businessVerified: verified, businessVerifiedAt: verified ? new Date() : null }, select: { id: true, businessVerified: true, businessVerifiedAt: true } });
    if (verified && !lesson.businessVerified) createNotification(lesson.userId, 'approve', '사업자 확인 배지가 붙었어요', `'${lesson.name}' 레슨에 사업자 확인 배지가 표시돼요.`, `/lesson/${lesson.id}`).catch(() => {});
    res.json({ ...updated, message: verified ? '사업자 확인 배지를 붙였어요.' : '사업자 확인 배지를 뗐어요.' });
  } catch (error) {
    console.error('Set lesson business badge error:', error);
    res.status(500).json({ error: '처리 중 오류가 발생했어요.' });
  }
};
