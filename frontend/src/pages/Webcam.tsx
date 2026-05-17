import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { MountainIcon } from '../components/Icons';
import { useVertical } from '../hooks/useVertical';

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

  useEffect(() => {
    api<WebcamItem[]>('/webcams')
      .then(d => setWebcams(Array.isArray(d) ? d : []))
      .catch(() => setWebcams([]))
      .finally(() => setLoading(false));
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

      <p className="text-xs text-gray-500">스키장을 선택하면 실시간 웹캠을 볼 수 있습니다.</p>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>
      ) : webcams.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">웹캠 정보가 없어요.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {webcams.map((cam) => {
            const hasStream = cam.camCount > 0;
            const cardContent = (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700">
                    <MountainIcon size={22} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{cam.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{cam.region}</span>
                      <span className="text-[10px] text-gray-500">
                        {cam.slopes}면{cam.elevation ? ` · ${cam.elevation}` : ''}
                      </span>
                      {hasStream ? (
                        <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium">{cam.camCount}캠</span>
                      ) : (
                        <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">외부 링크</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasStream ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                      <span className="text-xs text-gray-500">LIVE</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">공식사이트</span>
                  )}
                  <span className="text-gray-500">›</span>
                </div>
              </>
            );

            const className = "card rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all active:scale-[0.99]";

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
