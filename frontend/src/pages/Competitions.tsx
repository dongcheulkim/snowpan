import { useState } from 'react';
import { Link } from 'react-router-dom';

interface Competition {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  location: string;
  sport: 'ski' | 'board' | 'both';
  level: string;
  organizer: string;
  description?: string;
}

const competitions: Competition[] = [
  // 12월
  { id: '1', date: '2025-12-06', endDate: '2025-12-07', title: 'KSIA 시즌 개막전', location: '하이원리조트', sport: 'ski', level: '전체', organizer: 'KSIA', description: '2025-26 시즌 개막 레이스' },
  { id: '2', date: '2025-12-13', endDate: '2025-12-14', title: 'SBAK 보드크로스 1차', location: '웰리힐리파크', sport: 'board', level: '전체', organizer: 'SBAK' },
  { id: '3', date: '2025-12-20', endDate: '2025-12-21', title: '전국 알파인 스키 선수권 1차', location: '용평리조트', sport: 'ski', level: '선수', organizer: '대한스키협회' },
  { id: '4', date: '2025-12-27', endDate: '2025-12-28', title: '크리스마스 프리스타일 잼', location: '휘닉스평창', sport: 'both', level: '전체', organizer: '휘닉스파크', description: '모굴, 에어리얼, 하프파이프' },

  // 1월
  { id: '5', date: '2026-01-03', endDate: '2026-01-04', title: '신년 GS 대회', location: '하이원리조트', sport: 'ski', level: '전체', organizer: 'KSIA' },
  { id: '6', date: '2026-01-10', endDate: '2026-01-11', title: 'SBAK 슬로프스타일 1차', location: '휘닉스평창', sport: 'board', level: '전체', organizer: 'SBAK' },
  { id: '7', date: '2026-01-17', endDate: '2026-01-18', title: '전국 동계체전 스키부문', location: '용평리조트', sport: 'ski', level: '선수', organizer: '대한체육회' },
  { id: '8', date: '2026-01-24', endDate: '2026-01-25', title: '아마추어 보더크로스 오픈', location: '곤지암리조트', sport: 'board', level: '아마추어', organizer: 'SBAK', description: '누구나 참가 가능' },
  { id: '9', date: '2026-01-31', title: 'KSIA 데몬스트레이션 캠프', location: '웰리힐리파크', sport: 'ski', level: '데몬', organizer: 'KSIA' },

  // 2월
  { id: '10', date: '2026-02-07', endDate: '2026-02-08', title: '전국 알파인 스키 선수권 2차', location: '하이원리조트', sport: 'ski', level: '선수', organizer: '대한스키협회' },
  { id: '11', date: '2026-02-11', endDate: '2026-02-12', title: 'FIS 극동컵 SL/GS', location: '용평리조트', sport: 'ski', level: '국제', organizer: 'FIS', description: 'FIS 공인 국제대회' },
  { id: '12', date: '2026-02-14', endDate: '2026-02-15', title: '발렌타인 프리라이드 챌린지', location: '휘닉스평창', sport: 'both', level: '전체', organizer: '휘닉스파크' },
  { id: '13', date: '2026-02-21', endDate: '2026-02-22', title: 'SBAK 하프파이프 챔피언십', location: '웰리힐리파크', sport: 'board', level: '전체', organizer: 'SBAK' },
  { id: '14', date: '2026-02-28', title: '시즌엔드 레이스 페스티벌', location: '곤지암리조트', sport: 'both', level: '전체', organizer: '곤지암리조트', description: '시즌 마무리 축제' },

  // 3월
  { id: '15', date: '2026-03-07', endDate: '2026-03-08', title: 'KSIA 시즌 클로징 대회', location: '하이원리조트', sport: 'ski', level: '전체', organizer: 'KSIA' },
  { id: '16', date: '2026-03-14', endDate: '2026-03-15', title: 'SBAK 시즌 마감전', location: '휘닉스평창', sport: 'board', level: '전체', organizer: 'SBAK' },
  { id: '17', date: '2026-03-21', title: '스프링 스키 페스티벌', location: '용평리조트', sport: 'both', level: '전체', organizer: '용평리조트', description: '봄 스키 축제, 코스튬 레이스' },
];

const sportLabel: Record<string, { text: string; color: string }> = {
  ski: { text: '스키', color: 'bg-sky-100 text-sky-700' },
  board: { text: '보드', color: 'bg-purple-100 text-purple-700' },
  both: { text: '스키/보드', color: 'bg-amber-100 text-amber-700' },
};

const levelColor: Record<string, string> = {
  '전체': 'bg-green-100 text-green-700',
  '선수': 'bg-red-100 text-red-700',
  '아마추어': 'bg-blue-100 text-blue-700',
  '데몬': 'bg-gold/20 text-yellow-700',
  '국제': 'bg-violet-100 text-violet-700',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDay(dateStr: string) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(dateStr).getDay()];
}

function getMonthLabel(dateStr: string) {
  return `${new Date(dateStr).getMonth() + 1}월`;
}

export default function Competitions() {
  const [filter, setFilter] = useState<'all' | 'ski' | 'board'>('all');

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const filtered = competitions.filter(c => filter === 'all' || c.sport === filter || c.sport === 'both');

  // 월별 그룹
  const grouped: Record<string, Competition[]> = {};
  for (const c of filtered) {
    const month = getMonthLabel(c.date);
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(c);
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">시합 일정</h1>
        <span className="text-xs text-gray-400">2025-26 시즌</span>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {([['all', '전체'], ['ski', '⛷️ 스키'], ['board', '🏂 보드']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filter === id ? 'bg-accent text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 일정 목록 */}
      {Object.entries(grouped).map(([month, items]) => (
        <div key={month}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-gray-900">{month}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="space-y-2">
            {items.map((comp) => {
              const isPast = new Date(comp.endDate || comp.date) < now;
              const isToday = comp.date === now.toISOString().split('T')[0];
              const sl = sportLabel[comp.sport];

              return (
                <div
                  key={comp.id}
                  className={`card p-4 ${isPast ? 'opacity-50' : ''} ${isToday ? 'ring-2 ring-sky-400' : ''}`}
                >
                  <div className="flex gap-4">
                    {/* 날짜 */}
                    <div className="flex-shrink-0 text-center w-14">
                      <div className={`text-lg font-black ${isPast ? 'text-gray-300' : 'text-sky-500'}`}>
                        {formatDate(comp.date)}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        ({formatDay(comp.date)})
                        {comp.endDate && <> ~ {formatDate(comp.endDate)}</>}
                      </div>
                      {isToday && <div className="text-[9px] font-bold text-sky-500 mt-0.5">TODAY</div>}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sl.color}`}>{sl.text}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${levelColor[comp.level] || 'bg-gray-100 text-gray-500'}`}>{comp.level}</span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">{comp.title}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>📍 {comp.location}</span>
                        <span>· {comp.organizer}</span>
                      </div>
                      {comp.description && (
                        <p className="text-[11px] text-gray-400 mt-1">{comp.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
