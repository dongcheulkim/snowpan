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
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold gradient-text">중고 장비</h1>
        <div className="flex items-center space-x-2">
          <select className="px-3 py-1.5 glass rounded-lg text-xs text-gray-300 bg-transparent focus:outline-none focus:border-neon-blue/50 transition-all cursor-pointer">
            <option className="bg-dark-800">전체</option>
            <option className="bg-dark-800">스키</option>
            <option className="bg-dark-800">보드</option>
          </select>
          <select className="px-3 py-1.5 glass rounded-lg text-xs text-gray-300 bg-transparent focus:outline-none focus:border-neon-blue/50 transition-all cursor-pointer">
            <option className="bg-dark-800">상태: 전체</option>
            <option className="bg-dark-800">상</option>
            <option className="bg-dark-800">중</option>
            <option className="bg-dark-800">하</option>
          </select>
          <Link
            to="/used/register"
            className="px-4 py-1.5 bg-gradient-to-r from-neon-green to-emerald-500 text-white rounded-lg font-medium text-xs hover:shadow-lg hover:shadow-neon-green/25 transition-all active:scale-95 whitespace-nowrap"
          >
            + 장비 등록
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {usedProducts.map((product) => (
          <Link to={`/used/${product.id}`} key={product.id} className="glass rounded-xl overflow-hidden card-hover group block">
            <div className="relative h-28 flex items-center justify-center text-4xl bg-gradient-to-br from-emerald-600/10 to-green-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-green/5 to-emerald-500/5 group-hover:from-neon-green/10 group-hover:to-emerald-500/10 transition-all" />
              <span className="relative group-hover:scale-110 transition-transform duration-300">{product.image}</span>
              <span className="absolute top-2 right-2 bg-neon-green/20 text-neon-green px-2 py-0.5 rounded-full text-[10px] font-bold border border-neon-green/30">
                중고
              </span>
            </div>
            <div className="p-3">
              <div className="text-[10px] text-neon-green font-medium tracking-wider uppercase">{product.brand}</div>
              <h3 className="text-sm font-bold text-white truncate mb-2">{product.name}</h3>
              <div className="flex gap-1.5 mb-2">
                <span className="bg-neon-blue/10 text-neon-blue px-2 py-0.5 rounded text-[10px] border border-neon-blue/20">
                  {product.condition}
                </span>
                <span className="bg-white/5 text-gray-400 px-2 py-0.5 rounded text-[10px] border border-white/10">
                  {product.usageCount}
                </span>
              </div>
              <div className="text-[10px] text-gray-600 line-through">{product.originalPrice.toLocaleString()}원</div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-neon-green">{product.price.toLocaleString()}원</span>
                <span className="text-[10px] text-neon-pink font-bold">
                  {Math.round((1 - product.price / product.originalPrice) * 100)}%
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Used;
