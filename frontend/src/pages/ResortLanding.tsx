import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { useMeta } from '../hooks/useMeta';
import ResortReviews from '../components/ResortReviews';

interface MiniItem { id: string; name: string; price?: number; image?: string | null; area?: string; address?: string | null; }
interface Landing {
  name: string;
  resort: { id: string; name: string; location?: string | null; image?: string | null } | null;
  season?: { openDate: string | null; closeDate: string | null; seasonNote: string | null } | null;
  reviews?: { avg: number; count: number };
  skiShops: MiniItem[];
  repairShops: MiniItem[];
  rentals: MiniItem[];
  lessons: MiniItem[];
  accommodations: MiniItem[];
}

// 시즌 날짜는 서버가 KST 자정으로 저장 — 한국 달력일(일 단위)로 비교한다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
function kstDayIndex(ms: number): number { return Math.floor((ms + KST_OFFSET_MS) / DAY_MS); }
function kstYmd(iso: string): string {
  const k = new Date(new Date(iso).getTime() + KST_OFFSET_MS);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, '0')}-${String(k.getUTCDate()).padStart(2, '0')}`;
}

// 시즌 상태 문구 — 개장 전 D-day / 진행 중(폐장일) / 종료. 날짜가 하나도 없으면 null (카드 숨김)
function seasonStatus(season: Landing['season']): { title: string; sub?: string; tone: 'before' | 'open' | 'closed' } | null {
  if (!season) return null;
  const openMs = season.openDate ? new Date(season.openDate).getTime() : NaN;
  const closeMs = season.closeDate ? new Date(season.closeDate).getTime() : NaN;
  const hasOpen = !isNaN(openMs);
  const hasClose = !isNaN(closeMs);
  if (!hasOpen && !hasClose) return null;
  const today = kstDayIndex(Date.now());
  const openDay = hasOpen ? kstDayIndex(openMs) : null;
  const closeDay = hasClose ? kstDayIndex(closeMs) : null;

  if (openDay !== null && today < openDay) {
    const left = openDay - today;
    return { title: `개장까지 D-${left}`, sub: `${kstYmd(season.openDate!)} 개장`, tone: 'before' };
  }
  if (closeDay !== null && today > closeDay) return { title: '시즌 종료', sub: `${kstYmd(season.closeDate!)} 폐장`, tone: 'closed' };
  return { title: '시즌 진행 중', sub: closeDay !== null ? `폐장 ${kstYmd(season.closeDate!)}` : undefined, tone: 'open' };
}

export default function ResortLanding() {
  const { name } = useParams();
  const decoded = name ? decodeURIComponent(name) : '';
  const [data, setData] = useState<Landing | null>(null);
  const [loading, setLoading] = useState(true);

  useMeta({
    title: decoded ? `${decoded} 스키·보드샵, 렌탈샵, 레슨, 숙소` : undefined,
    description: decoded ? `${decoded} 근처 스키·보드샵, 렌탈샵, 레슨, 숙소를 스노우판에서 한눈에 비교하세요.` : undefined,
    jsonLd: decoded ? {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: decoded,
      description: `${decoded} 근처 스키·보드샵, 렌탈샵, 레슨, 숙소 정보`,
    } : null,
  });

  useEffect(() => {
    if (!decoded) return;
    setLoading(true);
    api<Landing>(`/resorts/landing/${encodeURIComponent(decoded)}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [decoded]);
  if (loading) return <div className="text-center py-20 text-sm text-gray-500">로딩 중...</div>;

  const sections: { title: string; items: MiniItem[]; to: (i: MiniItem) => string; listTo: string }[] = data ? [
    { title: '스키·보드샵', items: data.skiShops, to: i => `/skishop/${i.id}`, listTo: '/skishop' },
    { title: '렌탈샵', items: data.rentals, to: i => `/rental/${i.id}`, listTo: '/rental' },
    { title: '레슨', items: data.lessons, to: i => `/lesson/${i.id}`, listTo: '/lesson' },
    { title: '숙소', items: data.accommodations, to: i => `/accommodation/${i.id}`, listTo: '/accommodation' },
    { title: '정비샵', items: data.repairShops, to: i => `/repair/${i.id}`, listTo: '/repair' },
  ] : [];

  const totalCount = sections.reduce((n, s) => n + s.items.length, 0);
  const status = seasonStatus(data?.season ?? null);
  const seasonNote = data?.season?.seasonNote || '';
  const toneClass = status?.tone === 'open' ? 'text-emerald-700' : status?.tone === 'closed' ? 'text-gray-500' : 'text-sky-700';

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">{decoded}</h1>
      </div>

      {/* 스노우판 매거진 — 이 리조트를 고른 관리자 뉴스 (시즌권·개장일·할인). 없으면 숨김 */}

      <div className="card p-5">
        <p className="text-sm text-gray-600">
          <span className="font-bold text-gray-900">{decoded}</span> 근처 스키·보드샵, 렌탈샵, 레슨, 숙소를 한눈에.
        </p>
        <p className="text-xs text-gray-400 mt-1">등록된 업체 {totalCount}곳</p>
        <div className="flex gap-2 mt-3">
          <Link to="/webcam" className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold text-center">실시간 웹캠</Link>
          <Link to="/community" className="flex-1 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold text-center">커뮤니티</Link>
        </div>
      </div>

      {/* 시즌 정보 — 관리자가 넣은 개장·폐장일. 날짜가 없으면 카드 자체를 숨김 */}
      {(status || seasonNote) && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2">시즌 정보</h2>
          {status && (
            <p className="flex items-baseline gap-2">
              <span className={`text-base font-bold ${toneClass}`}>{status.title}</span>
              {status.sub && <span className="text-xs text-gray-500 tabular-nums">{status.sub}</span>}
            </p>
          )}
          {seasonNote && <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{seasonNote}</p>}
        </div>
      )}

      {totalCount === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">아직 {decoded}에 등록된 업체가 없어요.</p>
          <Link to="/mypage/shops" className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg font-bold text-xs">사장님 대시보드에서 등록하기</Link>
        </div>
      ) : (
        sections.filter(s => s.items.length > 0).map(section => (
          <div key={section.title} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">{section.title} ({section.items.length})</h2>
              <Link to={section.listTo} className="text-xs text-sky-600 font-bold">전체 →</Link>
            </div>
            <div className="space-y-2">
              {section.items.map(item => (
                <Link key={item.id} to={section.to(item)} className="flex items-center gap-3 p-2.5 bg-snow rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-gray-300">
                    {item.image && <img src={imageUrl(item.image)} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    {item.price ? (
                      <p className="text-sm font-bold text-mint">{item.price.toLocaleString()}원</p>
                    ) : (
                      <p className="text-[11px] text-gray-500 truncate">{item.address || item.area || ''}</p>
                    )}
                  </div>
                  <span className="text-gray-300 text-xs">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}

      {/* 스키장 후기·별점 — SkiResort 와 매칭된 리조트만 (후기는 리조트 id 기준) */}
      {data?.resort && <ResortReviews resortId={data.resort.id} />}
    </div>
  );
}
