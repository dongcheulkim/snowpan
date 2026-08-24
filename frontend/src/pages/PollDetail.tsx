import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import UserBadges from '../components/UserBadges';
import { UserIcon } from '../components/Icons';
import { toastError, toastSuccess } from '../components/Toast';

interface PollOption {
  id: string;
  label: string;
  votes: number;
  pct: number;
}

interface Poll {
  id: string;
  title: string;
  author: string;
  authorId: string;
  options: PollOption[];
  totalVotes: number;
  views: number;
  likes: number;
  createdAt: string;
  myVote?: string | null;
  myLike?: boolean;
  comments?: PollComment[];
}

interface PollComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; badges?: string[]; profileImage?: string | null };
}

const PollDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState<string | null>(null); // 내가 투표한 optionId
  const [liked, setLiked] = useState(false);
  const [voting, setVoting] = useState(false);
  const [comments, setComments] = useState<PollComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api<Poll>(`/polls/${id}`)
      .then((p) => {
        setPoll(p);
        setVoted(p.myVote || null);
        setLiked(!!p.myLike); // 서버 기준으로 하트 상태 복원 (이전엔 새로고침하면 항상 빈 하트)
        setComments(p.comments || []);
      })
      .catch(() => setPoll(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleVote = async (optionId: string) => {
    if (voted || !poll || voting) return;
    if (!user) { navigate('/login'); return; }
    setVoting(true);
    try {
      const updated = await api<Poll>(`/polls/${poll.id}/vote`, {
        method: 'POST',
        body: { optionId },
      });
      setPoll(updated);
      setVoted(updated.myVote || optionId);
    } catch (e) {
      toastError(e instanceof Error ? e.message : '투표 실패');
    } finally {
      setVoting(false);
    }
  };

  const likingRef = useRef(false);
  const handleLike = async () => {
    if (!poll) return;
    if (!user) { navigate('/login'); return; }
    if (likingRef.current) return; // 연타 시 토글 요청 2건이 역순 도착해 낡은 스냅샷이 남는 것 방지
    likingRef.current = true;
    // 토글 — 서버 응답(liked)을 그대로 반영 (이전엔 무조건 liked=true 로 굳혀 해제가 표시 안 됐음).
    const prevLiked = liked;
    setLiked(!prevLiked);
    setPoll({ ...poll, likes: poll.likes + (prevLiked ? -1 : 1) });
    try {
      const res = await api<{ likes: number; liked: boolean }>(`/polls/${poll.id}/like`, { method: 'POST' });
      setLiked(res.liked);
      setPoll((prev) => (prev ? { ...prev, likes: res.likes } : prev));
    } catch (e) {
      // 실패 시 롤백 + 이유 표시 — 조용히 삼키면 고장처럼 보임.
      setLiked(prevLiked);
      setPoll((prev) => (prev ? { ...prev, likes: prev.likes + (prevLiked ? 1 : -1) } : prev));
      toastError(e instanceof Error ? e.message : '좋아요 처리에 실패했습니다.');
    } finally {
      likingRef.current = false;
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !poll || commentSubmitting) return;
    if (!user) { navigate('/login'); return; }
    setCommentSubmitting(true);
    try {
      const c = await api<PollComment>(`/polls/${poll.id}/comments`, { method: 'POST', body: { content: newComment.trim() } });
      setComments((prev) => [...prev, c]);
      setNewComment('');
    } catch (e) { toastError(e instanceof Error ? e.message : '댓글 등록에 실패했습니다.'); }
    finally { setCommentSubmitting(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500 text-sm">불러오는 중…</p></div>;
  }
  if (!poll) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">투표를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 text-lg">←</button>
        <h1 className="text-xl font-bold text-gray-900">투표</h1>
      </div>

      {/* Poll Card */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">투표</span>
          <span className="text-[11px] text-gray-500">{poll.author}</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{poll.title}</h2>

        {/* Options */}
        <div className="space-y-2 mb-4">
          {poll.options.map((opt) => {
            const isSelected = voted === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleVote(opt.id)}
                disabled={!!voted || voting}
                className={`w-full relative h-11 rounded-xl overflow-hidden text-left transition-all ${
                  voted ? 'cursor-default' : 'active:scale-[0.98] hover:bg-gray-50'
                } ${!voted ? 'border-2 border-gray-200' : ''}`}
              >
                {voted && (
                  <div
                    className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-700 ease-out ${
                      isSelected ? 'bg-primary/25' : 'bg-gray-100'
                    }`}
                    style={{ width: `${opt.pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between px-4 h-full">
                  <span className={`text-sm ${isSelected ? 'font-bold text-primary-dark' : 'text-gray-700'}`}>
                    {opt.label}
                  </span>
                  {voted && (
                    <span className={`text-sm ${isSelected ? 'font-bold text-primary-dark' : 'text-gray-500'}`}>
                      {opt.pct}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {voted ? (
          <p className="text-xs text-gray-500 text-center mb-3">{poll.totalVotes.toLocaleString()}명 참여</p>
        ) : (
          <p className="text-xs text-gray-500 text-center mb-3">선택지를 눌러 투표하세요</p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-[12px] text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {poll.views.toLocaleString()}
            </span>
          </div>
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-[12px] transition-colors ${liked ? 'text-red-500' : 'text-gray-500'}`}
          >
            <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {poll.likes}
          </button>
        </div>
      </div>

      {/* 댓글 */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">댓글 {comments.length}</h3>
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0 mt-0.5 overflow-hidden">
                {c.user.profileImage ? <img src={imageUrl(c.user.profileImage)} alt="" className="w-full h-full object-cover" /> : <UserIcon size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-900">{c.user.name}</span>
                  <UserBadges badges={c.user.badges} />
                  <span className="text-[10px] text-gray-500">{new Date(c.createdAt).toLocaleDateString('ko-KR')}</span>
                  {user && (c.user.id === user.id || user.role === 'admin') && (
                    <button
                      onClick={async () => {
                        if (!confirm('댓글을 삭제하시겠습니까?')) return;
                        try {
                          await api(`/polls/comments/${c.id}`, { method: 'DELETE' });
                          setComments((prev) => prev.filter((x) => x.id !== c.id));
                        } catch (e) { toastError(e instanceof Error ? e.message : '삭제 실패'); }
                      }}
                      className="ml-auto text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                    >삭제</button>
                  )}
                </div>
                <p className="text-sm text-gray-500">{c.content}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && <p className="text-xs text-gray-400 text-center py-3">첫 댓글을 남겨보세요.</p>}
        </div>
        {user ? (
          <div className="flex gap-2 mt-5 pt-4 border-t border-gray-200">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') handleComment(); }}
              placeholder="댓글을 입력하세요"
              className="flex-1 min-w-0 h-9 px-3 bg-snow border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
            />
            <button onClick={handleComment} disabled={!newComment.trim() || commentSubmitting} className="h-9 px-3 bg-accent text-white rounded-lg font-bold text-xs flex-shrink-0 active:scale-95 transition-transform disabled:opacity-30">등록</button>
          </div>
        ) : (
          <div className="mt-5 pt-4 border-t border-gray-200 text-center">
            <button onClick={() => navigate('/login')} className="text-xs text-primary-dark hover:underline">로그인하고 댓글 남기기</button>
          </div>
        )}
      </div>

      {/* 작성자/관리자 삭제 — 백엔드 DELETE /polls/:id 는 있었지만 UI 진입점이 없었음 */}
      {user && (poll.authorId === user.id || user.role === 'admin') && (
        <button
          onClick={async () => {
            if (!confirm(poll.authorId !== user.id ? '관리자 권한으로 이 투표를 삭제하시겠습니까?' : '투표를 삭제하시겠습니까?')) return;
            try {
              await api(`/polls/${poll.id}`, { method: 'DELETE' });
              toastSuccess('삭제되었습니다.');
              navigate('/community/ski?tab=poll');
            } catch (e) { toastError(e instanceof Error ? e.message : '삭제 실패'); }
          }}
          className="w-full py-3 bg-gray-100 text-red-500 rounded-xl font-bold text-sm border border-gray-200 active:bg-red-50"
        >{poll.authorId !== user.id && user.role === 'admin' ? '관리자 삭제' : '삭제'}</button>
      )}
    </div>
  );
};

export default PollDetail;
