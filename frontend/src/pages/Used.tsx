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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">중고 장비</h1>
        <div className="flex space-x-4">
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option>전체</option>
            <option>스키</option>
            <option>보드</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option>상태: 전체</option>
            <option>상</option>
            <option>중</option>
            <option>하</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usedProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 h-48 flex items-center justify-center text-6xl relative">
              {product.image}
              <span className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                중고
              </span>
            </div>
            <div className="p-6">
              <div className="text-sm text-gray-500 mb-1">{product.brand}</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">{product.name}</h3>
              <div className="flex space-x-4 mb-3 text-sm">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  상태: {product.condition}
                </span>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                  {product.usageCount} 사용
                </span>
              </div>
              <div className="mb-2">
                <span className="text-sm text-gray-400 line-through">
                  {product.originalPrice.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-2xl font-bold text-green-600">
                    {product.price.toLocaleString()}원
                  </span>
                  <span className="ml-2 text-sm text-red-500 font-bold">
                    {Math.round((1 - product.price / product.originalPrice) * 100)}% 할인
                  </span>
                </div>
                <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                  구매하기
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Used;
