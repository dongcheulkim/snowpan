import { Link } from 'react-router-dom';

const Used = () => {
  const usedProducts = [
    {
      id: '1',
      name: 'Rossignol Soul 7 (2022)',
      brand: 'Rossignol',
      price: 450000,
      originalPrice: 850000,
      image: '🎿',
      condition: '상',
      usageCount: '5회'
    },
    {
      id: '2',
      name: 'Burton Custom (2021)',
      brand: 'Burton',
      price: 380000,
      originalPrice: 720000,
      image: '🏂',
      condition: '중',
      usageCount: '10회'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold gradient-text">중고 장비</h1>
        <div className="flex items-center space-x-3">
          <select className="px-4 py-2 glass rounded-lg text-sm text-gray-300 bg-transparent focus:outline-none focus:border-neon-blue/50 transition-all cursor-pointer">
            <option className="bg-dark-800">전체</option>
            <option className="bg-dark-800">스키</option>
            <option className="bg-dark-800">보드</option>
          </select>
          <select className="px-4 py-2 glass rounded-lg text-sm text-gray-300 bg-transparent focus:outline-none focus:border-neon-blue/50 transition-all cursor-pointer">
            <option className="bg-dark-800">상태: 전체</option>
            <option className="bg-dark-800">상</option>
            <option className="bg-dark-800">중</option>
            <option className="bg-dark-800">하</option>
          </select>
          <Link
            to="/used/register"
            className="px-5 py-2.5 bg-gradient-to-r from-neon-green to-emerald-500 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-neon-green/25 transition-all active:scale-95 whitespace-nowrap"
          >
            + 장비 등록
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usedProducts.map((product) => (
          <Link to={`/used/${product.id}`} key={product.id} className="glass rounded-2xl overflow-hidden card-hover group block">
            <div className="relative h-48 flex items-center justify-center text-7xl bg-gradient-to-br from-emerald-600/10 to-green-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-green/5 to-emerald-500/5 group-hover:from-neon-green/10 group-hover:to-emerald-500/10 transition-all" />
              <span className="relative group-hover:scale-110 transition-transform duration-300">{product.image}</span>
              <span className="absolute top-4 right-4 bg-neon-green/20 text-neon-green px-3 py-1 rounded-full text-xs font-bold border border-neon-green/30">
                중고
              </span>
            </div>
            <div className="p-6">
              <div className="text-xs text-neon-green font-medium tracking-wider uppercase mb-1">{product.brand}</div>
              <h3 className="text-lg font-bold mb-3 text-white">{product.name}</h3>
              <div className="flex gap-3 mb-4 text-xs">
                <span className="bg-neon-blue/10 text-neon-blue px-3 py-1.5 rounded-lg border border-neon-blue/20">
                  상태: {product.condition}
                </span>
                <span className="bg-white/5 text-gray-400 px-3 py-1.5 rounded-lg border border-white/10">
                  {product.usageCount} 사용
                </span>
              </div>
              <div className="mb-3">
                <span className="text-sm text-gray-600 line-through">
                  {product.originalPrice.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div>
                  <span className="text-2xl font-bold text-neon-green">
                    {product.price.toLocaleString()}원
                  </span>
                  <span className="ml-2 text-sm text-neon-pink font-bold">
                    {Math.round((1 - product.price / product.originalPrice) * 100)}% 할인
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Used;
