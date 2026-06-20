// PREVIEW — 토스/카카오뱅크 톤 홈 시안. 부드러운 그라데이션·둥근 카드·마이크로 인터랙션.
// 결정 후 본 Home 에 반영하고 이 파일 삭제.

import { Link } from 'react-router-dom';

const MOCK_PRODUCTS = [
  { id: '1', name: '아토믹 슈팅스타 165', brand: 'ATOMIC', price: 380000, image: '🎿' },
  { id: '2', name: '버튼 커스텀 X 158', brand: 'BURTON', price: 520000, image: '🏂' },
  { id: '3', name: '살로몬 X-PRO 부츠 270', brand: 'SALOMON', price: 240000, image: '👢' },
  { id: '4', name: '오클리 플라이트 데크', brand: 'OAKLEY', price: 180000, image: '🥽' },
];

const CATEGORIES = [
  { id: 'used', label: '중고거래', emoji: '🛒' },
  { id: 'rental', label: '렌탈', emoji: '🎿' },
  { id: 'lesson', label: '레슨', emoji: '🎓' },
  { id: 'accommodation', label: '숙소', emoji: '🏠' },
  { id: 'shop', label: '스키샵', emoji: '🏪' },
  { id: 'repair', label: '정비', emoji: '🔧' },
  { id: 'community', label: '커뮤니티', emoji: '💬' },
  { id: 'webcam', label: '웹캠', emoji: '📹' },
  { id: 'coupon', label: '쿠폰샵', emoji: '🎟️' },
];

export default function PreviewC() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 30%, #ffffff 100%)' }}>
      {/* Hero — 부드러운 그라데이션 카드 + 친근한 톤 */}
      <section className="px-4 pt-6 pb-4">
        <div
          className="rounded-3xl p-6 text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 60%, #38bdf8 100%)' }}
        >
          <p className="text-[10px] font-bold tracking-[0.18em] opacity-80">SNOWPAN · 2026–27</p>
          <h1 className="text-2xl font-black mt-2 leading-tight">
            시즌 개막까지<br />
            <span className="text-4xl">D-171</span>
          </h1>
          <p className="text-xs opacity-90 mt-2">미리 장비 점검하고 시즌권·숙소 예약하세요</p>
          <div className="mt-4 flex gap-2">
            <Link to="#" className="flex-1 bg-white text-sky-700 rounded-xl py-2.5 text-xs font-bold text-center active:scale-95 transition-transform shadow-sm">
              중고거래
            </Link>
            <Link to="#" className="flex-1 bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-xl py-2.5 text-xs font-bold text-center active:scale-95 transition-transform">
              둘러보기
            </Link>
          </div>
        </div>
      </section>

      {/* Snow Run — 친근한 카드 + 큰 숫자 + 그라데이션 액센트 */}
      <section className="px-4 pb-4">
        <Link
          to="/snow-run"
          className="block rounded-3xl p-5 bg-white shadow-sm border border-gray-100 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}
            >
              ⚡
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-500">스노우런 적립</p>
              <p className="text-xl font-black text-gray-900 mt-0.5">
                +100P <span className="text-sm font-medium text-gray-500">/회</span>
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">탈 때마다 포인트 쌓아요</p>
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </div>
        </Link>
      </section>

      {/* Categories — 부드러운 라운드 박스 + 이모지 + grid 3×3 */}
      <section className="px-4 pb-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="grid grid-cols-3 gap-y-4 gap-x-2">
            {CATEGORIES.map((c) => (
              <Link
                key={c.id}
                to="#"
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}
                >
                  {c.emoji}
                </div>
                <span className="text-[11px] font-bold text-gray-700">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Products — 카드형 그리드 */}
      <section className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-gray-900">중고거래 인기 매물</h2>
          <Link to="#" className="text-[11px] font-bold text-sky-600 inline-flex items-center gap-0.5">
            전체 보기 ›
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {MOCK_PRODUCTS.map((p) => (
            <Link
              key={p.id}
              to="#"
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
            >
              <div
                className="aspect-square flex items-center justify-center text-5xl"
                style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)' }}
              >
                {p.image}
              </div>
              <div className="p-3">
                <p className="text-[10px] font-bold tracking-wider text-sky-600">{p.brand}</p>
                <p className="text-[13px] text-gray-900 line-clamp-1 mt-0.5">{p.name}</p>
                <p className="text-sm font-black text-gray-900 mt-1.5">{p.price.toLocaleString()}원</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <button
            className="px-6 py-3 text-xs font-bold text-white rounded-full shadow-md active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)' }}
          >
            🔄 다른 매물 보기
          </button>
        </div>
      </section>

      {/* Footer — preview 표시 */}
      <div className="px-4 py-6 text-center">
        <p className="text-[10px] font-bold tracking-[0.18em] text-sky-300">PREVIEW · OPTION C · TOSS / KAKAOBANK</p>
        <Link to="/preview-a" className="inline-block mt-3 text-xs font-bold text-sky-600 underline">
          ← A 안 보기
        </Link>
      </div>
    </div>
  );
}
