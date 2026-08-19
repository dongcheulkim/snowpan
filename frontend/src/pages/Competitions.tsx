import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import competitions from '../data/competitions';
import { api, getUser } from '../api';
import { ChatIcon, LocationIcon, SkiIcon, SnowboardIcon, TrophyIcon } from '../components/Icons';

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

// 'YYYY-MM-DD' 키 생성 (로컬 기준, timezone 안전).
function dayKey(y: number, m0: number, d: number) {
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function Competitions() {
  const [filter, setFilter] = useState<'all' | 'ski' | 'board'>('all');
  const [chatLoading, setChatLoading] = useState(false);
  // 캘린더: 보고 있는 연/월(0-11), 선택한 날짜(null=전체).
  const [view, setView] = useState(() => {
    const first = competitions[0]?.date ? new Date(competitions[0].date) : new Date();
    return { y: first.getFullYear(), m: first.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAdminInquiry = async () => {
    const user = getUser();
    if (!user) { navigate('/login'); return; }
    setChatLoading(true);
    try {
      const admin = await api<{ id: string; name: string }>('/contact/admin-id');
      if (admin.id === user.id) { alert('관리자 계정입니다.'); setChatLoading(false); return; }
      const room = await api<{ id: string }>('/chat/rooms', {
        method: 'POST',
        body: { targetUserId: admin.id },
      });
      navigate(`/chat/${room.id}`, { state: { seller: admin.name, sellerId: admin.id, isAdmin: true, initialMessage: '[시합 일정 등록 문의] ' } });
    } catch {
      alert('관리자 연결에 실패했습니다.');
    } finally { setChatLoading(false); }
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const filtered = competitions.filter(c => filter === 'all' || c.sport === filter || c.sport === 'both');

  // 날짜별 대회 매핑 — 기간 대회(date~endDate)는 모든 날짜에 표시.
  const dayMap: Record<string, typeof competitions> = {};
  for (const c of filtered) {
    const start = new Date(`${c.date}T00:00:00`);
    const end = new Date(`${c.endDate || c.date}T00:00:00`);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = dayKey(d.getFullYear(), d.getMonth(), d.getDate());
      (dayMap[key] ||= []).push(c);
    }
  }

  // 캘린더 셀 (앞 빈칸 + 1~말일).
  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate());
  const moveMonth = (delta: number) => {
    setSelectedDay(null);
    setView(v => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  // 선택한 날 있으면 그날 대회만, 없으면 전체를 월별 그룹.
  const listSource = selectedDay ? (dayMap[selectedDay] || []) : filtered;
  const grouped: Record<string, typeof competitions> = {};
  for (const c of listSource) {
    const month = getMonthLabel(c.date);
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(c);
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">시합 일정</h1>
        <span className="text-xs text-gray-500">2026-27 시즌</span>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-sm text-sky-700">시합 일정 등록은 관리자에게 1:1 문의해주세요.</span>
        <button
          onClick={handleAdminInquiry}
          disabled={chatLoading}
          className="flex-shrink-0 px-3 py-1.5 bg-sky-500 text-white rounded-lg font-bold text-xs hover:bg-sky-600 transition-colors disabled:opacity-50"
        >
          {chatLoading ? '연결 중...' : <span className="inline-flex items-center gap-1"><ChatIcon size={12} /> 문의하기</span>}
        </button>
      </div>

      {/* 라이브타이밍 안내 — 대회 기록/결과 조회 외부 서비스 */}
      <a
        href="https://www.livetiming.co.kr/app/main/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <TrophyIcon size={16} className="text-amber-400 flex-shrink-0" />
          <div className="min-w-0">
            <span className="block text-sm font-bold text-white">대회 기록 조회는 라이브타이밍에서</span>
            <span className="block text-[11px] text-gray-400 truncate">실시간 경기 기록·순위 확인 — livetiming.co.kr</span>
          </div>
        </div>
        <span className="flex-shrink-0 text-[11px] font-bold text-gray-900 bg-white rounded-lg px-2.5 py-1.5">바로가기</span>
      </a>

      <div className="flex gap-2">
        {([
          { id: 'all', label: '전체', icon: null },
          { id: 'ski', label: '스키', icon: <SkiIcon size={13} /> },
          { id: 'board', label: '보드', icon: <SnowboardIcon size={13} /> },
        ] as const).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
              filter === id ? 'bg-gray-900 text-white' : 'bg-snow text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* 월 캘린더 — 대회 있는 날에 점 표시, 탭하면 그날 대회만 필터 */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => moveMonth(-1)} aria-label="이전 달" className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 rounded-lg">‹</button>
          <span className="text-sm font-bold text-gray-900">{view.y}년 {view.m + 1}월</span>
          <button onClick={() => moveMonth(1)} aria-label="다음 달" className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 rounded-lg">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
            <div key={w} className={`text-[10px] font-bold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-sky-400' : 'text-gray-400'}`}>{w}</div>
          ))}
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e${idx}`} />;
            const key = dayKey(view.y, view.m, day);
            const comps = dayMap[key];
            const has = !!comps;
            // 종목별 건수 (both 은 스키·보드 양쪽 카운트).
            const skiN = comps ? comps.filter(c => c.sport === 'ski' || c.sport === 'both').length : 0;
            const boardN = comps ? comps.filter(c => c.sport === 'board' || c.sport === 'both').length : 0;
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;
            const weekday = idx % 7;
            return (
              <button
                key={key}
                onClick={() => has && setSelectedDay(isSelected ? null : key)}
                disabled={!has}
                className={`relative min-h-[3.2rem] flex flex-col items-center pt-1 rounded-lg text-xs transition-colors ${
                  isSelected ? 'bg-sky-500 text-white font-bold'
                  : has ? 'bg-sky-50 hover:bg-sky-100 cursor-pointer'
                  : isToday ? 'ring-1 ring-sky-300 text-gray-700'
                  : weekday === 0 ? 'text-red-300' : weekday === 6 ? 'text-sky-300' : 'text-gray-400'
                }`}
              >
                <span className={has && !isSelected ? 'text-gray-900 font-bold' : ''}>{day}</span>
                {has && (
                  <span className="flex flex-col items-center gap-px mt-0.5 leading-none">
                    {skiN > 0 && (
                      <span className={`text-[8px] font-bold px-1 rounded ${isSelected ? 'bg-white/25 text-white' : 'bg-sky-500 text-white'}`}>스키 {skiN}</span>
                    )}
                    {boardN > 0 && (
                      <span className={`text-[8px] font-bold px-1 rounded ${isSelected ? 'bg-white/25 text-white' : 'bg-emerald-500 text-white'}`}>보드 {boardN}</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {selectedDay && (
          <button onClick={() => setSelectedDay(null)} className="mt-3 w-full py-1.5 text-[11px] font-medium text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
            {new Date(selectedDay + 'T00:00:00').getMonth() + 1}월 {new Date(selectedDay + 'T00:00:00').getDate()}일 대회만 보는 중 · 전체 보기
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 card">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-500"><TrophyIcon size={44} strokeWidth={1.4} /></div>
          <p className="text-sm text-gray-500">아직 등록된 시합 일정이 없습니다.</p>
          <p className="text-xs text-gray-500 mt-1">시즌이 시작되면 업데이트됩니다.</p>
        </div>
      )}

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

              return (
                <Link
                  key={comp.id}
                  to={`/competitions/${comp.id}`}
                  className={`card p-4 block card-hover ${isPast ? 'opacity-50' : ''} ${isToday ? 'ring-2 ring-sky-400' : ''}`}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 text-center w-14">
                      <div className={`text-lg font-black ${isPast ? 'text-gray-500' : 'text-sky-500'}`}>
                        {formatDate(comp.date)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        ({formatDay(comp.date)})
                        {comp.endDate && <> ~ {formatDate(comp.endDate)}</>}
                      </div>
                      {isToday && <div className="text-[9px] font-bold text-sky-500 mt-0.5">TODAY</div>}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${levelColor[comp.level] || 'bg-gray-100 text-gray-600'}`}>{comp.level}</span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">{comp.title}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span className="inline-flex items-center gap-1"><LocationIcon size={11} /> {comp.location}</span>
                        <span>· {comp.organizer}</span>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-500 flex-shrink-0">→</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
