import { useParams, Link, useNavigate } from 'react-router-dom';

const UsedDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const allProducts: Record<string, {
    id: string; name: string; brand: string; price: number;
    image: string;
    size: string; year: string; description: string; location: string;
    seller: string; sellerRating: number; createdAt: string; images: string[];
  }> = {
    '1': {
      id: '1', name: 'Rossignol Soul 7 (2022)', brand: 'Rossignol',
      price: 450000, image: '🎿',
      size: '172cm', year: '2022',
      description: '22시즌 구매 후 5회 사용했습니다. 엣지 상태 양호하고 탑시트에 미세한 스크래치 외에는 거의 새것 수준입니다. 바인딩 별도. 직거래 선호합니다.',
      location: '서울 강남구', seller: '스키매니아', sellerRating: 4.8,
      createdAt: '2024-01-15', images: ['🎿', '⛷️', '🏔️'],
    },
    '2': {
      id: '2', name: 'Burton Custom (2021)', brand: 'Burton',
      price: 380000, image: '🏂',
      size: '156cm', year: '2021',
      description: '21시즌 모델이며 약 10회 정도 사용했습니다. 전체적으로 양호하나 솔 부분에 사용감이 있습니다. 왁싱 최근에 했고 바인딩 포함 가격입니다.',
      location: '경기 성남시', seller: '보더킹', sellerRating: 4.5,
      createdAt: '2024-01-20', images: ['🏂', '🏔️', '⛷️'],
    },
  };

  const product = id ? allProducts[id] : null;

  if (!product) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 mb-2">상품을 찾을 수 없습니다</h2>
        <Link to="/used" className="text-gray-500 hover:text-gray-900 text-sm">← 목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Link to="/used" className="inline-flex items-center text-gray-400 hover:text-gray-900 text-sm transition-colors">
        ← 중고 장비 목록
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="card h-80 flex items-center justify-center text-9xl bg-gray-100">
            {product.image}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {product.images.map((img, idx) => (
              <div key={idx} className="card h-24 flex items-center justify-center text-4xl cursor-pointer hover:border-gray-400 transition-colors">
                {img}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="text-xs text-accent-light font-medium tracking-wider uppercase mb-1">{product.brand}</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-400">{product.createdAt}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-400">{product.location}</span>
            </div>
          </div>

          <div className="card p-5">
            <span className="text-3xl font-black text-mint">{product.price.toLocaleString()}원</span>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">상품 정보</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '사이즈', value: product.size },
                { label: '연식', value: product.year },
                { label: '거래방법', value: '직거래' },
              ].map((spec) => (
                <div key={spec.label} className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-xs text-gray-400">{spec.label}</span>
                  <span className="text-sm text-gray-900 font-medium">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">상품 설명</h3>
            <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>

          <div className="card p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-lg">👤</div>
              <div>
                <div className="text-sm font-bold text-gray-900">{product.seller}</div>
                <div className="text-xs text-gold">★ {product.sellerRating}</div>
              </div>
            </div>
            <Link to={`/seller/${product.seller}`} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm border border-gray-300 hover:bg-gray-200 transition-colors">
              프로필 보기
            </Link>
          </div>

          <button
            onClick={() => navigate(`/chat/${product.id}`, { state: { seller: product.seller, productName: product.name, productImage: product.image, productPrice: product.price } })}
            className="w-full py-3.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light transition-colors active:scale-[0.98]"
          >
            채팅하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsedDetail;
