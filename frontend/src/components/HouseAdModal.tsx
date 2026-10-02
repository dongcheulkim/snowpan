import { useEffect, useState } from 'react';
import { api, imageUrl } from '../api';

// 웹용 "광고 보고 끌어올리기" — 입점 광고주 카드(피드 광고·쿠팡 카드)를 5초 보여주고 끌어올리기 버튼을 연다 (2026-10-02).
// 앱에선 애드몹 보상형 영상(utils/rewardedAd.ts)이 먼저 뜨고, 영상이 안 뜰 때만 이 모달로 넘어온다.
interface HouseAd { kind: 'booking' | 'coupang'; id: string; title: string; description?: string | null; image?: string | null; url: string; price?: number | null }
const SECONDS = 5;

export default function HouseAdModal({ onDone, onClose }: { onDone: (adId: string) => void; onClose: () => void }) {
  const [ad, setAd] = useState<HouseAd | null | undefined>(undefined);
  const [left, setLeft] = useState(SECONDS);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<{ id: string; title: string; description: string; url: string; image: string | null }[]>('/ad-booking/active?slotType=feed&category=used').catch(() => []),
      api<{ id: string; title: string; image: string | null; price: number | null; link: string }[]>('/coupang-ads').catch(() => []),
    ]).then(([bk, cp]) => {
      if (cancelled) return;
      const pool: HouseAd[] = [
        ...(Array.isArray(bk) ? bk : []).map((b) => ({ kind: 'booking' as const, id: b.id, title: b.title, description: b.description, image: b.image, url: b.url })),
        ...(Array.isArray(cp) ? cp : []).map((c) => ({ kind: 'coupang' as const, id: c.id, title: c.title, image: c.image, url: c.link, price: c.price })),
      ];
      setAd(pool.length ? pool[Math.floor(Math.random() * pool.length)] : null);
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!ad) return;
    const t = setInterval(() => setLeft((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [ad]);
  // 광고가 하나도 없으면 바로 끌어올리기 허용 (광고주가 없는 건 손님 잘못이 아님)
  useEffect(() => { if (ad === null) onDone('none'); }, [ad, onDone]);

  if (ad === undefined || ad === null) return null;
  const ready = left === 0;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="px-4 pt-4 flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-500">{ad.kind === 'coupang' ? '쿠팡 광고' : '광고'} · 끝까지 보면 끌어올리기 1회</span>
          <button onClick={onClose} className="text-xs text-gray-500">닫기</button>
        </div>
        <a href={ad.url} target="_blank" rel="noopener noreferrer sponsored" className="block" onClick={() => api(ad.kind === 'coupang' ? `/coupang-ads/${ad.id}/click` : `/ad-booking/${ad.id}/click`, { method: 'POST' }).catch(() => {})}>
          <div className="mt-3 h-44 bg-gray-100 overflow-hidden">{ad.image && <img src={imageUrl(ad.image, 800)} alt={ad.title} className="w-full h-full object-cover" />}</div>
          <div className="px-4 py-3">
            <p className="text-sm font-bold text-gray-900">{ad.title}</p>
            {ad.price ? <p className="text-base font-bold text-gray-900 mt-0.5">{ad.price.toLocaleString()}원</p> : ad.description ? <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ad.description}</p> : null}
          </div>
        </a>
        <div className="px-4 pb-4">
          <button onClick={() => onDone(ad.id)} disabled={!ready} className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40">
            {ready ? '끌어올리기' : `${left}초 뒤 끌어올리기`}
          </button>
          {ad.kind === 'coupang' && <p className="text-[10px] text-gray-400 text-center mt-2">쿠팡 파트너스 활동의 일환으로 수수료를 받을 수 있습니다.</p>}
        </div>
      </div>
    </div>
  );
}
