import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api';
import { ProhibitIcon } from '../components/Icons';
import HScroll from '../components/HScroll';
import WebcamPlayer from '../components/WebcamPlayer';

interface CamInfo { label: string; stream: string; liveNow?: boolean | null; liveVideoId?: string | null }
interface WebcamData {
  id: string;
  slug: string;
  name: string;
  region: string;
  slopes: number;
  elevation: string | null;
  camCount: number;
  cameras: CamInfo[] | null;
  externalUrl: string | null;
}

const WebcamDetail = () => {
  const { id } = useParams();
  const [selectedCam, setSelectedCam] = useState(0);
  const [cam, setCam] = useState<WebcamData | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [seenId, setSeenId] = useState(id);
  if (seenId !== id) { setSeenId(id); setLoading(!!id); }

  useEffect(() => {
    if (!id) return;
    api<WebcamData>(`/webcams/${encodeURIComponent(id)}`)
      .then(setCam)
      .catch(() => setCam(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500 text-sm animate-fade-in">로딩 중...</div>;
  }

  if (!cam) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 mb-2">스키장을 찾을 수 없습니다</h2>
        <Link to="/webcam" className="text-gray-500 hover:text-gray-900 text-sm">← 목록으로 돌아가기</Link>
      </div>
    );
  }

  const cameras = cam.cameras || [];
  const hasStreams = cameras.length > 0;
  const currentStream = hasStreams ? cameras[selectedCam] : null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/webcam" className="text-gray-500 hover:text-gray-900 text-lg transition-colors">←</Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cam.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{cam.region}</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[10px] text-red-500 font-medium">LIVE</span>
              {hasStreams && (
                <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium">자체 재생</span>
              )}
            </div>
          </div>
        </div>
        <a
          href={cam.externalUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors border border-gray-200"
        >
          공식 사이트
        </a>
      </div>

      {hasStreams ? (
        <>
          {/* Camera selector tabs */}
          <HScroll className="overflow-x-auto pb-1">
            <div className="flex gap-1.5 min-w-max">
              {cameras.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCam(idx)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCam === idx
                      ? 'bg-accent text-white'
                      : 'bg-snow text-gray-500 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {String(idx + 1).padStart(2, '0')}. {c.label}{c.liveNow === false ? ' · 오프' : ''}
                </button>
              ))}
            </div>
          </HScroll>

          {/* Video player — 유튜브 라이브면 임베드, 아니면 HLS */}
          <div className="card rounded-2xl overflow-hidden bg-black">
            <div className="aspect-video">
              {currentStream!.liveNow === false ? (
                // 서버 확인 결과 지금 송출 없음(시즌 오프) — 플레이어 대신 안내 (유튜브·HLS 공통)
                <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-2 text-white px-4">
                  <span className="text-sm text-gray-300 font-medium">지금은 방송 중이 아니에요</span>
                  <span className="text-[11px] text-gray-500 text-center">스키 시즌 중에만 방송되는 카메라예요</span>
                  {cam.externalUrl && <a href={cam.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-xs font-bold text-white">{cam.name} 웹캠 페이지 열기</a>}
                </div>
              ) : (
                <WebcamPlayer key={currentStream!.liveVideoId || currentStream!.stream} stream={currentStream!.liveVideoId ? `youtube:${currentStream!.liveVideoId}` : currentStream!.stream} fallbackUrl={cam.externalUrl} fallbackName={cam.name} />
              )}
            </div>
          </div>

          <p className="text-[11px] text-gray-500 text-center">
            {cameras.length}개 카메라 · {currentStream!.label}
          </p>
        </>
      ) : (
        <>
          {/* 자체 스트림 없는 리조트 — 외부 사이트는 CSP·X-Frame-Options 로 임베딩이 막히므로 바로 공식 링크 안내 */}
          <div className="card rounded-2xl overflow-hidden">
            <div className="h-[320px] bg-gray-50 flex flex-col items-center justify-center gap-4">
              <ProhibitIcon size={48} className="text-gray-500" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 mb-1">이 스키장은 아직 판 안에서 재생할 수 없어요</p>
                <p className="text-xs text-gray-500">공식 사이트에서 실시간 웹캠을 확인해주세요</p>
              </div>
              <a
                href={cam.externalUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-light transition-colors"
              >
                {cam.name} 웹캠 보러가기
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WebcamDetail;
