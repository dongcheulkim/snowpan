import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import { toastError, toastSuccess } from '../components/Toast';

interface UserCoupon {
  id: string;
  code: string;
  status: 'active' | 'used' | 'expired';
  usesLeft: number;
  expiresAt: string;
  usedAt: string | null;
  purchasedAt: string;
  coupon: {
    title: string;
    description: string | null;
    partnerType: string;
    discountType: 'percent' | 'flat' | 'none';
    discountValue: number;
    effect: string | null;
    effectValue: number | null;
    image: string | null;
  };
}

interface MyProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  status: string;
}

const STATUS_TABS: { id: 'active' | 'used' | 'expired'; label: string }[] = [
  { id: 'active', label: '사용 가능' },
  { id: 'used', label: '사용 완료' },
  { id: 'expired', label: '만료' },
];

const TYPE_LABEL: Record<string, string> = {
  rental: '렌탈',
  lesson: '강습',
  skishop: '스키샵',
  accommodation: '숙소',
  repair: '정비',
  general: '전체',
  platform: '플랫폼',
};

const EFFECT_LABEL: Record<string, string> = {
  product_bump: '매물 끌어올리기',
};

const MyCoupons = () => {
  const [status, setStatus] = useState<'active' | 'used' | 'expired'>('active');
  const [items, setItems] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [bumpTarget, setBumpTarget] = useState<UserCoupon | null>(null);
  const [myProducts, setMyProducts] = useState<MyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    document.title = '내 쿠폰 - 스노우판';
  }, []);

  const refresh = () =>
    api<{ items: UserCoupon[] }>(`/coupons/my?status=${status}`).then((r) => setItems(r.items));

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const benefitLabel = (c: UserCoupon['coupon']) => {
    if (c.effect && EFFECT_LABEL[c.effect]) {
      return c.effectValue && c.effectValue > 1 ? `${EFFECT_LABEL[c.effect]} ${c.effectValue}회` : EFFECT_LABEL[c.effect];
    }
    return c.discountType === 'percent'
      ? `${c.discountValue}% 할인`
      : `${c.discountValue.toLocaleString()}원 할인`;
  };

  const openBumpPicker = async (uc: UserCoupon) => {
    setBumpTarget(uc);
    setLoadingProducts(true);
    try {
      const user = getUser();
      if (!user) { toastError('로그인이 필요해요.'); setBumpTarget(null); return; }
      const data = await api<{ products: MyProduct[] }>(
        `/products?userId=${encodeURIComponent(user.id)}&status=selling&limit=50`
      );
      setMyProducts(data.products);
    } catch (e) {
      toastError(e instanceof Error ? e.message : '내 매물을 불러오지 못했어요.');
      setBumpTarget(null);
    } finally {
      setLoadingProducts(false);
    }
  };

  const applyBump = async (productId: string) => {
    if (!bumpTarget) return;
    try {
      const res = await api<{ message: string; usesLeft: number }>(
        `/coupons/my/${bumpTarget.id}/use`,
        { method: 'POST', body: { productId } }
      );
      toastSuccess(res.message);
      setBumpTarget(null);
      await refresh();
    } catch (e) {
      toastError(e instanceof Error ? e.message : '사용 실패');
    }
  };

  const onUse = async (uc: UserCoupon) => {
    // 플랫폼 효과 쿠폰: 매물 선택 시트 띄움
    if (uc.coupon.effect === 'product_bump') {
      openBumpPicker(uc);
      return;
    }
    // 그 외 (파트너 쿠폰): 매장에서 코드 보여준 뒤 사용 처리
    if (!confirm('이 쿠폰을 사용 처리할까요? 사용 후 되돌릴 수 없어요.')) return;
    try {
      await api(`/coupons/my/${uc.id}/use`, { method: 'POST' });
      toastSuccess('쿠폰을 사용 처리했어요.');
      await refresh();
    } catch (e) {
      toastError(e instanceof Error ? e.message : '사용 처리 실패');
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 pb-10">
      <div className="px-4 pt-5">
        {/* 상단 진입 — 쿠폰샵 */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">내 쿠폰</h1>
          <Link
            to="/coupons"
            className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg"
          >
            쿠폰샵 →
          </Link>
        </div>

        {/* 상태 탭 */}
        <div className="flex gap-1 mb-3">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setStatus(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                status === t.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 쿠폰 카드 */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-10">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">
              {status === 'active' ? '사용 가능한 쿠폰이 없습니다.' : '해당 상태의 쿠폰이 없습니다.'}
            </p>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className={`bg-snow border-2 rounded-2xl p-4 ${
                  it.status === 'active' ? 'border-gray-900' : 'border-gray-200 opacity-70'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                    {TYPE_LABEL[it.coupon.partnerType] || it.coupon.partnerType}
                  </span>
                  <span className="text-[10px] font-bold text-mint">{benefitLabel(it.coupon)}</span>
                  {it.coupon.effect && it.usesLeft > 0 && it.status === 'active' && (
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                      남은 {it.usesLeft}회
                    </span>
                  )}
                  {it.status === 'used' && (
                    <span className="ml-auto text-[10px] font-bold text-gray-400">사용 완료</span>
                  )}
                  {it.status === 'expired' && (
                    <span className="ml-auto text-[10px] font-bold text-gray-400">만료</span>
                  )}
                </div>
                <p className="text-sm font-bold text-gray-900 mt-1.5">{it.coupon.title}</p>
                {it.coupon.description && (
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{it.coupon.description}</p>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500">쿠폰 번호</p>
                    <p className="text-base font-black tracking-widest text-gray-900 font-mono">{it.code}</p>
                  </div>
                  {it.status === 'active' && (
                    <button
                      onClick={() => onUse(it)}
                      className="text-xs font-bold bg-gray-900 text-white px-3 py-2 rounded-lg active:scale-95 transition-transform"
                    >
                      {it.coupon.effect === 'product_bump' ? '매물에 사용' : '사용 처리'}
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-gray-400 mt-2">
                  {it.status === 'used' && it.usedAt
                    ? `${new Date(it.usedAt).toLocaleDateString('ko-KR')} 사용`
                    : `${new Date(it.expiresAt).toLocaleDateString('ko-KR')}까지`}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 매물 선택 시트 (끌어올리기 쿠폰 사용 시) */}
      {bumpTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setBumpTarget(null)}>
          <div
            className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">끌어올릴 매물 선택</h2>
              <button onClick={() => setBumpTarget(null)} className="text-gray-500 text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              선택한 매물이 최신순 정렬 상단으로 다시 노출돼요.
              {bumpTarget.usesLeft > 1 && ` (사용 후 남은 ${bumpTarget.usesLeft - 1}회)`}
            </p>
            {loadingProducts ? (
              <p className="text-sm text-gray-500 text-center py-8">불러오는 중...</p>
            ) : myProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-3">판매중인 내 매물이 없어요.</p>
                <Link to="/used/register" className="inline-block text-xs font-bold bg-gray-900 text-white px-4 py-2 rounded-lg">
                  + 매물 등록하기
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {myProducts.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => applyBump(p.id)}
                      className="w-full flex items-center gap-3 p-2 bg-snow border border-gray-200 rounded-xl active:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {p.image && (p.image.startsWith('/') || p.image.startsWith('http')) ? (
                          <img src={imageUrl(p.image, 200)} alt={p.name} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.price.toLocaleString()}원</p>
                      </div>
                      <span className="text-xs font-bold text-gray-900">↑ 끌어올리기</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCoupons;
