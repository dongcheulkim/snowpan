import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';

interface RentalItem {
  id: string;
  name: string;
  price: number;
  duration: string;
  equipment: string;
  image: string;
  resort?: { id: string; name: string };
}

interface Resort {
  id: string;
  name: string;
}

const Rental = () => {
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [currentBanner, setCurrentBanner] = useState(0);
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
  const [resorts, setResorts] = useState<Resort[]>([]);

  const banners = [
    { title: '스노우렌탈 용평점', desc: '시즌 장기렌탈 40% 할인 · 최신 장비' },
    { title: '프로기어 휘닉스점', desc: '프리미엄 장비 렌탈 · 부츠 커스텀 피팅' },
    { title: '렌탈킹 하이원점', desc: '단체 렌탈 20% 할인 · 무료 배송 서비스' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    api<Resort[]>('/resorts').then(setResorts).catch(() => {});
    api<RentalItem[]>('/rentals').then(setRentalItems).catch(() => {});
  }, []);

  const filteredItems = selectedResort === 'all'
    ? rentalItems
    : rentalItems.filter(item => item.resort?.id === selectedResort);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">렌탈</h1>
        <Link to="/rental/register" className="px-4 py-1.5 bg-primary text-white rounded-lg font-bold text-xs hover:bg-primary-dark transition-colors">+ 등록</Link>
      </div>

      {/* Ad Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 h-24">
        {banners.map((banner, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 flex items-center px-6 transition-all duration-700 ease-in-out ${
              idx === currentBanner ? 'opacity-100 translate-x-0' : idx < currentBanner ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'
            }`}
          >
            <div className="relative z-10 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">AD</span>
                <h3 className="text-base font-bold text-gray-900">{banner.title}</h3>
              </div>
              <p className="text-sm text-gray-500">{banner.desc}</p>
            </div>
          </div>
        ))}
        <div className="absolute bottom-2 right-4 flex gap-1.5 z-10">
          {banners.map((_, idx) => (
            <button key={idx} onClick={() => setCurrentBanner(idx)} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentBanner ? 'bg-accent w-4' : 'bg-gray-300'}`} />
          ))}
        </div>
      </div>

      {/* Resort Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ id: 'all', name: '전체' }, ...resorts].map((resort) => (
          <button
            key={resort.id}
            onClick={() => setSelectedResort(resort.id)}
            className={`px-3 py-2 rounded-xl font-medium text-xs whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
              selectedResort === resort.id
                ? 'bg-accent text-white'
                : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            {resort.name}
          </button>
        ))}
      </div>

      {/* Rental Items */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredItems.map((item) => (
          <Link to={`/rental/${item.id}`} key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-400 transition-all duration-300 group block">
            <div className="relative h-28 flex items-center justify-center text-4xl bg-gray-100 overflow-hidden">
              {item.image.startsWith('/') || item.image.startsWith('http') ? (
                <img src={imageUrl(item.image)} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              ) : (
                <span className="relative group-hover:scale-110 transition-transform duration-300">{item.image}</span>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 truncate">
                  {item.resort?.name || ''}
                </span>
                <span className="text-[10px] text-gray-400">{item.duration}</span>
              </div>
              <h3 className="text-sm font-bold mb-2 text-gray-900">{item.name}</h3>
              <div className="flex flex-wrap gap-1 mb-2">
                <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded border border-gray-200">
                  {item.equipment}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <div>
                  <div className="text-[10px] text-gray-400">{item.duration}</div>
                  <span className="text-base font-bold text-mint">{item.price.toLocaleString()}원</span>
                </div>
                <button className="px-3 py-1.5 bg-accent text-white rounded-lg font-medium text-[11px] hover:bg-accent-light transition-all active:scale-95">
                  예약
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-xl text-sm">
          해당 스키장의 렌탈 정보가 없습니다.
        </div>
      )}
    </div>
  );
};

export default Rental;
