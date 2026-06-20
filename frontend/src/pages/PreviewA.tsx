// PREVIEW — Apple/Linear 미니멀 톤 홈 시안. 본 Home.tsx 안 건드리고 비교용.
// 결정 후 본 Home 에 반영하고 이 파일 삭제.

import { Link } from 'react-router-dom';

const MOCK_PRODUCTS = [
  { id: '1', name: '아토믹 슈팅스타 165', brand: 'ATOMIC', price: 380000, image: '🎿' },
  { id: '2', name: '버튼 커스텀 X 158', brand: 'BURTON', price: 520000, image: '🏂' },
  { id: '3', name: '살로몬 X-PRO 부츠 270', brand: 'SALOMON', price: 240000, image: '👢' },
  { id: '4', name: '오클리 플라이트 데크', brand: 'OAKLEY', price: 180000, image: '🥽' },
];

const CATEGORIES = [
  { id: 'used', label: '중고거래' },
  { id: 'rental', label: '렌탈' },
  { id: 'lesson', label: '레슨' },
  { id: 'accommodation', label: '숙소' },
  { id: 'shop', label: '스키샵' },
  { id: 'repair', label: '정비' },
  { id: 'community', label: '커뮤니티' },
  { id: 'webcam', label: '웹캠' },
  { id: 'coupon', label: '쿠폰샵' },
];

const ACCENT = '#0f172a'; // single accent — near-black

export default function PreviewA() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero — 절제된 큰 타이포 + 1포인트 액센트 */}
      <section className="px-6 pt-10 pb-12 border-b border-gray-100">
        <p className="text-[10px] font-black tracking-[0.25em] text-gray-400 mb-3">SNOWPAN · 2026–27 SEASON</p>
        <h1 className="text-3xl font-black text-gray-900 leading-tight">
          시즌의<br />모든 것.
        </h1>
        <p className="text-sm text-gray-500 mt-3 leading-relaxed">
          중고거래 · 렌탈 · 레슨 · 숙소를 한 곳에.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-[11px] font-bold tracking-wider" style={{ color: ACCENT }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
          시즌 개막 D-171
        </div>
      </section>

      {/* Snow Run — 톤 다운한 정제된 카드 */}
      <section className="px-6 py-8 border-b border-gray-100">
        <p className="text-[10px] font-black tracking-[0.25em] text-gray-400 mb-2">REWARD</p>
        <Link to="/snow-run" className="block group">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-black text-gray-900 leading-none">
                <span style={{ color: ACCENT }}>100P</span>
                <span className="text-sm font-medium text-gray-500 ml-2">/ run</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">탈 때마다 자동 적립 · 쿠폰으로 사용</p>
            </div>
            <span className="text-gray-400 group-hover:text-gray-900 transition-colors">→</span>
          </div>
          <div className="mt-4 h-px bg-gray-100 group-hover:bg-gray-900 transition-colors" />
        </Link>
      </section>

      {/* Categories — 박스 제거, 텍스트 위주 그리드 */}
      <section className="px-6 py-8 border-b border-gray-100">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[10px] font-black tracking-[0.25em] text-gray-400">CATEGORIES</p>
            <h2 className="text-lg font-black text-gray-900 mt-0.5">둘러보기</h2>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-y-5 gap-x-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              to="#"
              className="group flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full border border-gray-200 group-hover:border-gray-900 transition-colors flex items-center justify-center text-[10px] font-black tracking-widest text-gray-400 group-hover:text-gray-900">
                {c.id.toUpperCase().slice(0, 3)}
              </div>
              <span className="text-[11px] font-medium text-gray-700">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Products — 큰 카드, 미니멀 라벨 */}
      <section className="px-6 py-8">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[10px] font-black tracking-[0.25em] text-gray-400">USED</p>
            <h2 className="text-lg font-black text-gray-900 mt-0.5">중고거래</h2>
          </div>
          <Link to="#" className="text-xs font-bold text-gray-900 inline-flex items-center gap-1 group">
            전체 보기 <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-7">
          {MOCK_PRODUCTS.map((p) => (
            <Link key={p.id} to="#" className="flex flex-col group">
              <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center text-5xl">
                <span className="group-hover:scale-105 transition-transform">{p.image}</span>
              </div>
              <p className="mt-3 text-[10px] font-black tracking-[0.2em] text-gray-400">{p.brand}</p>
              <p className="text-sm text-gray-900 line-clamp-1 mt-0.5">{p.name}</p>
              <p className="text-base font-black text-gray-900 mt-1.5">{p.price.toLocaleString()}원</p>
            </Link>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <button className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-gray-900 border border-gray-900 rounded-full hover:bg-gray-900 hover:text-white transition-colors">
            다른 매물 보기
          </button>
        </div>
      </section>

      {/* Footer — preview 표시 */}
      <div className="px-6 py-6 border-t border-gray-100 text-center">
        <p className="text-[10px] font-black tracking-[0.25em] text-gray-300">PREVIEW · OPTION A · APPLE / LINEAR</p>
        <Link to="/preview-c" className="inline-block mt-3 text-xs font-bold text-gray-900 underline">
          C 안 보기 →
        </Link>
      </div>
    </div>
  );
}
