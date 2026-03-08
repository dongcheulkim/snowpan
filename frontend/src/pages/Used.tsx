import { useState } from 'react';
import { Link } from 'react-router-dom';

const Used = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');

  const categories = [
    { id: 'all', name: '전체' },
    { id: 'ski', name: '스키' },
    { id: 'board', name: '보드' },
    { id: 'ski-boots', name: '스키부츠' },
    { id: 'board-boots', name: '보드부츠' },
    { id: 'helmet-goggle', name: '헬멧/고글' },
    { id: 'gloves', name: '장갑' },
    { id: 'wear', name: '스키복' },
    { id: 'etc', name: '기타' },
  ];

  const conditions = [
    { id: 'all', name: '전체' },
    { id: '1시즌 이하', name: '1시즌 이하' },
    { id: '2시즌 이하', name: '2시즌 이하' },
    { id: '3시즌 이상', name: '3시즌 이상' },
  ];

  const usedProducts = [
    { id: '1', name: 'Rossignol Soul 7 (2022)', brand: 'Rossignol', price: 450000, originalPrice: 850000, image: '🎿', condition: '1시즌 이하', category: 'ski' },
    { id: '2', name: 'Burton Custom (2021)', brand: 'Burton', price: 380000, originalPrice: 720000, image: '🏂', condition: '2시즌 이하', category: 'board' },
    { id: '3', name: 'Salomon S/Pro 100 (2023)', brand: 'Salomon', price: 280000, originalPrice: 520000, image: '🥾', condition: '1시즌 이하', category: 'ski-boots' },
    { id: '4', name: 'Burton Ruler BOA (2022)', brand: 'Burton', price: 190000, originalPrice: 380000, image: '👢', condition: '2시즌 이하', category: 'board-boots' },
    { id: '5', name: 'Smith Vantage 헬멧 + I/O MAG 고글', brand: 'Smith', price: 250000, originalPrice: 480000, image: '⛑️', condition: '1시즌 이하', category: 'helmet-goggle' },
    { id: '6', name: 'Hestra Fall Line 장갑', brand: 'Hestra', price: 85000, originalPrice: 180000, image: '🧤', condition: '3시즌 이상', category: 'gloves' },
    { id: '7', name: 'Descente 스키복 상하세트', brand: 'Descente', price: 320000, originalPrice: 650000, image: '🧥', condition: '1시즌 이하', category: 'wear' },
    { id: '8', name: 'Atomic Maverick 86 (2023)', brand: 'Atomic', price: 520000, originalPrice: 920000, image: '🎿', condition: '1시즌 이하', category: 'ski' },
  ];

  const filteredProducts = usedProducts.filter(p => {
    const catMatch = selectedCategory === 'all' || p.category === selectedCategory;
    const condMatch = selectedCondition === 'all' || p.condition === selectedCondition;
    return catMatch && condMatch;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold gradient-text">중고 장비</h1>
        <Link
          to="/used/register"
          className="px-4 py-1.5 bg-gradient-to-r from-neon-green to-emerald-500 text-white rounded-lg font-medium text-xs hover:shadow-lg hover:shadow-neon-green/25 transition-all active:scale-95 whitespace-nowrap"
        >
          + 장비 등록
        </Link>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-2 rounded-xl font-medium text-xs whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-gradient-to-r from-neon-green to-emerald-500 text-white shadow-lg shadow-neon-green/25'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Condition Filter */}
      <div className="flex gap-2">
        {conditions.map((cond) => (
          <button
            key={cond.id}
            onClick={() => setSelectedCondition(cond.id)}
            className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300 ${
              selectedCondition === cond.id
                ? 'bg-neon-blue/15 text-neon-blue border border-neon-blue/30'
                : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300 border border-white/5'
            }`}
          >
            상태: {cond.name}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredProducts.map((product) => (
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

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500 glass rounded-xl text-sm">
          해당 조건의 중고 장비가 없습니다.
        </div>
      )}
    </div>
  );
};

export default Used;
