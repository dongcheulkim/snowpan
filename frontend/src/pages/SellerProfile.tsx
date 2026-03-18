import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import UserBadges from '../components/UserBadges';

interface SellerData {
  id: string;
  name: string;
  profileImage: string | null;
  badges: string[];
  createdAt: string;
  products: { id: string; name: string; price: number; image: string; createdAt: string }[];
}

const SellerProfile = () => {
  const { sellerId } = useParams();
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    api<SellerData>(`/auth/seller/${sellerId}`)
      .then(setSeller)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sellerId]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  if (loading) return <div className="text-center py-20 text-gray-400 text-sm animate-fade-in">로딩 중...</div>;

  if (!seller) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 mb-2">판매자를 찾을 수 없습니다</h2>
        <Link to="/used" className="text-gray-400 hover:text-gray-900 text-sm">← 목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      <Link to="/used" className="inline-flex items-center text-gray-400 hover:text-gray-900 text-sm transition-colors">← 뒤로</Link>

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
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="py-3 bg-white rounded-xl border border-gray-200">
            <div className="text-base font-bold text-gray-900">{seller.products.length}개</div>
            <div className="text-[10px] text-gray-400">판매 물품</div>
          </div>
          <div className="py-3 bg-white rounded-xl border border-gray-200">
            <div className="text-base font-bold text-gray-900">{formatDate(seller.createdAt)}</div>
            <div className="text-[10px] text-gray-400">가입일</div>
          </div>
        </div>
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
                <span className="text-gray-400 text-xs">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerProfile;
