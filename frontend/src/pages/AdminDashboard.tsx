import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUser, uploadImages, imageUrl } from '../api';

type TabId = 'reports' | 'stats' | 'users' | 'banners' | 'premium' | 'adBookings' | 'adPricing';

interface ReportItem {
  id: string;
  type: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string; email: string };
}

interface StatsData {
  users: number;
  products: number;
  posts: number;
  chatRooms: number;
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
  status: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalPrice: number;
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
  const [tab, setTab] = useState<TabId>('reports');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [adBookings, setAdBookings] = useState<AdBookingItem[]>([]);
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
      alert(err instanceof Error ? err.message : '처리 실패');
    }
  };

  const handleBan = async (id: string) => {
    if (!confirm('정말 이 유저를 정지하시겠습니까?')) return;
    try {
      await api(`/admin/users/${id}/ban`, { method: 'PUT' });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: 'banned' } : u)));
    } catch (err) {
      alert(err instanceof Error ? err.message : '정지 실패');
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
      alert(err instanceof Error ? err.message : '저장 실패');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('배너를 삭제하시겠습니까?')) return;
    try {
      await api(`/admin/banners/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 실패');
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
      alert(err instanceof Error ? err.message : '설정 실패');
    }
  };

  const handleAdBookingApprove = async (id: string) => {
    if (!confirm('입금 확인하고 광고를 바로 노출하시겠습니까?')) return;
    try {
      await api(`/ad-booking/admin/bookings/${id}/approve`, { method: 'POST' });
      setAdBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'active' } : b)));
      alert('입금 확인 완료! 광고가 노출됩니다.');
    } catch (err) {
      alert(err instanceof Error ? err.message : '승인 실패');
    }
  };

  const handleAdBookingCancel = async (id: string) => {
    if (!confirm('이 광고 예약을 취소하고 환불하시겠습니까?')) return;
    try {
      await api(`/ad-booking/admin/bookings/${id}/cancel`, { method: 'POST', body: { reason: '관리자 취소' } });
      setAdBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'refunded' } : b)));
    } catch (err) {
      alert(err instanceof Error ? err.message : '취소 실패');
    }
  };

  const handlePricingUpdate = async (pricing: AdPricingItem, field: string, value: number | boolean) => {
    try {
      await api(`/ad-booking/admin/pricings/${pricing.id}`, { method: 'PUT', body: { [field]: value } });
      setAdPricings((prev) => prev.map((p) => (p.id === pricing.id ? { ...p, [field]: value } : p)));
    } catch (err) {
      alert(err instanceof Error ? err.message : '수정 실패');
    }
  };

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'reports', label: '신고관리' },
    { id: 'stats', label: '통계' },
    { id: 'users', label: '유저관리' },
    { id: 'banners', label: '배너관리' },
    { id: 'premium', label: '프리미엄' },
    { id: 'adBookings', label: '광고예약' },
    { id: 'adPricing', label: '광고가격' },
  ];

  const inputClass = "w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
        <Link to="/mypage" className="text-sm text-gray-400">← 내정보</Link>
      </div>

      <div className="flex gap-1 bg-gray-50 rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap px-2 ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">로딩 중...</div>
      ) : (
        <>
          {/* Reports Tab */}
          {tab === 'reports' && (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">신고가 없습니다.</div>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.status === 'resolved' ? 'bg-mint/20 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {r.status === 'resolved' ? '처리완료' : '대기중'}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">{r.type}</span>
                      </div>
                      <span className="text-[10px] text-gray-300">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{r.reason}</p>
                    {r.description && <p className="text-xs text-gray-400 mb-2">{r.description}</p>}
                    <p className="text-[10px] text-gray-300">신고자: {r.reporter.name} ({r.reporter.email})</p>
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
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '총 유저 수', value: stats.users, icon: '👥' },
                { label: '총 상품 수', value: stats.products, icon: '📦' },
                { label: '총 게시글 수', value: stats.posts, icon: '📝' },
                { label: '총 채팅방 수', value: stats.chatRooms, icon: '💬' },
              ].map((s) => (
                <div key={s.label} className="card p-5 text-center">
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className="text-2xl font-bold text-gray-900">{s.value.toLocaleString()}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Users Tab */}
          {tab === 'users' && (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{u.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        u.role === 'admin' ? 'bg-accent/20 text-accent' : u.role === 'banned' ? 'bg-coral/20 text-coral' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  {u.role !== 'admin' && u.role !== 'banned' && (
                    <button onClick={() => handleBan(u.id)} className="px-3 py-1.5 bg-coral/10 text-coral rounded-lg font-bold text-[11px] hover:bg-coral/20 transition-colors">
                      정지
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

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
                        <button onClick={() => { setBannerImageFile(null); setBannerImagePreview(''); setBannerForm({ ...bannerForm, image: '' }); }} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✕</button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-sky-400 transition-colors">
                        <span className="text-xs text-gray-400">이미지 업로드</span>
                        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setBannerImageFile(f); setBannerImagePreview(URL.createObjectURL(f)); } }} className="hidden" />
                      </label>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={bannerForm.active} onChange={(e) => setBannerForm({ ...bannerForm, active: e.target.checked })} />
                    활성화
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowBannerForm(false); setEditingBannerId(null); }} className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-lg font-bold text-xs">취소</button>
                    <button onClick={handleBannerSubmit} className="flex-1 py-2 bg-accent text-white rounded-lg font-bold text-xs">저장</button>
                  </div>
                </div>
              )}

              {banners.map((b) => (
                <div key={b.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${b.active ? 'bg-mint/20 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                          {b.active ? '활성' : '비활성'}
                        </span>
                        <span className="text-[10px] text-gray-400">순서: {b.order}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{b.title}</p>
                      <p className="text-xs text-gray-400">{b.description}</p>
                      {b.image && <img src={imageUrl(b.image)} alt="" className="w-32 h-16 object-contain rounded mt-1 bg-gray-50" />}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditBanner(b)} className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-[10px] font-bold">수정</button>
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
              {products.map((p) => (
                <div key={p.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{p.name}</span>
                      {p.isPremium && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gold/20 text-yellow-700">PREMIUM</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{p.price.toLocaleString()}원</p>
                  </div>
                  <button
                    onClick={() => handleTogglePremium(p.id, p.isPremium)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${
                      p.isPremium ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gold/10 text-yellow-700 hover:bg-gold/20'
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
                    <div className="text-[10px] text-gray-400">총 매출</div>
                  </div>
                  <div className="card p-3 text-center">
                    <div className="text-lg font-bold text-accent">{adRevenue.monthlyRevenue.toLocaleString()}원</div>
                    <div className="text-[10px] text-gray-400">이번 달</div>
                  </div>
                  <div className="card p-3 text-center">
                    <div className="text-lg font-bold text-gray-900">{adRevenue.totalPayments}</div>
                    <div className="text-[10px] text-gray-400">결제 건수</div>
                  </div>
                </div>
              )}

              {adBookings.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">광고 예약이 없습니다.</div>
              ) : (
                adBookings.map((b) => {
                  const slotLabel = b.slotType === 'main_banner' ? '메인 배너' : b.slotType === 'premium' ? '프리미엄' : `카테고리: ${b.category}`;
                  const statusMap: Record<string, { label: string; color: string }> = {
                    pending_payment: { label: '결제 대기', color: 'bg-yellow-100 text-yellow-700' },
                    paid: { label: '결제 완료', color: 'bg-blue-100 text-blue-700' },
                    active: { label: '노출중', color: 'bg-mint/20 text-emerald-700' },
                    completed: { label: '종료', color: 'bg-gray-100 text-gray-500' },
                    cancelled: { label: '취소', color: 'bg-coral/20 text-coral' },
                    refunded: { label: '환불', color: 'bg-coral/20 text-coral' },
                  };
                  const s = statusMap[b.status] || { label: b.status, color: 'bg-gray-100 text-gray-500' };
                  const startD = new Date(b.startDate);
                  const endD = new Date(b.endDate);
                  return (
                    <div key={b.id} className="card p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.color}`}>{s.label}</span>
                          <span className="text-[10px] text-gray-400">{slotLabel}</span>
                        </div>
                        <span className="text-[10px] text-gray-300">{new Date(b.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 mb-0.5">{b.title}</p>
                      <p className="text-xs text-gray-500 mb-1">
                        {startD.getMonth() + 1}/{startD.getDate()} ~ {endD.getMonth() + 1}/{endD.getDate()} ({b.totalDays}일)
                      </p>
                      <p className="text-xs font-bold text-accent mb-1">{b.totalPrice.toLocaleString()}원</p>
                      <p className="text-[10px] text-gray-400">
                        {b.user.name} ({b.user.email}) · {b.user.phone}
                      </p>
                      {b.payment && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          결제: {b.payment.payMethod} · {new Date(b.payment.paidAt).toLocaleDateString()}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {b.status === 'pending_payment' && (
                          <button
                            onClick={() => handleAdBookingApprove(b.id)}
                            className="px-3 py-1.5 bg-mint/20 text-emerald-700 rounded-lg font-bold text-[11px] hover:bg-mint/30 transition-colors"
                          >
                            입금 확인
                          </button>
                        )}
                        {(b.status === 'pending_payment' || b.status === 'paid' || b.status === 'active') && (
                          <button
                            onClick={() => handleAdBookingCancel(b.id)}
                            className="px-3 py-1.5 bg-coral/10 text-coral rounded-lg font-bold text-[11px] hover:bg-coral/20 transition-colors"
                          >
                            취소
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Ad Pricing Tab */}
          {tab === 'adPricing' && (
            <div className="space-y-3">
              {adPricings.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">광고 가격 설정이 없습니다.</div>
              ) : (
                adPricings.map((p) => {
                  const slotLabel = p.slotType === 'main_banner' ? '메인 배너' : p.slotType === 'premium' ? '프리미엄' : `카테고리: ${p.category}`;
                  return (
                    <div key={p.id} className="card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{slotLabel}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.active ? 'bg-mint/20 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                            {p.active ? '활성' : '비활성'}
                          </span>
                        </div>
                        <button
                          onClick={() => handlePricingUpdate(p, 'active', !p.active)}
                          className="text-[10px] text-gray-400 hover:text-gray-600"
                        >
                          {p.active ? '비활성화' : '활성화'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">1일 가격 (원)</label>
                          <input
                            type="number"
                            defaultValue={p.pricePerDay}
                            onBlur={(e) => {
                              const v = parseInt(e.target.value);
                              if (v > 0 && v !== p.pricePerDay) handlePricingUpdate(p, 'pricePerDay', v);
                            }}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">동시 광고 수</label>
                          <input
                            type="number"
                            defaultValue={p.maxConcurrent}
                            onBlur={(e) => {
                              const v = parseInt(e.target.value);
                              if (v > 0 && v !== p.maxConcurrent) handlePricingUpdate(p, 'maxConcurrent', v);
                            }}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
