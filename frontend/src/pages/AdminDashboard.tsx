import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';

type TabId = 'reports' | 'stats' | 'users' | 'banners' | 'premium' | 'adRequests';

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

interface AdRequestItem {
  id: string;
  type: string;
  category: string | null;
  title: string;
  description: string;
  url: string;
  message: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; phone: string };
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
  const [adRequests, setAdRequests] = useState<AdRequestItem[]>([]);
  const [adRejectNote, setAdRejectNote] = useState<{ id: string; note: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Banner form state
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bannerForm, setBannerForm] = useState({ title: '', description: '', tag: 'AD', url: '', order: 0, active: true });
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

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
      } else if (tab === 'adRequests') {
        const data = await api<AdRequestItem[]>('/admin/ad-requests');
        setAdRequests(data);
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
      if (editingBannerId) {
        await api(`/admin/banners/${editingBannerId}`, { method: 'PUT', body: bannerForm });
      } else {
        await api('/admin/banners', { method: 'POST', body: bannerForm });
      }
      setShowBannerForm(false);
      setBannerForm({ title: '', description: '', tag: 'AD', url: '', order: 0, active: true });
      setEditingBannerId(null);
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
    setBannerForm({ title: banner.title, description: banner.description, tag: banner.tag, url: banner.url, order: banner.order, active: banner.active });
    setEditingBannerId(banner.id);
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

  const handleAdApprove = async (id: string) => {
    try {
      await api(`/admin/ad-requests/${id}/approve`, { method: 'PUT' });
      setAdRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved', adminNote: null } : r)));
    } catch (err) {
      alert(err instanceof Error ? err.message : '처리 실패');
    }
  };

  const handleAdReject = async (id: string, note: string) => {
    try {
      await api(`/admin/ad-requests/${id}/reject`, { method: 'PUT', body: { adminNote: note } });
      setAdRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected', adminNote: note } : r)));
      setAdRejectNote(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '처리 실패');
    }
  };

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'reports', label: '신고관리' },
    { id: 'stats', label: '통계' },
    { id: 'users', label: '유저관리' },
    { id: 'banners', label: '배너관리' },
    { id: 'premium', label: '프리미엄' },
    { id: 'adRequests', label: '광고신청' },
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
                onClick={() => { setShowBannerForm(true); setEditingBannerId(null); setBannerForm({ title: '', description: '', tag: 'AD', url: '', order: 0, active: true }); }}
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
          {/* Ad Requests Tab */}
          {tab === 'adRequests' && (
            <div className="space-y-3">
              {adRequests.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">광고 신청이 없습니다.</div>
              ) : (
                adRequests.map((r) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          r.status === 'approved' ? 'bg-mint/20 text-emerald-700' :
                          r.status === 'rejected' ? 'bg-coral/20 text-coral' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {r.status === 'approved' ? '승인' : r.status === 'rejected' ? '거부' : '대기중'}
                        </span>
                        <span className="text-[10px] text-gray-400">{r.type === 'main_banner' ? '메인 배너' : `카테고리: ${r.category}`}</span>
                      </div>
                      <span className="text-[10px] text-gray-300">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-0.5">{r.title}</p>
                    <p className="text-xs text-gray-500 mb-1">{r.description}</p>
                    <p className="text-[11px] text-accent truncate mb-1">{r.url}</p>
                    {r.message && <p className="text-[10px] text-gray-400 bg-gray-50 rounded p-2 mb-1">메모: {r.message}</p>}
                    {r.adminNote && <p className="text-[10px] text-coral">거부 사유: {r.adminNote}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">신청자: {r.user.name} ({r.user.email}) · {r.user.phone}</p>
                    {r.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleAdApprove(r.id)} className="flex-1 py-2 bg-accent text-white rounded-lg font-bold text-xs hover:bg-accent-light transition-colors">
                          승인
                        </button>
                        <button onClick={() => setAdRejectNote({ id: r.id, note: '' })} className="flex-1 py-2 bg-coral/10 text-coral rounded-lg font-bold text-xs hover:bg-coral/20 transition-colors">
                          거부
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* 거부 사유 입력 팝업 */}
              {adRejectNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setAdRejectNote(null)} />
                  <div className="relative bg-white rounded-xl p-5 w-full max-w-sm">
                    <h4 className="text-sm font-bold text-gray-900 mb-3">거부 사유 입력</h4>
                    <textarea
                      value={adRejectNote.note}
                      onChange={(e) => setAdRejectNote({ ...adRejectNote, note: e.target.value })}
                      placeholder="거부 사유를 입력하세요 (선택)"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none mb-3"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setAdRejectNote(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-500 rounded-lg font-bold text-xs">취소</button>
                      <button onClick={() => handleAdReject(adRejectNote.id, adRejectNote.note)} className="flex-1 py-2.5 bg-coral text-white rounded-lg font-bold text-xs">거부 확정</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
