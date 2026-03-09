import { useParams, Link } from 'react-router-dom';

const SellerProfile = () => {
  const { sellerId } = useParams();

  const sellers: Record<string, {
    id: string; name: string; rating: number; deals: number;
    joinDate: string; items: { id: string; name: string; price: number; image: string }[];
  }> = {
    '스키매니아': {
      id: '스키매니아', name: '스키매니아', rating: 4.8, deals: 12, joinDate: '2023.03',
      items: [
        { id: '1', name: 'Rossignol Soul 7 (2022)', price: 450000, image: '🎿' },
      ],
    },
    '보더킹': {
      id: '보더킹', name: '보더킹', rating: 4.5, deals: 8, joinDate: '2023.06',
      items: [
        { id: '2', name: 'Burton Custom (2021)', price: 380000, image: '🏂' },
      ],
    },
  };

  const seller = sellerId ? sellers[sellerId] : null;

  if (!seller) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">판매자를 찾을 수 없습니다</h2>
        <Link to="/used" className="text-gray-400 hover:text-gray-900 text-sm">
          ← 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      {/* Profile Card */}
      <div className="card rounded-2xl p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-3xl mx-auto mb-4">
          👤
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">{seller.name}</h1>
        <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mb-4">
          <span className="text-gold">★</span> {seller.rating}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="py-3 bg-white rounded-xl border border-gray-200">
            <div className="text-base font-bold text-gray-900">{seller.deals}건</div>
            <div className="text-[10px] text-gray-400">거래 완료</div>
          </div>
          <div className="py-3 bg-white rounded-xl border border-gray-200">
            <div className="text-base font-bold text-gray-900">{seller.joinDate}</div>
            <div className="text-[10px] text-gray-400">가입일</div>
          </div>
        </div>
      </div>

      {/* 판매 중인 상품 */}
      <div className="card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">판매 중인 상품</h3>
        <div className="space-y-3">
          {seller.items.map((item) => (
            <Link
              key={item.id}
              to={`/used/${item.id}`}
              className="flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-gray-100 transition-all border border-gray-200"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl border border-gray-300">
                {item.image}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                <div className="text-sm font-bold text-mint">{item.price.toLocaleString()}원</div>
              </div>
              <span className="text-gray-400 text-xs">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SellerProfile;
