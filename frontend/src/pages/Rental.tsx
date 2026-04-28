import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import Pagination from '../components/Pagination';
import RegisterCTA from '../components/RegisterCTA';
import CategoryAdBanner from '../components/CategoryAdBanner';

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

const PAGE_SIZE = 12;

const Rental = () => {
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resorts, setResorts] = useState<Resort[]>([]);

  useEffect(() => {
    api<Resort[]>('/resorts').then(setResorts).catch(() => {});
  }, []);

  // 필터 변경 시 페이지 리셋
  useEffect(() => { setPage(1); }, [selectedResort]);

  useEffect(() => {
    const fetchRentals = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
        if (selectedResort !== 'all') params.set('resortId', selectedResort);
        const data = await api<{ items: RentalItem[]; totalCount: number }>(`/rentals?${params}`);
        setRentalItems(data.items);
        setTotalCount(data.totalCount);
      } catch {
        setRentalItems([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };
    fetchRentals();
  }, [selectedResort, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">렌탈</h1>
        <RegisterCTA to="/rental/register" className="px-4 py-1.5 bg-primary text-white rounded-lg font-bold text-xs hover:bg-primary-dark transition-colors cursor-pointer">+ 등록</RegisterCTA>
      </div>

      <CategoryAdBanner category="rental" />

      {/* Resort Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ id: 'all', name: '전체' }, ...resorts].map((resort) => (
          <button
            key={resort.id}
            onClick={() => setSelectedResort(resort.id)}
            className={`px-3 py-2 rounded-xl font-medium text-xs whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
              selectedResort === resort.id
                ? 'bg-accent text-white'
                : 'bg-snow text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            {resort.name}
          </button>
        ))}
      </div>

      {/* Rental Items */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {rentalItems.map((item) => (
            <Link to={`/rental/${item.id}`} key={item.id} className="bg-snow border border-gray-200 rounded-xl overflow-hidden hover:border-gray-400 transition-all duration-300 group block">
              <div className="relative h-28 flex items-center justify-center text-4xl bg-gray-100 overflow-hidden">
                {item.image.startsWith('/') || item.image.startsWith('http') ? (
                  <img src={imageUrl(item.image, 400)} alt={item.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onError={e => { const i = e.target as HTMLImageElement; if (!i.dataset.fallback) { i.dataset.fallback = '1'; i.src = '/icons/placeholder-card.svg'; } }} />
                ) : (
                  <span className="relative group-hover:scale-110 transition-transform duration-300">{item.image}</span>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 truncate">
                    {item.resort?.name || ''}
                  </span>
                  <span className="text-[10px] text-gray-500">{item.duration}</span>
                </div>
                <h3 className="text-sm font-bold mb-2 text-gray-900">{item.name}</h3>
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                    {item.equipment}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <div>
                    <div className="text-[10px] text-gray-500">{item.duration}</div>
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
      )}

      {!loading && rentalItems.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-snow border border-gray-200 rounded-xl text-sm">
          해당 스키장의 렌탈 정보가 없습니다.
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default Rental;
