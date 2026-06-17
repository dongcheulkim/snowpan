// 스트라바 스타일 공유 카드 — 사진 + 런 통계 오버레이.
// Instagram 비율(1080x1350, 4:5) PNG 생성. 다운로드 또는 Web Share API.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

interface RunDetail {
  id: string;
  startedAt: string;
  durationSec: number;
  distanceM: number;
  verticalDropM: number;
  maxSpeedKmh: number | null;
  pointsAwarded: number;
  resortId: string | null;
}

const CANVAS_W = 1080;
const CANVAS_H = 1350;

const fmtSec = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const SnowRunShare = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [run, setRun] = useState<RunDetail | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    document.title = '공유 카드 만들기 - 스노우판';
    api<RunDetail>(`/snow-runs/${id}`)
      .then(setRun)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  // 사진이 바뀌면 캔버스에 자동 합성.
  useEffect(() => {
    if (!photoUrl || !run || !canvasRef.current) return;
    composeImage(photoUrl, run);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUrl, run]);

  const composeImage = async (photo: string, r: RunDetail) => {
    setBusy(true);
    try {
      const canvas = canvasRef.current!;
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = await loadImage(photo);
      // cover-fit: 사진을 캔버스에 꽉 차게 (잘리는 부분은 가운데 정렬).
      const ratio = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const dx = (CANVAS_W - w) / 2;
      const dy = (CANVAS_H - h) / 2;
      ctx.drawImage(img, dx, dy, w, h);

      // 상단 로고 띠 (약간의 어두운 그라데이션).
      const topGrad = ctx.createLinearGradient(0, 0, 0, 200);
      topGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, CANVAS_W, 200);

      ctx.fillStyle = '#fff';
      ctx.font = '900 56px "Pretendard", system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SNOWPAN', 60, 110);

      // 하단 어두운 그라데이션 (통계 영역 가독성).
      const bottomGrad = ctx.createLinearGradient(0, CANVAS_H * 0.45, 0, CANVAS_H);
      bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
      bottomGrad.addColorStop(0.4, 'rgba(15,23,42,0.65)');
      bottomGrad.addColorStop(1, 'rgba(15,23,42,0.95)');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, CANVAS_H * 0.45, CANVAS_W, CANVAS_H * 0.55);

      // === 통계 ===
      const baseY = CANVAS_H - 360;

      // 날짜 + 스키장
      const date = new Date(r.startedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '500 32px "Pretendard", system-ui, sans-serif';
      ctx.fillText(`${date}${r.resortId ? ` · ${r.resortId}` : ''}`, 60, baseY);

      // 큰 숫자: 거리 / 낙차
      ctx.fillStyle = '#fff';
      ctx.font = '900 140px "Pretendard", system-ui, sans-serif';
      const distKm = (r.distanceM / 1000).toFixed(2);
      const distText = `${distKm}`;
      ctx.fillText(distText, 60, baseY + 150);
      const distW = ctx.measureText(distText).width;
      ctx.font = '700 56px "Pretendard", system-ui, sans-serif';
      ctx.fillStyle = '#D1D5DB';
      ctx.fillText('km', 60 + distW + 16, baseY + 150);

      // 우측: 낙차
      ctx.fillStyle = '#fff';
      ctx.font = '900 140px "Pretendard", system-ui, sans-serif';
      const dropText = `${r.verticalDropM}`;
      ctx.textAlign = 'right';
      ctx.fillText(dropText, CANVAS_W - 60 - 96, baseY + 150);
      ctx.textAlign = 'left';
      ctx.font = '700 56px "Pretendard", system-ui, sans-serif';
      ctx.fillStyle = '#D1D5DB';
      ctx.fillText('m', CANVAS_W - 60 - 88, baseY + 150);

      // 라벨 (큰 숫자 위)
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '700 28px "Pretendard", system-ui, sans-serif';
      ctx.fillText('거리', 60, baseY + 60);
      ctx.textAlign = 'right';
      ctx.fillText('낙차', CANVAS_W - 60, baseY + 60);
      ctx.textAlign = 'left';

      // 하단 라인: 시간 · 최고속도 · 적립
      const lineY = baseY + 240;
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '600 28px "Pretendard", system-ui, sans-serif';
      ctx.fillText('시간', 60, lineY);
      ctx.fillText('최고 속도', 410, lineY);
      ctx.fillText('적립', 800, lineY);

      ctx.fillStyle = '#fff';
      ctx.font = '900 56px "Pretendard", system-ui, sans-serif';
      ctx.fillText(fmtSec(r.durationSec), 60, lineY + 60);
      ctx.fillText(r.maxSpeedKmh ? `${r.maxSpeedKmh.toFixed(0)} km/h` : '—', 410, lineY + 60);
      ctx.fillStyle = r.pointsAwarded > 0 ? '#34D399' : '#9CA3AF';
      ctx.fillText(r.pointsAwarded > 0 ? `+${r.pointsAwarded}P` : '—', 800, lineY + 60);

      const url = canvas.toDataURL('image/png', 0.95);
      setPreviewUrl(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoUrl(URL.createObjectURL(f));
  };

  const onDownload = () => {
    if (!previewUrl || !run) return;
    const a = document.createElement('a');
    a.download = `snowpan-${run.id.slice(0, 8)}.png`;
    a.href = previewUrl;
    a.click();
  };

  const onShare = async () => {
    if (!previewUrl) return;
    try {
      const blob = await (await fetch(previewUrl)).blob();
      const file = new File([blob], 'snowpan.png', { type: 'image/png' });
      // 브라우저가 Web Share API + 파일 공유 지원할 때만.
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean; share?: (data: { files: File[]; title?: string }) => Promise<void> };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: '오늘의 스노우런' });
      } else {
        alert('이 브라우저는 직접 공유를 지원하지 않아요. 다운로드 후 SNS에 올려주세요.');
        onDownload();
      }
    } catch (e) {
      // 사용자가 공유 취소한 경우 등.
      if ((e as Error).name !== 'AbortError') alert((e as Error).message);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-900 text-white rounded-lg">돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 pb-10">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-xs text-gray-600">← 뒤로</button>
        <span className="text-sm font-bold text-gray-900">공유 카드 만들기</span>
        <div className="w-12" />
      </div>

      <div className="px-4">
        {/* 미리보기 */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-[4/5] flex items-center justify-center">
          {previewUrl ? (
            <img src={previewUrl} alt="공유 카드" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-gray-400 px-6">
              <p className="text-5xl mb-3">📷</p>
              <p className="text-sm">사진을 선택하면 오늘 기록이 자동으로 합성됩니다</p>
            </div>
          )}
        </div>

        {/* 숨겨진 캔버스 */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* 사진 선택 */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPickFile}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full mt-4 bg-white border-2 border-gray-200 text-gray-900 font-bold py-3.5 rounded-xl active:scale-95 transition-transform"
          disabled={busy}
        >
          {photoUrl ? '🔄 다른 사진 선택' : '📷 사진 선택'}
        </button>

        {/* 액션 */}
        {previewUrl && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={onDownload}
              className="bg-gray-900 text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform"
            >
              💾 저장
            </button>
            <button
              onClick={onShare}
              className="bg-mint text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform"
            >
              🔗 공유
            </button>
          </div>
        )}

        <p className="text-[11px] text-gray-500 text-center mt-3">
          1080×1350 (인스타 4:5) PNG · 자동 합성
        </p>
      </div>
    </div>
  );
};

export default SnowRunShare;
