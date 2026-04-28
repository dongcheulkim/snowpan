import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface PollOption {
  label: string;
  votes: number;
  pct: number;
}

interface Poll {
  id: string;
  title: string;
  type: string;
  options: PollOption[];
  totalVotes: number;
  views: number;
  likes: number;
  author: string;
  createdAt: string;
}

interface Comment {
  id: string;
  pollId: string;
  author: string;
  content: string;
  createdAt: string;
  likes: number;
}

const defaultPolls: Poll[] = [
  {
    id: 'ht1',
    title: '올 시즌 최고의 스키장은?',
    type: 'poll',
    options: [
      { label: '용평리조트', votes: 162, pct: 38 },
      { label: '휘닉스평창', votes: 120, pct: 28 },
      { label: '하이원리조트', votes: 94, pct: 22 },
      { label: '비발디파크', votes: 51, pct: 12 },
    ],
    totalVotes: 427,
    views: 1842,
    likes: 256,
    author: '스노우판',
    createdAt: '2025-12-15T10:00:00',
  },
  {
    id: 'ht2',
    title: '초보자 첫 장비, 중고 vs 새제품?',
    type: 'poll',
    options: [
      { label: '중고로 시작', votes: 195, pct: 62 },
      { label: '새 제품 구매', votes: 119, pct: 38 },
    ],
    totalVotes: 314,
    views: 1253,
    likes: 189,
    author: '스노우판',
    createdAt: '2025-12-20T14:00:00',
  },
];

const PollDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [voted, setVoted] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    // Find poll from defaults or localStorage
    const userPolls: Poll[] = JSON.parse(localStorage.getItem('userPolls') || '[]');
    const allPolls = [...defaultPolls, ...userPolls];
    const found = allPolls.find((p) => p.id === id);
    if (found) {
      const updated = { ...found, views: found.views + 1 };
      // Schedule state update to avoid sync setState in effect
      setTimeout(() => setPoll(updated), 0);
    }

    // Load vote status
    const pollVotes = JSON.parse(localStorage.getItem('pollVotes') || '{}');
    if (id && pollVotes[id]) {
      setTimeout(() => setVoted(pollVotes[id]), 0);
    }

    // Load comments
    const allComments: Comment[] = JSON.parse(localStorage.getItem('pollComments') || '[]');
    const filtered = allComments.filter((c) => c.pollId === id);
    setTimeout(() => setComments(filtered), 0);

    // Load like status
    const pollLikes = JSON.parse(localStorage.getItem('pollLikes') || '{}');
    if (id && pollLikes[id]) {
      setTimeout(() => setLiked(true), 0);
    }
  }, [id]);

  const handleVote = (optionLabel: string) => {
    if (voted || !poll) return;

    const updatedOptions = poll.options.map((opt) => ({
      ...opt,
      votes: opt.label === optionLabel ? opt.votes + 1 : opt.votes,
    }));
    const newTotal = poll.totalVotes + 1;
    const withPct = updatedOptions.map((opt) => ({
      ...opt,
      pct: Math.round((opt.votes / newTotal) * 100),
    }));

    setPoll({ ...poll, options: withPct, totalVotes: newTotal });
    setVoted(optionLabel);

    // Save vote
    const pollVotes = JSON.parse(localStorage.getItem('pollVotes') || '{}');
    pollVotes[poll.id] = optionLabel;
    localStorage.setItem('pollVotes', JSON.stringify(pollVotes));

    // Update poll in localStorage if user-created
    const userPolls: Poll[] = JSON.parse(localStorage.getItem('userPolls') || '[]');
    const idx = userPolls.findIndex((p) => p.id === poll.id);
    if (idx !== -1) {
      userPolls[idx] = { ...poll, options: withPct, totalVotes: newTotal };
      localStorage.setItem('userPolls', JSON.stringify(userPolls));
    }
  };

  const handleLike = () => {
    if (!poll) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setPoll({ ...poll, likes: poll.likes + (newLiked ? 1 : -1) });

    const pollLikes = JSON.parse(localStorage.getItem('pollLikes') || '{}');
    if (newLiked) {
      pollLikes[poll.id] = true;
    } else {
      delete pollLikes[poll.id];
    }
    localStorage.setItem('pollLikes', JSON.stringify(pollLikes));
  };

  const handleAddComment = () => {
    const trimmed = newComment.trim();
    if (!trimmed || !poll) return;

    const comment: Comment = {
      id: `cmt_${Date.now()}`,
      pollId: poll.id,
      author: '나',
      content: trimmed,
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    const allComments: Comment[] = JSON.parse(localStorage.getItem('pollComments') || '[]');
    allComments.push(comment);
    localStorage.setItem('pollComments', JSON.stringify(allComments));

    setComments([...comments, comment]);
    setNewComment('');
  };

  const [now] = useState(() => Date.now());
  const formatTime = (dateStr: string) => {
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

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
            const isSelected = voted === opt.label;
            return (
              <button
                key={opt.label}
                onClick={() => handleVote(opt.label)}
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
                    {isSelected && '✓ '}{opt.label}
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

        {voted && (
          <p className="text-xs text-gray-500 text-center mb-3">{poll.totalVotes.toLocaleString()}명 참여</p>
        )}
        {!voted && (
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
            <span>댓글 {comments.length}</span>
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

      {/* Comments */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">댓글 {comments.length}</h3>

        {comments.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-6">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
        )}

        <div className="space-y-3">
          {comments.map((cmt) => (
            <div key={cmt.id} className="py-2.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary-50 rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary-dark">{cmt.author[0]}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-700">{cmt.author}</span>
                </div>
                <span className="text-[10px] text-gray-500">{formatTime(cmt.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-600 pl-8">{cmt.content}</p>
            </div>
          ))}
        </div>

        {/* Comment Input */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="댓글을 입력하세요"
            className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              newComment.trim() ? 'bg-primary text-white active:bg-primary-dark' : 'bg-gray-100 text-gray-600'
            }`}
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
};

export default PollDetail;
