import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import DealCard, { type Deal } from '../components/DealCard';
import CategoryAdBanner from '../components/CategoryAdBanner';
import { RowListSkeleton } from '../components/Skeleton';
import { hasMouse } from '../utils/pointer';
import HScroll from '../components/HScroll';

interface Resort {
  id: string;
  slug: string;
  name: string;
  scope?: string | null;      // '국내' | '해외'
  country: string;
  continent?: string | null;
  popular?: boolean;
  region?: string | null;
  address?: string | null;
  liftPrice?: string | null;
  nightSki?: boolean;
  image?: string | null;
  summary?: string | null;
  season?: string | null;
  highlights?: string | null;
  slopes?: number | null;
}

const CONTINENT_ORDER = ['아시아', '유럽', '북미', '기타'];
const REGION_ORDER = ['강원', '경기', '충청', '전북', '전남', '경북', '경남', '제주', '기타'];

// 사진 위 텍스트 오버레이 카드 — 가로 스크롤 섹션용 (야놀자식 풀포토 카드)
function PhotoCard({ r, scope }: { r: Resort; scope: '국내' | '해외' }) {
  const place = scope === '국내' ? (r.region || '국내') : `${r.country}${r.region ? ` · ${r.region}` : ''}`;
  return (
    <Link
      to={`/overseas/${r.slug}`}
      className="w-52 flex-shrink-0 snap-start block active:scale-[0.98] transition-transform"
    >
      <div className="relative h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-sky-400 to-indigo-500">
        {r.image && (
          <img src={imageUrl(r.image, 500)} alt={r.name} loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        {r.nightSki && <span className="absolute top-2 right-2 text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">야간</span>}
        {r.popular && <span className="absolute top-2 left-2 text-[9px] font-bold text-gray-900 bg-white/90 px-1.5 py-0.5 rounded">인기</span>}
        <div className="absolute bottom-0 inset-x-0 p-3">
          <p className="text-white font-bold text-[15px] leading-tight">{r.name}</p>
          <p className="text-white/80 text-[11px] mt-0.5">{place}</p>
        </div>
      </div>
      {r.liftPrice && <p className="text-xs font-bold text-gray-900 mt-1.5 px-0.5 line-clamp-1">{r.liftPrice}</p>}
    </Link>
  );
}

// 그리드 카드 — 카테고리 선택·검색 결과용
function GridCard({ r, scope }: { r: Resort; scope: '국내' | '해외' }) {
  const place = scope === '국내' ? (r.region || '국내') : `${r.country}${r.region ? ` · ${r.region}` : ''}`;
  return (
    <Link key={r.id} to={`/overseas/${r.slug}`} className="block active:scale-[0.98] transition-transform">
      <div className="relative h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-sky-400 to-indigo-500">
        {r.image && (
          <img src={imageUrl(r.image, 400)} alt={r.name} loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
        {r.nightSki && <span className="absolute top-2 right-2 text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">야간</span>}
        <div className="absolute bottom-0 inset-x-0 p-2.5">
          <p className="text-white font-bold text-sm leading-tight">{r.name}</p>
          <p className="text-white/80 text-[10px] mt-0.5">{place}</p>
        </div>
      </div>
      {r.liftPrice ? (
        <p className="text-[11px] font-bold text-gray-900 mt-1 px-0.5 line-clamp-1">{r.liftPrice}</p>
      ) : r.summary ? (
        <p className="text-[11px] text-gray-500 mt-1 px-0.5 line-clamp-1">{r.summary}</p>
      ) : null}
    </Link>
  );
}

// 투어 슬러그 → 웹캠 슬러그 (표기가 다른 3곳만 보정)
const WEBCAM_ALIAS: Record<string, string> = { 'elysian-gangchon': 'elysian', oakvalley: 'oak', edenvalley: 'eden' };
const camSlugOf = (slug: string) => WEBCAM_ALIAS[slug] || slug;

// 사진 없는 리조트용 설산 그라데이션 — 슬러그 해시로 고정 배정 (로드마다 안 바뀜)
const CARD_GRADS = [
  'from-sky-500 to-indigo-600',
  'from-slate-600 to-slate-800',
  'from-cyan-500 to-blue-700',
  'from-indigo-500 to-violet-700',
  'from-blue-600 to-slate-800',
  'from-teal-500 to-emerald-700',
];
const gradOf = (slug: string) => CARD_GRADS[[...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % CARD_GRADS.length];

// 국내 디렉토리 카드 — 사진(또는 설산 그라데이션) + 실시간 기온 + 정보칩 + 웹캠/상세 액션
function DomesticCard({ r, temp }: { r: Resort; temp: number | null }) {
  const hasCam = temp !== null;
  return (
    <div className="card overflow-hidden">
      <Link to={`/overseas/${r.slug}`} className="block active:opacity-90 transition-opacity">
        <div className={`relative h-40 bg-gradient-to-br ${gradOf(r.slug)}`}>
          {r.image ? (
            <img src={imageUrl(r.image, 700)} alt={r.name} loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            /* 설산 실루엣 — 사진 없는 카드의 밋밋함 방지 */
            <svg className="absolute bottom-0 inset-x-0 text-white/10" viewBox="0 0 420 96" fill="currentColor" preserveAspectRatio="none" aria-hidden>
              <path d="M0 96 L70 30 L120 66 L180 8 L250 74 L310 26 L360 58 L420 14 L420 96 Z" />
            </svg>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
          {r.popular && <span className="absolute top-2.5 left-2.5 text-[10px] font-bold text-gray-900 bg-white/90 px-1.5 py-0.5 rounded">인기</span>}
          {hasCam && (
            <span className={`absolute top-2.5 right-2.5 text-[11px] font-bold text-white px-2 py-0.5 rounded-full ${temp! <= 0 ? 'bg-blue-600' : 'bg-black/55'}`}>
              현재 {temp}°
            </span>
          )}
          <div className="absolute bottom-0 inset-x-0 p-3.5">
            <p className="text-white font-bold text-lg leading-tight">{r.name}</p>
            <p className="text-white/80 text-[11px] mt-0.5">{r.region || '국내'}{r.season ? ` · 시즌 ${r.season}` : ''}</p>
          </div>
        </div>
      </Link>
      <div className="p-3.5">
        <div className="flex flex-wrap gap-1.5">
          {r.slopes != null && r.slopes > 0 && (
            <span className="text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-md px-2 py-1">슬로프 {r.slopes}면</span>
          )}
          <span className={`text-[11px] font-medium rounded-md px-2 py-1 border ${r.nightSki ? 'text-sky-700 bg-sky-50 border-sky-100' : 'text-gray-400 bg-gray-50 border-gray-100'}`}>
            {r.nightSki ? '야간 운영' : '야간 없음'}
          </span>
          {hasCam && <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1">웹캠 라이브</span>}
        </div>
        {r.liftPrice && <p className="text-xs font-bold text-gray-900 mt-2.5 line-clamp-1">{r.liftPrice}</p>}
        <div className="flex gap-2 mt-3">
          {hasCam && (
            <Link to={`/webcam/${camSlugOf(r.slug)}`} className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold text-center active:scale-[0.98] transition-transform">
              웹캠 라이브
            </Link>
          )}
          <Link to={`/overseas/${r.slug}`} className={`${hasCam ? 'flex-1' : 'w-full'} py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold text-center active:scale-[0.98] transition-transform`}>
            상세 정보
          </Link>
        </div>
      </div>
    </div>
  );
}

// 가로 스크롤 섹션 (야놀자식 테마 행)
function Row({ title, items, scope, onMore }: { title: string; items: Resort[]; scope: '국내' | '해외'; onMore?: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  if (!items.length) return null;
  const nudge = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  return (
    <div className="pb-5">
      <div className="px-4 flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <div className="flex items-center gap-1.5">
          {/* PC — 스와이프 대신 화살표 */}
          {hasMouse && items.length > 1 && (
            <>
              <button type="button" aria-label="왼쪽으로" onClick={() => nudge(-1)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button type="button" aria-label="오른쪽으로" onClick={() => nudge(1)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </>
          )}
          {onMore && <button onClick={onMore} className="text-[11px] font-bold text-gray-500">전체보기 ›</button>}
        </div>
      </div>
      <div ref={trackRef} className="flex gap-3 overflow-x-auto no-scrollbar px-4 snap-x">
        {items.map((r) => <PhotoCard key={r.id} r={r} scope={scope} />)}
      </div>
    </div>
  );
}

export default function Overseas() {
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'국내' | '해외'>('국내');
  const [sub, setSub] = useState<string>('전체');
  const [query, setQuery] = useState('');
  // 국내 디렉토리용 — 실시간 기온(웹캠 API 공유) + 정렬
  const [temps, setTemps] = useState<Record<string, number>>({});
  const [domSort, setDomSort] = useState<'popular' | 'slopes' | 'temp'>('popular');

  useEffect(() => {
    document.title = '스키장 투어 - 스노우판';
    Promise.all([
      api<Resort[]>('/overseas/resorts').catch(() => []),
      api<Deal[]>('/overseas/deals?featured=1').catch(() => []),
      api<Record<string, number>>('/webcams/weather').catch(() => ({} as Record<string, number>)),
    ]).then(([r, d, t]) => {
      setResorts(Array.isArray(r) ? r : []);
      setDeals(Array.isArray(d) ? d : []);
      setTemps(t && typeof t === 'object' ? t : {});
    }).finally(() => setLoading(false));
  }, []);

  const scoped = resorts.filter((r) => (r.scope || '해외') === scope);
  const hasPopular = scoped.some((r) => r.popular);
  const subValues = scope === '해외'
    ? CONTINENT_ORDER.filter((c) => scoped.some((r) => r.continent === c))
    : REGION_ORDER.filter((rg) => scoped.some((r) => r.region === rg));
  const subTabs = [...(hasPopular ? ['인기'] : []), '전체', ...subValues];
  const activeSub = subTabs.includes(sub) ? sub : '전체';
  const filtered = activeSub === '전체'
    ? scoped
    : activeSub === '인기'
      ? scoped.filter((r) => r.popular)
      : scope === '해외'
        ? scoped.filter((r) => r.continent === activeSub)
        : scoped.filter((r) => r.region === activeSub);

  // 검색 — 이름·나라·지역, 국내외 통합 (야놀자식 검색 우선)
  const q = query.trim();
  const searched = useMemo(() => {
    if (!q) return [];
    const low = q.toLowerCase();
    return resorts.filter((r) =>
      r.name.toLowerCase().includes(low) ||
      (r.country || '').toLowerCase().includes(low) ||
      (r.region || '').toLowerCase().includes(low)
    );
  }, [q, resorts]);

  const switchScope = (s: '국내' | '해외') => { setScope(s); setSub('전체'); };
  const showThemeRows = !q && activeSub === '전체';

  return (
    <div className="min-h-screen bg-sky-50 pb-10">
      {/* 헤더 + 검색 */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-2xl font-black text-gray-900">스키장 투어</h1>
        <p className="text-xs text-gray-500 mt-0.5">이번 시즌, 어디로 떠날까요?</p>
        <div className="relative mt-3">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="스키장·나라·지역 검색"
            className="w-full h-12 pl-10 pr-4 rounded-2xl text-sm bg-white border border-gray-200 shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
          />
        </div>
      </div>

      {/* 검색 결과 */}
      {q ? (
        <div className="px-4">
          <p className="text-xs text-gray-500 mb-2">"{q}" 검색 결과 {searched.length}곳</p>
          {searched.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">검색 결과가 없어요.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {searched.map((r) => <GridCard key={r.id} r={r} scope={(r.scope as '국내' | '해외') || '해외'} />)}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 국내 / 해외 */}
          <div className="px-4 pb-3 flex gap-2">
            {(['국내', '해외'] as const).map((s) => (
              <button
                key={s}
                onClick={() => switchScope(s)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${scope === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* 광고 배너 */}
          <div className="px-4 pb-3">
            <CategoryAdBanner category="overseas" />
          </div>

          {/* 하위 카테고리 칩 */}
          {!loading && subTabs.length > 1 && (
            <HScroll className="px-4 pb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
              {subTabs.map((tb) => (
                <button key={tb} onClick={() => setSub(tb)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeSub === tb ? 'bg-sky-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{tb}</button>
              ))}
            </HScroll>
          )}

          {loading ? (
            <div className="px-4"><RowListSkeleton count={4} /></div>
          ) : scope === '국내' ? (
            /* 국내 — 정보형 디렉토리: 실시간 기온·웹캠·슬로프·리프트권을 한 카드에 */
            <div className="px-4">
              <div className="flex gap-1.5 pb-3">
                {([
                  ['popular', '인기순'],
                  ['slopes', '슬로프 많은순'],
                  ['temp', '기온 낮은순'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setDomSort(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${domSort === key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-12">준비 중이에요.</p>
              ) : (
                <div className="grid gap-3">
                  {[...filtered]
                    .sort((a, b) => {
                      const ta = temps[camSlugOf(a.slug)];
                      const tb = temps[camSlugOf(b.slug)];
                      if (domSort === 'slopes') return (b.slopes || 0) - (a.slopes || 0);
                      if (domSort === 'temp') return (ta ?? 99) - (tb ?? 99);
                      return (Number(b.popular) - Number(a.popular)) || (b.slopes || 0) - (a.slopes || 0);
                    })
                    .map((r) => <DomesticCard key={r.id} r={r} temp={temps[camSlugOf(r.slug)] ?? null} />)}
                </div>
              )}
            </div>
          ) : showThemeRows ? (
            <>
              {/* 해외 — 테마별 가로 스크롤 (야놀자식) */}
              {hasPopular && (
                <Row title="인기 해외 스키장" items={scoped.filter((r) => r.popular)} scope={scope} onMore={() => setSub('인기')} />
              )}
              {subValues.map((sv) => (
                <Row
                  key={sv}
                  title={sv}
                  items={scoped.filter((r) => r.continent === sv)}
                  scope={scope}
                  onMore={() => setSub(sv)}
                />
              ))}

              {/* 추천 딜 (해외) */}
              {scope === '해외' && deals.length > 0 && (
                <div className="px-4 pb-3">
                  <h2 className="text-base font-bold text-gray-900 mb-2">추천 여행 상품</h2>
                  <div className="grid gap-3">{deals.map((d) => <DealCard key={d.id} deal={d} showResort />)}</div>
                </div>
              )}
            </>
          ) : (
            <div className="px-4">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-12">준비 중이에요.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filtered.map((r) => <GridCard key={r.id} r={r} scope={scope} />)}
                </div>
              )}
            </div>
          )}

          {/* 여행사 유입 (해외) */}
          {scope === '해외' && (
            <div className="px-4 mt-4 space-y-2">
              <Link to="/overseas/agency/register" className="block bg-gray-900 text-white rounded-2xl p-4 text-center active:scale-[0.98] transition-transform">
                <p className="text-sm font-bold">여행사이신가요? 상품 등록하기</p>
                <p className="text-[11px] text-gray-300 mt-0.5">승인 후 직접 여행 상품을 올리고 추천 여행사로 노출돼요</p>
              </Link>
              <Link to="/advertise" className="block text-center text-[11px] font-bold text-gray-500 py-1">배너 광고 문의 ›</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
