import { useState } from 'react';
import { Link } from 'react-router-dom';

// 장비 추천 — 목적별 여러 개 추천 (큐레이션 정적 데이터, 가격은 대략적 범위).
interface Gear {
  name: string;
  brand: string;
  target: string;   // 어떤 러너에게
  priceRange: string;
  point: string;    // 추천 포인트
}

const SECTIONS: { id: string; title: string; desc: string; items: Gear[] }[] = [
  {
    id: 'daily',
    title: '데일리 러닝화 (입문·훈련)',
    desc: '처음 시작하거나 매일 신는 용도 — 쿠션 좋고 내구성 높은 모델',
    items: [
      { name: '페가수스', brand: '나이키', target: '입문~중급 데일리', priceRange: '10만원대', point: '수십 년 검증된 국민 데일리화. 무난함의 정석' },
      { name: '노바블라스트', brand: '아식스', target: '쿠션 좋아하는 러너', priceRange: '10만원대', point: '통통 튀는 쿠션감 — 장거리도 편함' },
      { name: '클리프톤', brand: '호카', target: '무릎 부담 줄이고 싶은 러너', priceRange: '10만원대 후반', point: '두꺼운 쿠션의 대명사. 회복 러닝에도 좋음' },
      { name: '고스트', brand: '브룩스', target: '발볼 넓은 러너', priceRange: '10만원대', point: '착화감 균형이 좋아 입문 추천 단골' },
    ],
  },
  {
    id: 'race',
    title: '레이스화 (대회용)',
    desc: '기록 도전용 카본 플레이트 — 풀·하프 대회에서',
    items: [
      { name: '베이퍼플라이', brand: '나이키', target: '기록 단축이 목표', priceRange: '30만원대', point: '카본화의 기준. 대회 날의 무기' },
      { name: '메타스피드', brand: '아식스', target: '피치 주법 러너', priceRange: '30만원대', point: '주법별 라인업 — 국내 러너 착용률 급상승' },
      { name: '아디오스 프로', brand: '아디다스', target: '장거리 레이스', priceRange: '20만원대 후반', point: '에너지로드 특유의 반발력' },
    ],
  },
  {
    id: 'watch',
    title: 'GPS 시계',
    desc: '페이스·심박·거리 기록 — 훈련의 필수템',
    items: [
      { name: '포러너 시리즈', brand: '가민', target: '본격 훈련 러너', priceRange: '30~70만원대', point: '러닝 시계의 표준. 훈련 기능 최강' },
      { name: '페이스 시리즈', brand: '코로스', target: '가성비 중시', priceRange: '20~30만원대', point: '배터리 오래가고 가벼움 — 가성비 강자' },
      { name: '애플워치', brand: '애플', target: '일상 겸용', priceRange: '50만원대~', point: '아이폰 유저면 활용도 최고, 러닝 전용 기능은 가민보다 약함' },
    ],
  },
  {
    id: 'etc',
    title: '러닝 용품',
    desc: '있으면 러닝이 훨씬 편해지는 것들',
    items: [
      { name: '러닝 베스트', brand: '(다양)', target: '장거리·트레일 러너', priceRange: '5~15만원대', point: '물·젤·폰 수납 — 10km 이상이면 체감 큼' },
      { name: '러닝 양말', brand: '(다양)', target: '모든 러너', priceRange: '1~2만원대', point: '물집 방지엔 전용 양말이 답. 면양말 금지' },
      { name: '러닝 벨트', brand: '(다양)', target: '가볍게 뛰는 러너', priceRange: '1~3만원대', point: '폰·카드만 넣고 출퇴근 러닝' },
      { name: '무선 이어폰 (오픈형)', brand: '샥즈 등', target: '음악 들으며 뛰는 러너', priceRange: '10만원대', point: '귀를 막지 않는 골전도 — 도로에서 안전' },
    ],
  },
];

export default function RunGear() {
  const [active, setActive] = useState('daily');
  const section = SECTIONS.find(s => s.id === active)!;

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/run" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">장비 추천</h1>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              active === s.id ? 'bg-gray-900 text-white' : 'bg-snow text-gray-500 border border-gray-200'
            }`}
          >
            {s.title.split(' ')[0]}
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-bold text-gray-900">{section.title}</h2>
        <p className="text-xs text-gray-500 mt-0.5 mb-3">{section.desc}</p>
        <div className="space-y-3">
          {section.items.map(g => (
            <div key={g.name} className="card p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-sm font-bold text-gray-900">{g.brand} {g.name}</h3>
                <span className="text-[11px] font-bold text-orange-600 flex-shrink-0">{g.priceRange}</span>
              </div>
              <p className="text-[11px] text-gray-500">{g.target}</p>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{g.point}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
        <p className="text-[11px] text-orange-700 leading-relaxed">
          가격은 대략적인 범위이며 모델·시즌에 따라 달라져요. 중고로 저렴하게 시작하고 싶다면{' '}
          <Link to="/run/used" className="font-bold underline">중고거래</Link>를 둘러보세요.
        </p>
      </div>
    </div>
  );
}
