import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import { categoryIcons, SecondHandIcon } from '../components/CategoryIcons';
import BrandHero from '../components/BrandHero';
import { useVertical } from '../hooks/useVertical';

interface BannerData {
  id: string;
  title: string;
  description: string;
  tag: string;
  url: string;
  image: string | null;
  textColor?: string | null;
  textAlign?: string | null;
}

// 홈 "지금 핫한 커뮤니티" — 인기글 + 투표를 핫한 순으로 섞어 상위 5개.
interface PopularPost {
  id: string;
  title: string;
  category: string;
  likes: number;
  views: number;
  images?: string | null;
  commentCount?: number;
  _count?: { comments: number };
}

interface HotPoll {
  id: string;
  title: string;
  likes: number;
  views: number;
  totalVotes: number;
  createdAt: string;
}

// 글·투표 공통 핫함 점수 — 좋아요 > 참여(댓글/투표) > 조회 순 가중치.
type HotItem =
  | { kind: 'post'; id: string; title: string; category: string; likes: number; views: number; comments: number; thumb?: string; score: number }
  | { kind: 'poll'; id: string; title: string; likes: number; views: number; votes: number; score: number };

// 홈 "매장 소식·이벤트" — /shop-posts/recent (승인 매장 전체 최신).
interface ShopNews {
  id: string;
  title: string;
  content: string;
  images: string | null;
  postType: string;
  createdAt: string;
  shopName: string;
}

const POST_CAT_LABEL: Record<string, string> = {
  free: '자유', review: '장비리뷰', gear: '장비추천', resort: '스키장후기',
  tip: '초보팁', carpool: '카풀/동행', meetup: '모임', job: '구인', jobseek: '구직', notice: '공지',
};
const NEWS_TYPE_LABEL: Record<string, { text: string; color: string }> = {
  general: { text: '소식', color: 'bg-gray-100 text-gray-600' },
  promo: { text: '프로모션', color: 'bg-sky-100 text-sky-700' },
  event: { text: '이벤트', color: 'bg-orange-100 text-orange-700' },
  notice: { text: '공지', color: 'bg-emerald-100 text-emerald-700' },
};

