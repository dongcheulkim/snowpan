import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  sport: string;
  likes: number;
  views: number;
  commentCount: number;
  user: { id: string; name: string };
  createdAt: string;
}

const badgeMap: Record<string, string> = {
  free: '자유', review: '장비리뷰', resort: '스키장후기', tip: '초보팁', carpool: '카풀/동행', poll: '투표',
};

const badgeColor: Record<string, string> = {
  '자유': 'text-accent-light bg-accent/10 border-accent/20',
  '장비리뷰': 'text-mint bg-mint/10 border-mint/20',
  '스키장후기': 'text-gold bg-gold/10 border-gold/20',
  '초보팁': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  '카풀/동행': 'text-coral bg-coral/10 border-coral/20',
  '투표': 'text-orange-500 bg-orange-50 border-orange-200',
};

const Community = () => {
  const { sport } = useParams<{ sport: string }>();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const sportLabel = sport === 'ski' ? '⛷️ 스키' : '🏂 보드';

  const tabs = [
    { id: 'all', name: '전체' },
    { id: 'free', name: '자유' },
    { id: 'review', name: '장비리뷰' },
    { id: 'resort', name: '스키장' },
    { id: 'tip', name: '초보팁' },
    { id: 'carpool', name: '카풀' },
  ];

  useEffect(() => {
    const params = new URLSearchParams();
    if (sport) params.set('sport', sport);
    if (selectedTab !== 'all') params.set('category', selectedTab);

    api<Post[]>(`/community?${params.toString()}`)
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sport, selectedTab]);

  const filteredPosts = posts.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
  });

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
          <button onClick={() => navigate('/community')} className="text-gray-400 text-lg">←</button>
          <h1 className="text-xl font-bold text-gray-900">{sportLabel} 커뮤니티</h1>
        </div>
        <Link to={`/community/${sport}/write`} className="px-3 py-1.5 bg-primary text-white rounded-lg font-bold text-xs active:bg-primary-dark transition-colors whitespace-nowrap">
          + 글쓰기
        </Link>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="제목이나 내용으로 검색" className="w-full h-10 pl-9 pr-4 rounded-lg text-sm bg-gray-50 border border-gray-100 text-gray-900 placeholder-gray-400" />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setSelectedTab(tab.id)} className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all ${selectedTab === tab.id ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500 active:bg-gray-200'}`}>
            {tab.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">로딩 중...</div>
      ) : (
        <div className="space-y-2">
          {filteredPosts.map((post) => (
            <Link to={`/community/post/${post.id}`} key={post.id} className="card p-4 block card-hover">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${badgeColor[badgeMap[post.category] || ''] || 'text-gray-500 bg-gray-100 border-gray-300'}`}>
                  {badgeMap[post.category] || post.category}
                </span>
                <span className="text-[10px] text-gray-400">{formatTime(post.createdAt)}</span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{post.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">{post.content}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">{post.user.name}</span>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span>조회 {post.views}</span>
                  <span className="text-coral">♥ {post.likes}</span>
                  <span>댓글 {post.commentCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && filteredPosts.length === 0 && (
        <div className="text-center py-12 text-gray-400 card text-sm">
          {searchQuery ? '검색 결과가 없습니다.' : '아직 게시글이 없습니다. 첫 글을 작성해보세요!'}
        </div>
      )}
    </div>
  );
};

export default Community;
