import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import UserBadges from '../components/UserBadges';

interface Comment {
  id: string;
  content: string;
  user: { id: string; name: string; profileImage?: string; badges?: string[] };
  createdAt: string;
}

interface PostData {
  id: string;
  userId?: string;
  title: string;
  content: string;
  category: string;
  sport: string;
  likes: number;
  views: number;
  user: { id: string; name: string; profileImage?: string; badges?: string[] };
  comments: Comment[];
  createdAt: string;
}

const badgeMap: Record<string, string> = {
  free: '자유', review: '장비리뷰', resort: '스키장후기', tip: '초보팁', carpool: '카풀/동행',
};

const badgeColor: Record<string, string> = {
  '자유': 'text-accent-light bg-accent/10 border-accent/20',
  '장비리뷰': 'text-mint bg-mint/10 border-mint/20',
  '스키장후기': 'text-gold bg-gold/10 border-gold/20',
  '초보팁': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  '카풀/동행': 'text-coral bg-coral/10 border-coral/20',
};

const CommunityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const user = getUser();

  useEffect(() => {
    if (!id) return;
    api<PostData & { liked?: boolean }>(`/community/${id}`)
      .then(data => {
        setPost(data);
        setLikeCount(data.likes);
        if (data.liked) setLiked(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    if (!id || !user) {
      alert('로그인이 필요합니다.');
      return;
    }
    try {
      const result = await api<{ likes: number; liked: boolean }>(`/community/${id}/like`, { method: 'PUT' });
      setLikeCount(result.likes);
      setLiked(result.liked);
    } catch { /* ignore */ }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !id) return;
    try {
      const comment = await api<Comment>(`/community/${id}/comments`, {
        method: 'POST',
        body: { content: newComment.trim() },
      });
      setPost(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : prev);
      setNewComment('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '댓글 등록에 실패했습니다.');
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '방금';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400 text-sm animate-fade-in">로딩 중...</div>;
  }

  if (!post) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 mb-2">게시글을 찾을 수 없습니다</h2>
        <Link to="/community" className="text-gray-500 hover:text-gray-900 text-sm">← 커뮤니티로 돌아가기</Link>
      </div>
    );
  }

  const badge = badgeMap[post.category] || post.category;

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <Link to={`/community/${post.sport}`} className="inline-flex items-center text-gray-400 hover:text-gray-900 text-sm transition-colors">← 커뮤니티</Link>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${badgeColor[badge] || 'text-gray-500 bg-gray-100 border-gray-300'}`}>{badge}</span>
          <span className="text-[10px] text-gray-400">{formatTime(post.createdAt)}</span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-4">{post.title}</h1>

        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-200">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm overflow-hidden">
            {post.user.profileImage ? <img src={post.user.profileImage} alt="" className="w-full h-full object-cover" /> : '👤'}
          </div>
          <span className="text-sm font-medium text-gray-900">{post.user.name}</span>
          <UserBadges badges={post.user.badges} />
          <span className="text-[11px] text-gray-400">· 조회 {post.views}</span>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{post.content}</p>

        <div className="flex items-center gap-4 mt-6 pt-5 border-t border-gray-200">
          <button onClick={handleLike} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${liked ? 'bg-coral/15 text-coral border border-coral/30' : 'bg-gray-100 text-gray-500 border border-gray-300 hover:bg-gray-200'}`}>
            ♥ {likeCount}
          </button>
          <span className="text-sm text-gray-400">댓글 {post.comments.length}</span>
        </div>
      </div>

      {user && post.userId === user.id && (
        <button onClick={async () => { if (!confirm('정말 삭제하시겠습니까?')) return; try { await api(`/community/${post.id}`, { method: 'DELETE' }); alert('삭제되었습니다.'); navigate(`/community/${post.sport}`); } catch (err) { alert(err instanceof Error ? err.message : '삭제 실패'); } }} className="w-full py-3 bg-gray-100 text-red-500 rounded-xl font-bold text-sm border border-gray-200 active:bg-red-50">삭제</button>
      )}

      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">댓글 {post.comments.length}</h3>
        <div className="space-y-4">
          {post.comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5 overflow-hidden">
                {comment.user.profileImage ? <img src={comment.user.profileImage} alt="" className="w-full h-full object-cover" /> : '👤'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-900">{comment.user.name}</span>
                  <UserBadges badges={comment.user.badges} />
                  <span className="text-[10px] text-gray-400">{formatTime(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-500">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>

        {user ? (
          <div className="flex gap-2 mt-5 pt-4 border-t border-gray-200">
            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleComment(); }} placeholder="댓글을 입력하세요..." className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all" />
            <button onClick={handleComment} disabled={!newComment.trim()} className="px-4 py-2.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">등록</button>
          </div>
        ) : (
          <div className="mt-5 pt-4 border-t border-gray-200 text-center">
            <Link to="/login" className="text-xs text-primary-dark hover:underline">로그인 후 댓글을 작성할 수 있습니다</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityDetail;
