import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, imageUrl as toImageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import UserBadges from '../components/UserBadges';
import Pagination from '../components/Pagination';
import { ChatIcon, FireIcon, HeartFilledIcon, SkiIcon, SnowboardIcon } from '../components/Icons';
import CategoryAdBanner from '../components/CategoryAdBanner';
import EmptyState from '../components/EmptyState';
import { communityCategoryLabel } from '../utils/communityLabels';

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  sport: string;
  images?: string | null;
  likes: number;
  views: number;
  commentCount: number;
  user: { id: string; name: string; badges?: string[] };
  createdAt: string;
}

const badgeMap: Record<string, string> = {
  free: '자유', review: '장비리뷰', gear: '장비추천', resort: '스키장후기', tip: '초보팁', carpool: '카풀/동행', poll: '투표',
};

const badgeColor: Record<string, string> = {
  '자유': 'text-accent-light bg-accent/10 border-accent/20',
  '장비리뷰': 'text-mint bg-mint/10 border-mint/20',
  '스키장후기': 'text-gold bg-gold/10 border-gold/20',
  '초보팁': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  '카풀/동행': 'text-coral bg-coral/10 border-coral/20',
  '장비추천': 'text-sky-500 bg-sky-50 border-sky-200',
  '투표': 'text-orange-500 bg-orange-50 border-orange-200',
};

const PAGE_SIZE = 20;

const Community = () => {
  const { sport } = useParams<{ sport: string }>();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [popularPosts, setPopularPosts] = useState<Post[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  const SportLabel = () => (
    <span className="inline-flex items-center gap-1.5">
      {sport === 'ski' ? <SkiIcon size={16} /> : <SnowboardIcon size={16} />}
      {sport === 'ski' ? t('used.cat.ski') : t('used.cat.board')}
    </span>
  );

  // 카테고리 라벨은 종목별로 다름 — 보드 커뮤니티에선 'resort' 가 '라이딩 장소' 로 표시.
  const tabs = [
    { id: 'all', name: t('community.all') },
    { id: 'popular', name: '인기' },
    { id: 'free', name: communityCategoryLabel('free', sport) },
    { id: 'review', name: communityCategoryLabel('review', sport) },
    { id: 'gear', name: communityCategoryLabel('gear', sport) },
    { id: 'resort', name: communityCategoryLabel('resort', sport) },
    { id: 'tip', name: communityCategoryLabel('tip', sport) },
    { id: 'carpool', name: communityCategoryLabel('carpool', sport) },
    { id: 'poll', name: communityCategoryLabel('poll', sport) },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => { setTimeout(() => setPage(1), 0); }, [sport, selectedTab, debouncedSearch]);

  // 인기 게시글 로딩
  useEffect(() => {
    if (selectedTab !== 'popular') return;
    setLoading(true);
    api<Post[]>(`/community/popular?sport=${sport || ''}`)
      .then(data => { setPopularPosts(Array.isArray(data) ? data : []); })
      .catch(() => setPopularPosts([]))
      .finally(() => setLoading(false));
  }, [sport, selectedTab]);

  // 일반 게시글 로딩
  useEffect(() => {
    if (selectedTab === 'popular') return;
    setTimeout(() => setLoading(true), 0);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
    if (sport) params.set('sport', sport);
    if (selectedTab !== 'all') params.set('category', selectedTab);
    if (debouncedSearch) params.set('search', debouncedSearch);

    api<{ posts: Post[]; totalCount: number }>(`/community?${params}`)
      .then(data => { setPosts(data.posts); setTotalCount(data.totalCount); })
      .catch(() => { setPosts([]); setTotalCount(0); })
      .finally(() => setLoading(false));
  }, [sport, selectedTab, debouncedSearch, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '방금';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/community')} className="text-gray-500 text-lg">←</button>
          <h1 className="text-xl font-bold text-gray-900 inline-flex items-center gap-2"><SportLabel /> {t('community.title')}</h1>
        </div>
        <div className="flex gap-2">
          {selectedTab === 'poll' && (
            <Link to="/poll/create" className="px-3 py-1.5 bg-orange-500 text-white rounded-lg font-bold text-xs transition-colors whitespace-nowrap">
              + 투표
            </Link>
          )}
          <Link to={`/community/${sport}/write`} className="px-3 py-1.5 bg-primary text-white rounded-lg font-bold text-xs active:bg-primary-dark transition-colors whitespace-nowrap">
            + {t('community.write')}
          </Link>
        </div>
      </div>

      <CategoryAdBanner category="community" />

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('community.searchPlaceholder')} className="w-full h-10 pl-9 pr-4 rounded-lg text-sm bg-gray-50 border border-gray-100 text-gray-900 placeholder-gray-400" />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setSelectedTab(tab.id)} className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all ${selectedTab === tab.id ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}>
            {tab.name}
          </button>
        ))}
      </div>

      {selectedTab === 'popular' && !loading && popularPosts.length > 0 && (
        <div className="bg-gradient-to-r from-sky-50 to-white rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-sky-600">
          <FireIcon size={12} /> 최근 7일간 좋아요·조회수 TOP 10
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">{t('general.loading')}</div>
      ) : (
        <div className="space-y-2">
          {(selectedTab === 'popular' ? popularPosts : posts).map((post, idx) => {
            const firstImage = post.images ? post.images.split(',')[0]?.trim() : null;
            const rank = selectedTab === 'popular' ? idx + 1 : 0;
            return (
            <Link to={`/community/post/${post.id}`} key={post.id} className="card p-4 block card-hover">
              <div className="flex gap-3">
                {rank > 0 && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${rank <= 3 ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {rank}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${badgeColor[badgeMap[post.category] || ''] || 'text-gray-600 bg-gray-100 border-gray-300'}`}>
                      {badgeMap[post.category] || post.category}
                    </span>
                    <span className="text-[10px] text-gray-500">{formatTime(post.createdAt)}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{post.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{post.content}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1">{post.user.name} <UserBadges badges={post.user.badges} /></span>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span>조회 {post.views}</span>
                      <span className="text-coral inline-flex items-center gap-0.5"><HeartFilledIcon size={11} /> {post.likes}</span>
                      <span>{t('communityDetail.comments')} {post.commentCount}</span>
                    </div>
                  </div>
                </div>
                {firstImage && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                    <img src={toImageUrl(firstImage)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
              </div>
            </Link>
            );
          })}
        </div>
      )}

      {!loading && (selectedTab === 'popular' ? popularPosts : posts).length === 0 && (
        selectedTab === 'popular' ? (
          <EmptyState
            icon={<FireIcon size={48} />}
            title="최근 7일간 인기 게시글이 없어요"
            description={"좋아요·조회수가 누적되면 TOP 10이 표시됩니다.\n첫 게시글을 남겨 인기글에 도전해보세요."}
            ctaLabel="글쓰기"
            ctaTo={`/community/${sport}/write`}
          />
        ) : debouncedSearch ? (
          <EmptyState
            title={t('community.noResults')}
            description={`"${debouncedSearch}" 와(과) 일치하는 게시글이 없어요.\n다른 키워드로 검색해보세요.`}
          />
        ) : (
          <EmptyState
            icon={<ChatIcon size={48} strokeWidth={1.4} />}
            title={t('community.noPosts')}
            description={"첫 글을 남겨\n다른 스키어들과 이야기를 시작해보세요."}
            ctaLabel="첫 글 쓰기"
            ctaTo={`/community/${sport}/write`}
          />
        )
      )}

      {selectedTab !== 'popular' && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
    </div>
  );
};

export default Community;
