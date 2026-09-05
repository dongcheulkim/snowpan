import { toastSuccess, toastError } from '../components/Toast';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUser, uploadImages, imageUrl } from '../api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { CalendarIcon, ChartIcon, ChatIcon, CloseIcon, DocumentIcon, PackageIcon, UsersIcon } from '../components/Icons';
import { adSlotLabelKr, SLOT_DESCRIPTIONS, SLOT_LABELS, AD_CATEGORY_LABELS } from '../utils/adLabels';
import AdminApproval from './AdminApproval';

type TabId = 'approval' | 'reports' | 'stats' | 'users' | 'banners' | 'premium' | 'adBookings' | 'adPricing';

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
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  createdAt: string;
}

interface BannerItem {
  id: string;
  title: string;
  description: string;
  tag: string;
  url: string;
  image: string | null;
  order: number;
  active: boolean;
  createdAt: string;
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  isPremium: boolean;
  premiumUntil: string | null;
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
  const [stats, setStats] = useState<StatsData | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(0);
  const USERS_PER_PAGE = 30;
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [adBookings, setAdBookings] = useState<AdBookingItem[]>([]);
  // 광고예약 필터 — 카테고리(슬롯)별 · 상태별 골라보기
  const [adCatFilter, setAdCatFilter] = useState('all');
  const [adStatusFilter, setAdStatusFilter] = useState('all');
  const [adPricings, setAdPricings] = useState<AdPricingItem[]>([]);
  const [adRevenue, setAdRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  // Banner form state
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bannerForm, setBannerForm] = useState({ title: '', description: '', tag: 'AD', url: '', image: '', order: 0, active: true });
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState('');

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
      } else if (tab === 'banners') {
        const data = await api<BannerItem[]>('/admin/banners');
        setBanners(data);
      } else if (tab === 'premium') {
        const data = await api<{ products: ProductItem[]; totalCount: number }>('/products?category=used&limit=50');
        setProducts(data.products);
      } else if (tab === 'adBookings') {
        const [bookings, revenue] = await Promise.all([
          api<AdBookingItem[]>('/ad-booking/admin/bookings'),
          api<RevenueData>('/ad-booking/admin/revenue'),
        ]);
        setAdBookings(bookings);
        setAdRevenue(revenue);
      } else if (tab === 'adPricing') {
        const data = await api<AdPricingItem[]>('/ad-booking/admin/pricings');
        setAdPricings(data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResolve = async (id: string) => {
    try {
      await api(`/admin/reports/${id}`, { method: 'PUT' });
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'resolved' } : r)));
    } catch (err) {
      toastError(err instanceof Error ? err.message : '처리 실패');
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

  const handleBannerSubmit = async () => {
    try {
      let imgUrl = bannerForm.image;
      if (bannerImageFile) {
        const urls = await uploadImages([bannerImageFile]);
        imgUrl = urls[0];
      }
      const body = { ...bannerForm, image: imgUrl };
      if (editingBannerId) {
        await api(`/admin/banners/${editingBannerId}`, { method: 'PUT', body });
      } else {
        await api('/admin/banners', { method: 'POST', body });
      }
      setShowBannerForm(false);
      setBannerForm({ title: '', description: '', tag: 'AD', url: '', image: '', order: 0, active: true });
      setEditingBannerId(null);
      setBannerImageFile(null);
      setBannerImagePreview('');
      fetchData();
    } catch (err) {
      toastError(err instanceof Error ? err.message : '저장 실패');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('배너를 삭제하시겠습니까?')) return;
    try {
      await api(`/admin/banners/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      toastError(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const handleEditBanner = (banner: BannerItem) => {
    setBannerForm({ title: banner.title, description: banner.description, tag: banner.tag, url: banner.url, image: banner.image || '', order: banner.order, active: banner.active });
    setEditingBannerId(banner.id);
    setBannerImageFile(null);
    setBannerImagePreview(banner.image ? imageUrl(banner.image) : '');
    setShowBannerForm(true);
  };

  const handleTogglePremium = async (id: string, current: boolean) => {
    try {
      await api(`/admin/products/${id}/premium`, { method: 'PUT', body: { isPremium: !current } });
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isPremium: !current } : p)));
    } catch (err) {
      toastError(err instanceof Error ? err.message : '설정 실패');
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

  const handleAdBookingCancel = async (id: string) => {
    if (!confirm('이 광고 예약을 취소하고 환불하시겠습니까?')) return;
    try {
      await api(`/ad-booking/admin/bookings/${id}/cancel`, { method: 'POST', body: { reason: '관리자 취소' } });
      setAdBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'refunded' } : b)));
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
    { id: 'banners', label: '배너관리' },
    { id: 'premium', label: '프리미엄' },
    { id: 'adBookings', label: '광고예약' },
    { id: 'adPricing', label: '광고가격' },
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

      {loading ? (
        <div className="text-center py-16 text-gray-500 text-sm">로딩 중...</div>
      ) : (
        <>
          {/* Reports Tab */}
          {tab === 'approval' && (
            <AdminApproval embedded />
          )}
          {tab === 'reports' && (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">신고가 없습니다.</div>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.status === 'resolved' ? 'bg-mint/20 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {r.status === 'resolved' ? '처리완료' : '대기중'}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">{({ product: '상품', post: '게시글', user: '유저', skishop: '스키샵', repair: '정비샵', rental: '렌탈샵', lesson: '레슨', accommodation: '숙소' } as Record<string, string>)[r.type] || r.type}</span>
                      </div>
                      <span className="text-[10px] text-gray-500">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                    {/* 신고 대상 — 이름 + 바로가기 (삭제된 대상은 표시만) */}
                    {(r.targetName || r.targetPath) && (
                      <p className="text-xs mb-1">
                        <span className="text-gray-500">대상: </span>
                        <span className="font-bold text-gray-900">{r.targetName || '(삭제됨)'}</span>
                        {r.targetPath && r.targetName && (
                          <a href={r.targetPath} target="_blank" rel="noopener noreferrer" className="ml-2 text-sky-600 underline">보러가기</a>
                        )}
                      </p>
                    )}
                    <p className="text-sm font-medium text-gray-900 mb-1">{r.reason}</p>
                    {r.description && <p className="text-xs text-gray-500 mb-2">{r.description}</p>}
                    <p className="text-[10px] text-gray-500">신고자: {r.reporter.name} ({r.reporter.email})</p>
                    {r.status === 'pending' && (
                      <button onClick={() => handleResolve(r.id)} className="mt-3 px-4 py-2 bg-accent text-white rounded-lg font-bold text-xs hover:bg-accent-light transition-colors">
                        처리 완료
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

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

              {/* 누적 카운트 */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '총 상품', value: stats.products, Icon: PackageIcon },
                  { label: '총 게시글', value: stats.posts, Icon: DocumentIcon },
                  { label: '총 채팅방', value: stats.chatRooms, Icon: ChatIcon },
                ].map((s) => (
                  <div key={s.label} className="card p-4 text-center">
                    <div className="mx-auto mb-1 flex justify-center text-gray-700"><s.Icon size={20} /></div>
                    <div className="text-lg font-bold text-gray-900">{s.value.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

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
                  ((u as any).nickname || '').toLowerCase().includes(q)
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
                  <div key={u.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{u.name}</span>
                        {(u as any).nickname && <span className="text-xs text-gray-500">({(u as any).nickname})</span>}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          u.role === 'admin' ? 'bg-accent/20 text-accent' : u.role === 'banned' ? 'bg-coral/20 text-coral' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {({ admin: '관리자', user: '일반', banned: '정지', deleted: '탈퇴' } as Record<string, string>)[u.role] || u.role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    {u.role !== 'admin' && (
                      <button onClick={() => handleBan(u.id)} className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${u.role === 'banned' ? 'bg-mint/10 text-emerald-700 hover:bg-mint/20' : 'bg-coral/10 text-coral hover:bg-coral/20'}`}>
                        {u.role === 'banned' ? '정지 해제' : '정지'}
                      </button>
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

          {/* Banners Tab */}
          {tab === 'banners' && (
            <div className="space-y-3">
              <button
                onClick={() => { setShowBannerForm(true); setEditingBannerId(null); setBannerForm({ title: '', description: '', tag: 'AD', url: '', image: '', order: 0, active: true }); setBannerImageFile(null); setBannerImagePreview(''); }}
                className="px-4 py-2 bg-accent text-white rounded-lg font-bold text-xs hover:bg-accent-light transition-colors"
              >
                + 배너 추가
              </button>

              {showBannerForm && (
                <div className="card p-4 space-y-3">
                  <h3 className="text-sm font-bold text-gray-900">{editingBannerId ? '배너 수정' : '새 배너'}</h3>
                  <input placeholder="제목" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} className={inputClass} />
                  <input placeholder="설명" value={bannerForm.description} onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })} className={inputClass} />
                  <input placeholder="태그 (예: AD)" value={bannerForm.tag} onChange={(e) => setBannerForm({ ...bannerForm, tag: e.target.value })} className={inputClass} />
                  <input placeholder="URL" value={bannerForm.url} onChange={(e) => setBannerForm({ ...bannerForm, url: e.target.value })} className={inputClass} />
                  <input type="number" placeholder="순서" value={bannerForm.order} onChange={(e) => setBannerForm({ ...bannerForm, order: parseInt(e.target.value) || 0 })} className={inputClass} />
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">배너 이미지</label>
                    {bannerImagePreview ? (
                      <div className="relative">
                        <img src={bannerImagePreview} alt="preview" className="w-full max-h-48 object-contain rounded-lg bg-gray-100" />
                        <button onClick={() => { setBannerImageFile(null); setBannerImagePreview(''); setBannerForm({ ...bannerForm, image: '' }); }} aria-label="제거" className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center"><CloseIcon size={12} /></button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-sky-400 transition-colors">
                        <span className="text-xs text-gray-500">이미지 업로드</span>
                        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setBannerImageFile(f); setBannerImagePreview(URL.createObjectURL(f)); } }} className="hidden" />
                      </label>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={bannerForm.active} onChange={(e) => setBannerForm({ ...bannerForm, active: e.target.checked })} />
                    활성화
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowBannerForm(false); setEditingBannerId(null); }} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold text-xs">취소</button>
                    <button onClick={handleBannerSubmit} className="flex-1 py-2 bg-accent text-white rounded-lg font-bold text-xs">저장</button>
                  </div>
                </div>
              )}

              {banners.map((b) => (
                <div key={b.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${b.active ? 'bg-mint/20 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {b.active ? '활성' : '비활성'}
                        </span>
                        <span className="text-[10px] text-gray-500">순서: {b.order}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{b.title}</p>
                      <p className="text-xs text-gray-500">{b.description}</p>
                      {b.image && <img src={imageUrl(b.image)} alt="" className="w-32 h-16 object-contain rounded mt-1 bg-gray-50" />}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditBanner(b)} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">수정</button>
                      <button onClick={() => handleDeleteBanner(b.id)} className="px-2 py-1 bg-coral/10 text-coral rounded text-[10px] font-bold">삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Premium Tab */}
          {tab === 'premium' && (
            <div className="space-y-2">
              {products.length === 0 && !loading && (
                <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">등록된 중고 상품이 없습니다.</div>
              )}
              {products.map((p) => (
                <div key={p.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{p.name}</span>
                      {p.isPremium && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gold/20 text-yellow-700">PREMIUM</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{p.price.toLocaleString()}원</p>
                  </div>
                  <button
                    onClick={() => handleTogglePremium(p.id, p.isPremium)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${
                      p.isPremium ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gold/10 text-yellow-700 hover:bg-gold/20'
                    }`}
                  >
                    {p.isPremium ? '해제' : '프리미엄 설정'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Ad Bookings Tab */}
          {tab === 'adBookings' && (
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
                const catCounts = new Map<string, number>();
                adBookings.forEach((b) => catCounts.set(catKey(b), (catCounts.get(catKey(b)) || 0) + 1));
                const catChips = [
                  { id: 'all', label: `전체 ${adBookings.length}` },
                  ...Array.from(catCounts.entries()).map(([id, n]) => {
                    const sample = adBookings.find((b) => catKey(b) === id)!;
                    return { id, label: `${adSlotLabelKr(sample.slotType, sample.category)} ${n}` };
                  }),
                ];
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
                      shown.map((b) => {
                        const s = statusMap[b.status] || { label: b.status, color: 'bg-gray-100 text-gray-600' };
                        const startD = new Date(b.startDate);
                        const endD = new Date(b.endDate);
                        return (
                          <div key={b.id} className="card p-4">
                            <div className="flex gap-3">
                              {/* 소재 썸네일 — 어떤 광고인지 한눈에 */}
                              <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                                {b.image
                                  ? <img src={imageUrl(b.image, 200)} alt="" className="w-full h-full object-cover" />
                                  : <span className="text-[9px] text-gray-400">텍스트 광고</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.color}`}>{s.label}</span>
                                  <span className="text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">{adSlotLabelKr(b.slotType, b.category)}</span>
                                  <span className="text-[10px] text-gray-400 ml-auto">{new Date(b.createdAt).toLocaleDateString('ko-KR')}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-sm font-bold text-gray-900 truncate flex-1">{b.title || '(이미지 광고)'}</p>
                                  {['active', 'paid', 'completed'].includes(b.status) && (
                                    <span className="flex-shrink-0 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5">클릭 {(b.clickCount ?? 0).toLocaleString()}</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  {startD.getMonth() + 1}/{startD.getDate()} ~ {endD.getMonth() + 1}/{endD.getDate()} ({b.totalDays}일) · <span className="font-bold text-gray-900">{b.totalPrice.toLocaleString()}원</span>
                                </p>
                                <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                                  {b.user.name} · {b.user.phone} · {b.user.email}
                                </p>
                                {b.payment && (
                                  <p className="text-[10px] text-gray-400 mt-0.5">결제 {b.payment.payMethod} · {new Date(b.payment.paidAt).toLocaleDateString('ko-KR')}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                              {b.status === 'pending_payment' && (
                                <>
                                  <button
                                    onClick={() => handleAdBookingApprove(b.id)}
                                    className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-bold text-xs hover:bg-emerald-600 transition-colors"
                                  >입금 확인</button>
                                  <button
                                    onClick={() => handleAdBookingFree(b.id)}
                                    className="flex-1 py-2 bg-sky-100 text-sky-700 rounded-lg font-bold text-xs hover:bg-sky-200 transition-colors"
                                  >무료 승인</button>
                                </>
                              )}
                              {(b.status === 'pending_payment' || b.status === 'paid' || b.status === 'active') && (
                                <button
                                  onClick={() => handleAdBookingCancel(b.id)}
                                  className="flex-1 py-2 bg-gray-100 text-coral rounded-lg font-bold text-xs hover:bg-coral/10 transition-colors"
                                >취소</button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Ad Pricing Tab */}
          {tab === 'adPricing' && (
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
              <p className="text-[10px] text-gray-400 px-1">가격·동시 수는 입력 후 바깥을 누르면 저장됩니다. 상태 버튼으로 슬롯 판매 켜기/끄기.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
