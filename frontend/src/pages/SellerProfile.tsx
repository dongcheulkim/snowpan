import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, imageUrl, getUser } from '../api';
import { t, onLangChange } from '../i18n';
import UserBadges from '../components/UserBadges';
import { StarIcon, UserIcon } from '../components/Icons';

interface SellerData {
  id: string;
  name: string;
  profileImage: string | null;
  highlighted?: boolean; // 프로필 강조 쿠폰 활성 여부
  badges: string[]; // 호환용 — snow vertical 만 평탄화 (기존 UI)
  badgesByVertical?: Record<string, string[]>; // 신규 — vertical 별 그룹핑
  createdAt: string;
  products: { id: string; name: string; price: number; image: string; status?: string; createdAt: string }[];
  stats?: { listingCount: number; soldCount: number; postCount: number };
}

const VERTICAL_LABEL: Record<string, string> = {
  snow: 'SNOWPAN', bike: 'BIKEPAN', run: 'RUNPAN',
  surf: 'SURFPAN', golf: 'GOLFPAN', camp: 'CAMPPAN',
};

// 가입일 → 자연어 (예: "3개월째 활동 중", "1년 2개월째 활동 중").
function memberDuration(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 14) return `가입한 지 ${days}일`;
  if (days < 60) return `가입한 지 ${Math.floor(days / 7)}주`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월째 활동 중`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years}년째 활동 중` : `${years}년 ${rem}개월째 활동 중`;
}

interface ReviewData {
  id: string;
  rating: number;
  content: string;
  buyer: { id: string; name: string; profileImage: string | null };
  createdAt: string;
}

interface ReviewsResponse {
  reviews: ReviewData[];
  averageRating: number;
  totalCount: number;
}

interface CommunityPost {
  id: string;
  title: string;
  category: string;
  sport: string;
  likes: number;
  views: number;
  commentCount: number;
  createdAt: string;
}

