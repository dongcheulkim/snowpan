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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">새 장비</h1>
        <div className="flex space-x-4">
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option>전체</option>
            <option>스키</option>
            <option>보드</option>
            <option>부츠</option>
            <option>바인딩</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option>가격순</option>
            <option>평점순</option>
            <option>리뷰순</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 h-48 flex items-center justify-center text-6xl">
              {product.image}
            </div>
            <div className="p-6">
              <div className="text-sm text-gray-500 mb-1">{product.brand}</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">{product.name}</h3>
              <div className="flex items-center mb-3">
                <span className="text-yellow-400">★</span>
                <span className="ml-1 text-sm text-gray-600">
                  {product.rating} ({product.reviewCount})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-primary">
                  {product.price.toLocaleString()}원
                </span>
                <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors">
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
