import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';

interface PendingItem {
  id: string;
  name?: string;
  price?: number;
  image?: string;
  duration?: string;
  equipment?: string;
  level?: string;
  maxStudents?: number;
  type?: string;
  guests?: string;
  features?: string;
  badgeType?: string;
  status?: string;
  businessLicense?: string;
  instructorCert?: string;
  accommodationPermit?: string;
  resort?: { name: string };
  area?: string;
  address?: string;
  description?: string;
  user?: { id: string; name: string; email?: string; phone?: string };
}

type TabId = 'rental' | 'lesson' | 'accommodation' | 'badge' | 'skishop' | 'repair';

const badgeLabels: Record<string, { label: string; color: string }> = {
  lv1: { label: 'LV1', color: 'bg-green-500 text-white' },
  lv2: { label: 'LV2', color: 'bg-accent text-white' },
  lv3: { label: 'LV3', color: 'bg-purple-500 text-white' },
  demo: { label: '데몬', color: 'bg-yellow-500 text-black' },
  teaching1: { label: '티칭1', color: 'bg-blue-400 text-white' },
  teaching2: { label: '티칭2', color: 'bg-blue-500 text-white' },
  teaching3: { label: '티칭3', color: 'bg-blue-700 text-white' },
  pro: { label: '프로', color: 'bg-red-500 text-white' },
};

// 관리자가 선택 가능한 모든 뱃지 옵션
const allBadgeOptions = [
  { value: 'lv1', label: 'LV1', color: 'bg-green-500 text-white' },
  { value: 'lv2', label: 'LV2', color: 'bg-accent text-white' },
  { value: 'lv3', label: 'LV3', color: 'bg-purple-500 text-white' },
  { value: 'demo', label: '데몬', color: 'bg-yellow-500 text-black' },
  { value: 'teaching1', label: '티칭1', color: 'bg-blue-400 text-white' },
  { value: 'teaching2', label: '티칭2', color: 'bg-blue-500 text-white' },
  { value: 'teaching3', label: '티칭3', color: 'bg-blue-700 text-white' },
  { value: 'pro', label: '프로', color: 'bg-red-500 text-white' },
];

const accomTypeLabels: Record<string, string> = {
  hotel: '호텔', pension: '펜션', condo: '콘도', minbak: '민박', season: '시즌방',
};

