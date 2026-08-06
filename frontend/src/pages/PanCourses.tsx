import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useVertical } from '../hooks/useVertical';
import { PAN_CONTENT } from '../data/panContent';

// 판별 코스 추천 (run 러닝 코스 / bike 라이딩 코스 / golf 골프장·연습 가이드).
const levelColor: Record<string, string> = {
  '입문': 'bg-green-100 text-green-700',
  '초급': 'bg-green-100 text-green-700',
  '중급': 'bg-yellow-100 text-yellow-700',
  '상급': 'bg-red-100 text-red-700',
  '투어': 'bg-violet-100 text-violet-700',
};

export default function PanCourses() {
  const vertical = useVertical();
  const content = PAN_CONTENT[vertical.slug];
  const [filter, setFilter] = useState('all');

  if (!content) return null;
  const types = Array.from(new Set(content.courses.map(c => c.type)));
  const filtered = content.courses.filter(c => filter === 'all' || c.type === filter);

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to={vertical.basePath} className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">{content.coursesTitle}</h1>
      </div>

      {types.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {['all', ...types].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filter === f ? 'bg-gray-900 text-white' : 'bg-snow text-gray-500 border border-gray-200'
              }`}
            >
              {f === 'all' ? '전체' : f}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.name} className="card p-4">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${levelColor[c.level] || 'bg-gray-100 text-gray-600'}`}>{c.level}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ color: vertical.accentColor, borderColor: vertical.toneTo, backgroundColor: vertical.toneFrom }}>{c.type}</span>
              <span className="text-[10px] text-gray-500">{c.area}</span>
              {c.distance && <span className="text-[10px] font-bold text-gray-700 ml-auto">{c.distance}</span>}
            </div>
            <h2 className="text-sm font-bold text-gray-900">{c.name}</h2>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{c.desc}</p>
            {c.tip && <p className="text-[11px] mt-1.5" style={{ color: vertical.accentColor }}>TIP. {c.tip}</p>}
          </div>
        ))}
      </div>

      {content.coursesFootnote && (
        <p className="text-[11px] text-gray-400 text-center pb-4">{content.coursesFootnote}</p>
      )}
    </div>
  );
}
