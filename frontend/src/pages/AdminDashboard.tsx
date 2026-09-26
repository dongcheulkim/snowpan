import { toastSuccess, toastError } from '../utils/toast';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { CalendarIcon, ChartIcon, UsersIcon } from '../components/Icons';
import { adSlotLabelKr, SLOT_DESCRIPTIONS, SLOT_LABELS, AD_CATEGORY_LABELS } from '../utils/adLabels';
import AdminApproval from './AdminApproval';
import OutreachBoard from '../components/OutreachBoard';
import InstagramPanel from '../components/InstagramPanel';
import AdminAppVersionPanel from '../components/AdminAppVersionPanel';
import AdminAccessLogPanel from '../components/AdminAccessLogPanel';
import AdminOpsPanel from '../components/AdminOpsPanel';
import AdminResortsPanel from '../components/AdminResortsPanel';
import AdInvitePanel from '../components/AdInvitePanel';
import { Link } from 'react-router-dom';

type TabId = 'approval' | 'reports' | 'stats' | 'users' | 'adBookings' | 'outreach' | 'settings';

const REPORT_TYPE_LABEL: Record<string, string> = { product: '중고 매물', post: '게시글', user: '회원', skishop: '스키·보드샵', repair: '정비샵', rental: '렌탈샵', lesson: '레슨', accommodation: '숙소' };
const REPORT_RESOLUTION_LABEL: Record<string, string> = { deleted: '삭제함', warned: '경고 보냄', kept: '문제 없음' };

interface ReportItem {
  id: string;
  type: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string; email: string };
  targetName?: string | null;
  targetPath?: string | null;
  targetOwner?: { id: string; name: string } | null; // 작성자(대상 소유자)
  reportCount?: number;                              // 같은 대상에 쌓인 신고 수
  resolution?: 'deleted' | 'warned' | 'kept' | null;
  adminNote?: string | null;
  resolvedAt?: string | null;
}

interface StatsData {
  users: number;
  products: number;
  posts: number;
  chatRooms: number;
  live?: { concurrent: number; concurrentUsers: number };
  today?: { visitors: number; pageviews: number };
  week?: { uniqueVisitors: number; pageviews: number };
  daily?: { date: string; users: number; products: number; visitors: number; pageviews: number }[];
  dbSizeBytes?: number | null;
  categoryViews?: { key: string; label: string; views: number }[];
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  nickname?: string | null;
  createdAt: string;
  // 탈퇴 회원의 원래 신원 (관리자 전용, 사기·분쟁 대응)
  withdrawnName?: string | null;
  withdrawnEmail?: string | null;
  withdrawnPhone?: string | null;
  withdrawnAt?: string | null;
  hasWithdrawnIdentity?: boolean;
}

interface AdBookingItem {
  id: string;
  slotType: string;
  category: string | null;
  title: string;
  description: string;
  url: string;
  image?: string | null;
  status: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalPrice: number;
  clickCount?: number;
  createdAt: string;
  user: { id: string; name: string; email: string; phone: string };
  payment: { paymentId: string; payMethod: string; amount: number; status: string; paidAt: string } | null;
}

interface AdPricingItem {
  id: string;
  slotType: string;
  category: string | null;
  pricePerDay: number;
  maxConcurrent: number;
  description: string | null;
  active: boolean;
}

