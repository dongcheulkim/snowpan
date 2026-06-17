import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface Coupon {
  id: string;
  title: string;
  description: string | null;
  pointsCost: number;
  partnerType: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  image: string | null;
  validDays: number;
  stock: number | null;
}

const TYPE_LABEL: Record<string, string> = {
  rental: '렌탈',
  lesson: '강습',
  skishop: '스키샵',
  accommodation: '숙소',
  repair: '정비',
  general: '전체',
};

const TYPES: { id: string; label: string }[] = [
  { id: '', label: '전체' },
  { id: 'rental', label: '렌탈' },
  { id: 'lesson', label: '강습' },
  { id: 'skishop', label: '스키샵' },
  { id: 'accommodation', label: '숙소' },
  { id: 'repair', label: '정비' },
];

const CouponShop = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [partnerType, setPartnerType] = useState<string>('');
  const [buying, setBuying] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = '쿠폰샵 - 스노우판';
  }, []);

  // 잔액은 로그인 시에만 의미 있음 — 실패해도 무시.
  useEffect(() => {
    api<{ balance: number }>('/points/balance')
      .then((b) => setBalance(b.balance))
      .catch(() => setBalance(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = partnerType ? `?partnerType=${partnerType}` : '';
    api<{ coupons: Coupon[] }>(`/coupons${qs}`)
      .then((r) => setCoupons(r.coupons))
      .finally(() => setLoading(false));
  }, [partnerType]);

  const discountLabel = (c: Coupon) =>
    c.discountType === 'percent' ? `${c.discountValue}% 할인` : `${c.discountValue.toLocaleString()}원 할인`;

  const onBuy = async (c: Coupon) => {
    if (balance === null) {
      alert('로그인 후 이용 가능합니다.');
      return;
    }
    if (balance < c.pointsCost) {
      alert(`포인트가 부족합니다. (보유 ${balance.toLocaleString()}P / 필요 ${c.pointsCost.toLocaleString()}P)`);
      return;
    }
    if (!confirm(`${c.pointsCost.toLocaleString()}P로 "${c.title}" 쿠폰을 구매하시겠습니까?`)) return;
    setBuying(c.id);
    try {
      await api(`/coupons/${c.id}/purchase`, { method: 'POST' });
      alert('쿠폰이 발급되었습니다. 내 쿠폰에서 확인하세요.');
      // 잔액 갱신
      const b = await api<{ balance: number }>('/points/balance');
      setBalance(b.balance);
    } catch (e) {
      const msg = (e as Error).message || '구매에 실패했습니다.';
      alert(msg);
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 pb-10">
      <div className="px-4 pt-5">
        {/* 잔액 + 내 쿠폰 진입 */}
        <div className="bg-gray-900 text-white rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-300">내 포인트</p>
            <p className="text-xl font-black">
              {balance === null ? '— P' : `${balance.toLocaleString()}P`}
            </p>
          </div>
          <Link
            to="/mypage/coupons"
            className="text-xs font-bold bg-white text-gray-900 px-3 py-2 rounded-lg active:scale-95 transition-transform"
          >
            내 쿠폰 →
          </Link>
        </div>

        {/* 카테고리 필터 칩 */}
        <div className="flex gap-2 overflow-x-auto mt-4 pb-1" style={{ scrollbarWidth: 'none' }}>
          {TYPES.map((t) => (
            <button
              key={t.id || 'all'}
              onClick={() => setPartnerType(t.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${
                partnerType === t.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 쿠폰 그리드 */}
        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-10">불러오는 중...</p>
          ) : coupons.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">조건에 맞는 쿠폰이 없습니다.</p>
          ) : (
            coupons.map((c) => {
              const insufficient = balance !== null && balance < c.pointsCost;
              const soldOut = c.stock !== null && c.stock <= 0;
              return (
                <div
                  key={c.id}
                  className="bg-snow border-2 border-gray-200 rounded-2xl p-4 flex gap-3"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">
                    {c.image ? (
                      <img src={c.image} alt={c.title} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span>🎟️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                        {TYPE_LABEL[c.partnerType] || c.partnerType}
                      </span>
                      <span className="text-[10px] font-bold text-mint">{discountLabel(c)}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 mt-1 line-clamp-1">{c.title}</p>
                    {c.description && (
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-black text-gray-900">{c.pointsCost.toLocaleString()}P</p>
                      <button
                        onClick={() => onBuy(c)}
                        disabled={buying === c.id || soldOut || insufficient}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                          soldOut
                            ? 'bg-gray-200 text-gray-400'
                            : insufficient
                            ? 'bg-gray-200 text-gray-500'
                            : 'bg-gray-900 text-white active:scale-95 transition-transform'
                        }`}
                      >
                        {soldOut ? '매진' : insufficient ? '포인트 부족' : buying === c.id ? '구매 중...' : '구매하기'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CouponShop;
