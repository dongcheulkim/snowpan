import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { MountainIcon } from '../components/Icons';
import { useVertical } from '../hooks/useVertical';
import { RowListSkeleton } from '../components/Skeleton';

interface WebcamItem {
  id: string;
  slug: string;
  name: string;
  region: string;
  slopes: number;
  elevation: string | null;
  camCount: number;
  externalUrl: string | null;
}

const Webcam = () => {
  const vertical = useVertical();
  const [webcams, setWebcams] = useState<WebcamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [temps, setTemps] = useState<Record<string, number>>({});

  useEffect(() => {
    api<WebcamItem[]>('/webcams')
      .then(d => setWebcams(Array.isArray(d) ? d : []))
      .catch(() => setWebcams([]))
      .finally(() => setLoading(false));
    // 리조트 현재 기온 (10분 서버 캐시) — 실패해도 표시만 생략
    api<Record<string, number>>('/webcams/weather')
      .then(setTemps)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{vertical.pageLabels?.webcam || '실시간 웹캠'}</h1>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500">{vertical.venue || '스키장'}을 선택하면 실시간 웹캠을 볼 수 있습니다.</p>

      {loading ? (
        <RowListSkeleton count={5} />
      ) : webcams.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">웹캠 정보가 없어요.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {webcams.map((cam) => {
            const hasStream = cam.camCount > 0;
            const cardContent = (
              <>
                {/* 상단 설산 블록 — LIVE·기온 배지 오버레이 */}
                <div className="relative h-24 bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                  <MountainIcon size={30} />
                  {hasStream ? (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold text-white bg-green-500/90 px-1.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                    </span>
                  ) : (
                    <span className="absolute top-2 left-2 text-[10px] font-medium text-white/90 bg-black/40 px-1.5 py-0.5 rounded">외부 링크</span>
                  )}
                  {temps[cam.slug] !== undefined && (
                    <span className={`absolute top-2 right-2 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full ${temps[cam.slug] <= 0 ? 'bg-blue-600' : 'bg-black/50'}`}>
                      {temps[cam.slug]}°
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-bold text-gray-900 leading-tight truncate">{cam.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{cam.region}</span>
                    <span className="text-[10px] text-gray-500 truncate">{cam.slopes}면{hasStream ? ` · ${cam.camCount}캠` : ''}</span>
                  </div>
                </div>
              </>
            );

            const className = "card rounded-2xl overflow-hidden hover:shadow-md transition-all active:scale-[0.98]";

            return hasStream ? (
              <Link key={cam.id} to={`/webcam/${cam.slug}`} className={className}>
                {cardContent}
              </Link>
            ) : (
              <a key={cam.id} href={cam.externalUrl || '#'} target="_blank" rel="noopener noreferrer" className={className}>
                {cardContent}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Webcam;
