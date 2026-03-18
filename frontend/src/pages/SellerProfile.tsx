import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, imageUrl, getUser } from '../api';
import UserBadges from '../components/UserBadges';

interface SellerData {
  id: string;
  name: string;
  profileImage: string | null;
  badges: string[];
  createdAt: string;
  products: { id: string; name: string; price: number; image: string; createdAt: string }[];
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
  const user = getUser();

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
  }, [sellerId]);

  const handleSubmitReview = async () => {
    if (!reviewContent.trim() || !sellerId) return;
    setReviewSubmitting(true);
    try {
      const newReview = await api<ReviewData>('/reviews', {
        method: 'POST',
        body: { sellerId, rating: reviewRating, content: reviewContent.trim() },
      });
      setReviews(prev => [newReview, ...prev]);
      setReviewCount(prev => prev + 1);
      const newTotal = reviews.reduce((sum, r) => sum + r.rating, 0) + reviewRating;
      setAverageRating(newTotal / (reviews.length + 1));
      setShowReviewForm(false);
      setReviewContent('');
      setReviewRating(5);
    } catch (err) {
      alert(err instanceof Error ? err.message : '리뷰 등록에 실패했습니다.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
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
          className={`text-lg ${interactive ? 'cursor-pointer' : 'cursor-default'} ${star <= rating ? 'text-gold' : 'text-gray-300'}`}
          disabled={!interactive}
        >
          ★
        </button>
      ))}
    </div>
  );

  if (loading) return <div className="text-center py-20 text-gray-400 text-sm animate-fade-in">로딩 중...</div>;

  if (!seller) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 mb-2">판매자를 찾을 수 없습니다</h2>
        <Link to="/used" className="text-gray-400 hover:text-gray-900 text-sm">&larr; 목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      <Link to="/used" className="inline-flex items-center text-gray-400 hover:text-gray-900 text-sm transition-colors">&larr; 뒤로</Link>

      {/* Profile Card */}
      <div className="card rounded-2xl p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-3xl mx-auto mb-4 overflow-hidden">
          {seller.profileImage ? (
            <img src={seller.profileImage} alt="" className="w-full h-full object-cover" />
          ) : '👤'}
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-gray-900">{seller.name}</h1>
          <UserBadges badges={seller.badges} />
        </div>
        {reviewCount > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {renderStars(Math.round(averageRating))}
            <span className="text-sm font-bold text-gold">{averageRating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({reviewCount})</span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="py-3 bg-white rounded-xl border border-gray-200">
            <div className="text-base font-bold text-gray-900">{seller.products.length}개</div>
            <div className="text-[10px] text-gray-400">판매 물품</div>
          </div>
          <div className="py-3 bg-white rounded-xl border border-gray-200">
            <div className="text-base font-bold text-gold">{averageRating > 0 ? averageRating.toFixed(1) : '-'}</div>
            <div className="text-[10px] text-gray-400">평균 별점</div>
          </div>
          <div className="py-3 bg-white rounded-xl border border-gray-200">
            <div className="text-base font-bold text-gray-900">{formatDate(seller.createdAt)}</div>
            <div className="text-[10px] text-gray-400">가입일</div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">거래 후기 ({reviewCount})</h3>
          {user && user.id !== sellerId && (
            <button onClick={() => setShowReviewForm(!showReviewForm)} className="px-3 py-1 bg-accent text-white rounded-lg font-bold text-[11px] hover:bg-accent-light transition-colors">
              후기 작성
            </button>
          )}
        </div>

        {showReviewForm && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-600 block mb-1">별점</label>
              {renderStars(reviewRating, true, setReviewRating)}
            </div>
            <textarea
              value={reviewContent}
              onChange={e => setReviewContent(e.target.value)}
              placeholder="거래 후기를 남겨주세요"
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-gray-200 text-gray-900 placeholder-gray-400 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowReviewForm(false); setReviewContent(''); }} className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium border border-gray-200">취소</button>
              <button onClick={handleSubmitReview} disabled={!reviewContent.trim() || reviewSubmitting} className="flex-1 py-2 bg-accent text-white rounded-lg text-xs font-bold disabled:opacity-30">
                {reviewSubmitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">아직 거래 후기가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] overflow-hidden">
                    {review.buyer.profileImage ? <img src={review.buyer.profileImage} alt="" className="w-full h-full object-cover" /> : '👤'}
                  </div>
                  <span className="text-xs font-bold text-gray-900">{review.buyer.name}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className={`text-xs ${s <= review.rating ? 'text-gold' : 'text-gray-300'}`}>★</span>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400">{formatTime(review.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-600">{review.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 판매 중인 상품 */}
      <div className="card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">판매 중인 상품 ({seller.products.length})</h3>
        {seller.products.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">등록된 상품이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {seller.products.map((item) => (
              <Link
                key={item.id}
                to={`/used/${item.id}`}
                className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-gray-100 transition-all border border-gray-200"
              >
                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-2xl border border-gray-200 overflow-hidden flex-shrink-0">
                  {item.image.startsWith('http') || item.image.startsWith('/') ? (
                    <img src={imageUrl(item.image)} alt="" className="w-full h-full object-cover" />
                  ) : item.image}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                  <div className="text-sm font-bold text-mint">{item.price.toLocaleString()}원</div>
                </div>
                <span className="text-gray-400 text-xs">&rarr;</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerProfile;
