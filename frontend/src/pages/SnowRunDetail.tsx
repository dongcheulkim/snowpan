// 스노우런 상세 — 나이키런 스타일 지도 + 통계.
// OSM 타일 (키 없이 무료). Leaflet 직접 사용 (react-leaflet RC 호환성 회피).

import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface RunDetail {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  distanceM: number;
  verticalDropM: number;
  maxSpeedKmh: number | null;
  avgSpeedKmh: number | null;
  resortId: string | null;
  source: string;
  validated: boolean;
  pointsAwarded: number;
  trackJson: { lat: number; lng: number; alt?: number | null; t?: number }[] | null;
}

const fmtSec = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const SnowRunDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!id) return;
    document.title = '런 상세 - 스노우판';
    api<RunDetail>(`/snow-runs/${id}`)
      .then(setRun)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  // 지도 초기화 + Polyline.
  useEffect(() => {
    if (!run || !mapRef.current) return;
    const track = run.trackJson;
    if (!track || track.length < 2) return;

    // 이전 인스턴스 정리.
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const coords: [number, number][] = track.map((p) => [p.lat, p.lng]);
    const bounds = L.latLngBounds(coords);

    const map = L.map(mapRef.current).fitBounds(bounds, { padding: [20, 20] });
    mapInstanceRef.current = map;

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // 경로 폴리라인 (청록색, 두꺼움).
    L.polyline(coords, { color: '#0F172A', weight: 5, opacity: 0.85, lineJoin: 'round' }).addTo(map);

    // 시작/종점 마커.
    L.circleMarker(coords[0], { radius: 7, color: '#fff', weight: 3, fillColor: '#059669', fillOpacity: 1 })
      .addTo(map)
      .bindTooltip('출발', { permanent: false, direction: 'top' });
    L.circleMarker(coords[coords.length - 1], { radius: 7, color: '#fff', weight: 3, fillColor: '#DC2626', fillOpacity: 1 })
      .addTo(map)
      .bindTooltip('도착', { permanent: false, direction: 'top' });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [run]);

  if (loading) {
    return <div className="min-h-screen bg-sky-50 flex items-center justify-center text-gray-500">불러오는 중...</div>;
  }
  if (error || !run) {
    return (
      <div className="min-h-screen bg-sky-50 px-4 pt-10">
        <p className="text-center text-gray-600 mb-4">{error || '런을 찾을 수 없습니다.'}</p>
        <button onClick={() => navigate('/snow-run')} className="block mx-auto px-4 py-2 text-sm text-white bg-gray-900 rounded-lg">
          돌아가기
        </button>
      </div>
    );
  }

  const hasTrack = run.trackJson && run.trackJson.length >= 2;

  return (
    <div className="min-h-screen bg-sky-50 pb-10">
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <Link to="/snow-run" className="text-xs text-gray-600">← 뒤로</Link>
        <Link to={`/snow-run/${run.id}/share`} className="text-xs font-bold text-white bg-gray-900 px-3 py-1.5 rounded-lg">
          📷 공유 카드
        </Link>
      </div>

      {/* 지도 */}
      {hasTrack ? (
        <div ref={mapRef} className="w-full h-72 bg-gray-200" />
      ) : (
        <div className="w-full h-72 bg-gray-100 flex items-center justify-center">
          <p className="text-sm text-gray-500">경로 데이터가 없습니다 (구버전 런)</p>
        </div>
      )}

      {/* 통계 */}
      <div className="px-4 pt-5">
        <div className="bg-snow border-2 border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">
              {new Date(run.startedAt).toLocaleString('ko-KR', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
              })}
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${run.validated ? 'bg-mint/10 text-mint' : 'bg-gray-200 text-gray-600'}`}>
              {run.validated ? '검증 완료' : '미검증'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-gray-500">거리</p>
              <p className="text-2xl font-black text-gray-900">{(run.distanceM / 1000).toFixed(2)}<span className="text-base font-bold text-gray-500 ml-1">km</span></p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">낙차</p>
              <p className="text-2xl font-black text-gray-900">{run.verticalDropM}<span className="text-base font-bold text-gray-500 ml-1">m</span></p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">시간</p>
              <p className="text-2xl font-black text-gray-900">{fmtSec(run.durationSec)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">최고 속도</p>
              <p className="text-2xl font-black text-gray-900">
                {run.maxSpeedKmh ? run.maxSpeedKmh.toFixed(0) : '—'}
                <span className="text-base font-bold text-gray-500 ml-1">km/h</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">평균 속도</p>
              <p className="text-2xl font-black text-gray-900">
                {run.avgSpeedKmh ? run.avgSpeedKmh.toFixed(0) : '—'}
                <span className="text-base font-bold text-gray-500 ml-1">km/h</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">적립 포인트</p>
              <p className={`text-2xl font-black ${run.pointsAwarded > 0 ? 'text-mint' : 'text-gray-400'}`}>
                {run.pointsAwarded > 0 ? `+${run.pointsAwarded}` : '—'}
                <span className="text-base font-bold text-gray-500 ml-1">P</span>
              </p>
            </div>
          </div>

          {run.resortId && (
            <p className="text-[11px] text-gray-500 mt-4 pt-3 border-t border-gray-100">
              감지된 스키장: <span className="font-medium text-gray-700">{run.resortId}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnowRunDetail;
