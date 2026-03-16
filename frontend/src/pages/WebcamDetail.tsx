import { useParams, Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';

interface CamInfo {
  label: string;
  stream: string;
}

interface ResortData {
  name: string;
  region: string;
  url: string;
  cameras?: CamInfo[];
}

const webcamData: Record<string, ResortData> = {
  yongpyong: {
    name: '용평리조트', region: '강원',
    url: 'https://www.yongpyong.co.kr/kor/guide/realTimeNews/ypResortWebcam.do',
    cameras: [
      { label: '발왕산 氣 스카이워크', stream: 'https://live.yongpyong.co.kr/Ycam1/cam01.stream/playlist.m3u8' },
      { label: '발왕산 천년주목숲길', stream: 'https://live.yongpyong.co.kr/Ycam1/cam02.stream/playlist.m3u8' },
      { label: '옐로우 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam03.stream/playlist.m3u8' },
      { label: '메가그린 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam04.stream/playlist.m3u8' },
      { label: '베이스전경 / 레드 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam05.stream/playlist.m3u8' },
      { label: '레인보우 전경', stream: 'https://live.yongpyong.co.kr/Ycam1/cam06.stream/playlist.m3u8' },
      { label: '레인보우 정상', stream: 'https://live.yongpyong.co.kr/Ycam1/cam07.stream/playlist.m3u8' },
      { label: '모나 용평 진입로', stream: 'https://live.yongpyong.co.kr/Ycam1/cam08.stream/playlist.m3u8' },
      { label: '골드 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam09.stream/playlist.m3u8' },
      { label: '실버 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam10.stream/playlist.m3u8' },
      { label: '핑크 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam11.stream/playlist.m3u8' },
      { label: '뉴레드 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam12.stream/playlist.m3u8' },
      { label: '뉴골드 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam13.stream/playlist.m3u8' },
      { label: '드래곤파크 전경', stream: 'https://live.yongpyong.co.kr/Ycam1/cam14.stream/playlist.m3u8' },
      { label: '레인보우 파라다이스', stream: 'https://live.yongpyong.co.kr/Ycam1/cam15.stream/playlist.m3u8' },
      { label: 'CAM 16', stream: 'https://live.yongpyong.co.kr/Ycam1/cam16.stream/playlist.m3u8' },
      { label: 'CAM 17', stream: 'https://live.yongpyong.co.kr/Ycam1/cam17.stream/playlist.m3u8' },
      { label: 'CAM 18', stream: 'https://live.yongpyong.co.kr/Ycam1/cam18.stream/playlist.m3u8' },
      { label: 'CAM 19', stream: 'https://live.yongpyong.co.kr/Ycam1/cam19.stream/playlist.m3u8' },
      { label: 'CAM 20', stream: 'https://live.yongpyong.co.kr/Ycam1/cam20.stream/playlist.m3u8' },
    ],
  },
  wellihilli: {
    name: '웰리힐리파크', region: '강원',
    url: 'https://www.wellihillipark.com/home/customer/webcam',
    cameras: [
      { label: '알파 슬로프', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam02.stream/playlist.m3u8' },
      { label: '베이스 광장', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam03.stream/playlist.m3u8' },
      { label: '스키장 전경', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam04.stream/playlist.m3u8' },
      { label: '정상 광장', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam05.stream/playlist.m3u8' },
      { label: 'D+ 슬로프', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam06.stream/playlist.m3u8' },
      { label: '워터플래닛', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam07.stream/playlist.m3u8' },
    ],
  },
  konjiam: {
    name: '곤지암리조트', region: '경기',
    url: 'https://www.konjiamresort.co.kr/ski/liveCam.dev',
    cameras: [
      { label: '정상 휴게소', stream: 'http://konjiam.live.cdn.cloudn.co.kr/konjiam/cam01.stream/playlist.m3u8' },
      { label: '정상부 슬로프', stream: 'http://konjiam.live.cdn.cloudn.co.kr/konjiam/cam02.stream/playlist.m3u8' },
      { label: '초중급 베이스', stream: 'http://konjiam.live.cdn.cloudn.co.kr/konjiam/cam03.stream/playlist.m3u8' },
      { label: '중상급 베이스', stream: 'http://konjiam.live.cdn.cloudn.co.kr/konjiam/cam04.stream/playlist.m3u8' },
      { label: '중간 슬로프', stream: 'http://konjiam.live.cdn.cloudn.co.kr/konjiam/cam05.stream/playlist.m3u8' },
    ],
  },
  phoenix: { name: '휘닉스평창', region: '강원', url: 'https://phoenixhnr.co.kr/page/pyeongchang/guide/operation/sketchMovie' },
  high1: { name: '하이원리조트', region: '강원', url: 'https://www.high1.com/ski/slopeView.do?key=748&mode=p' },
  vivaldi: { name: '비발디파크', region: '강원', url: 'https://www.sonohotelsresorts.com/daemyung.vp.skiworld.04_02_04.ds/dmparse.dm' },
  elysian: { name: '엘리시안강촌', region: '강원', url: 'https://www.elysian.co.kr/gangchon/ski/ski_slope03.asp' },
  jisan: { name: '지산리조트', region: '경기', url: 'https://www.jisanresort.co.kr/w/ski/slopes/webcam_init.asp' },
  muju: { name: '무주덕유산', region: '전북', url: 'https://www.mdysresort.com/guide/webcam.asp' },
  oak: { name: '오크밸리', region: '강원', url: 'https://oakvalley.co.kr/ski/introduction/realtime' },
  o2: { name: '오투리조트', region: '강원', url: 'https://www.o2resort.com/GDE/webcam.jsp' },
  alpensia: { name: '알펜시아', region: '강원', url: 'https://www.alpensia.com/guide/web-cam.do' },
  eden: { name: '에덴밸리', region: '경남', url: 'https://www.edenvalley.co.kr/CS/cam_pop1.asp' },
};

const HlsPlayer = ({ src, autoPlay = true }: { src: string; autoPlay?: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(false);

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
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src;
      if (autoPlay) video.play().catch(() => {});
      return () => { video.src = ''; };
    } else {
      setError(true);
    }
  }, [src, autoPlay]);

  if (error) {
    return (
      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-2 text-white min-h-[200px]">
        <span className="text-2xl">📡</span>
        <span className="text-xs text-gray-400">스트림을 불러올 수 없습니다</span>
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
          <Link to="/webcam" className="text-gray-400 hover:text-gray-900 text-lg transition-colors">←</Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cam.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{cam.region}</span>
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

          <p className="text-[11px] text-gray-400 text-center">
            {cam.cameras!.length}개 카메라 · {currentStream!.label}
          </p>
        </>
      ) : (
        <>
          {/* Fallback: iframe */}
          <div className="card rounded-2xl overflow-hidden">
            {iframeFailed ? (
              <div className="h-[500px] bg-gray-50 flex flex-col items-center justify-center gap-4">
                <div className="text-5xl">🚫</div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-1">외부 임베딩이 차단되었습니다</p>
                  <p className="text-xs text-gray-400">공식 사이트에서 직접 확인해주세요</p>
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
          <p className="text-[11px] text-gray-400 text-center">
            이 스키장은 자체 스트림이 지원되지 않아 공식 사이트를 표시합니다.
          </p>
        </>
      )}
    </div>
  );
};

export default WebcamDetail;
