import { Router } from 'express';
import { loginHistoryHandler } from '../utils/loginLog';
import { getInstagramStatus, saveInstagramToken, refreshInstagramPosts, clearInstagramToken } from '../utils/instagram';
import {
  getPendingRentals,
  getPendingLessons,
  getPendingAccommodations,
  getPendingBadges,
  approveRental,
  approveLesson,
  approveAccommodation,
  approveBadge,
  rejectRental,
  rejectLesson,
  rejectAccommodation,
  rejectBadge,
  getReports,
  resolveReport,
  deleteReport,
  getStats,
  getUsers,
  banUser,
  adminDeleteUser,
  createReviewAccount,
  getAdRequests,
  approveAdRequest,
  rejectAdRequest,
} from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { geocodeBackfill, resortsGeocode, autoResort } from '../controllers/geocodeController';
import { listOutreach, upsertOutreach, bulkOutreach, putOutreachTemplate } from '../controllers/outreachController';
import { isFcmConfigured, sendPushToUser } from '../utils/push';
import { appleRevokeStatus, kakaoConfigured, naverLoginConfigured } from '../controllers/socialAuthController';
import { buildDailySummary, sendDailySummary, smtpConfigured } from '../utils/dailySummary';
import { smsConfigured } from '../utils/sms';
import prisma from '../config/database';

const router = Router();

// 모든 관리자 라우트: 인증 + admin 권한 한번에. 각 컨트롤러 인라인 체크는 중복이라 제거 가능.
router.use(authenticateToken, requireAdmin);

// 푸시 셀프 테스트 — FCM 서버 키·기기 토큰 상태 확인 + 본인 기기로 테스트 알림 발송.
// 외부 연동 설정 상태 — 사장님이 Render env 를 넣은 뒤 잘 잡혔는지 확인용 (값은 절대 안 나감, 참/거짓만).
router.get('/integrations', async (_req, res) => {
  const apple = appleRevokeStatus();
  res.json({
    appleRevoke: apple.configured, // 탈퇴 시 Apple 로그인 연결 철회 키(APPLE_TEAM_ID/KEY_ID/PRIVATE_KEY)
    appleRevokeDetail: apple, // 어떤 env 가 빠졌는지·키 형식 문제인지 (값은 없고 이름·길이·모양만)
    kakao: kakaoConfigured(),
    naver: naverLoginConfigured(),
    fcm: await isFcmConfigured(),
    bunny: Boolean(process.env.BUNNY_STORAGE_KEY),
    adDeposit: Boolean(process.env.AD_DEPOSIT_BANK && process.env.AD_DEPOSIT_ACCOUNT && process.env.AD_DEPOSIT_HOLDER),
    smtp: smtpConfigured(),      // 하루 요약·인증 메일 발송 (SMTP_HOST/USER/PASS)
    sms: smsConfigured(),        // 사장님 문자 알림 (SOLAPI_API_KEY/SECRET, SMS_FROM)
    discord: Boolean(process.env.DISCORD_WEBHOOK_URL),
  });
});

// 문자·메일 알림 발송 기록 (최근 100건 + 30일 집계) — 비용·도달 확인용. 값(번호·이메일)은 관리자만 봄.
router.get('/alert-logs', async (_req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [items, rows] = await Promise.all([
      prisma.alertLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { user: { select: { id: true, name: true, nickname: true } } } }),
      prisma.alertLog.groupBy({ by: ['channel', 'status'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    ]);
    const counts: Record<string, number> = {};
    for (const r of rows) counts[`${r.channel}:${r.status}`] = r._count._all;
    res.json({ items: items.map((l) => ({ ...l, user: l.user ? { id: l.user.id, name: l.user.nickname || l.user.name } : null })), counts30d: counts });
  } catch (e) { console.error('alert logs error:', e); res.status(500).json({ error: '발송 기록을 불러오지 못했어요.' }); }
});

// 관리자 하루 요약 — 미리보기(GET)와 지금 보내기(POST). 스케줄러는 매일 09:00 KST 자동.
router.get('/daily-summary', async (_req, res) => {
  try { res.json(await buildDailySummary()); } catch (e) { console.error('daily summary error:', e); res.status(500).json({ error: '요약을 만들지 못했어요.' }); }
});
router.post('/daily-summary', async (_req, res) => {
  try { const s = await sendDailySummary(); res.json({ ...s, message: '관리자 전원에게 요약을 보냈어요.', email: smtpConfigured() }); } catch (e) { console.error('daily summary send error:', e); res.status(500).json({ error: '요약을 보내지 못했어요.' }); }
});

