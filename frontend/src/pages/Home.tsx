import { Link } from 'react-router-dom';

const Home = () => {
  const categories = [
    {
      id: 'new',
      icon: '🎿',
      title: '새 장비',
      desc: '최저가 비교',
      link: '/new-equipment',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'used',
      icon: '♻️',
      title: '중고',
      desc: '합리적 가격',
      link: '/used',
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'rental',
      icon: '🏔️',
      title: '렌탈',
      desc: '스키장별',
      link: '/rental',
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'lesson',
      icon: '👨‍🏫',
      title: '레슨',
      desc: '강사 예약',
      link: '/lesson',
      color: 'from-orange-500 to-orange-600',
    },
  ];

  const hotDeals = [
    { name: 'Rossignol 스키', price: 885000, off: '5%' },
    { name: 'Burton 보드', price: 699000, off: '10%' },
    { name: 'Atomic 스키', price: 845000, off: '3%' },
  ];

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* 상단 검색 */}
      <div className="bg-gradient-to-br from-blue-600 to-cyan-500 px-4 pt-8 pb-10">
        <h1 className="text-3xl font-black text-white mb-6 text-center">
          ⛷️ 스노우프라이스
        </h1>
        <div className="relative">
          <input
            type="text"
            placeholder="스키, 보드, 스키장 검색"
            className="w-full h-14 pl-4 pr-12 rounded-2xl text-lg focus:outline-none shadow-xl"
          />
          <button className="absolute right-2 top-2 bottom-2 px-5 bg-blue-600 text-white rounded-xl font-bold">
            검색
          </button>
        </div>
      </div>

      {/* 메인 카테고리 - 큰 버튼 */}
      <div className="px-4 -mt-6">
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.link}
              className={`bg-gradient-to-br ${cat.color} rounded-2xl p-6 shadow-lg active:scale-95 transition-transform`}
            >
              <div className="text-5xl mb-3">{cat.icon}</div>
              <div className="text-white">
                <div className="text-xl font-bold mb-1">{cat.title}</div>
                <div className="text-sm opacity-90">{cat.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 실시간 핫딜 */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            🔥 <span>실시간 핫딜</span>
          </h2>
          <Link to="/new-equipment" className="text-sm text-blue-600">
            전체보기 →
          </Link>
        </div>
        <div className="space-y-2">
          {hotDeals.map((deal, idx) => (
            <button
              key={idx}
              className="w-full bg-white rounded-2xl p-4 flex items-center justify-between shadow-md active:bg-gray-50"
            >
              <div className="text-left">
                <div className="font-bold text-gray-800">{deal.name}</div>
                <div className="text-xs text-gray-500">3개 쇼핑몰</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-red-600 font-bold mb-1">{deal.off} 할인</div>
                <div className="text-lg font-black text-blue-600">
                  {(deal.price / 10000).toFixed(0)}만원
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 빠른 메뉴 */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-gray-800 mb-3">빠른 메뉴</h2>
        <div className="grid grid-cols-3 gap-3">
          <button className="bg-white rounded-2xl p-4 text-center shadow-md active:bg-gray-50">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-xs font-medium text-gray-700">최저가</div>
          </button>
          <button className="bg-white rounded-2xl p-4 text-center shadow-md active:bg-gray-50">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-xs font-medium text-gray-700">인기순</div>
          </button>
          <button className="bg-white rounded-2xl p-4 text-center shadow-md active:bg-gray-50">
            <div className="text-3xl mb-2">🔔</div>
            <div className="text-xs font-medium text-gray-700">알림설정</div>
          </button>
        </div>
      </div>

      {/* 스키장 빠른 선택 */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-gray-800 mb-3">스키장</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['용평', '휘닉스', '하이원', '비발디', '엘리시안'].map((resort) => (
            <Link
              key={resort}
              to="/rental"
              className="flex-shrink-0 px-5 py-3 bg-white rounded-full font-medium text-sm shadow-md whitespace-nowrap active:bg-gray-50"
            >
              {resort}
            </Link>
          ))}
        </div>
      </div>

      {/* 하단 고정 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex justify-around">
        <Link to="/" className="flex flex-col items-center gap-1">
          <span className="text-2xl">🏠</span>
          <span className="text-xs font-medium text-blue-600">홈</span>
        </Link>
        <Link to="/new-equipment" className="flex flex-col items-center gap-1">
          <span className="text-2xl">🎿</span>
          <span className="text-xs text-gray-500">장비</span>
        </Link>
        <Link to="/rental" className="flex flex-col items-center gap-1">
          <span className="text-2xl">🏔️</span>
          <span className="text-xs text-gray-500">렌탈</span>
        </Link>
        <Link to="/admin-approval" className="flex flex-col items-center gap-1">
          <span className="text-2xl">⚙️</span>
          <span className="text-xs text-gray-500">관리</span>
        </Link>
      </div>
    </div>
  );
};

export default Home;
