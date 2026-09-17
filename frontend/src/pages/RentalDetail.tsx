import { useState, useEffect } from 'react';
import { loginPath } from '../utils/loginPath';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBackTo } from '../hooks/useUrlFilters';
import { api, getUser, openExternal } from '../api';
import { SadIcon, PhoneIcon, LocationIcon, ClockIcon } from '../components/Icons';
import PhotoGallery from '../components/PhotoGallery';
import ShopPostsFeed from '../components/ShopPostsFeed';
import ShopReportButton from '../components/ShopReportButton';
import ShopReviews from '../components/ShopReviews';
import UnverifiedShopBadge from '../components/UnverifiedShopBadge';
import ClaimShopButton from '../components/ClaimShopButton';
import { useMyLocation } from '../hooks/useMyLocation';
import { distanceKm, formatDistance } from '../utils/geo';
import OpenNowBadge from '../components/OpenNowBadge';
import ReservationForm from '../components/ReservationForm';
import { hoursLabel } from '../utils/openNow';


interface RentalData {
  id: string;
  userId?: string;
  name: string;
  area?: string | null;
  address?: string | null;
  phone?: string | null;
  hours?: string | null;
  brands?: string | null;
  description?: string | null;
  image?: string | null;
  images?: string | null;
  website?: string | null;
  instagram?: string | null;
  naverMap?: string | null;
  resort?: { id: string; name: string; location?: string } | null;
  user?: { id?: string; name: string; nickname?: string | null };
  claimable?: boolean; // 관리자 시딩 매장 — 사장님 확인 전
  lat?: number | null;
  lng?: number | null;
  extraKinds?: string | null;
  // 구조화 영업시간 + 가격표 (2026-09-17)
  openTime?: string | null;
  closeTime?: string | null;
  closedDays?: string | null;
  priceSkiSet?: number | null;
  priceBoardSet?: number | null;
  priceClothes?: number | null;
  priceHelmet?: number | null;
  priceGoggles?: number | null;
  priceNote?: string | null;
  priceFrom?: number | null;
}

