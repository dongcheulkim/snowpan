// 시즌 카운트다운 — 한국 스키장 평균 개장일 12월 초, 폐장 3월 말 기준.
// 시즌 중에는 'D+N (시즌 X일째)', 비시즌에는 'D-N 시즌 개막'.

const SEASONS: Array<{ label: string; openMonth: number; openDay: number; closeMonth: number; closeDay: number }> = [
  // 시즌별 한국 평균값 — 리조트마다 다르지만 통상 12월 초 ~ 3월 말.
  { label: '2025-2026', openMonth: 12, openDay: 5, closeMonth: 3, closeDay: 25 },
  { label: '2026-2027', openMonth: 12, openDay: 5, closeMonth: 3, closeDay: 25 },
  { label: '2027-2028', openMonth: 12, openDay: 5, closeMonth: 3, closeDay: 25 },
];

interface State {
  phase: 'pre' | 'in' | 'post';
  label: string;
  days: number; // pre: D-N, in: D+N, post: 다음 시즌까지 D-N
  seasonLabel: string;
}

function computeState(now: Date): State {
  const y = now.getFullYear();
  // 후보: (y-1)~y 시즌, y~(y+1) 시즌
  for (const s of SEASONS) {
    const [openY, closeY] = s.label.split('-').map(Number);
    const open = new Date(openY, s.openMonth - 1, s.openDay);
    const close = new Date(closeY, s.closeMonth - 1, s.closeDay, 23, 59, 59);
    if (now < open) {
      const days = Math.ceil((open.getTime() - now.getTime()) / 86400000);
      return { phase: 'pre', label: '시즌 개막', days, seasonLabel: s.label };
    }
    if (now <= close) {
      const days = Math.floor((now.getTime() - open.getTime()) / 86400000) + 1;
      return { phase: 'in', label: '시즌 진행 중', days, seasonLabel: s.label };
    }
  }
  // fallback (모든 시즌 지남) — 다음 12월
  const nextOpen = new Date(y + 1, 11, 5);
  const days = Math.ceil((nextOpen.getTime() - now.getTime()) / 86400000);
  return { phase: 'post', label: '시즌 개막', days, seasonLabel: `${y + 1}-${y + 2}` };
}

export default function SeasonCountdown() {
  const state = computeState(new Date());

  const isInSeason = state.phase === 'in';
  const numberText = isInSeason ? `D+${state.days}` : `D-${state.days}`;

  return (
    <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${isInSeason ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50 border-sky-200'}`}>
      <span className="text-2xl" aria-hidden>{isInSeason ? '⛷️' : '🗓️'}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-[10px] font-bold tracking-wider ${isInSeason ? 'text-emerald-700' : 'text-sky-700'}`}>
          {state.seasonLabel} 시즌
        </div>
        <div className="text-sm font-bold text-gray-900 leading-tight">
          {state.label}{' '}
          <span className={`font-mono ${isInSeason ? 'text-emerald-600' : 'text-sky-600'}`}>{numberText}</span>
        </div>
        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
          {isInSeason
            ? '슬로프 컨디션은 실시간 웹캠에서 확인하세요'
            : '미리 장비 점검하고 시즌권·숙소 예약하세요'}
        </p>
      </div>
    </div>
  );
}
