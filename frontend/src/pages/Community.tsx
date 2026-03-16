import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

const Community = () => {
  const { sport } = useParams<{ sport: string }>();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sportLabel = sport === 'ski' ? '⛷️ 스키' : '🏂 보드';

  const tabs = [
    { id: 'all', name: '전체' },
    { id: 'free', name: '자유' },
    { id: 'review', name: '장비리뷰' },
    { id: 'resort', name: '스키장' },
    { id: 'tip', name: '초보팁' },
    { id: 'carpool', name: '카풀' },
    { id: 'poll', name: '투표' },
  ];

  const badgeColor: Record<string, string> = {
    '자유': 'text-accent-light bg-accent/10 border-accent/20',
    '장비리뷰': 'text-mint bg-mint/10 border-mint/20',
    '스키장후기': 'text-gold bg-gold/10 border-gold/20',
    '초보팁': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    '카풀/동행': 'text-coral bg-coral/10 border-coral/20',
    '투표': 'text-orange-500 bg-orange-50 border-orange-200',
  };

  const defaultPosts = [
    { id: '1', tab: 'free', badge: '자유', sport: 'ski', title: '올시즌 첫 출격 다녀왔습니다!', preview: '용평 레인보우 슬로프 컨디션 최고였어요. 설질 좋고 사람도 적당하고...', author: '스키매니아', time: '2시간 전', likes: 24, comments: 8, views: 156 },
    { id: '2', tab: 'review', badge: '장비리뷰', sport: 'ski', title: 'Rossignol Soul 7 HD 2시즌 사용 후기', preview: '올라운드 스키로 정말 추천합니다. 카빙도 잘 되고 비정지에서도 안정적...', author: '장비덕후', time: '3시간 전', likes: 42, comments: 15, views: 312 },
    { id: '3', tab: 'resort', badge: '스키장후기', sport: 'board', title: '휘닉스 평창 주말 솔직 후기', preview: '리프트 대기 15분 정도, 슬로프 상태는 괜찮았는데 식당이 너무 비싸요...', author: '보더킹', time: '5시간 전', likes: 18, comments: 12, views: 203 },
    { id: '4', tab: 'tip', badge: '초보팁', sport: 'ski', title: '스키 처음 타시는 분들 꼭 읽어주세요', preview: '장비 렌탈부터 슬로프 매너까지 초보자가 알아야 할 모든 것을 정리했습니다...', author: '프로강사', time: '6시간 전', likes: 89, comments: 31, views: 567 },
    { id: '5', tab: 'carpool', badge: '카풀/동행', sport: 'ski', title: '이번 주 토요일 하이원 같이 가실 분!', preview: '서울 출발 새벽 5시, 차량 있어요. 2명 모집합니다. 왕복 인당 2만원...', author: '라이더준', time: '8시간 전', likes: 7, comments: 22, views: 134 },
    { id: '6', tab: 'free', badge: '자유', sport: 'board', title: '시즌권 vs 일일권 뭐가 더 이득일까요?', preview: '작년에 12번 갔는데 올해도 비슷할 것 같은데 시즌권 살지 고민...', author: '고민중', time: '10시간 전', likes: 15, comments: 28, views: 245 },
    { id: '7', tab: 'review', badge: '장비리뷰', sport: 'board', title: 'Burton Step On 바인딩 솔직 후기', preview: '편하긴 진짜 편한데... 단점도 있습니다. 3시즌 사용 후 느낀 점들...', author: '보드라이프', time: '12시간 전', likes: 56, comments: 19, views: 423 },
    { id: '8', tab: 'resort', badge: '스키장후기', sport: 'ski', title: '비발디파크 야간 스키 후기', preview: '야간 조명 밝고 좋았어요. 평일이라 사람도 별로 없고 연습하기 딱...', author: '야간러버', time: '14시간 전', likes: 22, comments: 6, views: 178 },
  ];

  const userPosts = JSON.parse(localStorage.getItem('communityPosts') || '[]');

  // Load polls as posts
  const defaultPolls = [
    { id: 'ht1', tab: 'poll', badge: '투표', sport: 'ski', title: '올 시즌 최고의 스키장은?', preview: '용평리조트 vs 휘닉스평창 vs 하이원리조트 vs 비발디파크', author: '스노우판', time: '1일 전', likes: 256, comments: 0, views: 1842 },
    { id: 'ht2', tab: 'poll', badge: '투표', sport: 'ski', title: '초보자 첫 장비, 중고 vs 새제품?', preview: '중고로 시작 vs 새 제품 구매', author: '스노우판', time: '2일 전', likes: 189, comments: 0, views: 1253 },
    { id: 'ht3', tab: 'poll', badge: '투표', sport: 'board', title: '보드 바인딩 각도 세팅 공유해요', preview: '여러분의 바인딩 각도 세팅은?', author: '프로라이더', time: '3일 전', likes: 134, comments: 47, views: 967 },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userPolls = JSON.parse(localStorage.getItem('userPolls') || '[]').map((p: any) => ({
    id: p.id,
    tab: 'poll',
    badge: '투표',
    sport: p.sport || sport || 'ski',
    title: p.title,
    preview: p.options?.map((o: { label: string }) => o.label).join(' vs ') || '',
    author: p.author || '나',
    time: '방금 전',
    likes: p.likes || 0,
    comments: 0,
    views: p.views || 0,
  }));

  const posts = [...userPolls, ...userPosts, ...defaultPolls, ...defaultPosts];

  const filteredPosts = posts
    .filter(p => p.sport === sport)
    .filter(p => selectedTab === 'all' || p.tab === selectedTab)
    .filter(p => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.preview.toLowerCase().includes(q);
    });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/community')} className="text-gray-400 text-lg">←</button>
          <h1 className="text-xl font-bold text-gray-900">{sportLabel} 커뮤니티</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/poll/create" className="px-3 py-1.5 bg-orange-500 text-white rounded-lg font-bold text-xs active:bg-orange-600 transition-colors whitespace-nowrap">
            + 투표
          </Link>
          <Link to={`/community/${sport}/write`} className="px-3 py-1.5 bg-primary text-white rounded-lg font-bold text-xs active:bg-primary-dark transition-colors whitespace-nowrap">
            + 글쓰기
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="제목이나 내용으로 검색"
          className="w-full h-10 pl-9 pr-4 rounded-lg text-sm bg-gray-50 border border-gray-100 text-gray-900 placeholder-gray-400"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              selectedTab === tab.id
                ? 'bg-accent text-white'
                : 'bg-gray-100 text-gray-500 active:bg-gray-200'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredPosts.map((post) => (
          <Link to={post.tab === 'poll' ? `/poll/${post.id}` : `/community/post/${post.id}`} key={post.id} className="card p-4 block card-hover">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${badgeColor[post.badge] || 'text-gray-500 bg-gray-100 border-gray-300'}`}>
                {post.badge}
              </span>
              <span className="text-[10px] text-gray-400">{post.time}</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              {post.title}
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">
              {post.preview}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">{post.author}</span>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span>조회 {post.views}</span>
                <span className="text-coral">♥ {post.likes}</span>
                <span>댓글 {post.comments}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-12 text-gray-400 card text-sm">
          해당 카테고리의 게시글이 없습니다.
        </div>
      )}
    </div>
  );
};

export default Community;
