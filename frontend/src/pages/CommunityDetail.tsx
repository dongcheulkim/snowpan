import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const CommunityDetail = () => {
  const { id } = useParams();
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);

  const posts: Record<string, {
    id: string; tab: string; badge: string; title: string; content: string;
    author: string; time: string; likes: number; views: number;
    comments: { author: string; text: string; time: string }[];
  }> = {
    '1': {
      id: '1', tab: 'free', badge: '자유',
      title: '올시즌 첫 출격 다녀왔습니다!',
      content: '용평 레인보우 슬로프 컨디션 최고였어요. 설질 좋고 사람도 적당하고...\n\n아침 일찍 가서 첫 곤돌라 탔는데 새벽 설질이 진짜 미쳤습니다.\n그루밍 완벽하게 되어있고 엣지 그립감이 장난 아니었어요.\n\n점심때부터 사람 좀 몰리긴 했는데 평일이라 그래도 괜찮았습니다.\n다음주에 또 가려구요 ㅎㅎ',
      author: '스키매니아', time: '2시간 전', likes: 24, views: 156,
      comments: [
        { author: '보더킹', text: '오 부럽다... 저도 이번주 갈건데 설질 기대되네요!', time: '1시간 전' },
        { author: '초보스키어', text: '용평 레인보우가 어디쯤인가요? 초보도 괜찮을까요?', time: '45분 전' },
        { author: '스키매니아', text: '레인보우는 중급 슬로프입니다! 초보시면 실버 추천드려요', time: '30분 전' },
      ],
    },
    '2': {
      id: '2', tab: 'review', badge: '장비리뷰',
      title: 'Rossignol Soul 7 HD 2시즌 사용 후기',
      content: '올라운드 스키로 정말 추천합니다. 카빙도 잘 되고 비정지에서도 안정적이에요.\n\n장점:\n- 다양한 설면에서 안정적\n- 카빙 시 엣지 그립 좋음\n- 가벼운 편\n\n단점:\n- 아이스반에서는 좀 약함\n- 모글에서는 다소 긴 느낌\n\n전체적으로 중급~상급 스키어에게 추천합니다. 특히 그루밍 슬로프에서 카빙 연습하기 좋아요.',
      author: '장비덕후', time: '3시간 전', likes: 42, views: 312,
      comments: [
        { author: '스키프로', text: '저도 Soul 7 쓰는데 공감합니다. 아이스반 약한 건 맞아요', time: '2시간 전' },
        { author: '뉴비', text: '중급인데 이거 살까 고민중이에요. 사이즈 추천 부탁드려요!', time: '1시간 전' },
      ],
    },
    '3': {
      id: '3', tab: 'resort', badge: '스키장후기',
      title: '휘닉스 평창 주말 솔직 후기',
      content: '리프트 대기 15분 정도, 슬로프 상태는 괜찮았는데 식당이 너무 비싸요...\n\n슬로프 컨디션: ★★★★☆\n리프트 대기: ★★★☆☆\n식당/편의시설: ★★☆☆☆\n가성비: ★★★☆☆\n\n주말이라 사람 많았지만 슬로프 관리는 잘 되어있었어요.\n다만 식당 물가가 진짜 사악합니다. 김밥 한줄에 8천원...\n도시락 싸가세요 진심으로.',
      author: '보더킹', time: '5시간 전', likes: 18, views: 203,
      comments: [
        { author: '라이더준', text: '식당 물가 공감... 저는 편의점에서 사가요', time: '4시간 전' },
      ],
    },
    '4': {
      id: '4', tab: 'tip', badge: '초보팁',
      title: '스키 처음 타시는 분들 꼭 읽어주세요',
      content: '장비 렌탈부터 슬로프 매너까지 초보자가 알아야 할 모든 것을 정리했습니다.\n\n1. 장비 렌탈\n- 부츠가 제일 중요! 꼭 피팅 잘 해주세요\n- 스키 길이는 키에서 -10cm 정도\n\n2. 슬로프 매너\n- 위에서 오는 사람이 피해야 합니다\n- 슬로프 중간에 멈춰서지 마세요\n- 넘어지면 빨리 일어나서 가장자리로\n\n3. 안전\n- 헬멧 꼭 착용하세요\n- 처음에는 초급 슬로프만!\n- 무리하지 마세요',
      author: '프로강사', time: '6시간 전', likes: 89, views: 567,
      comments: [
        { author: '완전초보', text: '감사합니다! 다음주 처음 가는데 도움 많이 됐어요', time: '5시간 전' },
        { author: '스키입문', text: '부츠 피팅 팁 감사합니다. 저번에 발 아파서 고생했거든요', time: '4시간 전' },
        { author: '프로강사', text: '부츠는 살짝 꽉 끼는게 정상이에요! 너무 편하면 오히려 안좋습니다', time: '3시간 전' },
      ],
    },
    '5': {
      id: '5', tab: 'carpool', badge: '카풀/동행',
      title: '이번 주 토요일 하이원 같이 가실 분!',
      content: '서울 출발 새벽 5시, 차량 있어요. 2명 모집합니다. 왕복 인당 2만원\n\n출발: 서울 강남역 2번 출구 앞\n시간: 토요일 새벽 5시\n복귀: 당일 저녁 7시경\n비용: 인당 2만원 (톨비+유류비)\n\n스키/보드 상관없이 편하게 연락주세요!\n장비 넣을 공간 충분합니다.',
      author: '라이더준', time: '8시간 전', likes: 7, views: 134,
      comments: [
        { author: '보드초보', text: '저 참가하고 싶어요! 채팅 드릴게요', time: '7시간 전' },
        { author: '라이더준', text: '네! 채팅 주세요~ 1자리 남았습니다', time: '6시간 전' },
      ],
    },
    '6': {
      id: '6', tab: 'free', badge: '자유',
      title: '시즌권 vs 일일권 뭐가 더 이득일까요?',
      content: '작년에 12번 갔는데 올해도 비슷할 것 같은데 시즌권 살지 고민...\n\n용평 시즌권 80만원\n일일권 평균 7만원 x 12회 = 84만원\n\n숫자만 보면 시즌권이 이득인데\n시즌권 사면 더 많이 가게 될까요?\n경험자 분들 조언 부탁드립니다!',
      author: '고민중', time: '10시간 전', likes: 15, views: 245,
      comments: [
        { author: '시즌권러', text: '시즌권 사면 무조건 더 많이 감 ㅋㅋ 저 작년에 30번 갔어요', time: '9시간 전' },
        { author: '가끔러', text: '저는 일일권파... 시즌권 사면 의무감에 갈 때 지칠 수 있어요', time: '8시간 전' },
      ],
    },
    '7': {
      id: '7', tab: 'review', badge: '장비리뷰',
      title: 'Burton Step On 바인딩 솔직 후기',
      content: '편하긴 진짜 편한데... 단점도 있습니다. 3시즌 사용 후 느낀 점들\n\n장점:\n- 착탈이 정말 빠르고 편함\n- 리프트에서 내려서 바로 출발 가능\n- 초보한테 특히 추천\n\n단점:\n- 전용 부츠만 사용 가능\n- 부츠 선택지가 적음\n- 가격이 비쌈\n- 하이백 조절 범위가 좁음',
      author: '보드라이프', time: '12시간 전', likes: 56, views: 423,
      comments: [
        { author: '보드입문', text: '저도 Step On 쓰는데 편한 건 인정! 근데 부츠 선택지 적은 게 아쉬워요', time: '11시간 전' },
      ],
    },
    '8': {
      id: '8', tab: 'resort', badge: '스키장후기',
      title: '비발디파크 야간 스키 후기',
      content: '야간 조명 밝고 좋았어요. 평일이라 사람도 별로 없고 연습하기 딱이었습니다.\n\n야간 운영 시간이 꽤 길어서 퇴근 후에도 충분히 즐길 수 있어요.\n서울에서 가깝고 야간이 저렴해서 평일 야간 추천합니다.',
      author: '야간러버', time: '14시간 전', likes: 22, views: 178,
      comments: [
        { author: '직장인스키어', text: '평일 야간 좋죠! 저도 자주 갑니다', time: '13시간 전' },
      ],
    },
  };

  const badgeColor: Record<string, string> = {
    '자유': 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    '장비리뷰': 'text-neon-green bg-neon-green/10 border-neon-green/20',
    '스키장후기': 'text-neon-orange bg-neon-orange/10 border-neon-orange/20',
    '초보팁': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    '카풀/동행': 'text-neon-pink bg-neon-pink/10 border-neon-pink/20',
  };

  const post = id ? posts[id] : null;

  if (!post) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-xl font-bold text-white mb-2">게시글을 찾을 수 없습니다</h2>
        <Link to="/community" className="text-neon-blue hover:text-neon-blue/80 text-sm">
          ← 커뮤니티로 돌아가기
        </Link>
      </div>
    );
  }

  const [likeCount, setLikeCount] = useState(post.likes);
  const [comments, setComments] = useState(post.comments);

  const handleLike = () => {
    if (liked) {
      setLikeCount(prev => prev - 1);
    } else {
      setLikeCount(prev => prev + 1);
    }
    setLiked(!liked);
  };

  const handleComment = () => {
    if (!newComment.trim()) return;
    setComments(prev => [...prev, { author: '테스트유저', text: newComment.trim(), time: '방금 전' }]);
    setNewComment('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <Link to="/community" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
        ← 커뮤니티
      </Link>

      {/* Post */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${badgeColor[post.badge]}`}>
            {post.badge}
          </span>
          <span className="text-[10px] text-gray-600">{post.time}</span>
        </div>

        <h1 className="text-xl font-bold text-white mb-4">{post.title}</h1>

        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-full bg-sky-500/10 flex items-center justify-center text-sm">
            👤
          </div>
          <span className="text-sm font-medium text-white">{post.author}</span>
          <span className="text-[11px] text-gray-600">· 👀 {post.views}</span>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
          {post.content}
        </p>

        {/* Like */}
        <div className="flex items-center gap-4 mt-6 pt-5 border-t border-white/5">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
              liked
                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {liked ? '❤️' : '🤍'} {likeCount}
          </button>
          <span className="text-sm text-gray-500">💬 {comments.length}</span>
        </div>
      </div>

      {/* Comments */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">댓글 {comments.length}</h3>
        <div className="space-y-4">
          {comments.map((comment, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                👤
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-white">{comment.author}</span>
                  <span className="text-[10px] text-gray-600">{comment.time}</span>
                </div>
                <p className="text-sm text-gray-400">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Comment Input */}
        <div className="flex gap-2 mt-5 pt-4 border-t border-white/5">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleComment(); }}
            placeholder="댓글을 입력하세요..."
            className="flex-1 px-4 py-2.5 bg-dark-700/50 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue/50 transition-all"
          />
          <button
            onClick={handleComment}
            disabled={!newComment.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-sky-500/25 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunityDetail;
