import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { toastError, toastSuccess } from '../components/Toast';

interface Transaction {
  id: string;
  amount: number;
  balanceAfter: number;
  source: string;
  description: string | null;
  createdAt: string;
}

interface CheckinStatus {
  checkedToday: boolean;
  dailyPoints: number;
}

const SOURCE_LABEL: Record<string, string> = {
  signup_bonus: '회원가입 보너스',
  referral_bonus: '추천인 보너스',
  snow_run: '스노우런 적립',
  review: '리뷰 작성',
  daily_checkin: '일일 출석',
  coupon_purchase: '쿠폰 구매',
  coupon_refund: '쿠폰 환불',
  admin_grant: '관리자 지급',
  admin_deduct: '관리자 차감',
  expire: '포인트 만료',
};

const Points = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkin, setCheckin] = useState<CheckinStatus | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const refresh = () => Promise.all([
    api<{ balance: number }>('/points/balance'),
    api<{ items: Transaction[] }>('/points/history?limit=30'),
    api<CheckinStatus>('/points/checkin'),
  ]).then(([b, h, c]) => {
    setBalance(b.balance);
    setItems(h.items);
    setCheckin(c);
  });

  useEffect(() => {
    document.title = '내 포인트 - 스노우판';
    refresh().catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCheckin = async () => {
    if (checkingIn || checkin?.checkedToday) return;
    setCheckingIn(true);
    try {
      const res = await api<{ message: string; amount: number; balance: number }>('/points/checkin', { method: 'POST' });
      toastSuccess(res.message);
      await refresh();
    } catch (e) {
      toastError(e instanceof Error ? e.message : '출석체크 실패');
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 pb-10">
      <div className="px-4 pt-5">
        {/* 잔액 카드 */}
        <div className="bg-gray-900 text-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-300">사용 가능한 포인트</p>
          <p className="text-3xl font-black mt-1">
            {balance === null ? '—' : balance.toLocaleString()}
            <span className="text-base font-bold ml-1 text-gray-300">P</span>
          </p>
          <div className="flex gap-2 mt-4">
            <Link
              to="/coupons"
              className="flex-1 text-center bg-white text-gray-900 text-sm font-bold py-2.5 rounded-lg active:scale-95 transition-transform"
            >
              쿠폰 구매
            </Link>
            <Link
              to="/mypage/coupons"
              className="flex-1 text-center bg-gray-700 text-white text-sm font-bold py-2.5 rounded-lg active:scale-95 transition-transform"
            >
              내 쿠폰
            </Link>
          </div>
        </div>

        {/* 일일 출석체크 */}
        <button
          onClick={handleCheckin}
          disabled={checkingIn || !checkin || checkin.checkedToday}
          className={`w-full mt-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-between ${
            checkin?.checkedToday
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : 'bg-sky-500 text-white shadow-sm hover:bg-sky-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="text-lg">{checkin?.checkedToday ? '✓' : '🎁'}</span>
            <span>{checkin?.checkedToday ? '오늘 출석 완료' : '오늘 출석체크 받기'}</span>
          </span>
          <span className="text-xs font-black tracking-wide">
            +{(checkin?.dailyPoints ?? 500).toLocaleString()}P
          </span>
        </button>

        {/* 적립 안내 */}
        <div className="mt-4 bg-snow border-2 border-gray-200 rounded-2xl p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-2">포인트 적립하기</h2>
          <ul className="text-xs text-gray-600 space-y-1.5">
            <li>• 일일 출석체크 +500P (하루 1회)</li>
            <li>• 회원가입 보너스 +1,000P (1회)</li>
          </ul>
        </div>

        {/* 적립/사용 이력 */}
        <div className="mt-4 bg-snow border-2 border-gray-200 rounded-2xl p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">적립/사용 이력</h2>
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-6">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">아직 이력이 없습니다.</p>
          ) : (
            <ul className="space-y-0">
              {items.map((it, idx) => (
                <li
                  key={it.id}
                  className={`flex items-start justify-between py-3 ${
                    idx !== items.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {it.description || SOURCE_LABEL[it.source] || it.source}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {new Date(it.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="ml-3 text-right flex-shrink-0">
                    <p
                      className={`text-sm font-bold ${
                        it.amount > 0 ? 'text-mint' : 'text-coral'
                      }`}
                    >
                      {it.amount > 0 ? '+' : ''}
                      {it.amount.toLocaleString()}P
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      잔액 {it.balanceAfter.toLocaleString()}P
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Points;
