import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import { useMeta } from '../hooks/useMeta';
import { toastSuccess, toastError } from '../components/Toast';
import { CameraIcon, CloseIcon, HeartFilledIcon, HeartOutlineIcon, ShieldIcon, UserIcon } from '../components/Icons';
import MarketPriceBadge from '../components/MarketPriceBadge';

interface Product {
  id: string;
  name: string;
  brand: string;
  subcategory: string | null;
  price: number;
  image: string;
  images: string | null;
  category: string;
  description: string | null;
  condition: string | null;
  usageCount: string | null;
  status: string;
  wishlisted: boolean;
  userId: string | null;
  user: { id: string; name: string } | null;
  createdAt: string;
}

const reportReasons = [
  '허위 매물 (존재하지 않는 상품)',
  '사기 의심 (선입금 요구, 가격 비정상)',
  '도난품 의심',
  '상품 상태 허위 기재',
  '욕설/비방/불쾌한 표현',
  '성인/음란 콘텐츠',
  '개인정보 노출',
  '기타',
];

const UsedDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showFullImage, setShowFullImage] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const user = getUser();
  const [, setLangTick] = useState(0);

  useMeta({
    title: product ? `${product.name}${product.brand ? ` · ${product.brand}` : ''} ${product.price.toLocaleString()}원` : undefined,
    description: product ? (product.description?.slice(0, 150) || `${product.name} 중고 스키/보드 장비 - 스노우판에서 안전하게 거래하세요.`) : undefined,
    image: product?.image ? (product.image.startsWith('http') ? product.image : imageUrl(product.image)) : undefined,
    type: 'product',
  });

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  // Schema.org Product JSON-LD — Google 리치 결과 (가격·상태 노출).
  useEffect(() => {
    if (!product) return;
    const SCRIPT_ID = 'snowpan-product-jsonld';
    document.getElementById(SCRIPT_ID)?.remove();
    const conditionMap: Record<string, string> = {
      '상': 'https://schema.org/NewCondition',
      '중': 'https://schema.org/UsedCondition',
      '하': 'https://schema.org/UsedCondition',
    };
    const availability =
      product.status === 'sold'
        ? 'https://schema.org/SoldOut'
        : product.status === 'reserved'
        ? 'https://schema.org/LimitedAvailability'
        : 'https://schema.org/InStock';
    const productImage = product.image?.startsWith('http') ? product.image : imageUrl(product.image);
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description || `${product.name} — 스노우판 중고 스키/보드 장비`,
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      image: productImage,
      itemCondition: product.condition ? conditionMap[product.condition] : 'https://schema.org/UsedCondition',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'KRW',
        price: product.price,
        availability,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        seller: product.user ? { '@type': 'Person', name: product.user.name } : undefined,
      },
    };
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
    return () => { document.getElementById(SCRIPT_ID)?.remove(); };
  }, [product]);

  const statusLabel: Record<string, { text: string; color: string }> = {
    selling: { text: t('used.status.selling'), color: 'bg-mint/20 text-emerald-700' },
    reserved: { text: t('used.status.reserved'), color: 'bg-yellow-100 text-yellow-700' },
    sold: { text: t('used.status.sold'), color: 'bg-gray-200 text-gray-500' },
  };

  const subcategoryLabels: Record<string, string> = {
    ski: t('used.cat.ski'), board: t('used.cat.board'), boots: t('used.cat.boots'), binding: t('used.cat.binding'),
    helmet: t('used.cat.helmet'), goggles: t('used.cat.goggles'), wear: t('used.cat.wear'), etc: t('used.cat.etc'),
  };

  useEffect(() => {
    if (!id) return;
    api<Product>(`/products/${id}`)
      .then(p => {
        setProduct(p);
        setWishlisted(p.wishlisted);

        // Save to recently viewed (localStorage)
        try {
          const key = 'recentlyViewedProducts';
          const stored = JSON.parse(localStorage.getItem(key) || '[]') as { id: string; name: string; price: number; image: string; viewedAt: string }[];
          const filtered = stored.filter(item => item.id !== p.id);
          const entry = { id: p.id, name: p.name, price: p.price, image: p.image, viewedAt: new Date().toISOString() };
          const updated = [entry, ...filtered].slice(0, 20);
          localStorage.setItem(key, JSON.stringify(updated));
        } catch { /* ignore */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
  };

  const conditionLabels: Record<string, string> = { '상': '새상품/거의 새 거', '중': '사용감 적음', '하': '사용감 많음' };

  const handleShare = async () => {
    const url = window.location.href;
    const title = product?.name || '스노우판 상품';
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

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !product) return;
    try {
      await api(`/products/${id}`, { method: 'PUT', body: { status: newStatus } });
      setProduct({ ...product, status: newStatus });
    } catch {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleReport = async () => {
    if (!reportReason || !id) return;
    setReportSubmitting(true);
    try {
      await api('/reports', {
        method: 'POST',
        body: { type: 'product', targetId: id, reason: reportReason, description: reportDesc || undefined },
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

  if (loading) {
    return <div className="text-center py-20 text-gray-500 text-sm animate-fade-in">{t('general.loading')}</div>;
  }

  if (!product) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('usedDetail.notFound')}</h2>
        <Link to="/used" className="text-gray-500 hover:text-gray-900 text-sm">&larr; {t('usedDetail.backToList')}</Link>
      </div>
    );
  }

  const isUrl = (s: string) => s.startsWith('http') || s.startsWith('/');
  const allImages = product.images
    ? product.images.split(',').filter(s => s && isUrl(s)).map(u => imageUrl(u))
    : isUrl(product.image) ? [imageUrl(product.image)] : [];
  const hasImages = allImages.length > 0;
  const currentImage = allImages[selectedImage] || '';
  const sellerName = product.user?.name || '판매자';
  const sellerId = product.user?.id || '';
  const isMyProduct = user && product.userId === user.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Link to="/used" className="inline-flex items-center text-gray-500 hover:text-gray-900 text-sm transition-colors">
        &larr; {t('usedDetail.backToUsed')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image */}
        <div>
          <div
            className="card aspect-[4/3] sm:aspect-square max-h-[480px] flex items-center justify-center overflow-hidden cursor-pointer"
            style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)' }}
            onClick={() => hasImages && !imgError && setShowFullImage(true)}
          >
            {hasImages && !imgError ? (
              <img src={currentImage} alt={product.name} className="w-full h-full object-cover" onError={() => setImgError(true)} loading="eager" decoding="async" />
            ) : (
              <div className="text-center text-gray-500">
                <CameraIcon size={56} strokeWidth={1.4} />
                <p className="text-xs text-gray-500 mt-2">{t('usedDetail.noImage')}</p>
              </div>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {allImages.map((img, idx) => (
                <button key={idx} onClick={() => setSelectedImage(idx)} className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${selectedImage === idx ? 'border-accent' : 'border-gray-200'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <div className="text-xs text-accent-light font-medium tracking-wider mb-1">
              {product.subcategory && <span className="bg-accent/10 text-accent px-1.5 py-0.5 rounded mr-1.5">{subcategoryLabels[product.subcategory] || product.subcategory}</span>}
              {product.brand && <span className="uppercase">{product.brand}</span>}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <div className="text-xs text-gray-500">{formatDate(product.createdAt)}</div>
          </div>

          {/* Price + Status + Wishlist + Share + Report */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-3xl font-black text-mint">{product.price.toLocaleString()}원</span>
                <MarketPriceBadge subcategory={product.subcategory} brand={product.brand} price={product.price} variant="badge" />
                {isMyProduct ? (
                  <select
                    value={product.status}
                    onChange={e => handleStatusChange(e.target.value)}
                    className={`text-xs font-bold px-2 py-1 rounded border-0 cursor-pointer outline-none ${(statusLabel[product.status] || statusLabel.selling).color}`}
                  >
                    <option value="selling">판매중</option>
                    <option value="reserved">예약중</option>
                    <option value="sold">판매완료</option>
                  </select>
                ) : product.status !== 'selling' && (
                  <span className={`text-xs font-bold px-2 py-1 rounded ${(statusLabel[product.status] || statusLabel.selling).color}`}>
                    {(statusLabel[product.status] || statusLabel.selling).text}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="text-gray-500 hover:text-accent transition-colors p-1"
                  title={t('usedDetail.share')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
                {/* Report button */}
                {user && !isMyProduct && (
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-coral hover:bg-coral/5 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    신고
                  </button>
                )}
                {/* Wishlist button — hidden for own products */}
                {user && product.userId !== user.id && (
                  <button
                    aria-label={wishlisted ? '찜 해제' : '찜하기'}
                    onClick={async () => {
                      try {
                        const res = await api<{ wishlisted: boolean }>(`/products/${product.id}/wishlist`, { method: 'POST' });
                        setWishlisted(res.wishlisted);
                        toastSuccess(res.wishlisted ? '찜 목록에 추가되었습니다' : '찜을 해제했습니다');
                      } catch (e) { toastError(e instanceof Error ? e.message : '찜 처리에 실패했습니다.'); }
                    }}
                    className={`transition-transform active:scale-125 ${wishlisted ? 'text-coral' : 'text-gray-500 hover:text-coral/50'}`}
                  >
                    {wishlisted ? <HeartFilledIcon size={26} /> : <HeartOutlineIcon size={26} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">{t('usedDetail.productInfo')}</h3>
            <div className="space-y-2">
              {product.condition && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-500">{t('usedDetail.condition')}</span>
                  <span className="text-sm text-gray-900 font-medium">{conditionLabels[product.condition] || product.condition}</span>
                </div>
              )}
              {product.usageCount && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-500">{t('usedDetail.year')}</span>
                  <span className="text-sm text-gray-900 font-medium">{product.usageCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">{t('usedDetail.description')}</h3>
              <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Seller */}
          <div className="card p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-600"><UserIcon size={20} /></div>
              <div>
                <div className="text-sm font-bold text-gray-900">{sellerName}</div>
              </div>
            </div>
            {sellerId && (
              <Link to={`/seller/${sellerId}`} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm border border-gray-300 hover:bg-gray-200 transition-colors">
                {t('usedDetail.viewProfile')}
              </Link>
            )}
          </div>

          {/* Chat Button */}
          {!isMyProduct && product.status !== 'sold' && (
            <button
              onClick={() => navigate(`/chat/new`, {
                state: { seller: sellerName, sellerId, productName: product.name, productImage: product.image, productPrice: product.price, backTo: `/used/${product.id}`, productPath: `/used/${product.id}` }
              })}
              className="w-full py-3.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98]"
            >
              {t('usedDetail.startChat')}
            </button>
          )}
          {product.status === 'sold' && !isMyProduct && (
            <div className="w-full py-3.5 bg-gray-200 text-gray-500 rounded-xl font-bold text-sm text-center">{t('usedDetail.soldItem')}</div>
          )}

          {/* Edit/Delete */}
          {(isMyProduct || (user && user.role === 'admin')) && (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const isAdminAction = !isMyProduct && user?.role === 'admin';
                  if (!confirm(isAdminAction ? '관리자 권한으로 이 상품을 삭제하시겠습니까?' : '정말 삭제하시겠습니까?')) return;
                  try {
                    await api(`/products/${product.id}`, { method: 'DELETE' });
                    alert('삭제되었습니다.');
                    window.location.href = '/used';
                  } catch (err) { alert(err instanceof Error ? err.message : '삭제 실패'); }
                }}
                className="flex-1 py-3 bg-gray-100 text-red-500 rounded-xl font-bold text-sm border border-gray-200 active:bg-red-50"
              >
                {!isMyProduct && user?.role === 'admin' ? '관리자 삭제' : t('usedDetail.delete')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 안전거래 가이드 + 면책 고지 */}
      <div className="text-center py-3 space-y-1">
        <Link to="/safe-trade" className="inline-flex items-center gap-1 text-xs text-gray-900 hover:underline">
          <ShieldIcon size={12} /> 안전거래 가이드 확인하기
        </Link>
        <p className="text-[9px] text-gray-500 px-4">스노우판은 통신판매중개자로서 거래 당사자가 아니며, 판매자가 등록한 상품 정보 및 거래에 대한 책임을 지지 않습니다.</p>
      </div>

      {/* Full Image Viewer */}
      {showFullImage && allImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setShowFullImage(false)}>
          <button className="absolute top-4 right-4 text-white z-10" aria-label="닫기" onClick={() => setShowFullImage(false)}><CloseIcon size={24} /></button>
          <img src={allImages[selectedImage]} alt="" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
          {allImages.length > 1 && (
            <>
              <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl" onClick={e => { e.stopPropagation(); setSelectedImage(prev => Math.max(0, prev - 1)); }}>&lsaquo;</button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl" onClick={e => { e.stopPropagation(); setSelectedImage(prev => Math.min(allImages.length - 1, prev + 1)); }}>&rsaquo;</button>
            </>
          )}
          <div className="absolute bottom-4 text-white text-sm">{selectedImage + 1} / {allImages.length}</div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReportModal(false)} />
          <div className="relative bg-snow rounded-xl p-6 w-full max-w-sm border border-gray-300">
            <h3 className="text-lg font-bold text-gray-900 mb-2">상품 신고</h3>
            <p className="text-xs text-gray-500 mb-4">신고 사유를 선택해주세요</p>
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
              <button onClick={() => { setShowReportModal(false); setReportReason(''); setReportDesc(''); }} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-lg font-medium text-sm border border-gray-300">{t('btn.cancel')}</button>
              <button onClick={handleReport} disabled={!reportReason || reportSubmitting} className="flex-1 py-3 bg-coral text-white rounded-lg font-bold text-sm disabled:opacity-30">
                {reportSubmitting ? '처리 중...' : t('usedDetail.report')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsedDetail;
