import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { toastError } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { LocationIcon } from '../components/Icons';

// 찜한 매장 (2026-09-24) — 마이 → 찜한 매장. 소식·이벤트 알림을 받는 매장 목록, 여기서 찜 해제.
interface FollowedShop { shopType: string; shopId: string; path: string; name: string; image: string | null; sub: string | null; followedAt: string }
const TYPE_LABEL: Record<string, string> = { skishop: '스키·보드샵', repair: '정비샵', rental: '렌탈샵', lesson: '레슨', accommodation: '숙소' };

export default function MyShopFollows() {
  const [items, setItems] = useState<FollowedShop[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api<FollowedShop[]>('/shop-follows/mine').then(setItems).catch(() => { setItems([]); toastError('찜한 매장을 불러오지 못했어요.'); });
  }, []);

  const unfollow = async (s: FollowedShop) => {
    if (busy) return;
    setBusy(s.shopId);
    try {
      await api(`/shop-follows/${s.shopType}/${s.shopId}`, { method: 'DELETE' });
      setItems((prev) => (prev || []).filter((x) => !(x.shopType === s.shopType && x.shopId === s.shopId)));
    } catch {
      toastError('찜을 해제하지 못했어요.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">찜한 매장</h1>
        <p className="text-xs text-gray-500 mt-1">찜한 매장의 소식과 이벤트가 올라오면 알림을 받아요.</p>
      </div>
      {items === null ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : items.length === 0 ? (
        <EmptyState icon={<LocationIcon size={48} strokeWidth={1.4} />} title="찜한 매장이 없어요" description="매장 페이지에서 '매장 찜'을 누르면 여기에 모여요." ctaLabel="매장 둘러보기" ctaTo="/rental" />
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <div key={`${s.shopType}:${s.shopId}`} className="card p-3 flex items-center gap-3">
              <Link to={s.path} className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                {s.image ? <img src={imageUrl(s.image)} alt="" className="w-full h-full object-cover" /> : null}
              </Link>
              <Link to={s.path} className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-500">{TYPE_LABEL[s.shopType] || '매장'}{s.sub ? ` · ${s.sub}` : ''}</p>
                <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
              </Link>
              <button type="button" onClick={() => unfollow(s)} disabled={busy === s.shopId} className="flex-shrink-0 min-h-10 px-3 rounded-xl text-xs font-bold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-40">찜 해제</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
