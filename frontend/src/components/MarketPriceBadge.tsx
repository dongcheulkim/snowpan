import { useEffect, useState } from 'react';
import { api } from '../api';

interface MarketStats {
  available: boolean;
  count: number;
  avg?: number;
  median?: number;
  min?: number;
  max?: number;
  p25?: number;
  p75?: number;
  windowDays?: number;
}

interface Props {
  subcategory: string | null | undefined;
  brand?: string | null;
  price: number;
  // 'badge' = UsedDetail 가격 옆 배지, 'inline' = UsedRegister 입력 도움말
  variant?: 'badge' | 'inline';
}

const subcatLabels: Record<string, string> = {
  ski: '스키', board: '보드', boots: '부츠', binding: '바인딩',
  helmet: '헬멧', goggles: '고글', wear: '의류', etc: '기타',
};

// 스노우판 핵심 차별화 — '시세 대비 가격' 비교는 가장 강력한 셀링 포인트라 시각적으로 충분히 강조.
export default function MarketPriceBadge({ subcategory, brand, price, variant = 'badge' }: Props) {
  const [stats, setStats] = useState<MarketStats | null>(null);

  useEffect(() => {
    if (!subcategory) return;
    let cancelled = false;
    const params = new URLSearchParams({ subcategory });
    if (brand) params.set('brand', brand);
    api<MarketStats>(`/products/market-stats?${params.toString()}`)
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [subcategory, brand]);

  if (!subcategory || !stats) return null;
  if (!stats.available || !stats.median) {
    if (variant === 'inline') {
      return (
        <p className="text-[11px] text-gray-500 mt-1">
          시세 데이터 부족 (등록 매물 {stats.count}건)
        </p>
      );
    }
    return null;
  }

  const median = stats.median;
  const ratio = price / median;
  // 톤: 시세보다 싸면 mint(긍정), 비슷하면 sky(중립), 비싸면 amber/coral(주의).
  let label: string;
  let toneBg: string;
  let toneText: string;
  let toneBorder: string;
  let toneAccent: string;
  if (ratio <= 0.85) {
    label = '시세 대비 저렴해요';
    toneBg = 'bg-emerald-50';
    toneText = 'text-emerald-700';
    toneBorder = 'border-emerald-200';
    toneAccent = 'text-emerald-600';
  } else if (ratio <= 1.15) {
    label = '시세 적정 수준';
    toneBg = 'bg-sky-50';
    toneText = 'text-sky-700';
    toneBorder = 'border-sky-200';
    toneAccent = 'text-sky-600';
  } else if (ratio <= 1.35) {
    label = '시세 대비 비싸요';
    toneBg = 'bg-amber-50';
    toneText = 'text-amber-700';
    toneBorder = 'border-amber-200';
    toneAccent = 'text-amber-600';
  } else {
    label = '시세보다 많이 비싸요';
    toneBg = 'bg-rose-50';
    toneText = 'text-rose-700';
    toneBorder = 'border-rose-200';
    toneAccent = 'text-rose-600';
  }

  const diffPct = Math.round((ratio - 1) * 100);
  const diffAbs = Math.abs(diffPct);
  const diffText = diffPct === 0 ? '시세와 동일' : diffPct > 0 ? `+${diffPct}%` : `−${diffAbs}%`;
  const scope = brand ? `${brand} ${subcatLabels[subcategory] || subcategory}` : subcatLabels[subcategory] || subcategory;
  const windowDays = stats.windowDays || 180;
  const windowMonths = Math.round(windowDays / 30);
  // 데이터 출처 — 외부 가격 비교 사이트가 아닌 본 플랫폼 자체 매물.
  const sourceTitle = `최근 ${windowDays}일간 스노우판에 등록된 ${scope} 중고 매물 ${stats.count}건의 가격 분포 (중앙값 ${median.toLocaleString()}원). 외부 시세 사이트가 아닌 본 플랫폼 거래 데이터 기반입니다.`;

  if (variant === 'inline') {
    return (
      <div className={`mt-2 rounded-xl border-2 ${toneBorder} ${toneBg} px-4 py-3`} title={sourceTitle}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-bold ${toneText}`}>{label}</span>
          <span className={`ml-auto text-base font-black ${toneAccent} font-mono`}>{diffText}</span>
        </div>
        <div className={`text-xs ${toneText} opacity-90`}>
          {scope} 시세 중앙값 <strong>{median.toLocaleString()}원</strong>
          <span className="opacity-70"> · 매물 {stats.count}건 분석</span>
        </div>
        <div className={`text-[10px] ${toneText} opacity-60 mt-1.5 leading-tight`}>
          출처: 최근 {windowMonths}개월 스노우판 등록 매물 (외부 시세 사이트 아님)
        </div>
      </div>
    );
  }

  // 'badge' — UsedDetail 가격 옆. 컴팩트하지만 % 와 라벨은 충분히 큼.
  return (
    <div className={`inline-flex items-center gap-2 rounded-xl border-2 ${toneBorder} ${toneBg} px-3 py-2`} title={sourceTitle}>
      <div className="flex flex-col gap-0">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-sm font-bold ${toneText} leading-tight`}>{label}</span>
          <span className={`text-base font-black ${toneAccent} font-mono leading-tight`}>{diffText}</span>
        </div>
        <span className={`text-[10px] ${toneText} opacity-70`}>
          스노우판 매물 {stats.count}건 · 최근 {windowMonths}개월 분석
        </span>
      </div>
    </div>
  );
}