const RentalDetail = () => {
  const { id } = useParams();
  const backTo = useBackTo('/rental'); // 목록에서 왔으면 그때의 필터(쿼리)로 돌아간다
  const navigate = useNavigate();
  const [item, setItem] = useState<RentalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserveOpen, setReserveOpen] = useState(false); // 방문 예약 바텀시트 (결제 없음)
  const user = getUser();
  const my = useMyLocation();

  useEffect(() => {
    if (!id) return;
    api<RentalData>(`/rentals/${id}`).then(setItem).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-500 text-sm animate-fade-in">로딩 중...</div>;
  if (!item) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center text-gray-500"><SadIcon size={56} strokeWidth={1.4} /></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">렌탈샵을 찾을 수 없습니다</h2>
        <Link to={backTo} className="text-gray-500 hover:text-gray-900 text-sm">← 목록으로 돌아가기</Link>
      </div>
    );
  }

  const gallery = item.images || item.image || '';
  // 가격표 — 입력된 항목만 (1일 기준). 하나도 없고 메모도 없으면 카드 숨김
  const priceRows = ([
    ['스키 세트', item.priceSkiSet], ['보드 세트', item.priceBoardSet], ['의류', item.priceClothes], ['헬멧', item.priceHelmet], ['고글', item.priceGoggles],
  ] as [string, number | null | undefined][]).filter((r): r is [string, number] => typeof r[1] === 'number');
  const structuredHours = hoursLabel(item);
  // 문의 채팅·방문 예약이 같이 쓰는 채팅방 state (예약은 서버가 카드를 넣어 준 방으로 이동할 때 헤더·뒤로가기용)
  const chatState ={ seller: item.user?.nickname || item.user?.name || '매장', sellerId: item.userId, productName: item.name, productImage: item.image, backTo: `/rental/${item.id}`, productPath: `/rental/${item.id}` };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in pb-4">
      <Link to={backTo} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm transition-colors">← 렌탈샵 목록</Link>

      {gallery && <PhotoGallery images={gallery} />}

      <UnverifiedShopBadge claimable={item.claimable} />

      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
          {item.area && <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">{item.area}</span>}
          {my.coords && item.lat != null && item.lng != null && <span className="text-[10px] font-bold text-emerald-700">내 위치에서 {formatDistance(distanceKm(my.coords, { lat: item.lat, lng: item.lng }))}</span>}
        </div>
        {item.resort?.name && <p className="text-xs text-gray-500">{item.resort.name} 인근</p>}
        <div className="mt-3 space-y-1.5">
          {item.address && <p className="text-sm text-gray-700 inline-flex items-center gap-1.5"><LocationIcon size={14} /> {item.address}</p>}
          {(structuredHours || item.hours) && (
            <p className="text-sm text-gray-700 flex items-center gap-1.5 flex-wrap"><ClockIcon size={14} /> {structuredHours || item.hours} <OpenNowBadge shop={item} /></p>
          )}
          {structuredHours && item.hours && <p className="text-xs text-gray-500 pl-5">{item.hours}</p>}
        </div>
      </div>

      {(priceRows.length > 0 || item.priceNote) && (
        <div className="card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-900">가격표</h3>
            <span className="text-[10px] text-gray-500">1일 기준</span>
          </div>
          {priceRows.length > 0 && (
            <div className="divide-y divide-gray-100">
              {priceRows.map(([label, price]) => (
                <div key={label} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-bold text-gray-900">{price.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          )}
          {item.priceNote && <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap leading-relaxed">{item.priceNote}</p>}
        </div>
      )}

      {item.brands && (
        <div className="card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-2">취급 장비 · 브랜드</h3>
          <div className="flex flex-wrap gap-1.5">
            {item.brands.split(',').filter(Boolean).map((b, i) => (
              <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs border border-gray-200">{b.trim()}</span>
            ))}
          </div>
        </div>
      )}

      {item.description && (
        <div className="card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-2">매장 소개</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{item.description}</p>
        </div>
      )}

      {/* 연락 / 링크 */}
      <div className="flex flex-wrap gap-2">
        {item.phone && <a href={`tel:${item.phone}`} className="flex-1 min-w-[100px] py-3 bg-gray-900 text-white rounded-xl font-bold text-sm text-center inline-flex items-center justify-center gap-1.5"><PhoneIcon size={14} /> 전화</a>}
        {item.naverMap && <button onClick={() => openExternal(item.naverMap!)} className="px-4 py-3 bg-green-500 text-white rounded-xl font-bold text-sm">네이버지도</button>}
        {item.website && <button onClick={() => openExternal(item.website!)} className="px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm">홈페이지</button>}
        {item.instagram && <button onClick={() => openExternal(`https://instagram.com/${item.instagram}`)} className="px-4 py-3 bg-pink-500 text-white rounded-xl font-bold text-sm">인스타</button>}
      </div>

      {/* 문의 채팅 — 전화/링크가 없는 매장도 연락 가능하게 (레슨과 동일 UX).
          시딩(사장님 확인 전) 매장은 채팅이 관리자에게 가서 매장과 대화하는 것처럼 오해되므로 숨김 — 전화만 */}
      {!item.claimable && user && item.userId && item.userId !== user.id && (
        <div className="flex gap-2">
          {/* 방문 예약 — 날짜·인원·장비를 받아 예약을 요청하고, 서버가 카드를 넣어 준 채팅방으로 이동 (결제 없음) */}
          <button
            onClick={() => setReserveOpen(true)}
            className="flex-1 min-h-11 py-3.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all active:scale-[0.98]"
          >방문 예약</button>
          <button
            onClick={() => navigate(`/chat/new`, { state: chatState })}
            className="flex-1 min-h-11 py-3.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light transition-all active:scale-[0.98]"
          >문의 채팅하기</button>
        </div>
      )}
      {!item.claimable && !user && (
        <div className="flex gap-2">
          <Link to={loginPath()} className="flex-1 min-h-11 py-3.5 bg-gray-900 text-white rounded-xl font-bold text-sm text-center hover:bg-gray-800 transition-all">방문 예약</Link>
          <Link to={loginPath()} className="flex-1 min-h-11 py-3.5 bg-accent text-white rounded-xl font-bold text-sm text-center hover:bg-accent-light transition-all">문의 채팅하기</Link>
        </div>
      )}
      <ReservationForm
        open={reserveOpen}
        shopType="rental"
        shopId={item.id}
        shopName={item.name}
        onClose={() => setReserveOpen(false)}
        onCreated={(roomId) => { setReserveOpen(false); navigate(`/chat/${roomId}`, { state: chatState }); }}
      />
      <ClaimShopButton shopType="rental" shopId={item.id} ownerId={item.userId} claimable={item.claimable} />

      {/* 수정·삭제 등 매장 관리는 사장님 대시보드(/mypage/shops)에서만 — 상세 페이지는 방문자 화면 유지 */}
      {item.userId && <ShopPostsFeed shopType="rental" shopId={item.id} ownerId={item.userId} />}
      <ShopReportButton shopType="rental" shopId={item.id} ownerId={item.userId} />

      <ShopReviews shopType="rental" shopId={item.id} ownerId={item.userId} />
    </div>
  );
};

export default RentalDetail;
