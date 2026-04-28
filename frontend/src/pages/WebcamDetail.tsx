import { useParams, Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import webcamData from '../data/webcamData';
import { ProhibitIcon } from '../components/Icons';
import { LivecamIcon } from '../components/CategoryIcons';

const HlsPlayer = ({ src, autoPlay = true }: { src: string; autoPlay?: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const resetTimer = setTimeout(() => setError(false), 0);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setError(true);
      });

      return () => {
        clearTimeout(resetTimer);
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      if (autoPlay) video.play().catch(() => {});
      return () => { clearTimeout(resetTimer); video.src = ''; };
    } else {
      clearTimeout(resetTimer);
      const errorTimer = setTimeout(() => setError(true), 0);
      return () => clearTimeout(errorTimer);
    }
  }, [src, autoPlay]);

  if (error) {
    return (
      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-2 text-white min-h-[200px]">
        <LivecamIcon size={28} className="text-gray-500" />
        <span className="text-xs text-gray-500">스트림을 불러올 수 없습니다</span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className="w-full h-full bg-black object-contain"
      controls
      muted
      playsInline
    />
  );
};

const WebcamDetail = () => {
  const { id } = useParams();
  const [selectedCam, setSelectedCam] = useState(0);
  const [iframeFailed, setIframeFailed] = useState(false);
  const cam = id ? webcamData[id] : null;

  if (!cam) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 mb-2">스키장을 찾을 수 없습니다</h2>
        <Link to="/webcam" className="text-gray-500 hover:text-gray-900 text-sm">← 목록으로 돌아가기</Link>
      </div>
    );
  }

  const hasStreams = cam.cameras && cam.cameras.length > 0;
  const currentStream = hasStreams ? cam.cameras![selectedCam] : null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/webcam" className="text-gray-500 hover:text-gray-900 text-lg transition-colors">←</Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cam.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{cam.region}</span>
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
          href={cam.url}
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
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-1.5 min-w-max">
              {cam.cameras!.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCam(idx)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCam === idx
                      ? 'bg-accent text-white'
                      : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {String(idx + 1).padStart(2, '0')}. {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Video player */}
          <div className="card rounded-2xl overflow-hidden bg-black">
            <div className="aspect-video">
              <HlsPlayer key={currentStream!.stream} src={currentStream!.stream} />
            </div>
          </div>

          <p className="text-[11px] text-gray-500 text-center">
            {cam.cameras!.length}개 카메라 · {currentStream!.label}
          </p>
        </>
      ) : (
        <>
          {/* Fallback: iframe */}
          <div className="card rounded-2xl overflow-hidden">
            {iframeFailed ? (
              <div className="h-[500px] bg-gray-50 flex flex-col items-center justify-center gap-4">
                <ProhibitIcon size={48} className="text-gray-500" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-1">외부 임베딩이 차단되었습니다</p>
                  <p className="text-xs text-gray-500">공식 사이트에서 직접 확인해주세요</p>
                </div>
                <a
                  href={cam.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-light transition-colors"
                >
                  {cam.name} 웹캠 보러가기
                </a>
              </div>
            ) : (
              <iframe
                src={cam.url}
                className="w-full h-[500px] md:h-[600px] border-0"
                title={`${cam.name} 실시간 웹캠`}
                sandbox="allow-scripts allow-same-origin allow-popups"
                onError={() => setIframeFailed(true)}
                onLoad={(e) => {
                  try {
                    const frame = e.target as HTMLIFrameElement;
                    if (frame.contentDocument?.title === '') {
                      setIframeFailed(true);
                    }
                  } catch {
                    // Cross-origin = loaded successfully
                  }
                }}
              />
            )}
          </div>
          <p className="text-[11px] text-gray-500 text-center">
            이 스키장은 자체 스트림이 지원되지 않아 공식 사이트를 표시합니다.
          </p>
        </>
      )}
    </div>
  );
};

export default WebcamDetail;
