import { Link } from 'react-router-dom';

// 포인트 · 쿠폰 공유 탭 — 두 페이지를 하나의 지갑 섹션처럼 묶어줌.
export default function WalletTabs({ active }: { active: 'points' | 'coupons' }) {
  const cls = (on: boolean) =>
    `flex-1 text-center py-2.5 text-sm font-bold rounded-lg transition-colors ${on ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`;
  return (
    <div className="flex gap-2 mb-4">
      <Link to="/points" className={cls(active === 'points')}>포인트</Link>
      <Link to="/mypage/coupons" className={cls(active === 'coupons')}>내 쿠폰</Link>
    </div>
  );
}
