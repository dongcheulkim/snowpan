import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate, Navigate } from 'react-router-dom';
import { api, imageUrl as toImageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import UserBadges from '../components/UserBadges';
import Pagination from '../components/Pagination';
import { ChatIcon, FireIcon, HeartFilledIcon, SkiIcon, SnowboardIcon } from '../components/Icons';
import CategoryAdBanner from '../components/CategoryAdBanner';
import EmptyState from '../components/EmptyState';
import { communityCategoryLabel, COMMUNITY_GROUPS } from '../utils/communityLabels';
import { useVertical } from '../hooks/useVertical';
import { RowListSkeleton } from '../components/Skeleton';

interface Post {
  isPremium?: boolean;
  id: string;
  title: string;
  content: string;
  category: string;
  sport: string;
  pinned?: boolean;
  images?: string | null;
  likes: number;
  views: number;
  commentCount: number;
  user: { id: string; name: string; badges?: string[] };
  createdAt: string;
}

interface PollItem {
  id: string;
  title: string;
  author: string;
  totalVotes: number;
  views: number;
  likes: number;
  options: { id: string; label: string; votes: number; pct: number }[];
  createdAt: string;
}

const badgeMap: Record<string, string> = {
  free: '자유', review: '장비리뷰', gear: '장비추천', resort: '스키장후기', tip: '초보팁', carpool: '카풀/동행', meetup: '모임', job: '구인', jobseek: '구직', poll: '투표', notice: '공지',
};

const badgeColor: Record<string, string> = {
  '자유': 'text-accent-light bg-accent/10 border-accent/20',
  '장비리뷰': 'text-mint bg-mint/10 border-mint/20',
  '스키장후기': 'text-gold bg-gold/10 border-gold/20',
  '초보팁': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  '카풀/동행': 'text-coral bg-coral/10 border-coral/20',
  '구인': 'text-indigo-500 bg-indigo-50 border-indigo-200',
  '구직': 'text-teal-600 bg-teal-50 border-teal-200',
  '장비추천': 'text-sky-500 bg-sky-50 border-sky-200',
  '모임': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  '투표': 'text-orange-500 bg-orange-50 border-orange-200',
  '공지': 'text-red-600 bg-red-50 border-red-200 font-bold',
};

const PAGE_SIZE = 20;

const Community = () => {
  const { sport } = useParams<{ sport: string }>();
  const navigate = useNavigate();
  // 잘못된 종목 URL(/community/xxx)은 선택 화면으로 — 고아 필터 화면 방지
  const validSports = ['ski', 'board'];
  const sportInvalid = !!sport && !validSports.includes(sport);
  // ?tab= 딥링크 지원 (투표 삭제 후 복귀 등) — 유효한 탭 id 만 수용
  const initialTab = (() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      return t && ['all', 'popular', 'g_talk', 'g_gear', 'g_info', 'g_jobs', 'poll'].includes(t) ? t : 'all';
    } catch { return 'all'; }
  })();
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [selectedSub, setSelectedSub] = useState('all'); // 대분류 안 소분류
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [popularPosts, setPopularPosts] = useState<Post[]>([]);
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const reqSeq = useRef(0); // 탭 전환 경쟁 시 낡은 응답·finally 무시
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  // 판(vertical)별 종목 라벨 — snow 는 스키/보드 아이콘, run 등은 config 의 sports 라벨.
  const vertical = useVertical();
  const vbase = vertical.slug === 'snow' ? '' : vertical.basePath;
  const sportConf = vertical.sports?.find((s) => s.id === sport);
  const SportLabel = () => (
    <span className="inline-flex items-center gap-1.5">
      {sport === 'ski' && <SkiIcon size={16} />}
      {sport === 'board' && <SnowboardIcon size={16} />}
      {sport === 'ski' ? t('used.cat.ski') : sport === 'board' ? t('used.cat.board') : (sportConf?.label || sport)}
    </span>
  );

  // 카테고리 라벨은 종목별로 다름 — 보드 커뮤니티에선 'resort' 가 '라이딩 장소' 로 표시.
  // 대분류 → 소분류 2단계 (중고거래와 동일 UX). 대분류 선택 시 소분류 칩이 아래로 펼쳐짐.
  const tabs: { id: string; name: string; subs?: string[] }[] = [
    { id: 'all', name: t('community.all') },
    { id: 'popular', name: '인기' },
    ...COMMUNITY_GROUPS,
    // 투표는 판 구분 없는 snow 시스템 — 다른 판에선 탭 미노출.
    ...(vertical.slug === 'snow' ? [{ id: 'poll', name: communityCategoryLabel('poll', sport) }] : []),
  ];
  const activeGroup = tabs.find((tb) => tb.id === selectedTab);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => { setTimeout(() => setPage(1), 0); }, [sport, selectedTab, selectedSub, debouncedSearch]);
  useEffect(() => { setSelectedSub('all'); }, [selectedTab]);

  // 인기 게시글 로딩
  useEffect(() => {
    if (selectedTab !== 'popular') return;
    const seq = ++reqSeq.current;
    setLoading(true);
    api<Post[]>(`/community/popular?sport=${sport || ''}`)
      .then(data => { if (reqSeq.current === seq) setPopularPosts(Array.isArray(data) ? data : []); })
      .catch(() => { if (reqSeq.current === seq) setPopularPosts([]); })
      .finally(() => { if (reqSeq.current === seq) setLoading(false); });
  }, [sport, selectedTab]);

  // 투표 탭 — 서버화된 Poll 목록 로딩 (커뮤니티 글이 아닌 별도 Poll 시스템).
  useEffect(() => {
    if (selectedTab !== 'poll' && selectedTab !== 'all') return;
    const seq = selectedTab === 'poll' ? ++reqSeq.current : reqSeq.current;
    if (selectedTab === 'poll') setTimeout(() => setLoading(true), 0);
    api<{ items: PollItem[] }>(`/polls?limit=${PAGE_SIZE}`)
      .then(data => setPolls(data.items || []))
      .catch(() => setPolls([]))
      .finally(() => { if (selectedTab === 'poll' && reqSeq.current === seq) setLoading(false); });
  }, [selectedTab]);

  // 일반 게시글 로딩 (poll/popular 제외)
  useEffect(() => {
    if (selectedTab === 'popular' || selectedTab === 'poll') return;
    const seq = ++reqSeq.current;
    setTimeout(() => { if (reqSeq.current === seq) setLoading(true); }, 0);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
    if (sport) params.set('sport', sport);
    if (activeGroup?.subs) {
      params.set('category', selectedSub !== 'all' ? selectedSub : activeGroup.subs.join(','));
    }
    if (debouncedSearch) params.set('search', debouncedSearch);

    api<{ posts: Post[]; totalCount: number }>(`/community?${params}`)
      .then(data => { if (reqSeq.current === seq) { setPosts(data.posts); setTotalCount(data.totalCount); } })
      .catch(() => { if (reqSeq.current === seq) { setPosts([]); setTotalCount(0); } })
      .finally(() => { if (reqSeq.current === seq) setLoading(false); });
  }, [sport, selectedTab, selectedSub, debouncedSearch, page]);

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

  // 투표 카드 — 투표 탭과 전체 탭 병합 피드에서 공용
  const renderPollCard = (poll: PollItem) => (
    <Link to={`/poll/${poll.id}`} key={`poll-${poll.id}`} className="card p-4 block card-hover">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded border text-orange-500 bg-orange-50 border-orange-200">투표</span>
        <span className="text-[10px] text-gray-500">{formatTime(poll.createdAt)}</span>
      </div>
      <h3 className="text-sm font-bold text-gray-900 mb-2">{poll.title}</h3>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {poll.options.slice(0, 4).map((o) => (
          <span key={o.id} className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">{o.label}</span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-500">{poll.author}</span>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span>{poll.totalVotes.toLocaleString()}명 참여</span>
          <span>조회 {poll.views}</span>
          <span className="text-coral inline-flex items-center gap-0.5"><HeartFilledIcon size={11} /> {poll.likes}</span>
        </div>
      </div>
    </Link>
  );

  // 전체 탭 1페이지: 게시글과 투표를 시간순으로 병합 (공지 고정글은 항상 위)
  type FeedItem = { kind: 'post'; post: Post } | { kind: 'poll'; poll: PollItem };
  const baseList: Post[] = selectedTab === 'popular' ? popularPosts : posts;
  let feedItems: FeedItem[] = baseList.map((p) => ({ kind: 'post' as const, post: p }));
  if (selectedTab === 'all' && page === 1 && polls.length && !debouncedSearch) {
    const at = (f: FeedItem) => new Date(f.kind === 'post' ? f.post.createdAt : f.poll.createdAt).getTime();
    const pinnedItems = feedItems.filter((f) => f.kind === 'post' && f.post.pinned);
    const restItems: FeedItem[] = [
      ...feedItems.filter((f) => !(f.kind === 'post' && f.post.pinned)),
      ...polls.map((p) => ({ kind: 'poll' as const, poll: p })),
    ].sort((a, b) => at(b) - at(a));
    feedItems = [...pinnedItems, ...restItems];
  }

  if (sportInvalid) return <Navigate to="/community" replace />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`${vbase}/community`)} className="text-gray-500 text-lg">←</button>
          <h1 className="text-xl font-bold text-gray-900 inline-flex items-center gap-2">{SportLabel()} {t('community.title')}</h1>
        </div>
        <div className="flex gap-2">
          {selectedTab === 'poll' && (
            <Link to="/poll/create" className="px-3 py-1.5 bg-orange-500 text-white rounded-lg font-bold text-xs transition-colors whitespace-nowrap">
              + 투표
            </Link>
          )}
          <Link to={`${vbase}/community/${sport}/write`} className="px-3 py-1.5 bg-primary text-white rounded-lg font-bold text-xs active:bg-primary-dark transition-colors whitespace-nowrap">
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

      <div className="space-y-1.5">
        <div className="flex gap-1.5 flex-wrap">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => { setSelectedTab(tab.id); setSelectedSub('all'); }} className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all ${selectedTab === tab.id ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}>
              {tab.name}
            </button>
          ))}
        </div>
        {activeGroup?.subs && (
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setSelectedSub('all')} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${selectedSub === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
              전체
            </button>
            {activeGroup.subs.map((id) => (
              <button key={id} onClick={() => setSelectedSub(id)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${selectedSub === id ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                {communityCategoryLabel(id, sport)}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedTab === 'popular' && !loading && popularPosts.length > 0 && (
        <div className="bg-gradient-to-r from-sky-50 to-white rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-sky-600">
          <FireIcon size={12} /> 최근 7일간 좋아요·조회수 TOP 10
        </div>
      )}

      {/* 투표 탭 — Poll 카드 목록 */}
      {selectedTab === 'poll' && !loading && (
        polls.length === 0 ? (
          <EmptyState
            icon={<ChatIcon size={48} strokeWidth={1.4} />}
            title="아직 진행 중인 투표가 없어요"
            description={"첫 투표를 만들어\n다른 스키어들의 의견을 모아보세요."}
            ctaLabel="+ 투표 만들기"
            ctaTo="/poll/create"
          />
        ) : (
          <div className="space-y-2">
            {polls.map(renderPollCard)}
          </div>
        )
      )}

      {selectedTab !== 'poll' && (loading ? (
        <RowListSkeleton count={6} />
      ) : (
        <div className="space-y-2">
          {feedItems.map((item, idx) => {
            if (item.kind === 'poll') return renderPollCard(item.poll);
            const post = item.post;
            const firstImage = post.images ? post.images.split(',')[0]?.trim() : null;
            const rank = selectedTab === 'popular' ? idx + 1 : 0;
            return (
            <Link to={`${vbase}/community/post/${post.id}`} key={post.id} className="card p-4 block card-hover">
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
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{post.pinned && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1 py-0.5 mr-1.5 align-middle">공지</span>}{post.isPremium && <span className="text-[10px] font-bold text-white bg-gold/80 rounded px-1 py-0.5 mr-1.5 align-middle">AD</span>}{post.title}</h3>
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
      ))}

      {selectedTab !== 'poll' && !loading && (selectedTab === 'popular' ? popularPosts : posts).length === 0 && (
        selectedTab === 'popular' ? (
          <EmptyState
            icon={<FireIcon size={48} />}
            title="최근 7일간 인기 게시글이 없어요"
            description={"좋아요·조회수가 누적되면 TOP 10이 표시됩니다.\n첫 게시글을 남겨 인기글에 도전해보세요."}
            ctaLabel="글쓰기"
            ctaTo={`${vbase}/community/${sport}/write`}
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
            description={`첫 글을 남겨\n다른 ${vertical.slug === 'snow' ? '스키어' : vertical.audience}들과 이야기를 시작해보세요.`}
            ctaLabel="첫 글 쓰기"
            ctaTo={`${vbase}/community/${sport}/write`}
          />
        )
      )}

      {selectedTab !== 'popular' && selectedTab !== 'poll' && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
    </div>
  );
};

export default Community;
