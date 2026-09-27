// 실시간 웹캠 플레이어 — 웹캠 페이지(WebcamDetail)와 스키장 투어 상세(OverseasDetail)가 같이 쓴다 (2026-09-27 분리).
// stream 형식: HLS(.m3u8) | youtube:VIDEOID | youtube.com/embed/live_stream?channel=UC... | youtu.be/ID 등 | iframe:URL | rtsp.me/rtsp.ru embed
// hls.js 가 무거워서(520KB) 이 파일은 React.lazy 로만 불러온다.
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { LivecamIcon } from './CategoryIcons';

// 유튜브 판별 → 임베드 src 변환.
// 지원: youtube:VIDEOID | youtu.be/ID | watch?v=ID | /live/ID | /embed/ID
//      | embed/live_stream?channel=UC... (채널 상시 라이브 — 방송 ID 가 바뀌어도 유효)
function parseYouTubeEmbed(stream: string): string | null {
  const params = 'autoplay=1&mute=1&playsinline=1';
  if (stream.startsWith('youtube:')) return `https://www.youtube-nocookie.com/embed/${stream.slice(8)}?${params}`;
  const ch = stream.match(/youtube\.com\/embed\/live_stream\?channel=([A-Za-z0-9_-]+)/);
  if (ch) return `https://www.youtube.com/embed/live_stream?channel=${ch[1]}&${params}`;
  const m = stream.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([A-Za-z0-9_-]{6,})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?${params}` : null;
}

// 일반 임베드 iframe — rtsp.me/rtsp.ru 같은 "임베드 전용" 웹캠 서비스 (에덴밸리 등).
function parseIframeEmbed(stream: string): string | null {
  if (stream.startsWith('iframe:')) return stream.slice(7);
  if (/https:\/\/rtsp\.(me|ru)\/embed\//.test(stream)) return stream;
  return null;
}

const YouTubePlayer = ({ src }: { src: string }) => (
  <iframe
    src={src}
    className="w-full h-full border-0"
    title="실시간 웹캠"
    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
    allowFullScreen
  />
);

const HlsPlayer = ({ src, autoPlay = true, fallbackUrl, fallbackName }: { src: string; autoPlay?: boolean; fallbackUrl?: string | null; fallbackName?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const resetTimer = setTimeout(() => setError(false), 0);

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { if (autoPlay) video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) setError(true); });
      return () => { clearTimeout(resetTimer); hls.destroy(); hlsRef.current = null; };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 네이티브 HLS — 오프시즌 404 스트림도 오프라인 폴백 UI 가 뜨도록 error 감지
      const onErr = () => setError(true);
      video.addEventListener('error', onErr);
      video.src = src;
      if (autoPlay) video.play().catch(() => {});
      return () => { clearTimeout(resetTimer); video.removeEventListener('error', onErr); video.removeAttribute('src'); video.load(); };
    } else {
      clearTimeout(resetTimer);
      const errorTimer = setTimeout(() => setError(true), 0);
      return () => clearTimeout(errorTimer);
    }
  }, [src, autoPlay]);

  if (error) {
    return (
      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-2 text-white min-h-[200px] px-4">
        <LivecamIcon size={28} className="text-gray-500" />
        <span className="text-sm text-gray-300 font-medium">지금은 방송 중이 아니에요</span>
        <span className="text-[11px] text-gray-500 text-center">스키 시즌 중에만 방송되는 카메라일 수 있어요</span>
        {fallbackUrl && (
          <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="mt-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-xs font-bold text-white">
            {fallbackName || '공식'} 웹캠 페이지 열기
          </a>
        )}
      </div>
    );
  }

  return <video ref={videoRef} className="w-full h-full bg-black object-contain" controls muted playsInline />;
};

// stream 종류를 알아서 골라 재생. 부모가 크기(aspect)를 정한다.
export default function WebcamPlayer({ stream, fallbackUrl, fallbackName }: { stream: string; fallbackUrl?: string | null; fallbackName?: string }) {
  const yt = parseYouTubeEmbed(stream);
  if (yt) return <YouTubePlayer src={yt} />;
  const frame = parseIframeEmbed(stream);
  if (frame) return <iframe src={frame} className="w-full h-full border-0" title="실시간 웹캠" allow="autoplay; fullscreen" allowFullScreen />;
  return <HlsPlayer src={stream} fallbackUrl={fallbackUrl} fallbackName={fallbackName} />;
}
