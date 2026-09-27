import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, imageUrl, openExternal } from '../api';
import DealCard, { type Deal } from '../components/DealCard';
import AgencyCard, { type Agency } from '../components/AgencyCard';
import HScroll from '../components/HScroll';
import { camSlugOf, hasDomesticCam } from '../utils/webcamSlug';

// hls.js(520KB) 를 품고 있어 필요할 때만 받는다
const WebcamPlayer = lazy(() => import('../components/WebcamPlayer'));

interface Cam { label: string; stream: string; liveNow?: boolean | null; liveVideoId?: string | null } // liveNow: 유튜브 채널이 지금 방송 중인지(서버 판정), null 은 모름
interface ResortDetail {
  id: string;
  slug: string;
  name: string;
  scope?: string | null;
  country: string;
  region?: string | null;
  address?: string | null;
  liftPrice?: string | null;
  website?: string | null;
  phone?: string | null;
  nightSki?: boolean;
  lifts?: number | null;
  image?: string | null;
  summary?: string | null;
  description: string;
  season?: string | null;
  snowType?: string | null;
  highlights?: string | null;
  slopes?: number | null;
  bestFor?: string | null;
  webcams?: Cam[] | null;
  webcamUrl?: string | null;
  imageCredit?: string | null;
  deals: Deal[];
  agencies: Agency[];
}

// 소개글 — "## 제목" 줄은 소제목, 나머지는 문단. 옛 글(제목 없음)도 그대로 보임.
function GuideBody({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <div className="space-y-2">
      {lines.map((l, i) => l.startsWith('## ')
        ? <h3 key={i} className={`text-[13px] font-bold text-gray-900 ${i ? 'pt-2' : ''}`}>{l.slice(3)}</h3>
        : <p key={i} className="text-sm text-gray-700 leading-relaxed">{l}</p>)}
    </div>
  );
}

