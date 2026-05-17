import { useLocation, Link, Navigate } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';
import { getVerticalBySlug, VERTICALS } from '../config/verticals';

// 단일 컴포넌트로 5개 coming-soon 버티컬 페이지 재사용.
// 라우트 매핑:
//   /{vertical}       — 홈 (hero + 카테고리 그리드 + 출시 미리보기 + 다른 버티컬)
//   /{vertical}/{cat} — 카테고리 페이지 (해당 카테고리 곧 출시 placeholder)
//
// SNOWPAN 처럼 카테고리·hero·구조는 그대로, 데이터는 비어있음.

export default function VerticalLanding() {
  const location = useLocation();
  const segments = location.pathname.replace(/^\//, '').split('/');
  const slug = segments[0];
  const categorySlug = segments[1]; // optional sub-category
  const vertical = getVerticalBySlug(slug);

  if (!vertical) return <Navigate to="/pan" replace />;

  // active 버티컬이 우연히 이 라우트로 오면 그 버티컬의 basePath 로
  if (vertical.status === 'active') {
    return <Navigate to={vertical.basePath} replace />;
  }

  // 카테고리 서브 페이지인지 체크
  const subCategory = categorySlug
    ? vertical.homeCategories?.find(c => c.slug === categorySlug)
    : undefined;

  useMeta({
    title: subCategory
      ? `${vertical.name} ${subCategory.label} · PAN`
      : `${vertical.name} — ${vertical.tagline} · PAN`,
    description: subCategory ? `${vertical.name} ${subCategory.label} 곧 출시됩니다.` : vertical.description,
  });

  const otherActives = VERTICALS.filter(v => v.status === 'active' && v.slug !== vertical.slug);

  // ── 카테고리 서브 페이지 렌더 ─────────────────────────
  if (categorySlug && subCategory) {
    return (
      <div className="animate-fade-in">
        {/* 브레드크럼 */}
        <nav className="text-xs text-gray-500 mb-3" aria-label="breadcrumb">
          <Link to="/pan" className="hover:text-gray-900">PAN</Link>
          <span className="mx-1">/</span>
          <Link to={vertical.basePath} className="hover:text-gray-900 font-bold">{vertical.name}</Link>
          <span className="mx-1">/</span>
          <span className="text-gray-900">{subCategory.label}</span>
        </nav>

        <section
          className="relative rounded-3xl overflow-hidden mb-8"
          style={{ background: `linear-gradient(135deg, ${vertical.toneFrom} 0%, ${vertical.toneTo} 100%)` }}
        >
          <div className="px-6 sm:px-10 py-14 sm:py-16 text-center">
            <p className="text-[10px] font-black tracking-[0.3em] text-gray-700 mb-3">COMING SOON</p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-wider text-gray-900 mb-2">{subCategory.label}</h1>
            <p className="text-sm text-gray-800 font-bold">{vertical.name}</p>
            <p className="text-sm text-gray-700 max-w-md mx-auto mt-4 leading-relaxed">{subCategory.desc}</p>
          </div>
        </section>

        <section className="card p-6 mb-6 bg-snow text-center">
          <h2 className="text-base font-bold text-gray-900 mb-2">{vertical.name} {subCategory.label} 은 준비 중입니다</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            이 페이지는 곧 실제 데이터로 채워집니다. 출시 전까지는 다른 카테고리나 SNOWPAN 을 이용해주세요.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Link to={vertical.basePath} className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg font-bold text-xs">{vertical.name} 홈으로</Link>
            <Link to="/snowpan" className="inline-block px-4 py-2 bg-snow border border-gray-300 text-gray-700 rounded-lg font-bold text-xs">SNOWPAN 이용하기</Link>
          </div>
        </section>

        {/* 같은 버티컬의 다른 카테고리 둘러보기 */}
        {vertical.homeCategories && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 tracking-widest px-1">{vertical.name} 다른 카테고리</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {vertical.homeCategories.filter(c => c.slug !== categorySlug).map(c => (
                <Link key={c.slug} to={`${vertical.basePath}/${c.slug}`} className="card p-4 hover:border-gray-900 transition-colors">
                  <div className="text-sm font-bold text-gray-900">{c.label}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{c.desc}</div>
                  <div className="text-[9px] font-bold text-gray-400 tracking-wider mt-2">SOON</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ── 버티컬 홈 렌더 ─────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section
        className="relative rounded-3xl overflow-hidden mb-8"
        style={{ background: `linear-gradient(135deg, ${vertical.toneFrom} 0%, ${vertical.toneTo} 100%)` }}
      >
        <div className="px-6 sm:px-10 py-14 sm:py-20 text-center">
          <p className="text-[10px] sm:text-[11px] font-black tracking-[0.3em] text-gray-700 mb-3">
            COMING SOON · PAN PLATFORM
          </p>
          <h1 className="text-4xl sm:text-6xl font-black tracking-[0.08em] text-gray-900 mb-3">
            {vertical.name}
          </h1>
          <p className="text-sm sm:text-base font-bold text-gray-800 mb-2">{vertical.tagline}</p>
          {vertical.englishSlogan && (
            <p className="text-[10px] sm:text-xs tracking-[0.2em] text-gray-700 font-medium opacity-80">
              {vertical.englishSlogan}
            </p>
          )}
          <p className="text-sm text-gray-700 max-w-md mx-auto mt-5 leading-relaxed">
            {vertical.description}
          </p>
        </div>
      </section>

      {/* 카테고리 그리드 — SNOWPAN 처럼 진입점 노출 */}
      {vertical.homeCategories && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold text-gray-900">카테고리</h2>
            <span className="text-[10px] text-gray-500">모두 준비 중</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {vertical.homeCategories.map(cat => (
              <Link
                key={cat.slug}
                to={`${vertical.basePath}/${cat.slug}`}
                className="card p-4 hover:border-gray-900 transition-colors text-center"
              >
                <div className="text-sm font-bold text-gray-900">{cat.label}</div>
                <div className="text-[10px] text-gray-500 mt-1 leading-tight">{cat.desc}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Preview Categories (출시 시 제공 예정 더 자세히) */}
      {vertical.previewCategories && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold text-gray-900">출시 시 제공 예정</h2>
            <span className="text-[10px] font-bold tracking-wider bg-gray-900 text-white px-2 py-0.5 rounded-full">
              PREVIEW
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {vertical.previewCategories.map((cat) => (
              <div key={cat.label} className="card p-4 opacity-90">
                <div className="text-sm font-bold text-gray-900">{cat.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{cat.desc}</div>
                <div className="text-[9px] font-bold text-gray-400 tracking-wider mt-2">SOON</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Why this matters */}
      <section className="card p-6 mb-8 bg-snow">
        <h2 className="text-base font-bold text-gray-900 mb-2">{vertical.name} 은 왜 별도일까요?</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          만능 플랫폼은 모든 종목에서 어중간해져요. 시세는 잡음이 끼고, 커뮤니티는 깊이를 잃습니다.
          PAN 은 종목마다 <strong>전용 플랫폼</strong>을 따로 만들어 그 종목의 정확한 시세·신뢰·커뮤니티를 보장합니다.
          계정·뱃지·신뢰 신호만 우산 아래 공유돼요.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mt-2">
          <strong>{vertical.name}</strong> 출시는 시장 신호와 베이스 플랫폼 안정화를 보고 결정합니다.
          기다리는 사이, 첫 번째 플랫폼인 <Link to="/snowpan" className="text-sky-600 underline font-bold">SNOWPAN</Link> 을 이용해보세요.
        </p>
      </section>

      {/* CTAs */}
      <section className="grid sm:grid-cols-2 gap-3 mb-10">
        {otherActives.map(v => (
          <Link
            key={v.slug}
            to={v.basePath}
            className="card p-5 hover:border-gray-900 transition-colors block relative overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${v.toneFrom} 0%, ${v.toneTo} 100%)` }}
              aria-hidden
            />
            <div className="relative">
              <p className="text-[9px] font-black tracking-[0.2em] text-gray-400">{v.slug.toUpperCase()}</p>
              <h3 className="text-lg font-black tracking-wider text-gray-900 mt-1">{v.name}</h3>
              <p className="text-xs text-gray-600 mt-1">{v.tagline}</p>
              <p className="text-xs font-bold text-gray-900 mt-3 inline-flex items-center gap-1">
                지금 이용하기 <span aria-hidden>→</span>
              </p>
            </div>
          </Link>
        ))}
        <Link
          to="/pan"
          className="card p-5 hover:border-gray-900 transition-colors block bg-gray-900 text-white border-gray-900"
        >
          <p className="text-[9px] font-black tracking-[0.2em] opacity-70">PAN PLATFORMS</p>
          <h3 className="text-lg font-black tracking-wider mt-1">전체 보기</h3>
          <p className="text-xs opacity-80 mt-1">PAN 우산 아래 모든 플랫폼</p>
          <p className="text-xs font-bold mt-3 inline-flex items-center gap-1">
            허브로 이동 <span aria-hidden>→</span>
          </p>
        </Link>
      </section>
    </div>
  );
}
