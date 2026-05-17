import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import Pagination from '../components/Pagination';
import RegisterCTA from '../components/RegisterCTA';
import CategoryAdBanner from '../components/CategoryAdBanner';
import { toastError } from '../components/Toast';
import { useVertical } from '../hooks/useVertical';

interface AccommodationItem {
  id: string;
  name: string;
  type: string;
  price: number;
  originalPrice: number;
  guests: string;
  features: string;
  image: string;
  resort?: { id: string; name: string };
}

const typeMap: Record<string, string> = { hotel: '호텔', pension: '펜션', condo: '콘도', minbak: '민박', season: '시즌방' };

interface Resort {
  id: string;
  name: string;
}

const PAGE_SIZE = 12;

const Accommodation = () => {
  const vertical = useVertical();
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [accommodations, setAccommodations] = useState<AccommodationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resorts, setResorts] = useState<Resort[]>([]);

  useEffect(() => {
    api<Resort[]>('/resorts').then(setResorts).catch(() => {});
  }, []);

  const types = [
    { id: 'all', name: '전체' },
    { id: 'hotel', name: '호텔' },
    { id: 'pension', name: '펜션' },
    { id: 'condo', name: '콘도' },
    { id: 'minbak', name: '민박' },
    { id: 'season', name: '시즌방' },
  ];

  // 필터 변경 시 페이지 리셋
  useEffect(() => { setPage(1); }, [selectedResort, selectedType]);

  useEffect(() => {
    const fetchAccommodations = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
        if (selectedResort !== 'all') params.set('resortId', selectedResort);
        if (selectedType !== 'all') params.set('type', selectedType);
        const data = await api<{ items: AccommodationItem[]; totalCount: number }>(`/accommodations?${params}`);
        setAccommodations(data.items);
        setTotalCount(data.totalCount);
      } catch (err) {
        setAccommodations([]);
        setTotalCount(0);
        toastError(err instanceof Error ? err.message : '숙소 목록을 불러오지 못했습니다');
      } finally {
        setLoading(false);
      }
    };
    fetchAccommodations();
  }, [selectedResort, selectedType, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{vertical.pageLabels?.accommodation || '숙소'}</h1>
        <RegisterCTA to="/accommodation/register" className="px-4 py-1.5 bg-primary text-white rounded-lg font-bold text-xs hover:bg-primary-dark transition-colors cursor-pointer">+ 등록</RegisterCTA>
      </div>

      <CategoryAdBanner category="accommodation" />

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

      {/* Type Filter */}
      <div className="flex gap-2">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-300 ${
              selectedType === type.id
                ? 'bg-accent text-white'
                : 'bg-snow text-gray-600 hover:bg-gray-100 hover:text-gray-600 border border-gray-200'
            }`}
          >
            {type.name}
          </button>
        ))}
      </div>

      {/* Accommodation List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {accommodations.map((item) => (
            <Link to={`/accommodation/${item.id}`} key={item.id} className="bg-snow border border-gray-200 rounded-xl overflow-hidden hover:border-gray-400 transition-all group block">
              <div className="relative h-28 flex items-center justify-center text-4xl bg-gray-100 overflow-hidden">
                {item.image.startsWith('/') || item.image.startsWith('http') ? (
                  <img src={imageUrl(item.image, 400)} alt={item.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onError={e => { const i = e.target as HTMLImageElement; if (!i.dataset.fallback) { i.dataset.fallback = '1'; i.src = '/icons/placeholder-card.svg'; } }} />
                ) : (
                  <span className="relative group-hover:scale-110 transition-transform duration-300">{item.image}</span>
                )}
                <span className="absolute top-2 right-2 bg-white/85 backdrop-blur-md text-gray-900 px-2 py-0.5 rounded-md text-[10px] font-bold ring-1 ring-white/40 shadow-sm">
                  {item.type.split(',').map(t => typeMap[t] || t).join(', ')}
                </span>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                    {item.resort?.name}
                  </span>
                  <span className="text-[10px] text-gray-500">{item.guests}</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 truncate mb-1.5">{item.name}</h3>

                <div className="flex flex-wrap gap-1 mb-2">
                  {item.features.split(',').filter(Boolean).map((feature, idx) => (
                    <span key={idx} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                      {feature.trim()}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-end pt-2 border-t border-gray-200">
                  <div>
                    {item.originalPrice > item.price && (
                      <div className="text-[10px] text-gray-500 line-through">{item.originalPrice.toLocaleString()}원</div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-base font-bold text-mint">{item.price.toLocaleString()}원</span>
                      {item.originalPrice > item.price && (
                        <span className="text-[10px] text-coral font-bold">
                          {Math.round((1 - item.price / item.originalPrice) * 100)}%
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500">1박</div>
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

      {!loading && accommodations.length === 0 && (
        <div className="text-center py-12 px-6 card">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M10 9h.01M14 9h.01M10 13h.01M14 13h.01"/>
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1.5">아직 등록된 {vertical.pageLabels?.accommodation || '숙소'}가 없어요</h3>
          <p className="text-xs text-gray-500 mb-5 leading-relaxed">
            숙소 운영자라면 첫 등록자가 되어<br/>{vertical.audience || '스키어'}들을 직접 만나보세요. 베타 기간 등록 무료입니다.
          </p>
          <Link to="/accommodation/register" className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">
            + 첫 숙소 등록하기
          </Link>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default Accommodation;
