import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import { useMeta } from '../hooks/useMeta';
import { toastSuccess, toastError } from '../components/Toast';
import { CloseIcon, HeartFilledIcon, HeartOutlineIcon, ShieldIcon, UserIcon } from '../components/Icons';
import MarketPriceBadge from '../components/MarketPriceBadge';
import CategoryPlaceholder from '../components/CategoryPlaceholder';
import { useVertical } from '../hooks/useVertical';
import HScroll from '../components/HScroll';

interface Product {
  id: string;
  name: string;
  brand: string;
  subcategory: string | null;
  price: number;
  retailPrice?: number | null;
  image: string;
  images: string | null;
  category: string;
  description: string | null;
  condition: string | null;
  usageCount: string | null;
  length?: string | null;   // 길이(cm) - 스키/보드
  radius?: string | null;   // 회전반경(m) - 스키
  flex?: string | null;     // 플렉스 - 부츠/보드
  size?: string | null;     // 사이즈 - 부츠/바인딩/헬멧/의류
  tradeMethod?: string | null;
  location?: string | null;
  status: string;
  wishlisted: boolean;
  viewCount?: number;
  wishlistCount?: number;
  userId: string | null;
  user: { id: string; name: string; nickname?: string | null; profileImage?: string | null } | null;
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
  const vertical = useVertical();
  const vbase = vertical.slug === 'snow' ? '' : vertical.basePath;
  const gearLabel = vertical.slug === 'snow' ? '스키/보드 장비' : `${vertical.tagline.split(' ')[0]} 장비`;
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showFullImage, setShowFullImage] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [sellerRating, setSellerRating] = useState<{ avg: number; count: number } | null>(null);
  // 이미지 한 장 깨져도 다른 썸네일 선택 시 다시 시도 (한 번 실패로 갤러리 전체 placeholder 되는 것 방지).
  useEffect(() => { setImgError(false); }, [selectedImage]);
  const [wishlisted, setWishlisted] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const user = getUser();
  const [, setLangTick] = useState(0);
  // 하단 sticky 액션바 — 인라인 버튼이 화면 밖으로 스크롤되면 노출. 훅은 조기 return 앞에 위치(훅 순서 규칙).
  const inlineActionsRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useMeta({
    title: product ? `${product.name}${product.brand ? ` · ${product.brand}` : ''} ${product.price.toLocaleString()}원` : undefined,
    description: product ? (product.description?.slice(0, 150) || `${product.name} 중고 ${gearLabel} - 안전하게 거래하세요.`) : undefined,
    image: product?.image ? (product.image.startsWith('http') ? product.image : imageUrl(product.image)) : undefined,
    type: 'product',
    jsonLd: product ? {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
      ...(product.image ? { image: product.image.startsWith('http') ? product.image : imageUrl(product.image) } : {}),
      ...(product.description ? { description: product.description.slice(0, 300) } : {}),
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: 'KRW',
        availability: product.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/UsedCondition',
      },
    } : null,
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
      description: product.description || `${product.name} — 중고 ${gearLabel}`,
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

  // 판매자 평점 요약 — 판매자 카드 배지용 (공개 API)
  useEffect(() => {
    const sid = product?.userId;
    if (!sid) return;
    let cancelled = false;
    api<{ averageRating: number; totalCount: number }>(`/reviews?sellerId=${sid}`)
      .then((d) => { if (!cancelled) setSellerRating({ avg: d.averageRating || 0, count: d.totalCount || 0 }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [product?.userId]);

  const statusLabel: Record<string, { text: string; color: string }> = {
    selling: { text: t('used.status.selling'), color: 'bg-mint/20 text-emerald-700' },
    reserved: { text: t('used.status.reserved'), color: 'bg-yellow-100 text-yellow-700' },
    sold: { text: t('used.status.sold'), color: 'bg-gray-200 text-gray-500' },
  };

  // 카테고리 라벨 — 판(vertical) 설정 기반 (raw id 노출 방지: ski_boots, shoes 등 전부 커버).
  const subcategoryLabels: Record<string, string> = Object.fromEntries(
    (vertical.usedSubcategories || []).map((c) => [c.id, c.label])
  );

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
    const title = product?.name || '상품';
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch { /* ignore - user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toastSuccess('링크가 클립보드에 복사되었습니다.');
      } catch { /* ignore */ }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !product) return;
    try {
      await api(`/products/${id}`, { method: 'PUT', body: { status: newStatus } });
      setProduct({ ...product, status: newStatus });
      toastSuccess(newStatus === 'reserved' ? '예약중으로 변경했어요' : newStatus === 'sold' ? '판매완료로 변경했어요' : '판매중으로 변경했어요');
    } catch {
      toastError('상태 변경에 실패했습니다.');
    }
  };

  // 인라인 액션 버튼 가시성 추적 → 화면 밖이면 sticky 바 노출
  useEffect(() => {
    const el = inlineActionsRef.current;
    if (!el) { setShowStickyBar(false); return; }
    const io = new IntersectionObserver(([e]) => setShowStickyBar(!e.isIntersecting), { rootMargin: '0px 0px -80px 0px' });
    io.observe(el);
    return () => io.disconnect();
  });

  const [bumping, setBumping] = useState(false);
  const handleBump = async () => {
    if (!id || bumping) return;
    setBumping(true);
    try {
      await api(`/products/${id}/bump`, { method: 'PUT' });
      toastSuccess('맨 위로 끌어올렸어요!');
    } catch (e) {
      toastError(e instanceof Error ? e.message : '끌어올리기에 실패했습니다.');
    } finally {
      setBumping(false);
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
      toastSuccess('신고가 접수되었습니다.');
      setShowReportModal(false);
      setReportReason('');
      setReportDesc('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '신고 처리에 실패했습니다.');
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
        <Link to={`${vbase}/used`} className="text-gray-500 hover:text-gray-900 text-sm">&larr; {t('usedDetail.backToList')}</Link>
      </div>
    );
  }

  const isUrl = (s: string) => s.startsWith('http') || s.startsWith('/');
  // 상세 페이지 이미지 — 900px 이면 retina 폰 (448×2) 대응 + 트래픽 절감.
  const allImages = product.images
    ? product.images.split(',').filter(s => s && isUrl(s)).map(u => imageUrl(u, 900))
    : isUrl(product.image) ? [imageUrl(product.image, 900)] : [];
  const hasImages = allImages.length > 0;
  const currentImage = allImages[selectedImage] || '';
  const sellerName = product.user?.nickname || product.user?.name || '판매자';
  const sellerId = product.user?.id || '';
  const sellerImage = product.user?.profileImage || '';
  const isMyProduct = user && product.userId === user.id;

  const startChat = () => {
    // 탈퇴한 판매자 매물 — sellerId 없이 채팅방 열면 죽은 방이 생김.
    if (!sellerId) { toastError('판매자가 탈퇴하여 채팅할 수 없습니다.'); return; }
    navigate(`/chat/new`, {
      state: { seller: sellerName, sellerId, productName: product.name, productImage: product.image, productPrice: product.price, backTo: `${vbase}/used/${product.id}`, productPath: `${vbase}/used/${product.id}` }
    });
  };
  const toggleWish = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await api<{ wishlisted: boolean }>(`/products/${product!.id}/wishlist`, { method: 'POST' });
      setWishlisted(res.wishlisted);
      setProduct(p => p ? { ...p, wishlistCount: Math.max(0, (p.wishlistCount ?? 0) + (res.wishlisted ? 1 : -1)) } : p);
      toastSuccess(res.wishlisted ? '찜 목록에 추가되었습니다' : '찜을 해제했습니다');
    } catch (e) { toastError(e instanceof Error ? e.message : '찜 처리에 실패했습니다.'); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Link to={`${vbase}/used`} className="inline-flex items-center text-gray-500 hover:text-gray-900 text-sm transition-colors">
        &larr; {t('usedDetail.backToUsed')}
      </Link>

      <div className="grid grid-cols-1 gap-8">
        {/* Image */}
        <div>
          <div
            className="card aspect-[4/3] max-h-[480px] flex items-center justify-center overflow-hidden cursor-pointer"
            style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)' }}
            onClick={() => hasImages && !imgError && setShowFullImage(true)}
          >
            {hasImages && !imgError ? (
              <img src={currentImage} alt={product.name} className="w-full h-full object-cover" style={{ viewTransitionName: 'hero-img' }} onError={() => setImgError(true)} loading="eager" decoding="async" />
            ) : (
              <CategoryPlaceholder subcategory={product.subcategory} />
            )}
          </div>
          {allImages.length > 1 && (
            <HScroll className="flex gap-2 mt-2 overflow-x-auto">
              {allImages.map((img, idx) => (
                <button key={idx} onClick={() => setSelectedImage(idx)} className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${selectedImage === idx ? 'border-accent' : 'border-gray-200'}`}>
                  <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </HScroll>
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
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{formatDate(product.createdAt)}</span>
              <span className="text-gray-300">·</span>
              <span className="inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                조회 {(product.viewCount ?? 0).toLocaleString()}
              </span>
              <span className="text-gray-300">·</span>
              <span className="inline-flex items-center gap-1">
                <HeartFilledIcon size={12} className="text-coral" />
                찜 {(product.wishlistCount ?? 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Price + Status + Wishlist + Share + Report */}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-3xl font-black text-mint">{product.price.toLocaleString()}원</span>
                {product.retailPrice && product.retailPrice > product.price && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5">
                      정가 대비 {Math.round((1 - product.price / product.retailPrice) * 100)}%↓
                    </span>
                    <span className="text-xs text-gray-400 line-through">신품 {product.retailPrice.toLocaleString()}원</span>
                  </span>
                )}
                <MarketPriceBadge subcategory={product.subcategory} brand={product.brand} price={product.price} variant="badge" />
                {isMyProduct ? (
                  <>
                    <select
                      value={product.status}
                      onChange={e => handleStatusChange(e.target.value)}
                      className={`text-xs font-bold px-2 py-1 rounded border-0 cursor-pointer outline-none ${(statusLabel[product.status] || statusLabel.selling).color}`}
                    >
                      <option value="selling">판매중</option>
                      <option value="reserved">예약중</option>
                      <option value="sold">판매완료</option>
                    </select>
                    {product.status !== 'sold' && (
                      <button
                        onClick={handleBump}
                        disabled={bumping}
                        className="text-xs font-bold px-2.5 py-1 rounded bg-gray-900 text-white active:scale-95 transition-transform disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                        {bumping ? '처리중' : '끌어올리기'}
                      </button>
                    )}
                  </>
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
              {product.length && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-500">길이</span>
                  <span className="text-sm text-gray-900 font-medium">{/[a-z]/i.test(product.length) ? product.length : `${product.length}cm`}</span>
                </div>
              )}
              {product.radius && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-500">회전반경</span>
                  <span className="text-sm text-gray-900 font-medium">{/[a-z]/i.test(product.radius) ? product.radius : `${product.radius}m`}</span>
                </div>
              )}
              {product.flex && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-500">플렉스</span>
                  <span className="text-sm text-gray-900 font-medium">{product.flex}</span>
                </div>
              )}
              {product.size && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-500">사이즈</span>
                  <span className="text-sm text-gray-900 font-medium">{product.size}</span>
                </div>
              )}
              {product.usageCount && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-500">{t('usedDetail.year')}</span>
                  <span className="text-sm text-gray-900 font-medium">{product.usageCount}</span>
                </div>
              )}
              {product.tradeMethod && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-500">거래 방식</span>
                  <span className="text-sm text-gray-900 font-medium">{product.tradeMethod}</span>
                </div>
              )}
              {product.location && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-500">직거래 지역</span>
                  <span className="text-sm text-gray-900 font-medium">{product.location}</span>
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
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-600 overflow-hidden">
                {sellerImage ? <img src={imageUrl(sellerImage)} alt="" className="w-full h-full object-cover" /> : <UserIcon size={20} />}
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{sellerName}</div>
                {sellerRating && (
                  sellerRating.count > 0 ? (
                    <div className="text-[11px] text-gold font-bold mt-0.5">★ {sellerRating.avg.toFixed(1)} <span className="text-gray-500 font-medium">· 후기 {sellerRating.count}</span></div>
                  ) : (
                    <div className="text-[10px] text-gray-400 mt-0.5">신규 판매자</div>
                  )
                )}
              </div>
            </div>
            {sellerId && (
              <Link to={`/seller/${sellerId}`} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm border border-gray-300 hover:bg-gray-200 transition-colors">
                {t('usedDetail.viewProfile')}
              </Link>
            )}
          </div>

          {/* Chat + Wishlist Button — 찜 하트를 크게 노출 (내 매물이 아닐 때) */}
          {!isMyProduct && product.status !== 'sold' && (
            <div ref={inlineActionsRef} className="flex gap-2">
              <button
                onClick={toggleWish}
                aria-label={wishlisted ? '찜 해제' : '찜하기'}
                className={`w-14 flex-shrink-0 py-3.5 rounded-xl border-2 flex items-center justify-center active:scale-95 transition-transform ${wishlisted ? 'border-coral text-coral bg-coral/5' : 'border-gray-200 text-gray-500'}`}
              >
                {wishlisted ? <HeartFilledIcon size={24} /> : <HeartOutlineIcon size={24} />}
              </button>
              <button
                onClick={startChat}
                className="flex-1 py-3.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98]"
              >
                {t('usedDetail.startChat')}
              </button>
            </div>
          )}
          {product.status === 'sold' && !isMyProduct && (
            <div className="w-full py-3.5 bg-gray-200 text-gray-500 rounded-xl font-bold text-sm text-center">{t('usedDetail.soldItem')}</div>
          )}

          {/* Edit/Delete */}
          {(isMyProduct || (user && user.role === 'admin')) && (
            <div className="flex gap-2">
              {isMyProduct && (
                <Link to={`${vbase}/used/${product.id}/edit`} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm border border-gray-200 text-center active:bg-gray-200">수정</Link>
              )}
              <button
                onClick={async () => {
                  const isAdminAction = !isMyProduct && user?.role === 'admin';
                  if (!confirm(isAdminAction ? '관리자 권한으로 이 상품을 삭제하시겠습니까?' : '정말 삭제하시겠습니까?')) return;
                  try {
                    await api(`/products/${product.id}`, { method: 'DELETE' });
                    toastSuccess('삭제되었습니다.');
                    navigate(`${vbase}/used`, { replace: true }); // SPA 이동 — 전체 리로드(스플래시 재생) 방지
                  } catch (err) { toastError(err instanceof Error ? err.message : '삭제 실패'); }
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
        <p className="text-[9px] text-gray-500 px-4">{vertical.slug === 'snow' ? '스노우판' : vertical.name}은 통신판매중개자로서 거래 당사자가 아니며, 판매자가 등록한 상품 정보 및 거래에 대한 책임을 지지 않습니다.</p>
      </div>

      {/* Full Image Viewer */}
      {showFullImage && allImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setShowFullImage(false)}>
          <button className="absolute top-4 right-4 text-white z-10" aria-label="닫기" onClick={() => setShowFullImage(false)}><CloseIcon size={24} /></button>
          <img src={allImages[selectedImage]} alt={product.name} className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
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

      {/* 하단 sticky 액션바 — 채팅 버튼이 스크롤로 사라지면 화면 하단에 고정 노출.
          당근·번개장터식 — 거래 시작까지의 스크롤 마찰 제거 (하단 네비 위에 안착) */}
      {!isMyProduct && product.status !== 'sold' && showStickyBar && (
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-40 bg-snow/95 backdrop-blur border-t border-gray-200 px-4 py-2.5 animate-fade-in-up">
          <div className="max-w-4xl mx-auto flex items-center gap-2.5">
            <div className="flex-shrink-0">
              <p className="text-[11px] text-gray-400 leading-none">{product.status === 'reserved' ? '예약중' : '판매중'}</p>
              <p className="text-base font-bold text-gray-900 leading-tight">{product.price.toLocaleString()}원</p>
            </div>
            <button
              onClick={toggleWish}
              aria-label={wishlisted ? '찜 해제' : '찜하기'}
              className={`w-12 flex-shrink-0 py-2.5 rounded-xl border-2 flex items-center justify-center active:scale-95 transition-transform ${wishlisted ? 'border-coral text-coral bg-coral/5' : 'border-gray-200 text-gray-500'}`}
            >
              {wishlisted ? <HeartFilledIcon size={20} /> : <HeartOutlineIcon size={20} />}
            </button>
            <button
              onClick={startChat}
              className="flex-1 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98]"
            >
              {t('usedDetail.startChat')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsedDetail;
