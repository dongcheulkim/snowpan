import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface Shop {
  id: string;
  name: string;
  area: string;
  resort?: string;
  address: string;
  description: string;
  brands: string[];
  phone?: string;
  instagram?: string;
  website?: string;
  naverMap?: string;
  image?: string;
  hours?: string;
}

const shops: Shop[] = [
  // 스키샵 등록 시 여기에 추가
  // 예시:
  // {
  //   id: '1', name: '용평 스키프로샵', area: '강원', resort: '용평리조트',
  //   address: '강원도 평창군 대관령면 올림픽로 715',
  //   description: '용평리조트 내 위치한 스키 전문샵. 튜닝, 왁싱, 바인딩 세팅 전문.',
  //   brands: ['Rossignol', 'Atomic', 'Salomon', 'HEAD'],
  //   phone: '033-335-1234', instagram: 'yp_skiproshop',
  //   hours: '08:30~18:00 (시즌 중 매일)',
  // },
];

const areas = [
  { id: 'all', name: '전체' },
  { id: '강원', name: '강원' },
  { id: '경기', name: '경기' },
  { id: '서울', name: '서울' },
  { id: '충청', name: '충청' },
  { id: '경상', name: '경상' },
  { id: '전라', name: '전라' },
];

const resorts = [
  '용평리조트', '웰리힐리파크', '하이원리조트', '휘닉스평창',
  '곤지암리조트', '비발디파크', '엘리시안강촌', '지산리조트',
  '오크밸리', '무주덕유산', '에덴밸리',
];

export default function NewEquipment() {
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedResort, setSelectedResort] = useState('all');
  const [currentBanner, setCurrentBanner] = useState(0);
  const [banners, setBanners] = useState<{ title: string; desc: string; textColor?: string | null; textAlign?: string | null }[]>([]);

  useEffect(() => {
    api<any[]>('/ad-booking/active?slotType=category&category=skishop')
      .then(ads => setBanners(ads.map(a => ({ title: a.title, desc: a.description, textColor: a.textColor, textAlign: a.textAlign }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => setCurrentBanner(prev => (prev + 1) % banners.length), 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const filtered = shops.filter(s => {
    if (selectedArea !== 'all' && s.area !== selectedArea) return false;
    if (selectedResort !== 'all' && s.resort !== selectedResort) return false;
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 text-lg">←</Link>
          <h1 className="text-xl font-bold text-gray-900">스키샵</h1>
        </div>
      </div>

      {/* 광고 배너 */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 h-24">
        {banners.length > 0 ? (
          <>
            {banners.map((banner, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 flex items-center px-6 transition-all duration-700 ease-in-out ${
                  idx === currentBanner ? 'opacity-100 translate-x-0' : idx < currentBanner ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'
                }`}
              >
                <div className={`relative z-10 flex-1 ${banner.textAlign === 'center' ? 'text-center' : banner.textAlign === 'right' ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-2 mb-0.5 ${banner.textAlign === 'center' ? 'justify-center' : banner.textAlign === 'right' ? 'justify-end' : ''}`}>
                    <span className="text-[9px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">AD</span>
                    <h3 className="text-base font-bold" style={banner.textColor ? { color: banner.textColor } : undefined}>{banner.title}</h3>
                  </div>
                  <p className="text-sm" style={banner.textColor ? { color: banner.textColor, opacity: 0.8 } : { color: '#6b7280' }}>{banner.desc}</p>
                </div>
              </div>
            ))}
            <div className="absolute bottom-2 right-4 flex gap-1.5 z-10">
              {banners.map((_, idx) => (
                <button key={idx} onClick={() => setCurrentBanner(idx)} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentBanner ? 'bg-accent w-4' : 'bg-gray-300'}`} />
              ))}
            </div>
          </>
        ) : (
          <Link to="/ad-booking" className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="text-lg">📢</span>
            <span className="text-xs font-bold text-primary-dark">광고를 신청해보세요!</span>
            <span className="text-[10px] text-gray-400">이 자리에 내 광고가 노출됩니다</span>
          </Link>
        )}
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sm text-sky-700">
        스키샵 등록/수정은 <a href="mailto:snowpan.help@gmail.com" className="font-bold underline">snowpan.help@gmail.com</a>으로 문의주세요.
      </div>

      {/* 지역 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {areas.map(a => (
          <button
            key={a.id}
            onClick={() => { setSelectedArea(a.id); setSelectedResort('all'); }}
            className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              selectedArea === a.id ? 'bg-accent text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* 스키장 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedResort('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
            selectedResort === 'all' ? 'bg-sky-100 text-sky-700 border border-sky-300' : 'bg-white text-gray-400 border border-gray-200'
          }`}
        >
          전체 스키장
        </button>
        {resorts.map(r => (
          <button
            key={r}
            onClick={() => setSelectedResort(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              selectedResort === r ? 'bg-sky-100 text-sky-700 border border-sky-300' : 'bg-white text-gray-400 border border-gray-200'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* 스키샵 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <div className="text-4xl mb-3">🏪</div>
          <p className="text-sm text-gray-400">
            {selectedArea !== 'all' || selectedResort !== 'all'
              ? '해당 지역/스키장에 등록된 스키샵이 없습니다.'
              : '아직 등록된 스키샵이 없습니다.'}
          </p>
          <p className="text-xs text-gray-300 mt-1">곧 업데이트됩니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((shop) => (
            <div key={shop.id} className="card p-5">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                  {shop.image ? (
                    <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
                  ) : '🏪'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">{shop.name}</h3>
                    {shop.resort && (
                      <span className="text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded border border-sky-200">{shop.resort}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">📍 {shop.address}</p>
                  {shop.hours && <p className="text-xs text-gray-400">🕐 {shop.hours}</p>}
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{shop.description}</p>
                  {shop.brands.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {shop.brands.map((b, i) => (
                        <span key={i} className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">{b}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs flex-wrap">
                    {shop.phone && <a href={`tel:${shop.phone}`} className="text-gray-500 hover:text-gray-900">📞 {shop.phone}</a>}
                    {shop.instagram && <a href={`https://instagram.com/${shop.instagram}`} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">@{shop.instagram}</a>}
                    {shop.website && <a href={shop.website} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">홈페이지</a>}
                    {shop.naverMap && <a href={shop.naverMap} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">네이버지도</a>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
