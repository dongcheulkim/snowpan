import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import { toastError } from '../components/Toast';

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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api<Poll>(`/polls/${id}`)
      .then((p) => {
        setPoll(p);
        setVoted(p.myVote || null);
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

  const handleLike = async () => {
    if (!poll || liked) return;
    if (!user) { navigate('/login'); return; }
    // 낙관적 업데이트.
    setLiked(true);
    setPoll({ ...poll, likes: poll.likes + 1 });
    try {
      const res = await api<{ likes: number }>(`/polls/${poll.id}/like`, { method: 'POST' });
      setPoll((prev) => (prev ? { ...prev, likes: res.likes } : prev));
    } catch {
      // 실패 시 롤백.
      setLiked(false);
      setPoll((prev) => (prev ? { ...prev, likes: prev.likes - 1 } : prev));
    }
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
    </div>
  );
};

export default PollDetail;
