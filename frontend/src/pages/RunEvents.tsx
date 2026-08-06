import { useState } from 'react';
import { Link } from 'react-router-dom';

// 대회 정보 — 국내 주요 정기 대회 큐레이션 (매년 열리는 대회, 시기는 월 단위).
// 정확한 일정·접수는 매년 바뀌므로 주최측 공지 기준 안내. 추후 관리자 등록형으로 전환 예정.
interface RunEvent {
  name: string;
  season: string; // '매년 3월' 등
  type: '로드' | '트레일';
  courses: string;
  area: string;
  note?: string;
}

const EVENTS: RunEvent[] = [
  { name: '서울마라톤 (동아마라톤)', season: '매년 3월', type: '로드', courses: '풀 · 10km', area: '서울 광화문~잠실', note: '국내 최고 권위의 메이저 대회. 접수 조기 마감' },
  { name: '코리아 50K', season: '매년 4월경', type: '트레일', courses: '50K · 25K 등', area: '경기 동두천 일대', note: '국내 대표 트레일 레이스' },
  { name: '서울하프마라톤', season: '매년 5월경', type: '로드', courses: '하프 · 10km', area: '서울 도심', note: '봄 시즌 대표 하프 대회' },
  { name: '춘천마라톤', season: '매년 10월', type: '로드', courses: '풀 · 10km', area: '강원 춘천 의암호', note: '가을 단풍 코스로 유명한 메이저 대회' },
  { name: 'JTBC 서울마라톤', season: '매년 11월', type: '로드', courses: '풀 · 10km', area: '서울 상암~잠실', note: '가을 시즌 최대 규모. 축제 분위기' },
  { name: '손기정평화마라톤', season: '매년 11월경', type: '로드', courses: '풀 · 하프 · 10km', area: '서울', note: '초보 러너 참가 비율 높음' },
];

export default function RunEvents() {
  const [filter, setFilter] = useState<'all' | '로드' | '트레일'>('all');
  const filtered = EVENTS.filter(e => filter === 'all' || e.type === filter);

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/run" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">대회 정보</h1>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
        <p className="text-xs text-orange-700 leading-relaxed">
          매년 열리는 국내 주요 대회 모음이에요. 정확한 일정·접수 기간은 해마다 달라지니
          <span className="font-bold"> 반드시 주최측 공식 홈페이지</span>에서 확인하세요.
        </p>
      </div>

      <div className="flex gap-2">
        {(['all', '로드', '트레일'] as const).map(f => (
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

      <div className="space-y-3">
        {filtered.map(e => (
          <div key={e.name} className="card p-4">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">{e.season}</span>
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
    </div>
  );
}
