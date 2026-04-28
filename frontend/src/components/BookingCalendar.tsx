import { useState } from 'react';

interface BookingCalendarProps {
  unavailableDates: string[];
  selectedStart: string | null;
  selectedEnd: string | null;
  onSelectRange: (start: string, end: string | null) => void;
  minDate?: string;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function BookingCalendar({
  unavailableDates,
  selectedStart,
  selectedEnd,
  onSelectRange,
  minDate,
}: BookingCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = formatDate(today);
  const minDateStr = minDate || formatDate(new Date(today.getTime() + 86400000));

  const unavailableSet = new Set(unavailableDates);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isInRange = (dateStr: string): boolean => {
    if (!selectedStart || !selectedEnd) return false;
    return dateStr >= selectedStart && dateStr <= selectedEnd;
  };

  const hasUnavailableInRange = (start: string, end: string): boolean => {
    const s = new Date(start);
    const e = new Date(end);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      if (unavailableSet.has(formatDate(d))) return true;
    }
    return false;
  };

  const handleDateClick = (dateStr: string) => {
    if (unavailableSet.has(dateStr) || dateStr < minDateStr) return;

    if (!selectedStart || (selectedStart && selectedEnd)) {
      // 새로운 선택 시작
      onSelectRange(dateStr, null);
    } else {
      // 종료일 선택
      if (dateStr < selectedStart) {
        onSelectRange(dateStr, null);
      } else if (dateStr === selectedStart) {
        onSelectRange(dateStr, dateStr);
      } else {
        // 선택 범위 내에 예약 불가 날짜가 있으면 불가
        if (hasUnavailableInRange(selectedStart, dateStr)) {
          onSelectRange(dateStr, null);
        } else {
          onSelectRange(selectedStart, dateStr);
        }
      }
    }
  };

  const isPrevDisabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const cells = [];
  // 빈 셀
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="h-10" />);
  }
  // 날짜 셀
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(new Date(viewYear, viewMonth, day));
    const isToday = dateStr === todayStr;
    const isUnavailable = unavailableSet.has(dateStr);
    const isPast = dateStr < minDateStr;
    const isDisabled = isUnavailable || isPast;
    const isStart = dateStr === selectedStart;
    const isEnd = dateStr === selectedEnd;
    const inRange = isInRange(dateStr);
    const isSelected = isStart || isEnd;

    let cellClass = 'h-10 w-full rounded-lg text-sm font-medium transition-all ';
    if (isDisabled) {
      cellClass += 'text-gray-500 dark:text-gray-600 cursor-not-allowed line-through';
    } else if (isSelected) {
      cellClass += 'bg-sky-500 text-white shadow-md';
    } else if (inRange) {
      cellClass += 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300';
    } else {
      cellClass += 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-500 cursor-pointer';
    }

    if (isToday && !isSelected) {
      cellClass += ' ring-2 ring-sky-400';
    }

    cells.push(
      <button
        key={day}
        type="button"
        disabled={isDisabled}
        onClick={() => handleDateClick(dateStr)}
        className={cellClass}
      >
        {day}
      </button>
    );
  }

  const monthLabel = `${viewYear}년 ${viewMonth + 1}월`;

  return (
    <div className="select-none">
      {/* 헤더: 월 이동 */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          disabled={isPrevDisabled}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-lg font-bold text-gray-800 dark:text-gray-200">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map((name, i) => (
          <div
            key={name}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">{cells}</div>

      {/* 범례 */}
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-sky-500" />
          <span>선택됨</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-sky-100 dark:bg-sky-900/30" />
          <span>선택 범위</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-600 line-through" />
          <span>예약 불가</span>
        </div>
      </div>
    </div>
  );
}