router.post('/push-test', async (req: any, res) => {
  try {
    const configured = await isFcmConfigured();
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { fcmToken: true } });
    const hasToken = !!me?.fcmToken;
    let sent = false; let detail = '';
    if (configured && hasToken) {
      const r = await sendPushToUser(req.user.id, '푸시 테스트', '스노우판 푸시가 정상 작동합니다.', '/admin');
      sent = r.ok; detail = r.detail; // 실패 시 FCM 에러코드 그대로 노출 — 원인 즉시 파악용
    }
    res.json({ fcmConfigured: configured, hasToken, sent, detail });
  } catch (e) {
    console.error('Push test error:', e);
    res.status(500).json({ error: '푸시 테스트 실패' });
  }
});

// 승인 대기 목록 조회
router.get('/rentals/pending', getPendingRentals);
router.get('/lessons/pending', getPendingLessons);
router.get('/accommodations/pending', getPendingAccommodations);
router.get('/badges/pending', getPendingBadges);

// 승인
router.put('/rentals/:id/approve', approveRental);
router.put('/lessons/:id/approve', approveLesson);
router.put('/accommodations/:id/approve', approveAccommodation);
router.put('/badges/:id/approve', approveBadge);

// 거부
router.delete('/rentals/:id/reject', rejectRental);
router.delete('/lessons/:id/reject', rejectLesson);
router.delete('/accommodations/:id/reject', rejectAccommodation);
router.delete('/badges/:id/reject', rejectBadge);

// 신고 관리
router.get('/reports', getReports);
router.put('/reports/:id', resolveReport);
router.delete('/reports/:id', deleteReport); // 처리 완료된 신고 기록 삭제

// 통계
router.get('/stats', getStats);

// 유저 관리
router.get('/users', getUsers);
router.get('/users/:id/logins', loginHistoryHandler); // 최근 로그인 IP·기기 + 같은 IP 다른 계정 (사기 신고 대응)
router.put('/users/:id/ban', banUser);
router.delete('/users/:id', adminDeleteUser);
// 앱 심사용 이메일 로그인 계정 생성/비밀번호 재설정 (스토어 심사관 제공용)
router.post('/review-account', createReviewAccount);

// 광고 신청 관리
router.get('/ad-requests', getAdRequests);
router.put('/ad-requests/:id/approve', approveAdRequest);
router.put('/ad-requests/:id/reject', rejectAdRequest);

// 좌표 일괄 변환 — lat 없는 매장(스키샵·정비샵·렌탈) 주소를 카카오 로컬 API 로 지오코딩
router.post('/geocode-backfill', geocodeBackfill);
// 리조트 좌표 채우기 / 리조트 미연결 매장을 반경 내 리조트에 자동 연결
router.post('/resorts/geocode', resortsGeocode);
router.post('/shops/auto-resort', autoResort);

// 매장 연락 보드 — 시딩 매장 사장님 연락 상태·메모 (관리자 대시보드 "매장연락보드" 탭)
router.get('/outreach', listOutreach);
router.put('/outreach/template', putOutreachTemplate);
router.post('/outreach/bulk', bulkOutreach);
router.put('/outreach/:shopType/:shopId', upsertOutreach);

// 인스타그램 연동 — 토큰은 관리자만 넣고, 값 자체는 어떤 응답에도 실리지 않는다(상태만 조회)
router.get('/instagram', async (_req, res) => {
  try { res.json(await getInstagramStatus()); }
  catch { res.status(500).json({ error: '인스타 상태를 불러오지 못했습니다.' }); }
});
router.put('/instagram/token', async (req, res) => {
  try {
    const token = String((req.body?.token ?? '')).trim();
    const appSecret = String((req.body?.appSecret ?? '')).trim() || undefined;
    if (token.length < 20 || token.length > 500) { res.status(400).json({ error: '토큰 형식이 올바르지 않습니다.' }); return; }
    const r = await saveInstagramToken(token, appSecret);
    res.json({ success: true, ...r });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? `인스타 연결 실패: ${err.message}` : '인스타 연결에 실패했습니다.' });
  }
});
router.post('/instagram/refresh', async (_req, res) => {
  try { const posts = await refreshInstagramPosts(true); res.json({ success: true, count: posts.length }); }
  catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : '새로고침 실패' }); }
});
router.delete('/instagram', async (_req, res) => {
  try { await clearInstagramToken(); res.json({ success: true }); }
  catch { res.status(500).json({ error: '연결 해제에 실패했습니다.' }); }
});

export default router;