const Home = () => {
  const vertical = useVertical();
  const isSnow = vertical.slug === 'snow';
  const verticalBase = isSnow ? '' : vertical.basePath; // '' for snow (root), '/bike' for bike etc.

  const [currentBanner, setCurrentBanner] = useState(0);
  const [, setLangTick] = useState(0);

  useEffect(() => {
    document.title = isSnow
      ? '스노우판 - 스키/보드 중고거래 & 렌탈'
      : `${vertical.name} - ${vertical.tagline} | PAN`;
  }, [isSnow, vertical]);

  // Re-render on language change
  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick((p) => p + 1), 0));
  }, []);

  const [banners, setBanners] = useState<BannerData[]>([]);
  const [hotAll, setHotAll] = useState<HotItem[]>([]); // 전체 랭킹 (칩 필터 전)
  const [hotTab, setHotTab] = useState('all'); // 홈 핫 섹션 카테고리 칩
  const [news, setNews] = useState<ShopNews[]>([]);

  // 핫 섹션 카테고리 칩 — 탭하면 그 카테고리의 핫한 것만.
  const HOT_TABS = [
    { id: 'all', label: '전체' },
    { id: 'poll', label: '투표' },
    { id: 'free', label: '자유' },
    { id: 'gear', label: '장비' },      // review + gear
    { id: 'resort', label: '스키장후기' },
    { id: 'tip', label: '초보팁' },
    { id: 'job', label: '구인구직' },   // job + jobseek 묶음
  ];
  const hot = hotAll.filter((it) => {
    if (hotTab === 'all') return true;
    if (hotTab === 'poll') return it.kind === 'poll';
    if (it.kind !== 'post') return false;
    if (hotTab === 'gear') return it.category === 'review' || it.category === 'gear';
    if (hotTab === 'job') return it.category === 'job' || it.category === 'jobseek';
    return it.category === hotTab;
  }).slice(0, 5);

  // 핫한 커뮤니티(인기글+투표 혼합) + 매장 소식 (snow 전용)
  useEffect(() => {
    if (!isSnow) return;
    Promise.all([
      api<PopularPost[]>('/community/popular?sport=ski').catch(() => [] as PopularPost[]),
      api<{ items: HotPoll[] }>('/polls?limit=10').then((d) => d.items || []).catch(() => [] as HotPoll[]),
    ]).then(([posts, polls]) => {
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const items: HotItem[] = [
        ...(Array.isArray(posts) ? posts : []).map((p): HotItem => {
          const comments = p.commentCount ?? p._count?.comments ?? 0;
          const thumb = (p.images || '').split(',').filter(Boolean)[0];
          return { kind: 'post', id: p.id, title: p.title, category: p.category, likes: p.likes, views: p.views ?? 0, comments, thumb, score: p.likes * 10 + comments * 5 + (p.views ?? 0) };
        }),
        // 투표는 최근 2주 것만 랭킹 (오래된 투표가 계속 남는 것 방지)
        ...polls.filter((p) => new Date(p.createdAt).getTime() >= twoWeeksAgo).map((p): HotItem => (
          { kind: 'poll', id: p.id, title: p.title, likes: p.likes, views: p.views ?? 0, votes: p.totalVotes ?? 0, score: p.likes * 10 + (p.totalVotes ?? 0) * 5 + (p.views ?? 0) }
        )),
      ];
      items.sort((a, b) => b.score - a.score);
      setHotAll(items); // 칩 필터가 골라 쓰도록 전체 보관 (표시는 5개씩)
    });
    api<{ items: ShopNews[] }>('/shop-posts/recent?limit=5')
      .then((d) => setNews(d.items || []))
      .catch(() => {});
  }, [isSnow]);

  useEffect(() => {
    if (!isSnow) return; // 배너 광고는 snow 전용 — 다른 판은 브랜드 슬라이드만.
    api<BannerData[]>('/banners')
      .then((data) => setBanners(data))
      .catch(() => {});
  }, [isSnow]);

  // snow: 브랜드 1 + 광고 N + 광고모집 1 (상시 회전). 다른 판: 브랜드 슬라이드만.
  const totalSlides = isSnow ? 2 + banners.length : 1;

  useEffect(() => {
    if (totalSlides <= 1) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % totalSlides);
    }, 4000);
    return () => clearInterval(timer);
  }, [totalSlides]);

  // 카테고리는 vertical 별로 다름.
  // snow 는 기존 9개 (스키 도메인 특화). 다른 vertical 은 config 의 homeCategories.
  const categories: { id: keyof typeof categoryIcons | string; title: string; link: string }[] = isSnow
    ? [
        { id: 'skishop', title: '스키샵', link: '/new-equipment' },
        { id: 'repair', title: '정비', link: '/repair' },
        { id: 'used', title: t('cat.used'), link: '/used' },
        { id: 'rental', title: t('cat.rental'), link: '/rental' },
        { id: 'lesson', title: t('cat.lesson'), link: '/lesson' },
        { id: 'accommodation', title: t('cat.accommodation'), link: '/accommodation' },
        { id: 'community', title: t('cat.community'), link: '/community' },
        { id: 'competitions', title: '시합일정', link: '/competitions' },
        { id: 'webcam', title: t('cat.webcam'), link: '/webcam' },
        { id: 'overseas', title: '스키장 정보', link: '/overseas' },
      ]
    : (vertical.homeCategories || []).map(c => ({
        id: c.slug,
        title: c.label,
        link: `${verticalBase}/${c.slug}`,
      }));

  return (
    <div className="min-h-screen bg-sky-50">
      <h1 className="sr-only">{isSnow ? '스노우판 — 스키·보드 중고거래, 렌탈, 레슨, 숙소를 한 곳에' : `${vertical.name} — ${vertical.tagline}`}</h1>

      {/* Hero — 브랜드 소개 슬라이드 + 광고 rotator (브랜드는 항상 슬라이드 #0)
          광고 카드는 다크모드에서도 light bg 강제 (광고주가 정한 textColor 가
          어두운 텍스트인 경우 가독성 보존). inline style 로 dark mode override 회피.
          모바일에서 임팩트 위해 정사각형 가까운 비율(5/4), 데스크탑은 슬림 유지. */}
      <div className="px-4 pt-3 pb-5 bg-snow">
        <div
          className="relative overflow-hidden rounded-2xl border aspect-[5/4]"
          style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
        >
          {/* Slide #0: 브랜드 소개 — translate-only 슬라이드 (opacity 페이드 제거 → 두 슬라이드 동시 노출 버그 해소) */}
          <div
            aria-hidden={currentBanner !== 0}
            className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
              currentBanner === 0 ? 'translate-x-0' : '-translate-x-full pointer-events-none'
            }`}
          >
            <BrandHero />
          </div>

          {/* Slide #1~N: 광고 */}
          {banners.map((banner, idx) => {
            const slideIdx = idx + 1;
            const inactive = slideIdx !== currentBanner;
            return (
              <a
                key={banner.id}
                // URL 없는 광고는 클릭해도 이동 안 함 — 빈 href 로 빈 탭 열리던 것 방지
                href={banner.url || undefined}
                target={banner.url ? '_blank' : undefined}
                rel="noopener noreferrer"
                onClick={banner.url ? undefined : (e) => e.preventDefault()}
                aria-hidden={inactive}
                tabIndex={inactive ? -1 : 0}
                className={`absolute inset-0 flex items-center px-5 transition-transform duration-500 ease-in-out cursor-pointer ${
                  slideIdx === currentBanner
                    ? 'translate-x-0'
                    : slideIdx < currentBanner
                    ? '-translate-x-full pointer-events-none'
                    : 'translate-x-full pointer-events-none'
                }`}
              >
                {banner.image && (
                  <img src={imageUrl(banner.image, 900)} alt={banner.title} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                )}
                <div className={`flex-1 relative z-10 ${banner.textAlign === 'center' ? 'text-center' : banner.textAlign === 'right' ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${banner.textAlign === 'center' ? 'justify-center' : banner.textAlign === 'right' ? 'justify-end' : ''}`}>
                    <span className="text-[15px] font-bold" style={banner.textColor ? { color: banner.textColor } : undefined}>{banner.title}</span>
                  </div>
                  <p className="text-sm" style={banner.textColor ? { color: banner.textColor, opacity: 0.8 } : { color: '#6b7280' }}>{banner.description}</p>
                </div>
                <span className="absolute bottom-2 left-3 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/55 text-white z-10">AD</span>
              </a>
            );
          })}

          {/* 마지막 슬라이드: 광고 모집 (snow 전용, 상시) — 눌리면 광고 신청으로 */}
          {isSnow && (() => {
            const slideIdx = banners.length + 1;
            const inactive = slideIdx !== currentBanner;
            return (
              <Link
                to="/ad-booking"
                aria-hidden={inactive}
                tabIndex={inactive ? -1 : 0}
                className={`absolute inset-0 flex items-center px-6 transition-transform duration-500 ease-in-out cursor-pointer ${
                  slideIdx === currentBanner
                    ? 'translate-x-0'
                    : slideIdx < currentBanner
                    ? '-translate-x-full pointer-events-none'
                    : 'translate-x-full pointer-events-none'
                }`}
                style={{ backgroundColor: '#ffffff' }}
              >
                <div className="relative z-10">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-sky-500 mb-1.5">AD SPACE</p>
                  <p className="text-xl font-bold text-gray-900 leading-snug">이 자리에<br />광고하세요</p>
                  <p className="text-sm text-gray-500 mt-1.5">스키어·보더에게 내 샵을 알릴 기회</p>
                  <span className="inline-block mt-3.5 px-4 py-2 bg-sky-500 text-white rounded-lg text-xs font-bold">광고 신청하기 →</span>
                </div>
              </Link>
            );
          })()}

          {/* 인디케이터 — 슬라이드 2개 이상일 때만 */}
          {totalSlides > 1 && (
            <div className="absolute bottom-0 right-0 flex z-10">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentBanner(i)}
                  aria-label={`슬라이드 ${i + 1}`}
                  aria-current={i === currentBanner}
                  className="min-w-11 min-h-11 inline-flex items-center justify-center"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-1.5 rounded-full transition-all duration-300 ${i === currentBanner ? 'bg-gray-900 w-5' : 'bg-gray-400 w-1.5'}`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Categories — 둥근 사각 + NEW 배지 (올영 스타일 명료한 클릭 유도) */}
      <div className="px-4 pb-5 bg-snow">
        <div className={`grid ${isSnow ? 'grid-cols-5' : 'grid-cols-4'} gap-y-3 gap-x-1`}>
          {categories.map((cat) => {
            const Icon = (categoryIcons as Record<string, typeof SecondHandIcon>)[cat.id];
            // 신규/핫 카테고리에 빨간 점 (전환 유도). 쿠폰샵은 NEW 강조.
            const showNew = ['used', 'rental', 'competitions'].includes(cat.id as string);
            return (
              <Link
                key={cat.id}
                to={cat.link}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <div className="relative w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-900 hover:bg-gray-200 transition-colors">
                  {Icon ? <Icon size={32} /> : <span className="text-[10px] font-black tracking-widest text-gray-400">{cat.id.toUpperCase().slice(0, 4)}</span>}
                  {showNew && (
                    <span className="absolute top-1 right-1 w-4 h-4 inline-flex items-center justify-center text-[8px] font-black text-white bg-coral rounded-full">N</span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-gray-900 text-center whitespace-nowrap">{cat.title}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 지금 핫한 커뮤니티 — 최근 7일 인기글 상위 5. 비어도 섹션은 항상 표시 */}
      {isSnow && (
        <div className="px-4 pt-2 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900">지금 핫한 커뮤니티</h2>
            <Link to="/community/ski" className="text-xs text-gray-500">전체 보기 &gt;</Link>
          </div>
          {/* 카테고리 칩 — 골라보기 (투표/자유/장비/스키장후기/초보팁) */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
            {HOT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setHotTab(tab.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors whitespace-nowrap flex-shrink-0 ${
                  hotTab === tab.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-snow text-gray-600 border-gray-200'
                }`}
              >{tab.label}</button>
            ))}
          </div>
          {hot.length === 0 ? (
            hotTab === 'all' ? (
              <Link to="/community/ski/write" className="block bg-snow rounded-2xl border border-gray-200 p-6 text-center active:bg-gray-50 transition-colors">
                <p className="text-sm text-gray-500">아직 인기 글이 없어요.</p>
                <p className="text-xs text-sky-600 font-bold mt-1.5">첫 글을 올려보세요 &gt;</p>
              </Link>
            ) : (
              <div className="bg-snow rounded-2xl border border-gray-200 p-6 text-center">
                <p className="text-sm text-gray-500">이 카테고리엔 아직 핫한 {hotTab === 'poll' ? '투표' : '글'}가 없어요.</p>
              </div>
            )
          ) : (
          <div className="bg-snow rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {hot.map((item, i) => (
              <Link
                key={`${item.kind}-${item.id}`}
                to={item.kind === 'poll' ? `/poll/${item.id}` : `/community/post/${item.id}`}
                className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors"
              >
                <span className={`text-sm font-black w-4 text-center flex-shrink-0 ${i < 3 ? 'text-sky-500' : 'text-gray-300'}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate">
                    {item.kind === 'poll' && (
                      <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 mr-1.5 align-middle">투표</span>
                    )}
                    {item.title}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {item.kind === 'poll'
                      ? `투표 ${item.votes.toLocaleString()}명 · 조회 ${item.views.toLocaleString()} · 좋아요 ${item.likes}`
                      : `${POST_CAT_LABEL[item.category] || item.category} · 조회 ${item.views.toLocaleString()} · 좋아요 ${item.likes} · 댓글 ${item.comments}`}
                  </p>
                </div>
                {item.kind === 'post' && item.thumb && (item.thumb.startsWith('/') || item.thumb.startsWith('http')) && (
                  <img src={imageUrl(item.thumb, 120)} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                )}
              </Link>
            ))}
          </div>
          )}
        </div>
      )}

      {/* 매장 소식·이벤트 — 전 매장 최신 소식. 비어도 섹션은 항상 표시 ("곧 올라와요") */}
      {isSnow && (
        <div className="px-4 pt-2 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900">매장 소식·이벤트</h2>
            {/* 홈은 매장당 최신 1개만 — 밀려난 소식은 전체 페이지에서 */}
            <Link to="/shop-news" className="text-xs text-gray-500">전체 보기 &gt;</Link>
          </div>
          {news.length === 0 ? (
            <div className="bg-snow rounded-2xl border border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-500">입점 매장들의 소식과 이벤트가 곧 올라와요.</p>
              <p className="text-xs text-gray-400 mt-1.5">스키샵·렌탈·레슨·정비·숙소의 프로모션 소식이 여기에 표시됩니다.</p>
            </div>
          ) : (
          <div className="bg-snow rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {news.map((n) => {
              const label = NEWS_TYPE_LABEL[n.postType] || NEWS_TYPE_LABEL.general;
              const thumb = (n.images || '').split(',').filter(Boolean)[0];
              return (
                <Link key={n.id} to={`/shop-post/${n.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${label.color}`}>{label.text}</span>
                      <span className="text-[11px] font-bold text-gray-500 truncate">{n.shopName}</span>
                    </div>
                    <p className="text-[13px] font-medium text-gray-900 truncate mt-1">{n.title}</p>
                  </div>
                  {thumb && (
                    <img src={imageUrl(thumb, 120)} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* 하단 여백 — 마지막 섹션과 바텀 내비 사이 */}
      <div className="pb-6" />
    </div>
  );
};

export default Home;
