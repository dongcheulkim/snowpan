// PREVIEW — Apple/무신사/Linear 톤 강화 미니멀.
// A 의 절제 유지 + 거대 타이포 위계 + 사진 hero + 호버 모션 + 1포인트 액센트.

import { Link } from 'react-router-dom';
import { categoryIcons } from '../components/CategoryIcons';

const MOCK_PRODUCTS = [
  { id: '1', name: '아토믹 슈팅스타 165', brand: 'ATOMIC', price: 380000 },
  { id: '2', name: '버튼 커스텀 X 158', brand: 'BURTON', price: 520000 },
  { id: '3', name: '살로몬 X-PRO 부츠 270', brand: 'SALOMON', price: 240000 },
  { id: '4', name: '오클리 플라이트 데크', brand: 'OAKLEY', price: 180000 },
];

const CATEGORIES: { id: keyof typeof categoryIcons; label: string }[] = [
  { id: 'used', label: '중고거래' },
  { id: 'rental', label: '렌탈' },
  { id: 'lesson', label: '레슨' },
  { id: 'accommodation', label: '숙소' },
  { id: 'skishop', label: '스키샵' },
  { id: 'repair', label: '정비' },
  { id: 'community', label: '커뮤니티' },
  { id: 'webcam', label: '웹캠' },
  { id: 'coupon', label: '쿠폰샵' },
];

// 무료 산 풍경 (Unsplash, 검은 오버레이 깔 거니까 거의 silhouette 만 보임)
const HERO_PHOTO = 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=900&auto=format&fit=crop&q=70';

export default function PreviewA() {
  return (
    <div className="min-h-screen bg-white">
      {/* HERO — 풀브리드 산 사진 + 어두운 오버레이 + 거대 타이포 */}
      <section className="relative overflow-hidden">
        <div className="aspect-[3/4] relative">
          <img
            src={HERO_PHOTO}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black" />
          <div className="absolute inset-0 flex flex-col justify-between p-6">
            {/* 상단: SLUG */}
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <p className="text-[10px] font-black tracking-[0.3em] text-white/80">
                SEASON OPENS · D-171
              </p>
            </div>
            {/* 하단: 거대 헤딩 */}
            <div>
              <h1 className="text-[44px] font-black text-white leading-[0.95] tracking-tight">
                시즌의<br />모든 것.
              </h1>
              <p className="text-sm text-white/70 mt-3 leading-relaxed max-w-[280px]">
                중고거래 · 렌탈 · 레슨 · 숙소를 한 곳에. 스키·보드 시즌을 위한 단 하나의 플랫폼.
              </p>
              <Link
                to="#"
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-black tracking-wider text-white border-b border-white/40 pb-1 hover:border-white transition-colors"
              >
                중고거래 둘러보기 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SNOW RUN — 검은 풀너비 카드 + 큰 숫자 + 액센트 점 */}
      <section className="border-y border-gray-200">
        <Link to="/snow-run" className="block px-6 py-7 group">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black tracking-[0.3em] text-gray-400 mb-2">REWARD · SNOW RUN</p>
              <p className="text-[40px] font-black text-gray-900 leading-none tracking-tight">
                100<span className="text-xl ml-0.5">P</span>
                <span className="text-base font-medium text-gray-400 ml-3">/ run</span>
              </p>
              <p className="text-xs text-gray-500 mt-3">탈 때마다 자동 적립 · 쿠폰으로 사용</p>
            </div>
            <span className="text-gray-300 text-2xl group-hover:text-gray-900 group-hover:translate-x-1 transition-all">→</span>
          </div>
        </Link>
      </section>

      {/* CATEGORIES — 정사각 박스 + SVG 아이콘 + 호버 시 검정 채움 */}
      <section className="px-6 py-10">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <p className="text-[10px] font-black tracking-[0.3em] text-gray-400">EXPLORE</p>
            <h2 className="text-2xl font-black text-gray-900 mt-1">둘러보기</h2>
          </div>
          <p className="text-[10px] font-medium text-gray-400">{CATEGORIES.length}개 카테고리</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map((c) => {
            const Icon = categoryIcons[c.id];
            return (
              <Link
                key={c.id}
                to="#"
                className="group flex flex-col items-center gap-2 py-4 border border-gray-200 rounded-2xl hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all"
              >
                <div className="text-gray-900 group-hover:text-white transition-colors">
                  {Icon ? <Icon size={28} /> : null}
                </div>
                <span className="text-[11px] font-bold mt-1">{c.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* PRODUCTS — 굵은 위계 + 호버 시 카드 살짝 떠오름 */}
      <section className="px-6 pb-12">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <p className="text-[10px] font-black tracking-[0.3em] text-gray-400">USED · 0</p>
            <h2 className="text-2xl font-black text-gray-900 mt-1">중고거래</h2>
          </div>
          <Link to="#" className="text-xs font-black text-gray-900 inline-flex items-center gap-1 group">
            전체 보기
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-8">
          {MOCK_PRODUCTS.map((p) => (
            <Link
              key={p.id}
              to="#"
              className="flex flex-col group"
            >
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative group-hover:-translate-y-1 transition-transform duration-300">
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)' }}
                />
              </div>
              <p className="mt-3 text-[10px] font-black tracking-[0.25em] text-gray-500">{p.brand}</p>
              <p className="text-[13px] text-gray-900 line-clamp-1 mt-1">{p.name}</p>
              <p className="text-lg font-black text-gray-900 mt-1.5 tracking-tight">
                {p.price.toLocaleString()}<span className="text-xs font-medium text-gray-500 ml-0.5">원</span>
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-10">
          <button className="w-full py-4 text-xs font-black tracking-wider text-gray-900 border border-gray-900 rounded-2xl hover:bg-gray-900 hover:text-white transition-colors">
            다른 매물 보기
          </button>
        </div>
      </section>

      {/* FOOTER — preview 표시 */}
      <div className="px-6 py-8 border-t border-gray-100 text-center">
        <p className="text-[10px] font-black tracking-[0.3em] text-gray-300">PREVIEW · A · 강화된 미니멀</p>
        <Link to="/preview-c" className="inline-block mt-3 text-xs font-bold text-gray-900 underline">
          C 안 보기 →
        </Link>
      </div>
    </div>
  );
}
