import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import { loginPath } from '../utils/loginPath';
import { useMeta } from '../hooks/useMeta';
import LoadError from '../components/LoadError';
import EmptyState from '../components/EmptyState';
import { SkiIcon, SnowboardIcon, TrophyIcon } from '../components/Icons';

// 서버(/competitions)가 내려주는 대회 한 건. date/endDate 는 KST 달력일 'YYYY-MM-DD'.
export interface Competition {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  location: string;
  resortId: string | null;
  resort?: { id: string; name: string } | null;
  sport: 'ski' | 'board' | 'both';
  level: string | null;
  organizer: string;
  description: string | null;
  poster: string | null;
  events: string | null;
  fee: string | null;
  contact: string | null;
  website: string | null;
  schedule: string | null;
  eligibility: string | null;
  prize: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason: string | null;
  submittedById: string | null;
  createdAt: string;
  updatedAt: string;
}

const levelColor: Record<string, string> = {
  '전체': 'bg-green-100 text-green-700',
  '선수': 'bg-red-100 text-red-700',
  '아마추어': 'bg-blue-100 text-blue-700',
  '데몬': 'bg-gold/20 text-yellow-700',
  '국제': 'bg-violet-100 text-violet-700',
};

// 'YYYY-MM-DD' → 로컬 자정 Date (new Date('YYYY-MM-DD') 는 UTC 로 읽혀 하루 밀릴 수 있음)
function toLocalDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`);
}

function formatDate(dateStr: string) {
  const d = toLocalDate(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDay(dateStr: string) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[toLocalDate(dateStr).getDay()];
}

function getMonthLabel(dateStr: string) {
  const d = toLocalDate(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

// 'YYYY-MM-DD' 키 생성 (로컬 기준, timezone 안전).
function dayKey(y: number, m0: number, d: number) {
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function Competitions() {
  useMeta({
    title: '시합 일정',
    description: '스키·스노보드 대회 일정을 한눈에 확인하고, 주최하는 대회를 직접 등록해 보세요.',
  });
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'ski' | 'board'>('all');
  const [showPast, setShowPast] = useState(false);
  const [items, setItems] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null); // 목록 로드 실패 메시지 (빈 상태와 구분)
  const [retryKey, setRetryKey] = useState(0);
  // 캘린더: 보고 있는 연/월(0-11), 선택한 날짜(null=전체).
  const [view, setView] = useState(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // 월별 아코디언 열림 상태 (명시 안 된 달은 아래 monthOrder[0] 기본 열림).
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    api<{ items: Competition[] }>(`/competitions${showPast ? '?past=1' : ''}`)
      .then((data) => {
        if (cancelled) return;
        const list = data.items || [];
        setItems(list);
        setSelectedDay(null);
        setOpenMonths({});
        // 목록 첫 대회가 있는 달로 캘린더 이동 (지난 대회 모드면 가장 최근 대회 달)
        const first = list[0];
        if (first) {
          const d = toLocalDate(first.date);
          setView({ y: d.getFullYear(), m: d.getMonth() });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setItems([]);
        setLoadError(err instanceof Error ? err.message : '시합 일정을 불러오지 못했어요.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showPast, retryKey]);

  const goRegister = () => {
    if (!getUser()) { navigate(loginPath('/competitions/register')); return; }
    navigate('/competitions/register');
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const filtered = items.filter(c => filter === 'all' || c.sport === filter || c.sport === 'both');

  // 날짜별 대회 매핑 — 기간 대회(date~endDate)는 모든 날짜에 표시.
  const dayMap: Record<string, Competition[]> = {};
  for (const c of filtered) {
    const start = toLocalDate(c.date);
    const end = toLocalDate(c.endDate || c.date);
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
  const grouped: Record<string, Competition[]> = {};
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
        <div className="min-w-0">
          <span className="block text-sm font-bold text-sky-800">대회를 주최하시나요?</span>
          <span className="block text-[11px] text-sky-700">일정을 신청하면 확인 후 공개돼요.</span>
        </div>
        <button
          type="button"
          onClick={goRegister}
          className="flex-shrink-0 px-3 py-2 bg-sky-500 text-white rounded-lg font-bold text-xs hover:bg-sky-600 transition-colors"
        >
          시합 등록 신청
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
            <span className="block text-[11px] text-gray-500 truncate">실시간 경기 기록·순위 확인 — livetiming.co.kr</span>
          </div>
        </div>
        <span className="flex-shrink-0 text-[11px] font-bold text-gray-900 bg-white rounded-lg px-2.5 py-1.5">바로가기</span>
      </a>

      <div className="flex items-center gap-2">
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
        <button
          type="button"
          onClick={() => setShowPast(p => !p)}
          className={`ml-auto px-3 py-2 rounded-lg text-[11px] font-bold border transition-colors ${
            showPast ? 'bg-gray-100 text-gray-900 border-gray-300' : 'bg-snow text-gray-500 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {showPast ? '다가오는 대회 보기' : '지난 대회 보기'}
        </button>
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
            <div key={w} className={`text-[10px] font-bold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-sky-400' : 'text-gray-500'}`}>{w}</div>
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
                  : weekday === 0 ? 'text-red-300' : weekday === 6 ? 'text-sky-300' : 'text-gray-500'
                }`}
              >
                <span className={has && !isSelected ? 'text-gray-900 font-bold' : ''}>{day}</span>
                {has && (
                  <span className="flex flex-col items-center gap-px mt-0.5 leading-none">
                    {/* 필터가 '보드'가 아니면 스키 배지, '스키'가 아니면 보드 배지 — 선택 종목만 표시 */}
                    {filter !== 'board' && skiN > 0 && (
                      <span className={`text-[8px] font-bold px-1 rounded ${isSelected ? 'bg-white/25 text-white' : 'bg-sky-500 text-white'}`}>스키 {skiN}</span>
                    )}
                    {filter !== 'ski' && boardN > 0 && (
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
            {toLocalDate(selectedDay).getMonth() + 1}월 {toLocalDate(selectedDay).getDate()}일 대회만 보는 중 · 전체 보기
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-12 text-sm text-gray-500">불러오는 중...</div>
      )}

      {!loading && loadError && (
        <LoadError message={loadError} onRetry={() => setRetryKey((k) => k + 1)} />
      )}

      {!loading && !loadError && filtered.length === 0 && (
        <EmptyState
          icon={<TrophyIcon size={44} strokeWidth={1.4} />}
          title={showPast ? '지난 대회 기록이 없어요.' : '아직 등록된 시합 일정이 없어요.'}
          description={showPast ? '공개된 대회가 끝나면 여기에 모여요.' : '대회를 주최하신다면 일정을 신청해 주세요.'}
          ctaLabel={showPast ? undefined : '시합 등록 신청'}
          onCtaClick={showPast ? undefined : goRegister}
        />
      )}

      {/* 월별 아코디언 — 헤더 탭으로 펼침/접힘, 각 대회는 한 줄 컴팩트 */}
      {!loading && !loadError && (() => {
        const monthOrder = Object.keys(grouped);
        return monthOrder.map((month, mi) => {
          const list = grouped[month];
          const open = openMonths[month] ?? (mi === 0); // 첫 달 기본 펼침
          return (
            <div key={month} className="card overflow-hidden">
              <button
                onClick={() => setOpenMonths(prev => ({ ...prev, [month]: !open }))}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-bold text-gray-900">{month} <span className="text-gray-500 font-medium">({list.length})</span></span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {open && (
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {list.map((comp) => {
                    const isPast = toLocalDate(comp.endDate || comp.date) < now;
                    const isToday = comp.date === todayKey;
                    const sportDot = comp.sport === 'board' ? 'bg-emerald-500' : comp.sport === 'both' ? 'bg-purple-400' : 'bg-sky-500';
                    return (
                      <Link
                        key={comp.id}
                        to={`/competitions/${comp.id}`}
                        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${isPast ? 'opacity-50' : ''}`}
                      >
                        <div className="flex-shrink-0 w-12 text-center">
                          <div className={`text-sm font-black ${isPast ? 'text-gray-500' : 'text-sky-500'}`}>{formatDate(comp.date)}</div>
                          <div className="text-[9px] text-gray-500">({formatDay(comp.date)}){comp.endDate && `~${formatDate(comp.endDate)}`}</div>
                        </div>
                        <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${sportDot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-gray-900 truncate">{comp.title}</span>
                            {isToday && <span className="flex-shrink-0 text-[9px] font-bold text-sky-500">TODAY</span>}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">{comp.location} · {comp.organizer}</div>
                        </div>
                        {comp.level && (
                          <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${levelColor[comp.level] || 'bg-gray-100 text-gray-600'}`}>{comp.level}</span>
                        )}
                        <span className="flex-shrink-0 text-gray-300 text-xs">›</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        });
      })()}
    </div>
  );
}
