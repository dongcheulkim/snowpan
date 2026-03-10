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

  const defaultProducts = [
    { id: '1', name: 'Rossignol Soul 7 (2022)', brand: 'Rossignol', price: 450000, image: '🎿', condition: '1시즌 이하', category: 'ski' },
    { id: '2', name: 'Burton Custom (2021)', brand: 'Burton', price: 380000, image: '🏂', condition: '2시즌 이하', category: 'board' },
    { id: '3', name: 'Salomon S/Pro 100 (2023)', brand: 'Salomon', price: 280000, image: '🥾', condition: '1시즌 이하', category: 'ski-boots' },
    { id: '4', name: 'Burton Ruler BOA (2022)', brand: 'Burton', price: 190000, image: '👢', condition: '2시즌 이하', category: 'board-boots' },
    { id: '5', name: 'Smith Vantage 헬멧 + I/O MAG 고글', brand: 'Smith', price: 250000, image: '⛑️', condition: '1시즌 이하', category: 'helmet-goggle' },
    { id: '6', name: 'Hestra Fall Line 장갑', brand: 'Hestra', price: 85000, image: '🧤', condition: '3시즌 이상', category: 'gloves' },
    { id: '7', name: 'Descente 스키복 상하세트', brand: 'Descente', price: 320000, image: '🧥', condition: '1시즌 이하', category: 'wear' },
    { id: '8', name: 'Atomic Maverick 86 (2023)', brand: 'Atomic', price: 520000, image: '🎿', condition: '1시즌 이하', category: 'ski' },
  ];
  const userProducts = JSON.parse(localStorage.getItem('usedProducts') || '[]');
  const usedProducts = [...userProducts, ...defaultProducts];

  const filteredProducts = usedProducts.filter(p => {
    const catMatch = selectedCategory === 'all' || p.category === selectedCategory;
    const condMatch = selectedCondition === 'all' || p.condition === selectedCondition;
    return catMatch && condMatch;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">중고 장비</h1>
        <Link
          to="/used/register"
          className="px-4 py-1.5 bg-mint text-black rounded-lg font-bold text-xs hover:bg-emerald-300 transition-colors whitespace-nowrap"
        >
          + 장비 등록
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all flex-shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-accent text-white'
                : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {conditions.map((cond) => (
          <button
            key={cond.id}
            onClick={() => setSelectedCondition(cond.id)}
            className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${
              selectedCondition === cond.id
                ? 'bg-gray-200 text-gray-900 border border-gray-300'
                : 'bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-gray-200'
            }`}
          >
            상태: {cond.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredProducts.map((product) => (
          <Link to={`/used/${product.id}`} key={product.id} className="card overflow-hidden card-hover block">
            <div className="h-28 flex items-center justify-center text-4xl bg-gray-100">
              {product.image}
            </div>
            <div className="p-3">
              <div className="text-[10px] text-accent-light font-medium uppercase tracking-wider">{product.brand}</div>
              <h3 className="text-sm font-bold text-gray-900 truncate mb-2">{product.name}</h3>
              <div className="mb-2">
                <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {product.condition}
                </span>
              </div>
              <span className="text-base font-bold text-mint">{product.price.toLocaleString()}원</span>
            </div>
          </Link>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-400 card text-sm">
          해당 조건의 중고 장비가 없습니다.
        </div>
      )}
    </div>
  );
};

export default Used;
