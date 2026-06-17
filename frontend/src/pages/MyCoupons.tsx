import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface UserCoupon {
  id: string;
  code: string;
  status: 'active' | 'used' | 'expired';
  expiresAt: string;
  usedAt: string | null;
  purchasedAt: string;
  coupon: {
    title: string;
    description: string | null;
    partnerType: string;
    discountType: 'percent' | 'flat';
    discountValue: number;
    image: string | null;
  };
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
};

const MyCoupons = () => {
  const [status, setStatus] = useState<'active' | 'used' | 'expired'>('active');
  const [items, setItems] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = '내 쿠폰 - 스노우판';
  }, []);

  useEffect(() => {
    setLoading(true);
    api<{ items: UserCoupon[] }>(`/coupons/my?status=${status}`)
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [status]);

  const discountLabel = (c: UserCoupon['coupon']) =>
    c.discountType === 'percent' ? `${c.discountValue}% 할인` : `${c.discountValue.toLocaleString()}원 할인`;

  const onUse = async (id: string) => {
    if (!confirm('이 쿠폰을 사용 처리하시겠습니까? 사용 후 되돌릴 수 없습니다.')) return;
    try {
      await api(`/coupons/my/${id}/use`, { method: 'POST' });
      alert('쿠폰을 사용 처리했습니다.');
      const r = await api<{ items: UserCoupon[] }>(`/coupons/my?status=${status}`);
      setItems(r.items);
    } catch (e) {
      const msg = (e as Error).message || '사용 처리에 실패했습니다.';
      alert(msg);
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
                  <span className="text-[10px] font-bold text-mint">{discountLabel(it.coupon)}</span>
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
                      onClick={() => onUse(it.id)}
                      className="text-xs font-bold bg-gray-900 text-white px-3 py-2 rounded-lg active:scale-95 transition-transform"
                    >
                      사용 처리
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
    </div>
  );
};

export default MyCoupons;
