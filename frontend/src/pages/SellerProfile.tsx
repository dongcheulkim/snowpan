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
  const [eligibleProducts, setEligibleProducts] = useState<{ id: string; name: string; price: number }[]>([]);
  const [reviewProductId, setReviewProductId] = useState('');
  const user = getUser();
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

      {/* Profile Card */}
      <div className="card rounded-2xl p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 mx-auto mb-4 overflow-hidden">
          {seller.profileImage ? (
            <img src={seller.profileImage} alt="" className="w-full h-full object-cover" />
          ) : <UserIcon size={36} />}
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-gray-900">{seller.name}</h1>
          <UserBadges badges={seller.badges} />
        </div>
        {reviewCount > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {renderStars(Math.round(averageRating))}
            <span className="text-sm font-bold text-gold">{averageRating.toFixed(1)}</span>
            <span className="text-xs text-gray-500">({reviewCount})</span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="py-3 bg-white rounded-xl border border-gray-200">
            <div className="text-base font-bold text-gray-900">{seller.products.length}개</div>
            <div className="text-[10px] text-gray-500">{t('sellerProfile.sales')}</div>
          </div>
          <div className="py-3 bg-white rounded-xl border border-gray-200">
            <div className="text-base font-bold text-gold">{averageRating > 0 ? averageRating.toFixed(1) : '-'}</div>
            <div className="text-[10px] text-gray-500">{t('sellerProfile.avgRating')}</div>
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
              <select value={reviewProductId} onChange={e => setReviewProductId(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-gray-200 text-gray-900">
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
              className="w-full px-3 py-2 rounded-lg text-sm bg-white border border-gray-200 text-gray-900 placeholder-gray-400 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowReviewForm(false); setReviewContent(''); }} className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium border border-gray-200">{t('btn.cancel')}</button>
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
              <div key={review.id} className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 overflow-hidden">
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
                <span className="text-gray-500 text-xs">&rarr;</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerProfile;
