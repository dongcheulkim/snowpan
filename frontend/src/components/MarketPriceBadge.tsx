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
        <p className="text-[11px] text-gray-400 mt-1">
          시세 데이터 부족 (등록 매물 {stats.count}개)
        </p>
      );
    }
    return null;
  }

  const median = stats.median;
  const ratio = price / median;
  let label: string;
  let tone: string;
  if (ratio <= 0.85) {
    label = '시세 대비 저렴';
    tone = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (ratio <= 1.15) {
    label = '시세 적정';
    tone = 'bg-sky-50 text-sky-700 border-sky-200';
  } else if (ratio <= 1.35) {
    label = '시세 대비 비쌈';
    tone = 'bg-amber-50 text-amber-700 border-amber-200';
  } else {
    label = '시세보다 많이 비쌈';
    tone = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  const diffPct = Math.round((ratio - 1) * 100);
  const diffText = diffPct === 0 ? '시세와 동일' : diffPct > 0 ? `+${diffPct}%` : `${diffPct}%`;
  const scope = brand ? `${brand} ${subcatLabels[subcategory] || subcategory}` : subcatLabels[subcategory] || subcategory;

  if (variant === 'inline') {
    return (
      <div className={`mt-2 rounded-lg border px-3 py-2 ${tone}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold">{label}</span>
          <span className="text-[11px] font-mono">{diffText}</span>
        </div>
        <div className="text-[11px] mt-0.5 opacity-80">
          {scope} 시세 중앙값 {median.toLocaleString()}원
          <span className="opacity-60"> · {stats.count}건 기준</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col gap-0.5 rounded-lg border px-2.5 py-1.5 ${tone}`}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[11px] font-bold">{label}</span>
        <span className="text-[10px] font-mono opacity-80">{diffText}</span>
      </div>
      <span className="text-[10px] opacity-70">
        시세 {median.toLocaleString()}원 · {stats.count}건
      </span>
    </div>
  );
}