// 실시간 웹캠 — 해외는 리조트에 저장된 스트림, 국내는 웹캠 페이지 데이터를 그대로 가져와 첫 카메라를 보여준다
function WebcamSection({ resort }: { resort: ResortDetail }) {
  const domestic = resort.scope === '국내';
  const [cams, setCams] = useState<Cam[]>(() => (!domestic && Array.isArray(resort.webcams) ? resort.webcams : []));
  const [externalUrl, setExternalUrl] = useState<string | null>(resort.webcamUrl || null);
  const [idx, setIdx] = useState(0);
  const [seenSlug, setSeenSlug] = useState(resort.slug);
  if (seenSlug !== resort.slug) { setSeenSlug(resort.slug); setIdx(0); setCams(!domestic && Array.isArray(resort.webcams) ? resort.webcams : []); setExternalUrl(resort.webcamUrl || null); }
  const camSlug = camSlugOf(resort.slug);
  useEffect(() => {
    if (!domestic || !hasDomesticCam(resort.slug)) return;
    let alive = true;
    api<{ cameras?: Cam[] | null; externalUrl?: string | null }>(`/webcams/${encodeURIComponent(camSlug)}`)
      .then((w) => { if (!alive) return; setCams(Array.isArray(w.cameras) ? w.cameras : []); setExternalUrl(w.externalUrl || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [domestic, resort.slug, camSlug]);

  if (cams.length === 0 && !externalUrl) return null;
  const cur = cams[Math.min(idx, cams.length - 1)];
  return (
    <section id="webcam" className="px-4 mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          실시간 웹캠
          {cams.length > 0 && cams.some((c) => c.liveNow !== false) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
          )}
        </h2>
        {domestic && cams.length > 0 && <Link to={`/webcam/${camSlug}`} className="text-[11px] font-bold text-gray-700 underline">카메라 전부 보기</Link>}
      </div>
      {cams.length > 0 ? (
        <div className="bg-black rounded-2xl overflow-hidden">
          <div className="aspect-video">
            {cur.liveNow === false ? (
              // 유튜브 채널이 지금 방송 중이 아님(시즌오프·야간) — 깨진 임베드 대신 안내
              <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-2 text-white px-4">
                <span className="text-sm text-gray-300 font-medium">지금은 방송 중이 아니에요</span>
                <span className="text-[11px] text-gray-500 text-center">스키 시즌이나 낮 시간에만 방송되는 카메라예요</span>
                {externalUrl && <button type="button" onClick={() => openExternal(externalUrl)} className="mt-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-xs font-bold text-white">공식 웹캠 페이지 열기</button>}
              </div>
            ) : (
              <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-xs text-gray-400">웹캠 불러오는 중</div>}>
                <WebcamPlayer key={cur.liveVideoId || cur.stream} stream={cur.liveVideoId ? `youtube:${cur.liveVideoId}` : cur.stream} fallbackUrl={externalUrl} fallbackName={resort.name} />
              </Suspense>
            )}
          </div>
          {cams.length > 1 && (
            <HScroll className="overflow-x-auto bg-gray-900">
              <div className="flex gap-1 p-2 min-w-max">
                {cams.map((c, i) => (
                  <button key={i} type="button" onClick={() => setIdx(i)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap inline-flex items-center gap-1.5 ${i === idx ? 'bg-white text-gray-900' : 'bg-white/10 text-gray-300'}`}>
                    {c.liveNow === true && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}{c.label}
                  </button>
                ))}
              </div>
            </HScroll>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => openExternal(externalUrl!)} className="w-full bg-snow border border-gray-200 rounded-2xl p-4 text-left active:bg-gray-50">
          <p className="text-sm font-bold text-gray-900">공식 웹캠 보기</p>
          <p className="text-[11px] text-gray-500 mt-0.5">이 스키장은 공식 사이트에서 실시간 화면을 제공해요. 새 창으로 열려요.</p>
        </button>
      )}
      {cams.length > 0 && externalUrl && (
        <button type="button" onClick={() => openExternal(externalUrl)} className="mt-2 text-[11px] font-bold text-gray-700 underline">공식 웹캠 페이지에서 더 보기</button>
      )}
    </section>
  );
}

export default function OverseasDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [resort, setResort] = useState<ResortDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [seenSlug, setSeenSlug] = useState(slug);
  if (seenSlug !== slug) { setSeenSlug(slug); setLoading(true); setNotFound(false); }
  useEffect(() => {
    if (!slug) return;
    api<ResortDetail>(`/overseas/resorts/${slug}`)
      .then((r) => { setResort(r); document.title = `${r.name} - 스키장 투어`; })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-sky-50 flex items-center justify-center text-sm text-gray-500">불러오는 중...</div>;
  if (notFound || !resort) {
    return (
      <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-gray-500">스키장을 찾을 수 없어요.</p>
        <Link to="/overseas" className="text-xs font-bold text-white bg-gray-900 px-4 py-2 rounded-lg">목록으로</Link>
      </div>
    );
  }

  const domestic = resort.scope === '국내';
  const metas = [
    resort.season && { label: '시즌', value: resort.season },
    resort.liftPrice && { label: '리프트권', value: resort.liftPrice },
    resort.slopes != null && { label: '슬로프', value: `${resort.slopes}면` },
    resort.lifts != null && { label: '리프트', value: `${resort.lifts}기` },
    resort.snowType && { label: '설질', value: resort.snowType },
    (resort.nightSki !== undefined) && { label: '야간 스키', value: resort.nightSki ? '운영' : '미운영' },
  ].filter(Boolean) as { label: string; value: string }[];
  const bestFor = (resort.bestFor || '').split(',').map((s) => s.trim()).filter(Boolean);
  const highlights = (resort.highlights || '').split(',').map((s) => s.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-sky-50 pb-12">
      {/* 히어로 */}
      <div className="relative h-60 bg-gradient-to-br from-sky-400 to-indigo-600">
        {resort.image && (
          <img
            src={imageUrl(resort.image, 800)}
            alt={resort.name}
            className="w-full h-full object-cover"
            fetchPriority="high"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {/* 사진 출처 — 리조트마다 저장된 값(위키미디어 공용·공식 홈페이지 등). 잘 안 보이게 아주 작게 우하단에. */}
        {resort.image && resort.imageCredit && <span className="absolute bottom-1 right-1.5 text-[8px] text-white/35 leading-none">사진 {resort.imageCredit}</span>}
        <Link to="/overseas" className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-gray-900 text-lg" aria-label="목록으로">←</Link>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded">
            {resort.country}{resort.region ? ` · ${resort.region}` : ''}
          </span>
          <h1 className="text-2xl font-bold mt-1.5">{resort.name}</h1>
          {resort.summary && <p className="text-xs text-gray-200 mt-0.5">{resort.summary}</p>}
        </div>
      </div>

      {/* 한눈에 보기 */}
      {metas.length > 0 && (
        <div className="px-4 -mt-4 relative">
          <div className="bg-snow border border-gray-200 rounded-2xl p-3 grid grid-cols-3 gap-y-3 gap-x-3">
            {metas.map((m) => (
              <div key={m.label} className="min-w-0">
                <div className="text-[10px] text-gray-500">{m.label}</div>
                <div className="text-xs font-bold text-gray-900 truncate" title={m.value}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 이런 분께 · 하이라이트 */}
      {(bestFor.length > 0 || highlights.length > 0) && (
        <div className="px-4 mt-4">
          {bestFor.length > 0 && (
            <p className="text-xs text-gray-700 mb-2"><span className="font-bold text-gray-900">이런 분께</span> · {bestFor.join(', ')}</p>
          )}
          {highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {highlights.map((h) => (
                <span key={h} className="text-[11px] font-bold text-gray-800 bg-white border border-gray-200 px-2 py-1 rounded-lg">#{h}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 실시간 웹캠 */}
      <WebcamSection resort={resort} />

      {/* 소개 */}
      <section className="px-4 mt-6">
        <h2 className="text-sm font-bold text-gray-900 mb-2">{resort.name} 이야기</h2>
        <div className="bg-snow border border-gray-200 rounded-2xl p-4">
          <GuideBody text={resort.description} />
        </div>
      </section>

      {/* 해외 — 여행 상품·추천 여행사 */}
      {!domestic && (
        <>
          <section className="px-4 mt-6">
            <h2 className="text-sm font-bold text-gray-900 mb-2">여행 상품 · 딜{resort.deals.length > 0 ? ` ${resort.deals.length}` : ''}</h2>
            {resort.deals.length > 0 ? (
              <div className="grid gap-3">
                {resort.deals.map((d) => <DealCard key={d.id} deal={d} />)}
              </div>
            ) : (
              <p className="text-xs text-gray-500 py-2">아직 등록된 여행 상품이 없어요.</p>
            )}
          </section>

          <section className="px-4 mt-6">
            <h2 className="text-sm font-bold text-gray-900 mb-2">추천 여행사</h2>
            {resort.agencies.length > 0 ? (
              <div className="grid gap-3">
                {resort.agencies.map((a) => <AgencyCard key={a.id} agency={a} />)}
              </div>
            ) : (
              <Link to="/overseas/agency/register" className="block bg-white border border-dashed border-gray-300 rounded-2xl p-5 text-center">
                <p className="text-sm font-bold text-gray-700">이 지역 여행사를 찾고 있어요</p>
                <p className="text-[11px] text-gray-500 mt-1">여행사라면 등록하고 이 리조트를 찾는 스키어에게 노출하세요 ›</p>
              </Link>
            )}
          </section>
        </>
      )}

      {/* 위치 · 공식 사이트 · 전화 */}
      {(resort.address || resort.website || resort.phone) && (
        <section className="px-4 mt-6">
          <h2 className="text-sm font-bold text-gray-900 mb-2">찾아가기</h2>
          <div className="bg-snow border border-gray-200 rounded-2xl p-3">
            {resort.address && (
              <div className="mb-2">
                <div className="text-[10px] text-gray-500">위치</div>
                <div className="text-xs font-medium text-gray-800">{resort.address}</div>
              </div>
            )}
            {(resort.website || resort.phone) && (
              <div className="flex gap-2">
                {resort.website && <button type="button" onClick={() => openExternal(resort.website!)} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold">{domestic ? '리프트권 요금 보기' : '공식 사이트'}</button>}
                {resort.phone && <a href={`tel:${resort.phone}`} className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center">전화</a>}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 국내 — 근처 업체·커뮤니티 */}
      {domestic && (
        <div className="px-4 mt-6 grid grid-cols-2 gap-2">
          <Link to={`/resort/${encodeURIComponent(resort.name)}`} className="py-3 bg-gray-900 text-white rounded-xl text-xs font-bold text-center">근처 렌탈·정비·레슨·숙소</Link>
          <Link to="/community" className="py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold text-center">커뮤니티 후기</Link>
        </div>
      )}

      {/* 해외 — 여행사 등록 */}
      {!domestic && (
        <div className="px-4 mt-6">
          <Link to="/overseas/agency/register" className="block bg-gray-900 text-white rounded-2xl p-4 text-center active:scale-[0.98] transition-transform">
            <p className="text-sm font-bold">여행사이신가요? 상품 등록하기</p>
            <p className="text-[11px] text-gray-300 mt-0.5">승인 후 직접 여행 상품을 올리고 추천 여행사로 노출돼요</p>
          </Link>
        </div>
      )}
    </div>
  );
}
