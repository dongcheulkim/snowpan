import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useVertical } from '../hooks/useVertical';
import { PAN_CONTENT } from '../data/panContent';

// 판별 대회 정보 — 매년 열리는 주요 대회 큐레이션. 데이터 없으면 준비중 안내.
export default function PanEvents() {
  const vertical = useVertical();
  const content = PAN_CONTENT[vertical.slug];
  const [filter, setFilter] = useState('all');

  if (!content) return null;
  const types = Array.from(new Set(content.events.map(e => e.type)));
  const filtered = content.events.filter(e => filter === 'all' || e.type === filter);

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to={vertical.basePath} className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">{content.eventsTitle}</h1>
      </div>

      {content.events.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-gray-500">대회 정보를 준비 중이에요.</p>
          <p className="text-xs text-gray-400 mt-1">곧 업데이트됩니다.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl px-4 py-3 border" style={{ backgroundColor: vertical.toneFrom, borderColor: vertical.toneTo }}>
            <p className="text-xs leading-relaxed" style={{ color: vertical.accentColor }}>
              매년 열리는 주요 대회 모음이에요. 정확한 일정·접수 기간은 해마다 달라지니
              <span className="font-bold"> 반드시 주최측 공식 홈페이지</span>에서 확인하세요.
            </p>
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
            {filtered.map(e => (
              <div key={e.name} className="card p-4">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: vertical.toneFrom, color: vertical.accentColor }}>{e.season}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">{e.type}</span>
                  <span className="text-[10px] text-gray-500 ml-auto">{e.area}</span>
                </div>
                <h2 className="text-sm font-bold text-gray-900">{e.name}</h2>
                <p className="text-xs text-gray-600 mt-1">{e.courses}</p>
                {e.note && <p className="text-[11px] text-gray-500 mt-1">{e.note}</p>}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-gray-400 text-center pb-4">추가하고 싶은 대회가 있다면 커뮤니티에 제보해주세요.</p>
        </>
      )}
    </div>
  );
}