const AdminApproval = () => {
  const [activeTab, setActiveTab] = useState<TabId>('rental');
  const [pendingRentals, setPendingRentals] = useState<PendingItem[]>([]);
  const [pendingLessons, setPendingLessons] = useState<PendingItem[]>([]);
  const [pendingAccom, setPendingAccom] = useState<PendingItem[]>([]);
  const [pendingBadges, setPendingBadges] = useState<PendingItem[]>([]);
  const [pendingShops, setPendingShops] = useState<PendingItem[]>([]);
  const [pendingRepair, setPendingRepair] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const [rentals, lessons, accom, badges, shops, repair] = await Promise.all([
        api<PendingItem[]>('/admin/rentals/pending'),
        api<PendingItem[]>('/admin/lessons/pending'),
        api<PendingItem[]>('/admin/accommodations/pending'),
        api<PendingItem[]>('/admin/badges/pending'),
        api<PendingItem[]>('/ski-shops/pending').catch(() => []),
        api<PendingItem[]>('/repair-shops/pending').catch(() => []),
      ]);
      setPendingRentals(rentals);
      setPendingLessons(lessons);
      setPendingAccom(accom);
      setPendingBadges(badges);
      setPendingShops(shops);
      setPendingRepair(repair);
    } catch {
      // not admin or error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const [badgeOverrides, setBadgeOverrides] = useState<Record<string, string>>({});

  const handleApprove = async (tab: TabId, id: string) => {
    try {
      if (tab === 'skishop') {
        await api(`/ski-shops/${id}/approve`, { method: 'PUT' });
        alert('승인되었습니다!'); fetchPending(); return;
      }
      if (tab === 'repair') {
        await api(`/repair-shops/${id}/approve`, { method: 'PUT' });
        alert('승인되었습니다!'); fetchPending(); return;
      }
      const path = tab === 'badge' ? 'badges' : `${tab}s`;
      if (tab === 'badge' && !badgeOverrides[id]) {
        alert('뱃지를 선택해주세요.');
        return;
      }
      const body = tab === 'badge' ? { badgeType: badgeOverrides[id] } : undefined;
      await api(`/admin/${path}/${id}/approve`, { method: 'PUT', body });
      alert('승인되었습니다!');
      fetchPending();
    } catch (err) {
      alert(err instanceof Error ? err.message : '승인 실패');
    }
  };

  const handleReject = async (tab: TabId, id: string) => {
    if (!confirm('정말 거부하시겠습니까?')) return;
    try {
      if (tab === 'skishop') {
        await api(`/ski-shops/${id}`, { method: 'DELETE' });
        alert('거부되었습니다.'); fetchPending(); return;
      }
      if (tab === 'repair') {
        await api(`/repair-shops/${id}`, { method: 'DELETE' });
        alert('거부되었습니다.'); fetchPending(); return;
      }
      const path = tab === 'badge' ? 'badges' : `${tab}s`;
      await api(`/admin/${path}/${id}/reject`, { method: 'DELETE' });
      alert('거부되었습니다.');
      fetchPending();
    } catch (err) {
      alert(err instanceof Error ? err.message : '거부 실패');
    }
  };

  const tabs = [
    { id: 'rental' as const, name: '렌탈', count: pendingRentals.length },
    { id: 'lesson' as const, name: '레슨', count: pendingLessons.length },
    { id: 'accommodation' as const, name: '숙소', count: pendingAccom.length },
    { id: 'badge' as const, name: '자격증', count: pendingBadges.length },
    { id: 'skishop' as const, name: '스키샵', count: pendingShops.length },
    { id: 'repair' as const, name: '정비샵', count: pendingRepair.length },
  ];

  const displayItems =
    activeTab === 'rental' ? pendingRentals :
    activeTab === 'lesson' ? pendingLessons :
    activeTab === 'accommodation' ? pendingAccom :
    activeTab === 'skishop' ? pendingShops :
    activeTab === 'repair' ? pendingRepair :
    pendingBadges;

  const renderItem = (item: PendingItem) => {
    if (activeTab === 'repair') {
      return (
        <div key={item.id} className="card p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🔧</span>
                <span className="font-bold text-sm text-gray-900">{item.name}</span>
                {item.area && <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">{item.area}</span>}
              </div>
              {item.address && <div className="text-xs text-gray-400">📍 {item.address}</div>}
              {item.description && <div className="text-xs text-gray-500 mt-1">{item.description}</div>}
              {item.user && <div className="text-xs text-gray-400 mt-1">신청자: {item.user.name} ({item.user.email})</div>}
              {item.businessLicense && (
                <a href={imageUrl(item.businessLicense)} target="_blank" rel="noopener noreferrer" className="block mt-2">
                  <img src={imageUrl(item.businessLicense)} alt="사업자등록증" className="w-full max-w-xs object-contain rounded-lg border border-gray-200" />
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button onClick={() => handleReject('repair', item.id)} className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-lg font-bold text-xs border border-gray-200">거부</button>
            <button onClick={() => handleApprove('repair', item.id)} className="flex-1 py-2 bg-sky-500 text-white rounded-lg font-bold text-xs">승인</button>
          </div>
        </div>
      );
    }
    if (activeTab === 'skishop') {
      return (
        <div key={item.id} className="card p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🏪</span>
                <span className="font-bold text-sm text-gray-900">{item.name}</span>
                {item.area && <span className="text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded">{item.area}</span>}
              </div>
              {item.address && <div className="text-xs text-gray-400">📍 {item.address}</div>}
              {item.description && <div className="text-xs text-gray-500 mt-1">{item.description}</div>}
              {item.user && <div className="text-xs text-gray-400 mt-1">신청자: {item.user.name} ({item.user.email})</div>}
              {item.businessLicense && (
                <a href={imageUrl(item.businessLicense)} target="_blank" rel="noopener noreferrer" className="block mt-2">
                  <img src={imageUrl(item.businessLicense)} alt="사업자등록증" className="w-full max-w-xs object-contain rounded-lg border border-gray-200 hover:border-sky-400 transition-colors" />
                  <span className="text-[10px] text-sky-500 mt-1 block">사업자등록증 확인</span>
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button onClick={() => handleReject('skishop', item.id)} className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-lg font-bold text-xs hover:bg-red-50 hover:text-red-500 transition-colors border border-gray-200">거부</button>
            <button onClick={() => handleApprove('skishop', item.id)} className="flex-1 py-2 bg-sky-500 text-white rounded-lg font-bold text-xs hover:bg-sky-600 transition-colors">승인</button>
          </div>
        </div>
      );
    }
    if (activeTab === 'badge') {
      const selectedType = badgeOverrides[item.id] || '';
      const selectedBadge = badgeLabels[selectedType];
      return (
        <div key={item.id} className="card p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {selectedBadge && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedBadge.color}`}>{selectedBadge.label}</span>}
                <span className="font-bold text-sm text-gray-900">자격증 인증 요청</span>
              </div>
              {item.user && <div className="text-xs text-gray-400">신청자: {item.user.name}</div>}
              {item.image && (
                <a href={imageUrl(item.image)} target="_blank" rel="noopener noreferrer" className="block mt-2">
                  <img src={imageUrl(item.image)} alt="자격증" className="w-full max-w-xs object-contain rounded-lg border border-gray-200 hover:border-primary transition-colors" />
                </a>
              )}
            </div>
          </div>
          {/* 뱃지 선택 */}
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-[10px] font-bold text-gray-500 mb-2">📋 뱃지 선택</div>
            <div className="flex gap-1.5 flex-wrap">
              {allBadgeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setBadgeOverrides(prev => ({ ...prev, [item.id]: opt.value }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedType === opt.value
                      ? `${opt.color} ring-2 ring-offset-1 ring-primary`
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-3 border-t border-gray-50">
            <button onClick={() => handleReject('badge', item.id)} className="flex-1 py-2.5 bg-gray-50 text-gray-500 rounded-lg font-bold text-xs active:bg-gray-100 transition-colors">거부</button>
            <button onClick={() => handleApprove('badge', item.id)} disabled={!selectedType} className="flex-1 py-2.5 bg-primary text-white rounded-lg font-bold text-xs active:bg-primary-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed">승인</button>
          </div>
        </div>
      );
    }

    return (
      <div key={item.id} className="card p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">
            {item.image && (item.image.startsWith('/') || item.image.startsWith('http'))
              ? <img src={imageUrl(item.image)} alt="" className="w-full h-full object-cover rounded-xl" />
              : item.image || '📦'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-gray-900">{item.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{item.resort?.name}</div>
            {activeTab === 'rental' && item.equipment && (
              <div className="text-xs text-gray-400 mt-0.5">{item.duration} · {item.equipment}</div>
            )}
            {activeTab === 'lesson' && (
              <div className="text-xs text-gray-400 mt-0.5">{item.duration} · {item.level} · 최대 {item.maxStudents}명</div>
            )}
            {activeTab === 'accommodation' && (
              <div className="text-xs text-gray-400 mt-0.5">{(item.type || '').split(',').map(t => accomTypeLabels[t] || t).join(', ')} · {item.guests}</div>
            )}
            {item.user && <div className="text-xs text-gray-300 mt-0.5">등록자: {item.user.name}</div>}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-base font-black text-gray-900">{item.price?.toLocaleString()}원</div>
          </div>
        </div>

        {/* 인증서류 */}
        {(item.businessLicense || item.instructorCert || item.accommodationPermit) && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-[10px] font-bold text-gray-500 mb-2">📋 인증서류</div>
            <div className="flex gap-2 flex-wrap">
              {item.instructorCert && (
                <a href={imageUrl(item.instructorCert)} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="text-[10px] text-gray-400 mb-0.5">강사 자격증</div>
                  <img src={imageUrl(item.instructorCert)} alt="자격증" className="w-24 h-18 object-cover rounded-lg border border-gray-200 hover:border-primary transition-colors" />
                </a>
              )}
              {item.businessLicense && (
                <a href={imageUrl(item.businessLicense)} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="text-[10px] text-gray-400 mb-0.5">사업자등록증</div>
                  <img src={imageUrl(item.businessLicense)} alt="사업자등록증" className="w-24 h-18 object-cover rounded-lg border border-gray-200 hover:border-primary transition-colors" />
                </a>
              )}
              {item.accommodationPermit && (
                <a href={imageUrl(item.accommodationPermit)} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="text-[10px] text-gray-400 mb-0.5">숙박업 신고증</div>
                  <img src={imageUrl(item.accommodationPermit)} alt="숙박업 신고증" className="w-24 h-18 object-cover rounded-lg border border-gray-200 hover:border-primary transition-colors" />
                </a>
              )}
            </div>
          </div>
        )}
        {!item.businessLicense && !item.instructorCert && (
          <div className="mt-3 p-2 bg-yellow-50 rounded-lg">
            <p className="text-[10px] text-yellow-600 font-medium">⚠️ 인증서류가 첨부되지 않았습니다</p>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-gray-50">
          <button onClick={() => handleReject(activeTab, item.id)} className="flex-1 py-2.5 bg-gray-50 text-gray-500 rounded-lg font-bold text-xs active:bg-gray-100 transition-colors">거부</button>
          <button onClick={() => handleApprove(activeTab, item.id)} className="flex-1 py-2.5 bg-primary text-white rounded-lg font-bold text-xs active:bg-primary-dark transition-colors">승인</button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">관리자 승인</h1>
        <Link to="/mypage" className="text-sm text-gray-400">← 내정보</Link>
      </div>

      <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            {tab.name} ({tab.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">로딩 중...</div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">
          승인 대기 중인 항목이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map(renderItem)}
        </div>
      )}
    </div>
  );
};

export default AdminApproval;
