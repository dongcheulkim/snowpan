import { Link } from 'react-router-dom';

interface Shop {
  id: string;
  name: string;
  location: string;
  description: string;
  brands: string[];
  phone?: string;
  instagram?: string;
  website?: string;
  image?: string;
}

const shops: Shop[] = [
  // 스키샵 등록 시 여기에 추가
];

export default function NewEquipment() {
  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">새장비 · 스키샵</h1>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sm text-sky-700">
        스키샵 등록/수정은 <a href="mailto:snowpan.help@gmail.com" className="font-bold underline">snowpan.help@gmail.com</a>으로 문의주세요.
      </div>

      {shops.length === 0 ? (
        <div className="text-center py-16 card">
          <div className="text-4xl mb-3">🏪</div>
          <p className="text-sm text-gray-400">아직 등록된 스키샵이 없습니다.</p>
          <p className="text-xs text-gray-300 mt-1">곧 업데이트됩니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shops.map((shop) => (
            <div key={shop.id} className="card p-5">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                  {shop.image ? (
                    <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
                  ) : '🏪'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900">{shop.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">📍 {shop.location}</p>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{shop.description}</p>
                  {shop.brands.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {shop.brands.map((b, i) => (
                        <span key={i} className="text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded border border-sky-200">{b}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs">
                    {shop.phone && <a href={`tel:${shop.phone}`} className="text-gray-500 hover:text-gray-900">📞 {shop.phone}</a>}
                    {shop.instagram && <a href={`https://instagram.com/${shop.instagram}`} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">@{shop.instagram}</a>}
                    {shop.website && <a href={shop.website} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">홈페이지</a>}
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
