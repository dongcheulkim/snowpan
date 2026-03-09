import { useState } from 'react';
import { Link } from 'react-router-dom';

const Community = () => {
  const [selectedTab, setSelectedTab] = useState('all');

  const tabs = [
    { id: 'all', name: '전체' },
    { id: 'free', name: '자유게시판' },
    { id: 'review', name: '장비리뷰' },
    { id: 'resort', name: '스키장후기' },
    { id: 'tip', name: '초보팁' },
    { id: 'carpool', name: '카풀/동행' },
  ];

  const posts = [
    { id: '1', tab: 'free', badge: '자유', title: '올시즌 첫 출격 다녀왔습니다!', preview: '용평 레인보우 슬로프 컨디션 최고였어요. 설질 좋고 사람도 적당하고...', author: '스키매니아', time: '2시간 전', likes: 24, comments: 8, views: 156 },
    { id: '2', tab: 'review', badge: '장비리뷰', title: 'Rossignol Soul 7 HD 2시즌 사용 후기', preview: '올라운드 스키로 정말 추천합니다. 카빙도 잘 되고 비정지에서도 안정적...', author: '장비덕후', time: '3시간 전', likes: 42, comments: 15, views: 312 },
    { id: '3', tab: 'resort', badge: '스키장후기', title: '휘닉스 평창 주말 솔직 후기', preview: '리프트 대기 15분 정도, 슬로프 상태는 괜찮았는데 식당이 너무 비싸요...', author: '보더킹', time: '5시간 전', likes: 18, comments: 12, views: 203 },
    { id: '4', tab: 'tip', badge: '초보팁', title: '스키 처음 타시는 분들 꼭 읽어주세요', preview: '장비 렌탈부터 슬로프 매너까지 초보자가 알아야 할 모든 것을 정리했습니다...', author: '프로강사', time: '6시간 전', likes: 89, comments: 31, views: 567 },
    { id: '5', tab: 'carpool', badge: '카풀/동행', title: '이번 주 토요일 하이원 같이 가실 분!', preview: '서울 출발 새벽 5시, 차량 있어요. 2명 모집합니다. 왕복 인당 2만원...', author: '라이더준', time: '8시간 전', likes: 7, comments: 22, views: 134 },
    { id: '6', tab: 'free', badge: '자유', title: '시즌권 vs 일일권 뭐가 더 이득일까요?', preview: '작년에 12번 갔는데 올해도 비슷할 것 같은데 시즌권 살지 고민...', author: '고민중', time: '10시간 전', likes: 15, comments: 28, views: 245 },
    { id: '7', tab: 'review', badge: '장비리뷰', title: 'Burton Step On 바인딩 솔직 후기', preview: '편하긴 진짜 편한데... 단점도 있습니다. 3시즌 사용 후 느낀 점들...', author: '보드라이프', time: '12시간 전', likes: 56, comments: 19, views: 423 },
    { id: '8', tab: 'resort', badge: '스키장후기', title: '비발디파크 야간 스키 후기', preview: '야간 조명 밝고 좋았어요. 평일이라 사람도 별로 없고 연습하기 딱...', author: '야간러버', time: '14시간 전', likes: 22, comments: 6, views: 178 },
  ];

  const filteredPosts = selectedTab === 'all' ? posts : posts.filter(p => p.tab === selectedTab);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">커뮤니티</h1>
        <button className="px-4 py-1.5 bg-white text-black rounded-lg font-bold text-xs hover:bg-gray-200 transition-colors whitespace-nowrap">
          + 글쓰기
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all flex-shrink-0 ${
              selectedTab === tab.id
                ? 'bg-white text-black'
                : 'bg-[#111] text-gray-400 hover:bg-[#1a1a1a] hover:text-white border border-white/5'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredPosts.map((post) => (
          <Link to={`/community/${post.id}`} key={post.id} className="card rounded-lg p-4 block card-hover">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
                {post.badge}
              </span>
              <span className="text-[10px] text-gray-600">{post.time}</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1 hover:text-gray-300 transition-colors">
              {post.title}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
              {post.preview}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">{post.author}</span>
              <div className="flex items-center gap-3 text-[11px] text-gray-600">
                <span>조회 {post.views}</span>
                <span>좋아요 {post.likes}</span>
                <span>댓글 {post.comments}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-12 text-gray-500 card rounded-lg text-sm">
          해당 카테고리의 게시글이 없습니다.
        </div>
      )}
    </div>
  );
};

export default Community;
