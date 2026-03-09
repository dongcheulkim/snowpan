import { useParams, Link } from 'react-router-dom';

const AccommodationDetail = () => {
  const { id } = useParams();

  const allItems: Record<string, {
    id: string; name: string; resort: string; type: string; typeText: string;
    price: number; originalPrice: number; rating: number; reviewCount: number;
    guests: string; features: string[]; image: string; description: string;
    address: string; checkIn: string; checkOut: string; contact: string;
    amenities: string[]; rooms: { name: string; price: number; guests: string }[];
  }> = {
    '1': {
      id: '1', name: '용평리조트 타워콘도', resort: '용평', type: 'condo', typeText: '콘도',
      price: 180000, originalPrice: 250000, rating: 4.6, reviewCount: 312, guests: '4인',
      features: ['스키장 직결', '온수풀', '조식포함'], image: '🏨',
      description: '용평리조트 내 위치한 타워콘도입니다. 스키장과 직결되어 있어 이동이 편리하며, 온수풀과 피트니스 등 부대시설을 갖추고 있습니다.',
      address: '강원도 평창군 대관령면 올림픽로 715', checkIn: '15:00', checkOut: '11:00', contact: '033-335-5757',
      amenities: ['주차무료', '와이파이', '온수풀', '피트니스', '편의점', '레스토랑'],
      rooms: [{ name: '스탠다드 (2인)', price: 150000, guests: '2인' }, { name: '디럭스 (4인)', price: 180000, guests: '4인' }, { name: '스위트 (6인)', price: 280000, guests: '6인' }],
    },
    '2': {
      id: '2', name: '휘닉스평창 블리스힐스테이', resort: '휘닉스', type: 'hotel', typeText: '호텔',
      price: 220000, originalPrice: 300000, rating: 4.8, reviewCount: 187, guests: '2인',
      features: ['도보 3분', '스파', '셔틀'], image: '🏩',
      description: '휘닉스평창 스키장에서 도보 3분 거리의 프리미엄 호텔입니다. 스파, 사우나 등 릴랙스 시설이 완비되어 있습니다.',
      address: '강원도 평창군 봉평면 태기로 174', checkIn: '15:00', checkOut: '11:00', contact: '033-330-6000',
      amenities: ['주차무료', '와이파이', '스파', '사우나', '셔틀버스', '룸서비스'],
      rooms: [{ name: '디럭스 더블', price: 220000, guests: '2인' }, { name: '디럭스 트윈', price: 240000, guests: '2인' }, { name: '스위트', price: 380000, guests: '4인' }],
    },
    '3': {
      id: '3', name: '하이원 마운틴콘도', resort: '하이원', type: 'condo', typeText: '콘도',
      price: 150000, originalPrice: 200000, rating: 4.5, reviewCount: 245, guests: '4인',
      features: ['곤돌라 근처', '키친', '주차무료'], image: '🏔️',
      description: '하이원리조트 곤돌라 근처에 위치한 콘도입니다. 주방이 완비되어 있어 취사가 가능합니다.',
      address: '강원도 정선군 고한읍 하이원길 424', checkIn: '15:00', checkOut: '11:00', contact: '033-590-7000',
      amenities: ['주차무료', '와이파이', '키친', '세탁기', '편의점'],
      rooms: [{ name: '스탠다드 (2인)', price: 120000, guests: '2인' }, { name: '디럭스 (4인)', price: 150000, guests: '4인' }, { name: '패밀리 (6인)', price: 220000, guests: '6인' }],
    },
    '4': {
      id: '4', name: '비발디파크 스위트빌라', resort: '비발디', type: 'pension', typeText: '펜션',
      price: 130000, originalPrice: 180000, rating: 4.3, reviewCount: 156, guests: '6인',
      features: ['바베큐', '넓은거실', '5분거리'], image: '🏡',
      description: '비발디파크 인근 펜션으로 넓은 거실과 바베큐 시설을 갖추고 있어 단체 이용에 적합합니다.',
      address: '강원도 홍천군 서면 한치골길 262', checkIn: '15:00', checkOut: '11:00', contact: '033-434-7000',
      amenities: ['주차무료', '와이파이', '바베큐', '넓은거실', '키친', '온돌방'],
      rooms: [{ name: '4인실', price: 100000, guests: '4인' }, { name: '6인실', price: 130000, guests: '6인' }, { name: '8인실 (단체)', price: 180000, guests: '8인' }],
    },
    '5': {
      id: '5', name: '엘리시안 스노우빌리지', resort: '엘리시안', type: 'minbak', typeText: '민박',
      price: 80000, originalPrice: 120000, rating: 4.1, reviewCount: 89, guests: '4인',
      features: ['가성비', '온돌방', '10분거리'], image: '🏠',
      description: '엘리시안강촌 스키장에서 차로 10분 거리의 가성비 좋은 민박입니다. 온돌방에서 따뜻하게 쉴 수 있습니다.',
      address: '강원도 춘천시 남산면 강촌리', checkIn: '16:00', checkOut: '11:00', contact: '033-260-2000',
      amenities: ['주차무료', '와이파이', '온돌방', '공용주방'],
      rooms: [{ name: '2인실', price: 60000, guests: '2인' }, { name: '4인실', price: 80000, guests: '4인' }, { name: '6인실', price: 110000, guests: '6인' }],
    },
    '6': {
      id: '6', name: '용평 드래곤밸리호텔', resort: '용평', type: 'hotel', typeText: '호텔',
      price: 280000, originalPrice: 350000, rating: 4.9, reviewCount: 421, guests: '2인',
      features: ['5성급', '스키인/아웃', '뷔페조식'], image: '🌟',
      description: '용평리조트 내 5성급 호텔로 스키인/아웃이 가능합니다. 뷔페 조식이 포함되어 있으며 최고급 서비스를 제공합니다.',
      address: '강원도 평창군 대관령면 올림픽로 715', checkIn: '15:00', checkOut: '12:00', contact: '033-335-5757',
      amenities: ['주차무료', '와이파이', '뷔페조식', '스파', '피트니스', '컨시어지', '스키인/아웃'],
      rooms: [{ name: '디럭스', price: 280000, guests: '2인' }, { name: '프리미엄', price: 380000, guests: '2인' }, { name: '로얄 스위트', price: 550000, guests: '4인' }],
    },
  };

  const item = id ? allItems[id] : null;

  if (!item) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-xl font-bold text-white mb-2">숙소 정보를 찾을 수 없습니다</h2>
        <Link to="/accommodation" className="text-gray-400 hover:text-white text-sm">
          ← 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const discount = Math.round((1 - item.price / item.originalPrice) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link to="/accommodation" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
        ← 숙소 목록
      </Link>

      {/* Hero */}
      <div className="card rounded-2xl h-48 flex items-center justify-center text-8xl relative overflow-hidden bg-[#0a0a0a]">
        <span className="relative">{item.image}</span>
        <span className="absolute top-4 right-4 bg-[#1a1a1a] text-gray-300 px-3 py-1 rounded-full text-xs font-bold border border-white/10">
          {item.typeText}
        </span>
      </div>

      {/* Info */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-medium text-gray-400 bg-[#1a1a1a] px-2 py-0.5 rounded border border-white/10">
            {item.resort}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="text-gray-300">★</span> {item.rating} ({item.reviewCount})
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">{item.name}</h1>
        <p className="text-xs text-gray-500 mb-3">{item.address}</p>
        <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
      </div>

      {/* Price */}
      <div className="card rounded-2xl p-5">
        <div className="text-sm text-gray-600 line-through mb-1">{item.originalPrice.toLocaleString()}원</div>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-white">{item.price.toLocaleString()}원</span>
          <span className="text-sm text-gray-300 font-bold bg-[#1a1a1a] px-2 py-1 rounded-lg border border-white/10">{discount}% 할인</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">1박 기준 · 세금 포함</div>
      </div>

      {/* Rooms */}
      <div className="card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">객실 유형</h3>
        <div className="space-y-2">
          {item.rooms.map((room, idx) => (
            <div key={idx} className="flex justify-between items-center py-3 px-3 rounded-xl bg-[#0a0a0a] border border-white/5">
              <div>
                <div className="text-sm text-white font-medium">{room.name}</div>
                <div className="text-[10px] text-gray-500">{room.guests} 기준</div>
              </div>
              <span className="text-sm font-bold text-white">{room.price.toLocaleString()}원</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features & Amenities */}
      <div className="card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">편의시설</h3>
        <div className="flex flex-wrap gap-2">
          {item.amenities.map((a, idx) => (
            <span key={idx} className="px-3 py-1.5 bg-[#1a1a1a] text-gray-300 rounded-lg text-xs border border-white/10">
              {a}
            </span>
          ))}
        </div>
      </div>

      {/* Check-in Info */}
      <div className="card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">이용 안내</h3>
        <div className="space-y-2.5">
          {[
            { label: '체크인', value: item.checkIn },
            { label: '체크아웃', value: item.checkOut },
            { label: '연락처', value: item.contact },
          ].map((info) => (
            <div key={info.label} className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-xs text-gray-500">{info.label}</span>
              <span className="text-sm text-white">{info.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      <button className="w-full py-3.5 bg-white text-black rounded-lg font-bold text-sm hover:bg-gray-200 transition-all active:scale-[0.98]">
        숙소 예약하기
      </button>
    </div>
  );
};

export default AccommodationDetail;
