const NewEquipment = () => {
  const products = [
    {
      id: '1',
      name: 'Rossignol Experience 88 Ti',
      brand: 'Rossignol',
      price: 890000,
      image: '🎿',
      rating: 4.8,
      reviewCount: 124
    },
    {
      id: '2',
      name: 'Atomic Maverick 88',
      brand: 'Atomic',
      price: 850000,
      image: '🎿',
      rating: 4.7,
      reviewCount: 98
    },
    {
      id: '3',
      name: 'Salomon QST 92',
      brand: 'Salomon',
      price: 920000,
      image: '🎿',
      rating: 4.9,
      reviewCount: 156
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold gradient-text">새 장비</h1>
        <div className="flex space-x-3">
          <select className="px-4 py-2 glass rounded-lg text-sm text-gray-500 bg-transparent focus:outline-none focus:border-accent/50 transition-all cursor-pointer">
            <option className="bg-white">전체</option>
            <option className="bg-white">스키</option>
            <option className="bg-white">보드</option>
            <option className="bg-white">부츠</option>
            <option className="bg-white">바인딩</option>
          </select>
          <select className="px-4 py-2 glass rounded-lg text-sm text-gray-500 bg-transparent focus:outline-none focus:border-accent/50 transition-all cursor-pointer">
            <option className="bg-white">가격순</option>
            <option className="bg-white">평점순</option>
            <option className="bg-white">리뷰순</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="glass rounded-2xl overflow-hidden card-hover group">
            <div className="relative h-48 flex items-center justify-center text-7xl bg-gradient-to-br from-blue-600/10 to-cyan-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 to-neon-purple/5 group-hover:from-neon-blue/10 group-hover:to-neon-purple/10 transition-all" />
              <span className="relative group-hover:scale-110 transition-transform duration-300">{product.image}</span>
            </div>
            <div className="p-6">
              <div className="text-xs text-neon-blue font-medium tracking-wider uppercase mb-1">{product.brand}</div>
              <h3 className="text-lg font-bold mb-3 text-white">{product.name}</h3>
              <div className="flex items-center mb-4">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-sm ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-500">
                  {product.rating} ({product.reviewCount})
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <span className="text-2xl font-bold text-neon-blue">
                  {product.price.toLocaleString()}원
                </span>
                <button className="px-5 py-2.5 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-neon-blue/25 transition-all active:scale-95">
                  비교하기
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewEquipment;
