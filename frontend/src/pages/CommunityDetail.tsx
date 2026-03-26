import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
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
  images?: string | null;
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

const reportReasons = [
  '스팸/광고',
  '욕설/비방',
  '허위 정보',
  '음란/불법 콘텐츠',
  '개인정보 노출',
  '기타',
];

const CommunityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const user = getUser();
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

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

  const handleShare = async () => {
    const url = window.location.href;
    const title = post?.title || '스노우판 게시글';
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch { /* ignore - user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('링크가 클립보드에 복사되었습니다.');
      } catch { /* ignore */ }
    }
  };

  const handleReport = async () => {
    if (!reportReason || !id) return;
    setReportSubmitting(true);
    try {
      await api('/reports', {
        method: 'POST',
        body: { type: 'post', targetId: id, reason: reportReason, description: reportDesc || undefined },
      });
      alert('신고가 접수되었습니다.');
      setShowReportModal(false);
      setReportReason('');
      setReportDesc('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '신고 처리에 실패했습니다.');
    } finally {
      setReportSubmitting(false);
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
    return <div className="text-center py-20 text-gray-400 text-sm animate-fade-in">{t('general.loading')}</div>;
  }

  if (!post) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('communityDetail.notFound')}</h2>
        <Link to="/community" className="text-gray-500 hover:text-gray-900 text-sm">&larr; {t('communityDetail.backToCommunity')}</Link>
      </div>
    );
  }

  const badge = badgeMap[post.category] || post.category;
  const postImages = post.images ? post.images.split(',').filter(s => s.trim()).map(u => imageUrl(u.trim())) : [];

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <Link to={`/community/${post.sport}`} className="inline-flex items-center text-gray-400 hover:text-gray-900 text-sm transition-colors">&larr; {t('communityDetail.back')}</Link>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${badgeColor[badge] || 'text-gray-500 bg-gray-100 border-gray-300'}`}>{badge}</span>
          <span className="text-[10px] text-gray-400">{formatTime(post.createdAt)}</span>
          <div className="flex-1" />
          {/* Share button */}
          <button onClick={handleShare} className="p-1.5 text-gray-400 hover:text-accent transition-colors" title={t('usedDetail.share')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          {/* Report button */}
          {user && user.id !== post.userId && (
            <button onClick={() => setShowReportModal(true)} className="p-1.5 text-gray-400 hover:text-coral transition-colors" title={t('usedDetail.report')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </button>
          )}
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

        {/* Post Images */}
        {postImages.length > 0 && (
          <div className="mt-4 space-y-2">
            {postImages.map((img, idx) => (
              <img key={idx} src={img} alt="" className="w-full rounded-lg border border-gray-200" />
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 mt-6 pt-5 border-t border-gray-200">
          <button onClick={handleLike} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${liked ? 'bg-coral/15 text-coral border border-coral/30' : 'bg-gray-100 text-gray-500 border border-gray-300 hover:bg-gray-200'}`}>
            ♥ {likeCount}
          </button>
          <span className="text-sm text-gray-400">{t('communityDetail.comments')} {post.comments.length}</span>
        </div>
      </div>

      {user && post.userId === user.id && (
        <button onClick={async () => { if (!confirm('정말 삭제하시겠습니까?')) return; try { await api(`/community/${post.id}`, { method: 'DELETE' }); alert('삭제되었습니다.'); navigate(`/community/${post.sport}`); } catch (err) { alert(err instanceof Error ? err.message : '삭제 실패'); } }} className="w-full py-3 bg-gray-100 text-red-500 rounded-xl font-bold text-sm border border-gray-200 active:bg-red-50">{t('btn.delete')}</button>
      )}

      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">{t('communityDetail.comments')} {post.comments.length}</h3>
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
            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleComment(); }} placeholder={t('communityDetail.commentPlaceholder')} className="flex-1 min-w-0 h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all" />
            <button onClick={handleComment} disabled={!newComment.trim()} className="h-9 px-3 bg-accent text-white rounded-lg font-bold text-xs flex-shrink-0 hover:bg-accent-light transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">{t('communityDetail.submit')}</button>
          </div>
        ) : (
          <div className="mt-5 pt-4 border-t border-gray-200 text-center">
            <Link to="/login" className="text-xs text-primary-dark hover:underline">{t('communityDetail.loginToComment')}</Link>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReportModal(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-sm border border-gray-300">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('communityDetail.reportPost')}</h3>
            <p className="text-xs text-gray-400 mb-4">{t('communityDetail.selectReason')}</p>
            <div className="space-y-2 mb-4">
              {reportReasons.map((reason) => (
                <button key={reason} onClick={() => setReportReason(reason)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${reportReason === reason ? 'bg-coral/10 text-coral border border-coral/30' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>
                  {reason}
                </button>
              ))}
            </div>
            <textarea
              value={reportDesc}
              onChange={e => setReportDesc(e.target.value)}
              placeholder="추가 설명 (선택)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowReportModal(false); setReportReason(''); setReportDesc(''); }} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium text-sm border border-gray-300">{t('btn.cancel')}</button>
              <button onClick={handleReport} disabled={!reportReason || reportSubmitting} className="flex-1 py-3 bg-coral text-white rounded-lg font-bold text-sm disabled:opacity-30">
                {reportSubmitting ? t('communityDetail.processing') : t('usedDetail.report')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityDetail;
