import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  category: string;
  description: string | null;
  condition: string | null;
  usageCount: string | null;
  userId: string | null;
  user: { id: string; name: string } | null;
  createdAt: string;
}

const UsedDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (!id) return;
    api<Product>(`/products/${id}`)
      .then(setProduct)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
  };

  const conditionLabels: Record<string, string> = { '상': '새상품/거의 새 거', '중': '사용감 적음', '하': '사용감 많음' };

  if (loading) {
    return <div className="text-center py-20 text-gray-400 text-sm animate-fade-in">로딩 중...</div>;
  }

  if (!product) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 mb-2">상품을 찾을 수 없습니다</h2>
        <Link to="/used" className="text-gray-500 hover:text-gray-900 text-sm">← 목록으로 돌아가기</Link>
      </div>
    );
  }

  const isImage = product.image.startsWith('/') || product.image.startsWith('http');
  const imgSrc = imageUrl(product.image);
  const sellerName = product.user?.name || '판매자';
  const sellerId = product.user?.id || '';
  const isMyProduct = user && product.userId === user.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Link to="/used" className="inline-flex items-center text-gray-400 hover:text-gray-900 text-sm transition-colors">
        ← 중고 장비 목록
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image */}
        <div className="card h-80 flex items-center justify-center bg-gray-100 overflow-hidden">
          {isImage ? (
            <img src={imgSrc} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-9xl">{product.image}</span>
          )}
        </div>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <div className="text-xs text-accent-light font-medium tracking-wider uppercase mb-1">{product.brand}</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <div className="text-xs text-gray-400">{formatDate(product.createdAt)}</div>
          </div>

          {/* Price */}
          <div className="card p-5">
            <span className="text-3xl font-black text-mint">{product.price.toLocaleString()}원</span>
          </div>

          {/* Info */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">상품 정보</h3>
            <div className="space-y-2">
              {product.condition && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-400">상태</span>
                  <span className="text-sm text-gray-900 font-medium">{conditionLabels[product.condition] || product.condition}</span>
                </div>
              )}
              {product.usageCount && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-400">연식</span>
                  <span className="text-sm text-gray-900 font-medium">{product.usageCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">상품 설명</h3>
              <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Seller */}
          <div className="card p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-lg">👤</div>
              <div>
                <div className="text-sm font-bold text-gray-900">{sellerName}</div>
              </div>
            </div>
            {sellerId && (
              <Link to={`/seller/${sellerId}`} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm border border-gray-300 hover:bg-gray-200 transition-colors">
                프로필 보기
              </Link>
            )}
          </div>

          {/* Chat Button */}
          {!isMyProduct && (
            <button
              onClick={() => navigate(`/chat/${product.id}`, {
                state: { seller: sellerName, sellerId, productName: product.name, productImage: product.image, productPrice: product.price }
              })}
              className="w-full py-3.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98]"
            >
              채팅하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsedDetail;
