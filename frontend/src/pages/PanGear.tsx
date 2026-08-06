import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useVertical } from '../hooks/useVertical';
import { PAN_CONTENT } from '../data/panContent';

// 판별 장비 추천 — 목적별 섹션에 여러 개 추천 (가격은 대략 범위).
export default function PanGear() {
  const vertical = useVertical();
  const content = PAN_CONTENT[vertical.slug];
  const [active, setActive] = useState(content?.gear[0]?.id || '');

  if (!content || content.gear.length === 0) return null;
  const section = content.gear.find(s => s.id === active) || content.gear[0];

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to={vertical.basePath} className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">{content.gearTitle}</h1>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {content.gear.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              section.id === s.id ? 'bg-gray-900 text-white' : 'bg-snow text-gray-500 border border-gray-200'
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
                <h3 className="text-sm font-bold text-gray-900">{g.brand !== '(다양)' ? `${g.brand} ` : ''}{g.name}</h3>
                <span className="text-[11px] font-bold flex-shrink-0" style={{ color: vertical.accentColor }}>{g.priceRange}</span>
              </div>
              <p className="text-[11px] text-gray-500">{g.target}</p>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{g.point}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl px-4 py-3 border" style={{ backgroundColor: vertical.toneFrom, borderColor: vertical.toneTo }}>
        <p className="text-[11px] leading-relaxed" style={{ color: vertical.accentColor }}>
          가격은 대략적인 범위이며 모델·시즌에 따라 달라져요. 중고로 저렴하게 시작하고 싶다면{' '}
          <Link to={`${vertical.basePath}/used`} className="font-bold underline">중고거래</Link>를 둘러보세요.
        </p>
      </div>
    </div>
  );
}