interface RevenueData {
  totalRevenue: number;
  monthlyRevenue: number;
  totalPayments: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [tab, setTab] = useState<TabId>('approval');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reportFilter, setReportFilter] = useState<'pending' | 'all'>('pending');
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({}); // 신고별 작성자 안내 문구 입력
  const [reportBusy, setReportBusy] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(0);
  const USERS_PER_PAGE = 30;
  const [adBookings, setAdBookings] = useState<AdBookingItem[]>([]);
  // 광고예약 필터 — 카테고리(슬롯)별 · 상태별 골라보기
  const [adCatFilter, setAdCatFilter] = useState('all');
  const [adSection, setAdSection] = useState<'bookings' | 'invites' | 'pricing'>('bookings'); // 광고관리 내 서브탭(예약/가격). 홈 배너는 광고 승인 시 자동 생성·만료 시 자동 삭제라 수동 관리 화면 없음
  const [adStatusFilter, setAdStatusFilter] = useState('all');
  const [adPricings, setAdPricings] = useState<AdPricingItem[]>([]);
  const [adRevenue, setAdRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'reports') {
        const data = await api<ReportItem[]>('/admin/reports');
        setReports(data);
      } else if (tab === 'stats') {
        const data = await api<StatsData>('/admin/stats');
        setStats(data);
      } else if (tab === 'users') {
        const data = await api<UserItem[]>('/admin/users');
        setUsers(data);
      } else if (tab === 'adBookings') {
        // 광고관리 탭 — 예약·매출·가격을 함께 로드
        // (서브탭 예약/가격 전환 시 추가 요청 없이 즉시 표시)
        // allSettled: 하나가 실패해도 나머지 서브탭은 정상 표시(부분 실패 허용).
        const [bookings, revenue, pricings] = await Promise.allSettled([
          api<AdBookingItem[]>('/ad-booking/admin/bookings'),
          api<RevenueData>('/ad-booking/admin/revenue'),
          api<AdPricingItem[]>('/ad-booking/admin/pricings'),
        ]);
        if (bookings.status === 'fulfilled') setAdBookings(bookings.value);
        else toastError('광고 예약 목록을 불러오지 못했습니다.'); // 조용한 실패 시 "예약 없음"으로 오인 방지
        if (revenue.status === 'fulfilled') setAdRevenue(revenue.value);
        if (pricings.status === 'fulfilled') setAdPricings(pricings.value);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 신고 처리 — 삭제(게시글·중고 매물) / 경고(작성자 안내) / 유지(문제 없음). 같은 대상의 신고는 서버가 한꺼번에 처리.
  const handleResolve = async (r: ReportItem, action: 'delete' | 'warn' | 'keep') => {
    const label = REPORT_TYPE_LABEL[r.type] || r.type;
    if (action === 'delete' && !confirm(`${label} "${r.targetName || ''}"을(를) 삭제할까요? 작성자에게 삭제 알림이 가고 되돌릴 수 없어요.`)) return;
    if (action === 'warn' && !confirm('작성자에게 규칙 안내(경고) 알림을 보낼까요?')) return;
    setReportBusy(r.id);
    try {
      const res = await api<{ message: string; resolution: string }>(`/admin/reports/${r.id}`, { method: 'PUT', body: { action, note: reportNotes[r.id] || '' } });
      const resolution = (res.resolution || (action === 'delete' ? 'deleted' : action === 'warn' ? 'warned' : 'kept')) as ReportItem['resolution'];
      setReports((prev) => prev.map((x) => (x.type === r.type && x.targetId === r.targetId && x.status === 'pending'
        ? { ...x, status: 'resolved', resolution, adminNote: reportNotes[r.id] || null, resolvedAt: new Date().toISOString(), targetName: action === 'delete' ? null : x.targetName }
        : x)));
      toastSuccess(res.message || '처리했어요.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '처리 실패');
    } finally {
      setReportBusy(null);
    }
  };

  // 처리 완료된 신고 기록 삭제 — 목록 정리용. 처리 결과(게시글 삭제·알림)는 이미 반영돼 있어 되돌리지 않는다.
  const handleReportDelete = async (r: ReportItem) => {
    if (!confirm('처리 완료된 신고 기록을 삭제할까요? 목록에서만 사라지고 이미 처리한 결과는 그대로예요.')) return;
    setReportBusy(r.id);
    try {
      const res = await api<{ message: string }>(`/admin/reports/${r.id}`, { method: 'DELETE' });
      setReports((prev) => prev.filter((x) => x.id !== r.id));
      toastSuccess(res.message || '삭제했어요.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setReportBusy(null);
    }
  };

  // 관리자가 유저에게 먼저 1:1 대화 걸기 — 기존 채팅방이 있으면 그 방으로
  // 로그인 기록 (IP·기기·같은 IP 다른 계정) — 사기 신고·분쟁 때만 보는 용도. 사용자 요청 2026-09-13
  interface LoginHistory { retentionDays: number; logins: { ip: string; userAgent: string | null; method: string; createdAt: string }[]; sameIpAccounts: { id: string; nickname: string | null; email: string; role: string; ip: string; lastAt: string }[] }
  const [loginInfo, setLoginInfo] = useState<{ userId: string; data: LoginHistory | null; loading: boolean } | null>(null);
  // 탈퇴 회원 원래 정보(전체 값) — 볼 때마다 서버에 열람 기록이 남는다
  const [identity, setIdentity] = useState<Record<string, { withdrawnName: string | null; withdrawnEmail: string | null; withdrawnPhone: string | null; withdrawnProviders?: string | null } | 'loading' | 'error'>>({});
  const showIdentity = async (u: UserItem) => {
    if (identity[u.id] && identity[u.id] !== 'error') { setIdentity((m) => { const n = { ...m }; delete n[u.id]; return n; }); return; }
    setIdentity((m) => ({ ...m, [u.id]: 'loading' }));
    try { const data = await api<{ withdrawnName: string | null; withdrawnEmail: string | null; withdrawnPhone: string | null; withdrawnProviders: string | null }>(`/admin/users/${u.id}/identity`); setIdentity((m) => ({ ...m, [u.id]: data })); }
    catch { setIdentity((m) => ({ ...m, [u.id]: 'error' })); }
  };
  const showLogins = async (u: UserItem) => {
    if (loginInfo?.userId === u.id) { setLoginInfo(null); return; }
    setLoginInfo({ userId: u.id, data: null, loading: true });
    try { const data = await api<LoginHistory>(`/admin/users/${u.id}/logins`); setLoginInfo({ userId: u.id, data, loading: false }); }
    catch (e) { setLoginInfo(null); toastError(e instanceof Error ? e.message : '로그인 기록을 불러오지 못했어요.'); }
  };
  const startChat = async (u: UserItem) => {
    try {
      const room = await api<{ id: string }>('/chat/rooms', { method: 'POST', body: { targetUserId: u.id } });
      navigate(`/chat/${room.id}`, { state: { seller: (u as { nickname?: string }).nickname || u.name, sellerId: u.id } });
    } catch (err) {
      toastError(err instanceof Error ? err.message : '대화방을 열지 못했습니다.');
    }
  };

  const handleBan = async (id: string) => {
    const target = users.find(u => u.id === id);
    const action = target?.role === 'banned' ? '정지 해제' : '정지';
    if (!confirm(`이 유저를 ${action}하시겠습니까?`)) return;
    try {
      const res = await api<{ id: string; role: string; message: string }>(`/admin/users/${id}/ban`, { method: 'PUT' });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: res.role } : u)));
      toastSuccess(res.message);
    } catch (err) {
      toastError(err instanceof Error ? err.message : `${action} 실패`);
    }
  };

  // 승인 시 시작일 지정 (선택) — 비우면 즉시 시작, YYYY-MM-DD 입력 시 그 날부터 노출.
  // (예: 11/27 에 입금 확인하면서 12/1 시작으로 예약)
  const promptStartDate = (): { cancelled: boolean; startDate?: string } => {
    const input = prompt('광고 시작일 (YYYY-MM-DD)\n비워두면 지금 즉시 시작됩니다.', '');
    if (input === null) return { cancelled: true };
    const trimmed = input.trim();
    if (!trimmed) return { cancelled: false };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || isNaN(new Date(trimmed).getTime())) {
      toastError('날짜 형식이 올바르지 않습니다. (예: 2026-12-01)');
      return { cancelled: true };
    }
    // 과거 날짜 거부 (백데이트 방지 — 백엔드도 거부함)
    const [y, m, d] = trimmed.split('-').map(Number);
    const picked = new Date(y, m - 1, d);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (picked < today) {
      toastError('과거 날짜는 지정할 수 없습니다.');
      return { cancelled: true };
    }
    return { cancelled: false, startDate: trimmed };
  };

  const handleAdBookingApprove = async (id: string) => {
    const { cancelled, startDate } = promptStartDate();
    if (cancelled) return;
    try {
      const r = await api<{ message?: string }>(`/ad-booking/admin/bookings/${id}/approve`, { method: 'POST', body: startDate ? { startDate } : {} });
      toastSuccess(r.message || '입금 확인 완료!');
      fetchData(); // 서버가 결정한 최종 상태(미래 시작=paid/즉시=active)로 갱신 — 낙관 추측 오표시 방지
    } catch (err) {
      toastError(err instanceof Error ? err.message : '승인 실패');
    }
  };

  const handleAdBookingFree = async (id: string) => {
    const { cancelled, startDate } = promptStartDate();
    if (cancelled) return;
    try {
      await api(`/ad-booking/admin/bookings/${id}/free`, { method: 'POST', body: startDate ? { startDate } : {} });
      toastSuccess('무료 승인 완료!');
      fetchData();
    } catch (err) {
      toastError(err instanceof Error ? err.message : '승인 실패');
    }
  };

  // 끝난(취소·환불·종료·거절) 광고 예약 삭제 — 목록 정리용 (2026-09-22)
  const handleAdBookingDelete = async (id: string) => {
    if (!confirm('이 광고 예약 기록을 삭제할까요? 되돌릴 수 없어요.')) return;
    try {
      await api(`/ad-booking/admin/bookings/${id}`, { method: 'DELETE' });
      setAdBookings((prev) => prev.filter((b) => b.id !== id));
      toastSuccess('삭제했어요.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '삭제 실패');
    }
  };
  const handleAdBookingCancel = async (id: string) => {
    if (!confirm('이 광고 예약을 취소하고 환불하시겠습니까?')) return;
    try {
      await api(`/ad-booking/admin/bookings/${id}/cancel`, { method: 'POST', body: { reason: '관리자 취소' } });
      // 서버가 결정한 최종 상태(실결제=refunded/무결제=cancelled)와 매출·배너 목록까지 갱신
      fetchData();
    } catch (err) {
      toastError(err instanceof Error ? err.message : '취소 실패');
    }
  };

  const handlePricingUpdate = async (pricing: AdPricingItem, field: string, value: number | boolean) => {
    try {
      await api(`/ad-booking/admin/pricings/${pricing.id}`, { method: 'PUT', body: { [field]: value } });
      setAdPricings((prev) => prev.map((p) => (p.id === pricing.id ? { ...p, [field]: value } : p)));
    } catch (err) {
      toastError(err instanceof Error ? err.message : '수정 실패');
    }
  };

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'approval', label: '승인관리' },
    { id: 'reports', label: '신고관리' },
    { id: 'stats', label: '통계' },
    { id: 'users', label: '유저관리' },
    { id: 'adBookings', label: '광고관리' },
    { id: 'outreach', label: '매장 관리' },
    { id: 'settings', label: '설정' },
  ];

  const inputClass = "w-full px-3 py-2 bg-snow border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                const r = await api<{ fcmConfigured: boolean; hasToken: boolean; sent: boolean; detail?: string }>('/admin/push-test', { method: 'POST' });
                if (r.sent) toastSuccess('테스트 알림을 보냈어요. 앱을 완전히 내린 상태에서 폰을 확인하세요.');
                else if (!r.fcmConfigured) toastError('FCM 서버 키 미적용 — Render 재배포 완료 후 다시 시도하세요.');
                else if (!r.hasToken) toastError('이 계정에 등록된 기기가 없어요. 앱에서 로그인하고 알림을 허용한 뒤 다시 시도하세요.');
                else toastError(`발송 실패: ${r.detail || '원인 미상'}`);
              } catch { toastError('푸시 테스트 실패'); }
            }}
            className="text-xs font-bold text-gray-600 border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
          >푸시 테스트</button>
          <button type="button" onClick={() => navigate('/mypage')} className="text-sm text-gray-500 hover:text-gray-600 transition-colors">← 내정보</button>
        </div>
      </div>

      {/* 커뮤니티 관리자 글 바로가기 — 공지(상단 고정) — 글쓰기 폼의 카테고리가 미리 선택된다. 매거진은 인스타 @snowpan.kr 에 올리면 홈에 자동 반영 */}
      <div className="flex gap-2">
        <button type="button" onClick={() => navigate('/community/write?category=notice')} className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold">공지 쓰기</button>
      </div>

      {/* 탭 — 7개가 눌리지 않게 스크롤 필 방식 */}
      <div className="flex flex-wrap gap-1.5 pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-colors whitespace-nowrap flex-shrink-0 border ${
              tab === t.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-snow text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'adBookings' && (
        <div className="flex gap-1 mb-1">
          {([['bookings','예약·결제'],['invites','초대 링크'],['pricing','광고 가격']] as const).map(([id,label]) => (
            <button key={id} onClick={() => setAdSection(id)}
              className={`flex-1 py-2 px-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${adSection === id ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500 text-sm">로딩 중...</div>
      ) : (
        <>
          {/* Reports Tab */}
          {tab === 'approval' && (
            <AdminApproval embedded />
          )}
          {/* 매장 관리 — 매장·레슨 전체 보기 + 수정·삭제 + 시딩 매장 연락 상태 (자체 로딩·저장) */}
          {tab === 'outreach' && (
            <OutreachBoard />
          )}
          {/* 설정 — 인스타 연동 등 사이트 전역 설정 */}
          {tab === 'settings' && (
            <div className="space-y-3">
              <AdminOpsPanel />
              <AdminResortsPanel />
              <InstagramPanel />
              <AdminAppVersionPanel />
              <AdminAccessLogPanel />
            </div>
          )}
          {tab === 'reports' && (() => {
            const shown = reportFilter === 'pending' ? reports.filter((r) => r.status === 'pending') : reports;
            const pendingCount = reports.filter((r) => r.status === 'pending').length;
            return (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {([['pending', `대기중 ${pendingCount}`], ['all', `전체 ${reports.length}`]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setReportFilter(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${reportFilter === k ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>{l}</button>
                ))}
              </div>
              {shown.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">{reportFilter === 'pending' ? '처리할 신고가 없어요.' : '신고가 없어요.'}</div>
              ) : (
                shown.map((r) => {
                  const canDelete = r.type === 'post' || r.type === 'product';
                  const busy = reportBusy === r.id;
                  return (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.status === 'resolved' ? 'bg-mint/20 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {r.status === 'resolved' ? (REPORT_RESOLUTION_LABEL[r.resolution || ''] || '처리완료') : '대기중'}
                        </span>
                        <span className="text-xs text-gray-500">{REPORT_TYPE_LABEL[r.type] || r.type}</span>
                        {(r.reportCount || 0) > 1 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600">신고 {r.reportCount}건</span>}
                      </div>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                    {/* 신고 대상 — 이름 + 바로가기 (삭제된 대상은 표시만) + 작성자 */}
                    <p className="text-xs mb-1">
                      <span className="text-gray-500">대상: </span>
                      <span className="font-bold text-gray-900">{r.targetName || '(삭제됨)'}</span>
                      {r.targetPath && r.targetName && (
                        <a href={r.targetPath} target="_blank" rel="noopener noreferrer" className="ml-2 text-sky-600 underline">보러가기</a>
                      )}
                      {r.targetOwner && r.type !== 'user' && <span className="ml-2 text-gray-500">작성자 <span className="font-medium text-gray-800">{r.targetOwner.name}</span></span>}
                    </p>
                    <p className="text-sm font-bold text-gray-900 mb-0.5">신고 사유: {r.reason}</p>
                    {r.description && <p className="text-xs text-gray-600 mb-2 whitespace-pre-wrap">{r.description}</p>}
                    <p className="text-[10px] text-gray-500">신고자: {r.reporter.name} ({r.reporter.email})</p>
                    {r.status === 'resolved' && r.adminNote && <p className="text-[11px] text-gray-500 mt-1">보낸 안내: {r.adminNote}</p>}
                    {r.status === 'resolved' && (
                      <div className="mt-2 flex justify-end">
                        <button disabled={busy} onClick={() => handleReportDelete(r)} className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg font-bold text-[11px] hover:bg-red-50 transition-colors disabled:opacity-50">기록 삭제</button>
                      </div>
                    )}
                    {r.status === 'pending' && (
                      <div className="mt-3 space-y-2">
                        <input
                          value={reportNotes[r.id] || ''}
                          onChange={(e) => setReportNotes((m) => ({ ...m, [r.id]: e.target.value }))}
                          maxLength={500}
                          placeholder="작성자에게 함께 보낼 안내 (선택) — 예: 연락처 노출은 금지예요"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-gray-400"
                        />
                        <div className="flex flex-wrap gap-2">
                          {canDelete && (
                            <button disabled={busy} onClick={() => handleResolve(r, 'delete')} className="px-3.5 py-2 bg-red-500 text-white rounded-lg font-bold text-xs disabled:opacity-50">
                              {REPORT_TYPE_LABEL[r.type]} 삭제
                            </button>
                          )}
                          <button disabled={busy} onClick={() => handleResolve(r, 'warn')} className="px-3.5 py-2 bg-amber-500 text-white rounded-lg font-bold text-xs disabled:opacity-50">
                            {r.type === 'user' ? '회원에게 경고' : '작성자에게 경고'}
                          </button>
                          <button disabled={busy} onClick={() => handleResolve(r, 'keep')} className="px-3.5 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-bold text-xs disabled:opacity-50">
                            문제 없음 · 유지
                          </button>
                        </div>
                        {!canDelete && <p className="text-[10px] text-gray-500">{r.type === 'user' ? '정지·차단은 유저관리 탭에서 할 수 있어요.' : '매장 정보 수정·삭제는 승인관리 탭에서 할 수 있어요.'}</p>}
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
            );
          })()}

          {/* Stats Tab */}
          {tab === 'stats' && stats && (
            <div className="space-y-4">
              {/* 실시간 + 오늘 + 주간 핵심 지표 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card p-5 text-center">
                  <div className="mx-auto mb-2 flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /></div>
                  <div className="text-2xl font-bold text-gray-900">{(stats.live?.concurrent ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1">실시간 동접</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">로그인 {stats.live?.concurrentUsers ?? 0}명</div>
                </div>
                <div className="card p-5 text-center">
                  <div className="mx-auto mb-2 flex justify-center text-gray-700"><CalendarIcon size={26} /></div>
                  <div className="text-2xl font-bold text-gray-900">{(stats.today?.visitors ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1">오늘 방문자</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">PV {(stats.today?.pageviews ?? 0).toLocaleString()}</div>
                </div>
                <div className="card p-5 text-center">
                  <div className="mx-auto mb-2 flex justify-center text-gray-700"><ChartIcon size={26} /></div>
                  <div className="text-2xl font-bold text-gray-900">{(stats.week?.uniqueVisitors ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1">주간 순방문</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">PV {(stats.week?.pageviews ?? 0).toLocaleString()}</div>
                </div>
                <div className="card p-5 text-center">
                  <div className="mx-auto mb-2 flex justify-center text-gray-700"><UsersIcon size={26} /></div>
                  <div className="text-2xl font-bold text-gray-900">{stats.users.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1">누적 가입</div>
                </div>
              </div>

              {/* 카테고리별 인기 (누적 조회수) — 어느 카테고리가 잘 나가는지 랭킹 */}
              {stats.categoryViews && stats.categoryViews.length > 0 && (() => {
                const max = Math.max(1, ...stats.categoryViews.map((c) => c.views));
                return (
                  <div className="card p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">카테고리별 조회수</h3>
                    <div className="space-y-2">
                      {stats.categoryViews.map((c, i) => (
                        <div key={c.key} className="flex items-center gap-2">
                          <span className={`w-4 text-center text-xs font-black flex-shrink-0 ${i < 3 ? 'text-sky-500' : 'text-gray-300'}`}>{i + 1}</span>
                          <span className="w-20 text-xs font-medium text-gray-700 flex-shrink-0 truncate">{c.label}</span>
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-sky-400 rounded-full" style={{ width: `${Math.max(2, (c.views / max) * 100)}%` }} />
                          </div>
                          <span className="w-14 text-right text-xs font-bold text-gray-900 flex-shrink-0">{c.views.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2.5">누적 상세 조회수 기준 (렌탈·레슨·숙소는 2026-09-06부터 집계)</p>
                  </div>
                );
              })()}

              {/* DB 용량 — Render Basic-256mb 스토리지 1GB 기준 */}
              {typeof stats.dbSizeBytes === 'number' && stats.dbSizeBytes > 0 && (
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-700">DB 사용량</span>
                    <span className="text-xs text-gray-500">
                      {(stats.dbSizeBytes / 1024 / 1024).toFixed(1)} MB / 1 GB ({((stats.dbSizeBytes / (1024 * 1024 * 1024)) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stats.dbSizeBytes / (1024 * 1024 * 1024) > 0.8 ? 'bg-coral' : 'bg-sky-500'}`}
                      style={{ width: `${Math.min(100, (stats.dbSizeBytes / (1024 * 1024 * 1024)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 일별 방문자 + PV 차트 */}
              {stats.daily && stats.daily.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">최근 14일 방문자 · 페이지뷰</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.daily} margin={{ left: -20, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="visitors" name="순방문자" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="pageviews" name="페이지뷰" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* 신규 가입 + 등록 차트 (기존 차트 유지) */}
              {stats.daily && stats.daily.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">최근 14일 가입 · 상품 등록</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.daily} margin={{ left: -20, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="users" name="신규 가입" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="products" name="신규 상품" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {tab === 'users' && (() => {
            const q = userSearch.trim().toLowerCase();
            const filtered = q
              ? users.filter(u =>
                  u.name.toLowerCase().includes(q) ||
                  u.email.toLowerCase().includes(q) ||
                  (u.withdrawnName || '').toLowerCase().includes(q) ||
                  (u.withdrawnEmail || '').toLowerCase().includes(q) ||
                  (u.nickname || '').toLowerCase().includes(q)
                )
              : users;
            const totalPages = Math.max(1, Math.ceil(filtered.length / USERS_PER_PAGE));
            const currentPage = Math.min(userPage, totalPages - 1);
            const pageUsers = filtered.slice(currentPage * USERS_PER_PAGE, (currentPage + 1) * USERS_PER_PAGE);
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="이름 · 닉네임 · 이메일 검색"
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserPage(0); }}
                    className={`flex-1 ${inputClass}`}
                  />
                  <span className="text-[11px] text-gray-500 whitespace-nowrap">{filtered.length}명</span>
                </div>
                {pageUsers.map((u) => (
                  <div key={u.id}>
                  <div className="card p-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">{u.role === 'deleted' && u.withdrawnName ? u.withdrawnName : u.name}</span>
                        {u.nickname && <span className="text-xs text-gray-500">({u.nickname})</span>}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          u.role === 'admin' ? 'bg-accent/20 text-accent' : u.role === 'banned' ? 'bg-coral/20 text-coral' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {({ admin: '관리자', user: '일반', banned: '정지', deleted: '탈퇴' } as Record<string, string>)[u.role] || u.role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{u.role === 'deleted' && u.withdrawnEmail ? u.withdrawnEmail : u.email}</p>
                      {u.role === 'deleted' && (
                        <p className="text-[11px] text-gray-500">
                          {u.withdrawnAt ? `${new Date(u.withdrawnAt).toLocaleDateString('ko-KR')} 탈퇴` : '탈퇴'}
                          {u.withdrawnPhone ? ` · ${u.withdrawnPhone}` : ''}
                          {!u.hasWithdrawnIdentity ? ' · 원래 정보 없음(이전 방식 탈퇴)' : ''}
                        </p>
                      )}
                      {u.role === 'deleted' && u.hasWithdrawnIdentity && (
                        <div className="mt-1">
                          <button onClick={() => showIdentity(u)} className="text-[11px] font-bold text-gray-900 underline">
                            {identity[u.id] && identity[u.id] !== 'error' ? '원래 정보 닫기' : '원래 정보 보기 (열람 기록 남음)'}
                          </button>
                          {identity[u.id] === 'loading' && <span className="text-[11px] text-gray-500 ml-2">불러오는 중</span>}
                          {identity[u.id] === 'error' && <span className="text-[11px] text-gray-700 ml-2">불러오지 못했어요</span>}
                          {identity[u.id] && typeof identity[u.id] === 'object' && (
                            <p className="text-[11px] text-gray-900 mt-0.5">
                              {(identity[u.id] as { withdrawnName: string | null }).withdrawnName || '-'} · {(identity[u.id] as { withdrawnEmail: string | null }).withdrawnEmail || '-'} · {(identity[u.id] as { withdrawnPhone: string | null }).withdrawnPhone || '-'}
                              <br />로그인 수단 {(identity[u.id] as { withdrawnProviders?: string | null }).withdrawnProviders || '-'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-shrink-0">
                      {/* 프로필(공개 페이지: 닉네임·리뷰·글) · 1:1 대화(관리자 → 유저 채팅방) — 사용자 요청 2026-09-09 */}
                      <Link to={`/seller/${u.id}`} className="px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">프로필</Link>
                      <button onClick={() => showLogins(u)} className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${loginInfo?.userId === u.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>로그인 기록</button>
                      {u.role !== 'admin' && u.role !== 'deleted' && (
                        <button onClick={() => startChat(u)} className="px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors">1:1 대화</button>
                      )}
                      {u.role !== 'admin' && (
                        <button onClick={() => handleBan(u.id)} className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${u.role === 'banned' ? 'bg-mint/10 text-emerald-700 hover:bg-mint/20' : 'bg-coral/10 text-coral hover:bg-coral/20'}`}>
                          {u.role === 'banned' ? '정지 해제' : '정지'}
                        </button>
                      )}
                    </div>
                  </div>
                  {loginInfo?.userId === u.id && (
                    <div className="card p-4 mt-1 text-xs space-y-3 border-gray-300">
                      {loginInfo.loading || !loginInfo.data ? <p className="text-gray-500">불러오는 중...</p> : (
                        <>
                          <div>
                            <p className="font-bold text-gray-900 mb-1">최근 로그인 (최근 {loginInfo.data.retentionDays}일 보관)</p>
                            {loginInfo.data.logins.length === 0 ? <p className="text-gray-500">기록 없음</p> : (
                              <div className="overflow-x-auto"><table className="w-full text-[11px]"><tbody>
                                {loginInfo.data.logins.map((l, i) => (
                                  <tr key={i} className="border-t border-gray-100"><td className="py-1 pr-2 whitespace-nowrap text-gray-600">{new Date(l.createdAt).toLocaleString('ko-KR')}</td><td className="py-1 pr-2 font-mono text-gray-800">{l.ip}</td><td className="py-1 pr-2 text-gray-600">{({ email: '이메일', register: '가입', kakao: '카카오', naver: '네이버', apple: 'Apple' } as Record<string, string>)[l.method] || l.method}</td><td className="py-1 text-gray-500 truncate max-w-[220px]">{l.userAgent || ''}</td></tr>
                                ))}
                              </tbody></table></div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 mb-1">같은 IP 를 쓴 다른 계정</p>
                            {loginInfo.data.sameIpAccounts.length === 0 ? <p className="text-gray-500">없음</p> : (
                              <ul className="space-y-0.5">
                                {loginInfo.data.sameIpAccounts.map((a, i) => (
                                  <li key={i} className="flex items-center gap-2 flex-wrap"><span className="font-mono text-gray-500">{a.ip}</span><span className="font-bold text-gray-900">{a.nickname || '(닉네임 없음)'}</span><span className="text-gray-500">{a.email}</span><span className="text-gray-500">{({ admin: '관리자', user: '일반', banned: '정지', deleted: '탈퇴' } as Record<string, string>)[a.role] || a.role}</span><span className="text-gray-500">{new Date(a.lastAt).toLocaleDateString('ko-KR')}</span></li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500">사기 신고·분쟁 확인 용도로만 열람하세요. 기록은 {loginInfo.data.retentionDays}일 뒤 자동 삭제됩니다.</p>
                        </>
                      )}
                    </div>
                  )}
                  </div>
                ))}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-3">
                    <button onClick={() => setUserPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 disabled:opacity-30">← 이전</button>
                    <span className="text-xs text-gray-500">{currentPage + 1} / {totalPages}</span>
                    <button onClick={() => setUserPage(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage >= totalPages - 1} className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 disabled:opacity-30">다음 →</button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 광고 초대 링크 — 상담 후 조건을 정해 광고주에게 소재 작성 링크 발급 */}
          {tab === 'adBookings' && adSection === 'invites' && (
            <AdInvitePanel />
          )}

          {/* Ad Bookings Tab */}
          {tab === 'adBookings' && adSection === 'bookings' && (
            <div className="space-y-3">
              {/* 매출 요약 */}
              {adRevenue && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="card p-3 text-center">
                    <div className="text-lg font-bold text-gray-900">{adRevenue.totalRevenue.toLocaleString()}원</div>
                    <div className="text-[10px] text-gray-500">총 매출</div>
                  </div>
                  <div className="card p-3 text-center">
                    <div className="text-lg font-bold text-accent">{adRevenue.monthlyRevenue.toLocaleString()}원</div>
                    <div className="text-[10px] text-gray-500">이번 달</div>
                  </div>
                  <div className="card p-3 text-center">
                    <div className="text-lg font-bold text-gray-900">{adRevenue.totalPayments}</div>
                    <div className="text-[10px] text-gray-500">결제 건수</div>
                  </div>
                </div>
              )}

              {/* 카테고리(슬롯)별 필터 — 들어온 예약에서 자동 생성, 건수 표시 */}
              {(() => {
                const catKey = (b: AdBookingItem) => (b.slotType === 'main_banner' ? 'main_banner' : `cat:${b.category || 'none'}`);
                const countOf = (id: string) => adBookings.filter((b) => catKey(b) === id).length;
                // 모든 카테고리를 항상 노출(등록 0건이어도) — 관리자가 카테고리별로 광고 관리.
                // 선택하면 아래 목록이 그 카테고리 광고만 표시.
                const AD_CAT_ORDER = ['skishop', 'repair', 'used', 'rental', 'lesson', 'accommodation', 'community', 'overseas'];
                const fixedChips = [
                  { id: 'main_banner', label: `메인 배너 ${countOf('main_banner')}` },
                  ...AD_CAT_ORDER.map((c) => ({ id: `cat:${c}`, label: `${AD_CATEGORY_LABELS[c] || c} ${countOf(`cat:${c}`)}` })),
                ];
                // 고정 목록에 없는 카테고리 값이 실제 예약에 있으면 뒤에 덧붙여 누락 방지(미분류 등)
                const extraChips = Array.from(new Set(adBookings.map(catKey)))
                  .filter((k) => k !== 'main_banner' && !AD_CAT_ORDER.includes(k.slice(4)))
                  .map((k) => {
                    const cat = k.slice(4);
                    const lbl = cat && cat !== 'none' ? (AD_CATEGORY_LABELS[cat] || cat) : '미분류';
                    return { id: k, label: `${lbl} ${countOf(k)}` };
                  });
                const catChips = [{ id: 'all', label: `전체 ${adBookings.length}` }, ...fixedChips, ...extraChips];
                const statusChips = [
                  { id: 'all', label: '전체' },
                  { id: 'pending_payment', label: '결제 대기' },
                  { id: 'active', label: '노출중' },
                  { id: 'paid', label: '결제 완료' },
                  { id: 'done', label: '종료·취소' },
                ];
                const shown = adBookings
                  .filter((b) => adCatFilter === 'all' || catKey(b) === adCatFilter)
                  .filter((b) => {
                    if (adStatusFilter === 'all') return true;
                    if (adStatusFilter === 'done') return ['completed', 'cancelled', 'refunded'].includes(b.status);
                    return b.status === adStatusFilter;
                  });
                const statusMap: Record<string, { label: string; color: string }> = {
                  pending_payment: { label: '결제 대기', color: 'bg-yellow-100 text-yellow-700' },
                  paid: { label: '결제 완료', color: 'bg-blue-100 text-blue-700' },
                  active: { label: '노출중', color: 'bg-mint/20 text-emerald-700' },
                  completed: { label: '종료', color: 'bg-gray-100 text-gray-600' },
                  cancelled: { label: '취소', color: 'bg-coral/20 text-coral' },
                  refunded: { label: '환불', color: 'bg-coral/20 text-coral' },
                };
                return (
                  <>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                      {catChips.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setAdCatFilter(c.id)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap flex-shrink-0 border transition-colors ${
                            adCatFilter === c.id ? 'bg-sky-500 text-white border-sky-500' : 'bg-snow text-gray-600 border-gray-200'
                          }`}
                        >{c.label}</button>
                      ))}
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                      {statusChips.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setAdStatusFilter(c.id)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap flex-shrink-0 border transition-colors ${
                            adStatusFilter === c.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-snow text-gray-600 border-gray-200'
                          }`}
                        >{c.label}</button>
                      ))}
                    </div>

                    {shown.length === 0 ? (
                      <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">
                        {adBookings.length === 0 ? '광고 예약이 없습니다.' : '이 조건의 광고가 없습니다.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        {shown.map((b) => {
                          const s = statusMap[b.status] || { label: b.status, color: 'bg-gray-100 text-gray-600' };
                          const startD = new Date(b.startDate);
                          const endD = new Date(b.endDate);
                          const isActive = ['active', 'paid', 'completed'].includes(b.status);
                          return (
                            <div key={b.id} className="card p-2.5 flex flex-col">
                              {/* 소재 썸네일 — 상태·클릭수 오버레이 */}
                              <div className="relative w-full h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center mb-1.5">
                                {b.image
                                  ? <img src={imageUrl(b.image, 300)} alt="" className="w-full h-full object-cover" />
                                  : <span className="text-[9px] text-gray-500">텍스트 광고</span>}
                                <span className={`absolute top-1 left-1 text-[9px] font-bold px-1 py-0.5 rounded ${s.color}`}>{s.label}</span>
                                {isActive && (
                                  <span className="absolute bottom-1 right-1 text-[9px] font-bold text-white bg-black/55 rounded px-1 py-0.5">클릭 {(b.clickCount ?? 0).toLocaleString()}</span>
                                )}
                              </div>
                              <span className="self-start text-[9px] font-bold text-sky-600 bg-sky-50 border border-sky-200 px-1 py-0.5 rounded">{adSlotLabelKr(b.slotType, b.category)}</span>
                              <p className="text-xs font-bold text-gray-900 truncate mt-1">{b.title || '(이미지 광고)'}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {startD.getMonth() + 1}/{startD.getDate()}~{endD.getMonth() + 1}/{endD.getDate()} · <span className="font-bold text-gray-900">{b.totalPrice.toLocaleString()}원</span>
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">{b.user.name} · {b.user.phone}</p>
                              <p className="text-[10px] text-gray-500 truncate">{b.user.email}</p>
                              {b.payment && b.payment.status === 'paid' && (
                                <p className="text-[9px] text-gray-500 mt-0.5">결제 {b.payment.payMethod} · {new Date(b.payment.paidAt).toLocaleDateString('ko-KR')}</p>
                              )}
                              {(b.status === 'pending_payment' || b.status === 'paid' || b.status === 'active') && (
                                <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100">
                                  {b.status === 'pending_payment' && (
                                    <>
                                      <button
                                        onClick={() => handleAdBookingApprove(b.id)}
                                        className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-600 transition-colors"
                                      >입금확인</button>
                                      <button
                                        onClick={() => handleAdBookingFree(b.id)}
                                        className="flex-1 py-1.5 bg-sky-100 text-sky-700 rounded-lg font-bold text-[11px] hover:bg-sky-200 transition-colors"
                                      >무료</button>
                                    </>
                                  )}
                                  {b.status === 'paid' && (
                                    // 카드 결제 완료(검수 대기) 또는 미래 시작 승인 건 — 게재 승인/시작일 변경.
                                    // 이 버튼이 없으면 카드 결제 광고는 영영 활성화 못 함
                                    <button
                                      onClick={() => handleAdBookingApprove(b.id)}
                                      className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-600 transition-colors"
                                    >게재 승인</button>
                                  )}
                                  <button
                                    onClick={() => handleAdBookingCancel(b.id)}
                                    className="flex-1 py-1.5 bg-gray-100 text-coral rounded-lg font-bold text-[11px] hover:bg-coral/10 transition-colors"
                                  >취소</button>
                                </div>
                              )}
                              {['cancelled', 'refunded', 'completed', 'rejected', 'expired'].includes(b.status) && (
                                <div className="mt-2">
                                  <button onClick={() => handleAdBookingDelete(b.id)} className="w-full py-1.5 bg-white border border-red-200 text-red-600 rounded-lg font-bold text-[11px] hover:bg-red-50 transition-colors">기록 삭제</button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Ad Pricing Tab */}
          {tab === 'adBookings' && adSection === 'pricing' && (
            <div className="space-y-4">
              {adPricings.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">광고 가격 설정이 없습니다.</div>
              ) : (
                (() => {
                  // 슬롯별 그룹 (메인 배너 / 카테고리 배너 / 프리미엄) — 카테고리 배너는 카테고리 순 정렬
                  const catOrder = ['none', 'skishop', 'repair', 'used', 'rental', 'lesson', 'accommodation', 'community', 'overseas'];
                  const groups: { slot: string; items: AdPricingItem[] }[] = [];
                  for (const slot of ['main_banner', 'category', 'premium']) {
                    const items = adPricings
                      .filter((p) => p.slotType === slot)
                      .sort((a, b) => catOrder.indexOf(a.category || 'none') - catOrder.indexOf(b.category || 'none'));
                    if (items.length) groups.push({ slot, items });
                  }
                  // 알 수 없는 슬롯도 누락 없이
                  const known = new Set(['main_banner', 'category', 'premium']);
                  const etc = adPricings.filter((p) => !known.has(p.slotType));
                  if (etc.length) groups.push({ slot: '기타', items: etc });
                  return groups.map(({ slot, items }) => (
                    <div key={slot}>
                      <div className="mb-2 px-1">
                        <h3 className="text-sm font-bold text-gray-900">{SLOT_LABELS[slot] || slot}</h3>
                        {SLOT_DESCRIPTIONS[slot] && <p className="text-[11px] text-gray-500 mt-0.5">{SLOT_DESCRIPTIONS[slot]}</p>}
                      </div>
                      <div className="card overflow-hidden divide-y divide-gray-100">
                        {/* 열 헤더 */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-500">
                          <span className="flex-1">카테고리</span>
                          <span className="w-24 text-center">월 단가</span>
                          <span className="w-14 text-center">동시 수</span>
                          <span className="w-12 text-center">상태</span>
                        </div>
                        {items.map((p) => (
                          <div key={p.id} className={`flex items-center gap-2 px-4 py-2.5 ${p.active ? '' : 'opacity-50'}`}>
                            <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                              {p.slotType === 'category' || p.slotType === 'premium'
                                ? (AD_CATEGORY_LABELS[p.category || 'none'] || p.category || '전체')
                                : '홈 상단'}
                            </span>
                            <input
                              type="number"
                              defaultValue={p.pricePerDay}
                              onBlur={(e) => {
                                const v = parseInt(e.target.value);
                                if (v > 0 && v !== p.pricePerDay) handlePricingUpdate(p, 'pricePerDay', v);
                              }}
                              className="w-24 px-2 py-1.5 bg-snow border border-gray-200 rounded-lg text-sm text-right text-gray-900 focus:outline-none focus:border-sky-400"
                            />
                            <input
                              type="number"
                              defaultValue={p.maxConcurrent}
                              onBlur={(e) => {
                                const v = parseInt(e.target.value);
                                if (v > 0 && v !== p.maxConcurrent) handlePricingUpdate(p, 'maxConcurrent', v);
                              }}
                              className="w-14 px-2 py-1.5 bg-snow border border-gray-200 rounded-lg text-sm text-center text-gray-900 focus:outline-none focus:border-sky-400"
                            />
                            <button
                              onClick={() => handlePricingUpdate(p, 'active', !p.active)}
                              className={`w-12 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                                p.active ? 'bg-mint/20 text-emerald-700' : 'bg-gray-100 text-gray-500'
                              }`}
                            >{p.active ? '활성' : '꺼짐'}</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()
              )}
              <p className="text-[10px] text-gray-500 px-1">가격·동시 수는 입력 후 바깥을 누르면 저장됩니다. 상태 버튼으로 슬롯 판매 켜기/끄기.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