const SellerProfile = () => {
  const { sellerId } = useParams();
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [eligibleProducts, setEligibleProducts] = useState<{ id: string; name: string; price: number }[]>([]);
  const [reviewProductId, setReviewProductId] = useState('');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postTotalCount, setPostTotalCount] = useState(0);
  const user = getUser();
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  useEffect(() => {
    if (!sellerId) return;
    api<SellerData>(`/auth/seller/${sellerId}`)
      .then(setSeller)
      .catch(() => {})
      .finally(() => setLoading(false));

    api<ReviewsResponse>(`/reviews?sellerId=${sellerId}`)
      .then(data => {
        setReviews(data.reviews);
        setAverageRating(data.averageRating);
        setReviewCount(data.totalCount);
      })
      .catch(() => {});

    // 셀러가 쓴 커뮤니티 글 (최신 10개).
    api<{ posts: CommunityPost[]; totalCount: number }>(`/community?userId=${sellerId}&limit=10`)
      .then(data => {
        setPosts(data.posts || []);
        setPostTotalCount(data.totalCount || 0);
      })
      .catch(() => {});
  }, [sellerId]);

  const openReviewForm = async () => {
    if (!sellerId || !user) return;
    try {
      const data = await api<{ products: { id: string; name: string; price: number }[] }>(`/reviews/eligible?sellerId=${sellerId}`);
      if (!data.products.length) {
        alert('리뷰를 작성할 수 있는 거래 내역이 없습니다. (판매완료된 상품 + 채팅 이력 필요)');
        return;
      }
      setEligibleProducts(data.products);
      setReviewProductId(data.products[0].id);
      setShowReviewForm(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '리뷰 작성 가능 여부를 확인하지 못했습니다.');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewContent.trim() || !sellerId || !reviewProductId) return;
    setReviewSubmitting(true);
    try {
      const newReview = await api<ReviewData>('/reviews', {
        method: 'POST',
        body: { sellerId, rating: reviewRating, content: reviewContent.trim(), productId: reviewProductId },
      });
      setReviews(prev => [newReview, ...prev]);
      setReviewCount(prev => prev + 1);
      const newTotal = reviews.reduce((sum, r) => sum + r.rating, 0) + reviewRating;
      setAverageRating(newTotal / (reviews.length + 1));
      setShowReviewForm(false);
      setReviewContent('');
      setReviewRating(5);
      setReviewProductId('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '리뷰 등록에 실패했습니다.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const reportReasons = ['사기 의심', '허위 정보', '욕설·비방', '부적절한 행동', '스팸·광고', '기타'];

  const handleReportUser = async () => {
    if (!reportReason || !sellerId) return;
    setReportSubmitting(true);
    try {
      await api('/reports', {
        method: 'POST',
        body: { type: 'user', targetId: sellerId, reason: reportReason, description: reportDesc || undefined },
      });
      alert('신고가 접수되었습니다.');
      setShowReport(false);
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
    if (diff < 86400000) return '오늘';
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const renderStars = (rating: number, interactive = false, onChange?: (r: number) => void) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => interactive && onChange?.(star)}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'} ${star <= rating ? 'text-gold' : 'text-gray-500'}`}
          disabled={!interactive}
          aria-label={`${star}점`}
        >
          <StarIcon size={18} />
        </button>
      ))}
    </div>
  );

  if (loading) return <div className="text-center py-20 text-gray-500 text-sm animate-fade-in">{t('general.loading')}</div>;

  if (!seller) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('sellerProfile.notFound')}</h2>
        <Link to="/used" className="text-gray-500 hover:text-gray-900 text-sm">&larr; {t('sellerProfile.backToList')}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      <Link to="/used" className="inline-flex items-center text-gray-500 hover:text-gray-900 text-sm transition-colors">&larr; {t('sellerProfile.back')}</Link>

      {/* Profile Card — 강조 쿠폰 활성 시 배경·테두리 강조 */}
      <div className={`card rounded-2xl p-6 text-center ${seller.highlighted ? 'ring-2 ring-amber-300 bg-gradient-to-b from-amber-50/60 to-white' : ''}`}>
        <div className={`w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mx-auto mb-4 overflow-hidden ${seller.highlighted ? 'ring-2 ring-amber-400' : 'border border-gray-200'}`}>
          {seller.profileImage ? (
            <img src={seller.profileImage} alt="" className="w-full h-full object-cover" />
          ) : <UserIcon size={36} />}
        </div>
        <div className="flex items-center justify-center gap-1.5 mb-1">
          {seller.highlighted && <span className="text-amber-500" title="강조 판매자">★</span>}
          <h1 className="text-xl font-bold text-gray-900">{seller.name}</h1>
        </div>

        {/* Cross-vertical 뱃지 — 모든 종목의 전문성 한눈에 (프로필에서만 노출) */}
        {seller.badgesByVertical && Object.keys(seller.badgesByVertical).length > 0 && (
          <div className="mt-3 space-y-2 max-w-xs mx-auto">
            {Object.entries(seller.badgesByVertical).map(([v, list]) => (
              list.length > 0 && (
                <div key={v} className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-black tracking-[0.18em] text-gray-500">{VERTICAL_LABEL[v] || v.toUpperCase()}</span>
                  <UserBadges badges={list} />
                </div>
              )
            ))}
          </div>
        )}
        {reviewCount > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {renderStars(Math.round(averageRating))}
            <span className="text-sm font-bold text-gold">{averageRating.toFixed(1)}</span>
            <span className="text-xs text-gray-500">({reviewCount})</span>
          </div>
        )}
        <p className="text-[11px] text-gray-500 mt-1">{memberDuration(seller.createdAt)}</p>
        {user && user.id !== sellerId && (
          <button onClick={() => setShowReport(true)} className="text-[11px] text-gray-400 hover:text-coral transition-colors mt-1.5">🚩 이 사용자 신고</button>
        )}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="py-2.5 bg-snow rounded-xl border border-gray-200">
            <div className="text-sm font-bold text-gray-900">{seller.stats?.listingCount ?? seller.products.length}</div>
            <div className="text-[10px] text-gray-500">등록</div>
          </div>
          <div className="py-2.5 bg-snow rounded-xl border border-gray-200">
            <div className="text-sm font-bold text-emerald-600">{seller.stats?.soldCount ?? 0}</div>
            <div className="text-[10px] text-gray-500">판매</div>
          </div>
          <div className="py-2.5 bg-snow rounded-xl border border-gray-200">
            <div className="text-sm font-bold text-sky-600">{seller.stats?.postCount ?? 0}</div>
            <div className="text-[10px] text-gray-500">글</div>
          </div>
          <div className="py-2.5 bg-snow rounded-xl border border-gray-200">
            <div className="text-sm font-bold text-gold">{averageRating > 0 ? averageRating.toFixed(1) : '-'}</div>
            <div className="text-[10px] text-gray-500">평점</div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">{t('sellerProfile.reviews')} ({reviewCount})</h3>
          {user && user.id !== sellerId && (
            <button onClick={() => showReviewForm ? setShowReviewForm(false) : openReviewForm()} className="px-3 py-1 bg-accent text-white rounded-lg font-bold text-[11px] hover:bg-accent-light transition-colors">
              {t('sellerProfile.writeReview')}
            </button>
          )}
        </div>

        {showReviewForm && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-600 block mb-1">거래 상품</label>
              <select value={reviewProductId} onChange={e => setReviewProductId(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm bg-snow border border-gray-200 text-gray-900">
                {eligibleProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} · {p.price.toLocaleString()}원</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-600 block mb-1">{t('sellerProfile.rating')}</label>
              {renderStars(reviewRating, true, setReviewRating)}
            </div>
            <textarea
              value={reviewContent}
              onChange={e => setReviewContent(e.target.value)}
              placeholder={t('sellerProfile.reviewPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm bg-snow border border-gray-200 text-gray-900 placeholder-gray-400 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowReviewForm(false); setReviewContent(''); }} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium border border-gray-200">{t('btn.cancel')}</button>
              <button onClick={handleSubmitReview} disabled={!reviewContent.trim() || reviewSubmitting} className="flex-1 py-2 bg-accent text-white rounded-lg text-xs font-bold disabled:opacity-30">
                {reviewSubmitting ? t('sellerProfile.submitting') : t('communityDetail.submit')}
              </button>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">{t('sellerProfile.noReviews')}</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="p-3 bg-snow rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 overflow-hidden">
                    {review.buyer.profileImage ? <img src={review.buyer.profileImage} alt="" className="w-full h-full object-cover" /> : <UserIcon size={12} />}
                  </div>
                  <span className="text-xs font-bold text-gray-900">{review.buyer.name}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className={`${s <= review.rating ? 'text-gold' : 'text-gray-500'}`}><StarIcon size={11} /></span>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500">{formatTime(review.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-600">{review.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 커뮤니티 글 */}
      <div className="card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">커뮤니티 글 ({postTotalCount})</h3>
        {posts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">아직 작성한 글이 없습니다.</p>
        ) : (
          <div className="space-y-0">
            {posts.map((p, idx) => (
              <Link
                key={p.id}
                to={`/community/post/${p.id}`}
                className={`flex items-center justify-between py-2.5 ${idx !== posts.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{p.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {p.sport === 'board' ? '보드' : p.sport === 'ski' ? '스키' : p.sport} · {formatTime(p.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-shrink-0 ml-2">
                  <span className="text-coral">♥ {p.likes}</span>
                  <span>💬 {p.commentCount}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 판매 중인 상품 */}
      <div className="card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">{t('sellerProfile.productsForSale')} ({seller.products.length})</h3>
        {seller.products.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">{t('sellerProfile.noProducts')}</p>
        ) : (
          <div className="space-y-3">
            {seller.products.map((item) => (
              <Link
                key={item.id}
                to={`/used/${item.id}`}
                className="flex items-center gap-3 p-3 bg-snow rounded-xl hover:bg-gray-100 transition-all border border-gray-200"
              >
                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-2xl border border-gray-200 overflow-hidden flex-shrink-0">
                  {item.image.startsWith('http') || item.image.startsWith('/') ? (
                    <img src={imageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                  ) : item.image}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                  <div className="text-sm font-bold text-mint">{item.price.toLocaleString()}원</div>
                </div>
                <span className="text-gray-500 text-xs">&rarr;</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 유저 신고 모달 */}
      {showReport && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45" onClick={() => setShowReport(false)}>
          <div className="w-full max-w-md bg-white rounded-t-2xl p-5 space-y-3 animate-[slideUp_.25s_ease-out]" onClick={e => e.stopPropagation()}>
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
            <h3 className="text-sm font-bold text-gray-900">사용자 신고</h3>
            <div className="space-y-1.5">
              {reportReasons.map(r => (
                <label key={r} className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input type="radio" name="report-reason" checked={reportReason === r} onChange={() => setReportReason(r)} className="accent-coral" />
                  <span className="text-sm text-gray-700">{r}</span>
                </label>
              ))}
            </div>
            <textarea value={reportDesc} onChange={e => setReportDesc(e.target.value)} rows={2} placeholder="상세 내용 (선택)" className="w-full px-3 py-2 rounded-lg text-sm bg-snow border border-gray-200 text-gray-900 placeholder-gray-400 resize-none" />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowReport(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium border border-gray-200">취소</button>
              <button onClick={handleReportUser} disabled={!reportReason || reportSubmitting} className="flex-1 py-2.5 bg-coral text-white rounded-lg text-sm font-bold disabled:opacity-30">
                {reportSubmitting ? '접수 중...' : '신고하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerProfile;
