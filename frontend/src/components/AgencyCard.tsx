import { imageUrl, openExternal } from '../api';

export interface Agency {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  phone?: string | null;
  website: string;
  kakao?: string | null;
  countries?: string | null;
  isPremium?: boolean;
}

// 추천 여행사 카드 — 홈페이지/예약 링크로 중개.
export default function AgencyCard({ agency }: { agency: Agency }) {
  const kakaoUrl = agency.kakao && /^https?:\/\//i.test(agency.kakao) ? agency.kakao : null;
  return (
    <div className="bg-snow border border-gray-200 rounded-2xl p-3.5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center overflow-hidden flex-shrink-0">
          {agency.image ? (
            <img
              src={imageUrl(agency.image, 120)}
              alt={agency.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <span className="text-white font-black text-sm">{agency.name.slice(0, 2)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-gray-900 truncate">{agency.name}</p>
            {agency.isPremium && <span className="text-[9px] font-bold text-white bg-gold px-1.5 py-0.5 rounded">프리미엄</span>}
          </div>
          {agency.countries && <p className="text-[11px] text-gray-500 truncate">{agency.countries.split(',').map((c) => c.trim()).filter(Boolean).join(' · ')}</p>}
        </div>
      </div>
      {agency.description && <p className="text-[11px] text-gray-600 mt-2 line-clamp-2 leading-snug">{agency.description}</p>}
      <div className="flex gap-2 mt-2.5">
        <button onClick={() => openExternal(agency.website)} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold active:scale-95 transition-transform">홈페이지 · 예약</button>
        {kakaoUrl && <button onClick={() => openExternal(kakaoUrl)} className="px-3 py-2 bg-yellow-300 text-gray-900 rounded-lg text-xs font-bold">카카오</button>}
        {agency.phone && <a href={`tel:${agency.phone}`} className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center">전화</a>}
      </div>
    </div>
  );
}
