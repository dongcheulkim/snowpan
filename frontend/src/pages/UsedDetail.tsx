import { useParams, Link, useNavigate } from 'react-router-dom';

const UsedDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const allProducts: Record<string, {
    id: string; name: string; brand: string; price: number; originalPrice: number;
    image: string; condition: string; usageCount: string; category: string;
    size: string; year: string; description: string; location: string;
    seller: string; sellerRating: number; sellerPhone: string; createdAt: string; images: string[];
  }> = {
    '1': {
      id: '1',
      name: 'Rossignol Soul 7 (2022)',
      brand: 'Rossignol',
      price: 450000,
      originalPrice: 850000,
      image: '🎿',
      condition: '1시즌 이하',
      usageCount: '5회',
      category: '스키',
      size: '172cm',
      year: '2022',
      description: '22시즌 구매 후 5회 사용했습니다. 엣지 상태 양호하고 탑시트에 미세한 스크래치 외에는 거의 새것 수준입니다. 바인딩 별도. 직거래 선호합니다.',
      location: '서울 강남구',
      seller: '스키매니아',
      sellerRating: 4.8,
      sellerPhone: '010-1234-5678',
      createdAt: '2024-01-15',
      images: ['🎿', '⛷️', '🏔️'],
    },
    '2': {
      id: '2',
      name: 'Burton Custom (2021)',
      brand: 'Burton',
      price: 380000,
      originalPrice: 720000,
      image: '🏂',
      condition: '2시즌 이하',
      usageCount: '10회',
      category: '보드',
      size: '156cm',
      year: '2021',
      description: '21시즌 모델이며 약 10회 정도 사용했습니다. 전체적으로 양호하나 솔 부분에 사용감이 있습니다. 왁싱 최근에 했고 바인딩 포함 가격입니다.',
      location: '경기 성남시',
      seller: '보더킹',
      sellerRating: 4.5,
      sellerPhone: '010-9876-5432',
      createdAt: '2024-01-20',
      images: ['🏂', '🏔️', '⛷️'],
    },
  };

  const product = id ? allProducts[id] : null;

  if (!product) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-xl font-bold text-white mb-2">상품을 찾을 수 없습니다</h2>
        <Link to="/used" className="text-neon-blue hover:text-neon-blue/80 text-sm">
          ← 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const discount = Math.round((1 - product.price / product.originalPrice) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Back */}
      <Link to="/used" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
        ← 중고 장비 목록
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-3">
          <div className="glass rounded-2xl h-80 flex items-center justify-center text-9xl bg-gradient-to-br from-emerald-600/10 to-green-500/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-green/5 to-emerald-500/5" />
            <span className="relative">{product.image}</span>
            <span className="absolute top-4 right-4 bg-neon-green/20 text-neon-green px-3 py-1 rounded-full text-xs font-bold border border-neon-green/30">
              중고
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {product.images.map((img, idx) => (
              <div key={idx} className="glass rounded-xl h-24 flex items-center justify-center text-4xl cursor-pointer hover:border-neon-green/30 transition-all">
                {img}
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <div className="text-xs text-neon-green font-medium tracking-wider uppercase mb-1">{product.brand}</div>
            <h1 className="text-2xl font-bold text-white mb-2">{product.name}</h1>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500">{product.createdAt}</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-500">{product.location}</span>
            </div>
          </div>

          {/* Price */}
          <div className="glass rounded-2xl p-5">
            <div className="text-sm text-gray-600 line-through mb-1">
              {product.originalPrice.toLocaleString()}원
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-neon-green">
                {product.price.toLocaleString()}원
              </span>
              <span className="text-sm text-neon-pink font-bold bg-neon-pink/10 px-2 py-1 rounded-lg">
                {discount}% 할인
              </span>
            </div>
          </div>

          {/* Specs */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">상품 정보</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '카테고리', value: product.category },
                { label: '사이즈', value: product.size },
                { label: '연식', value: product.year },
                { label: '상태', value: product.condition },
                { label: '사용횟수', value: product.usageCount },
                { label: '거래지역', value: product.location },
              ].map((spec) => (
                <div key={spec.label} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-gray-500">{spec.label}</span>
                  <span className="text-sm text-white font-medium">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Seller */}
          <div className="glass rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-lg">
                👤
              </div>
              <div>
                <div className="text-sm font-bold text-white">{product.seller}</div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="text-yellow-400">★</span> {product.sellerRating}
                </div>
              </div>
            </div>
            <button className="px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-sm border border-white/10 hover:bg-white/10 transition-all">
              프로필 보기
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button className="flex-1 py-3.5 bg-white/5 text-gray-300 rounded-xl font-bold text-sm border border-white/10 hover:bg-white/10 transition-all active:scale-95">
              채팅하기
            </button>
            <button className="flex-1 py-3.5 bg-gradient-to-r from-neon-green to-emerald-500 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-neon-green/25 transition-all active:scale-95">
              구매하기
            </button>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-3">상품 설명</h3>
        <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">
          {product.description}
        </p>
      </div>
    </div>
  );
};

export default UsedDetail;
