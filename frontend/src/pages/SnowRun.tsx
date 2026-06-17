import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface Stats {
  allTime: {
    runCount: number;
    totalDistanceKm: string;
    totalVerticalDropM: number;
    totalDurationSec: number;
    totalPoints: number;
    maxSpeedKmh: number | null;
  };
  season: {
    year: string;
    runCount: number;
    totalDistanceKm: string;
    totalVerticalDropM: number;
    totalPoints: number;
  };
  today: {
    runCount: number;
    remainingRewardable: number;
  };
}

interface RunItem {
  id: string;
  startedAt: string;
  durationSec: number;
  distanceM: number;
  verticalDropM: number;
  maxSpeedKmh: number | null;
  source: string;
  validated: boolean;
  pointsAwarded: number;
}

const SnowRun = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = '스노우런 - 스노우판';
    Promise.all([
      api<Stats>('/snow-runs/stats'),
      api<{ items: RunItem[] }>('/snow-runs/my?limit=10'),
    ])
      .then(([s, r]) => {
        setStats(s);
        setRuns(r.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDuration = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-sky-50 pb-10">
      <div className="px-4 pt-5">
        {/* 상단 — 시즌 요약 + 시작 버튼 */}
        <div className="bg-gray-900 text-white rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] text-gray-300">{stats?.season.year || '—'} 시즌</p>
              <p className="text-3xl font-black mt-0.5">
                {stats?.season.runCount ?? '—'}
                <span className="text-base font-bold ml-1 text-gray-300">런</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-300">누적 적립</p>
              <p className="text-xl font-black">
                {(stats?.season.totalPoints ?? 0).toLocaleString()}
                <span className="text-sm font-bold ml-1 text-gray-300">P</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 mb-4">
            <div className="bg-gray-800 rounded-lg p-2.5">
              <p className="text-[10px] text-gray-400">시즌 거리</p>
              <p className="text-sm font-bold mt-0.5">{stats?.season.totalDistanceKm || '0.0'} km</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-2.5">
              <p className="text-[10px] text-gray-400">시즌 낙차</p>
              <p className="text-sm font-bold mt-0.5">{(stats?.season.totalVerticalDropM || 0).toLocaleString()} m</p>
            </div>
          </div>

          <Link
            to="/snow-run/record"
            className="block w-full text-center bg-white text-gray-900 text-base font-black py-3.5 rounded-lg active:scale-95 transition-transform"
          >
            ▶ 런 시작
          </Link>
          <p className="text-[11px] text-gray-400 text-center mt-2">
            오늘 적립 가능 {stats?.today.remainingRewardable ?? 10}회 남음 (1런 100P)
          </p>
        </div>

        {/* 누적 기록 */}
        <div className="mt-4 bg-snow border-2 border-gray-200 rounded-2xl p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">누적 기록</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-500">총 런</p>
              <p className="text-base font-bold text-gray-900">{stats?.allTime.runCount ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">총 거리</p>
              <p className="text-base font-bold text-gray-900">{stats?.allTime.totalDistanceKm || '0.0'} km</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">총 낙차</p>
              <p className="text-base font-bold text-gray-900">
                {(stats?.allTime.totalVerticalDropM || 0).toLocaleString()} m
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">최고 속도</p>
              <p className="text-base font-bold text-gray-900">
                {stats?.allTime.maxSpeedKmh ? `${stats.allTime.maxSpeedKmh.toFixed(1)} km/h` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* 최근 런 */}
        <div className="mt-4 bg-snow border-2 border-gray-200 rounded-2xl p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">최근 런</h2>
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-6">불러오는 중...</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              아직 기록이 없습니다. 위의 "런 시작"을 눌러보세요.
            </p>
          ) : (
            <ul className="space-y-0">
              {runs.map((r, idx) => (
                <li key={r.id} className={idx !== runs.length - 1 ? 'border-b border-gray-100' : ''}>
                  <Link
                    to={`/snow-run/${r.id}`}
                    className="flex items-start justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-gray-900">
                          {(r.distanceM / 1000).toFixed(2)} km
                        </span>
                        <span className="text-[10px] text-gray-500">·</span>
                        <span className="text-[11px] text-gray-600">낙차 {r.verticalDropM}m</span>
                        <span className="text-[10px] text-gray-500">·</span>
                        <span className="text-[11px] text-gray-600">{formatDuration(r.durationSec)}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {new Date(r.startedAt).toLocaleString('ko-KR', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {!r.validated && <span className="ml-2 text-coral">미검증</span>}
                      </p>
                    </div>
                    <span className={`text-sm font-bold ml-3 flex-shrink-0 ${r.pointsAwarded > 0 ? 'text-mint' : 'text-gray-400'}`}>
                      {r.pointsAwarded > 0 ? `+${r.pointsAwarded}P` : '—'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnowRun;
