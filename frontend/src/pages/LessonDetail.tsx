import { useState, useEffect } from 'react';
import { loginPath } from '../utils/loginPath';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBackTo } from '../hooks/useUrlFilters';
import { api, getUser, imageUrl } from '../api';
import { useMeta } from '../hooks/useMeta';
import ShareButton from '../components/ShareButton';
import { SadIcon, PhoneIcon } from '../components/Icons';
import PhotoGallery from '../components/PhotoGallery';
import ShopPostsFeed from '../components/ShopPostsFeed';
import ShopReportButton from '../components/ShopReportButton';
import ShopReviews from '../components/ShopReviews';
import ReservationForm from '../components/ReservationForm';
import RecruitCard from '../components/RecruitCard';
import ShopFollowBar from '../components/ShopFollowBar';
import { DETAIL_2COL, DETAIL_PHOTO } from '../utils/detailLayout';

interface LessonData {
  phone?: string | null;
  businessVerified?: boolean; // 관리자가 사업자등록증 확인 후 부여한 배지 (2026-09-23)
  certVerified?: boolean; career?: string | null; languages?: string | null; schedule?: string | null; videoUrl?: string | null; priceTable?: string | null; // 강사 프로필·가격표 (2026-10-07)
  id: string;
  userId?: string;
  name: string;
  type?: string | null;
  specialties?: string | null;
  description?: string | null;
  image?: string | null;
  images?: string | null;
  resort?: { id: string; name: string; location?: string } | null;
  user?: { id?: string; name: string; nickname?: string | null };
}

const LessonDetail = () => {
  const { id } = useParams();
  const backTo = useBackTo('/lesson'); // 목록에서 왔으면 그때의 필터(쿼리)로 돌아간다
  const navigate = useNavigate();
  const [item, setItem] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserveOpen, setReserveOpen] = useState(false); // 레슨 예약 바텀시트 (결제 없음)
  const user = getUser();

  useMeta({
    title: item ? `${item.name}${item.type ? ' · ' + item.type : ''} 레슨` : undefined,
    description: item ? `${item.resort?.name ? item.resort.name + ' · ' : ''}스노우판 스키/보드 레슨` : undefined,
    image: item?.image ? (item.image.startsWith('http') ? item.image : imageUrl(item.image)) : undefined,
    type: 'product',
  });

  useEffect(() => {
    if (!id) return;
    api<LessonData>(`/lessons/${id}`).then(setItem).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-500 text-sm animate-fade-in">로딩 중...</div>;
  if (!item) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center text-gray-500"><SadIcon size={56} strokeWidth={1.4} /></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">레슨을 찾을 수 없습니다</h2>
        <Link to={backTo} className="text-gray-500 hover:text-gray-900 text-sm">← 목록으로 돌아가기</Link>
      </div>
    );
  }

  const gallery = item.images || item.image || '';
  // 가격표 — 서버 JSON [{label, price}] (2026-10-07)
  let priceRows: { label: string; price: number }[] = [];
  try { priceRows = item.priceTable ? JSON.parse(item.priceTable) : []; } catch { priceRows = []; }
  const videoHost = item.videoUrl ? (/instagram\.com/.test(item.videoUrl) ? '인스타그램' : '유튜브') : '';
  // 문의 채팅·레슨 예약이 같이 쓰는 채팅방 state (헤더 이름·뒤로가기 경로)
  const chatState = { seller: item.user?.nickname || item.user?.name || '강사', sellerId: item.userId, productName: item.name, productImage: item.image, backTo: `/lesson/${item.id}`, productPath: `/lesson/${item.id}` };

  return (
    <div className={`max-w-2xl mx-auto space-y-5 animate-fade-in pb-4 ${gallery ? DETAIL_2COL : ''}`}>
      <div className="flex items-center justify-between">
        <Link to={backTo} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm transition-colors">← 레슨 목록</Link>
        <ShareButton title={item.name} text={item.name} />
      </div>

      {gallery && <div className={DETAIL_PHOTO}><PhotoGallery images={gallery} /></div>}

      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          {item.type && <span className="text-[10px] font-bold text-white bg-primary px-1.5 py-0.5 rounded">{item.type}</span>}
          {item.resort?.name && <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">{item.resort.name}</span>}
          {item.businessVerified && <span className="text-[10px] font-bold bg-white text-gray-900 px-1.5 py-0.5 rounded border border-gray-900">사업자 확인</span>}
          {item.certVerified && <span className="text-[10px] font-bold bg-gray-900 text-white px-1.5 py-0.5 rounded">자격 확인</span>}
          {item.specialties && item.specialties.split(',').map((sp) => (
            <span key={sp} className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{sp}</span>
          ))}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
      </div>

      {/* 가격표 — 강사가 넣은 구조화 가격. 없으면 카드 자체를 숨김 (2026-10-07) */}
      {priceRows.length > 0 && (
        <div className="card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">가격표</h3>
          <ul className="divide-y divide-gray-100">
            {priceRows.map((r) => (
              <li key={r.label} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <span className="text-sm text-gray-800">{r.label}</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{r.price.toLocaleString()}원</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-gray-500 mt-2">장비·리프트권 포함 여부는 상세 안내를 확인하거나 예약할 때 물어보세요.</p>
        </div>
      )}

      {/* 강사 프로필 — 경력·언어·가능 시간·소개 영상 */}
      {(item.career || item.languages || item.schedule || item.videoUrl) && (
        <div className="card rounded-2xl p-5 space-y-2.5">
          <h3 className="text-sm font-bold text-gray-900">강사 소개</h3>
          {item.career && <p className="text-sm text-gray-800 leading-relaxed">{item.career}</p>}
          <dl className="space-y-1.5 text-sm">
            {item.languages && <div className="flex gap-3"><dt className="w-16 shrink-0 text-gray-500">언어</dt><dd className="text-gray-800">{item.languages.split(',').join(' · ')}</dd></div>}
            {item.schedule && <div className="flex gap-3"><dt className="w-16 shrink-0 text-gray-500">가능 시간</dt><dd className="text-gray-800">{item.schedule}</dd></div>}
          </dl>
          {item.videoUrl && (
            <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-10 px-4 bg-white border border-gray-300 text-gray-900 rounded-xl text-xs font-bold">{videoHost} 소개 영상 보기</a>
          )}
        </div>
      )}

      {item.description && (
        <div className="card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">상세 안내</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.description}</p>
        </div>
      )}

      {item.user && (
        <div className="card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-2">강사/스쿨</h3>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-900">{item.user.nickname || item.user.name}</span>
            {item.phone && <a href={`tel:${item.phone.replace(/[^0-9+]/g, '')}`} className="min-h-11 px-4 inline-flex items-center gap-1.5 bg-gray-900 text-white rounded-xl text-sm font-bold"><PhoneIcon size={16} /> 전화</a>}
          </div>
        </div>
      )}

      {/* 수정·삭제 등 매장 관리는 사장님 대시보드(/mypage/shops)에서만 — 상세 페이지는 방문자 화면 유지 */}
      {user && item.userId && item.userId !== user.id && (
        <div className="flex gap-2">
          {/* 레슨 예약 — 날짜·인원·수준을 받아 예약을 요청하고, 서버가 카드를 넣어 준 채팅방으로 이동 (결제 없음) */}
          <button
            onClick={() => setReserveOpen(true)}
            className="flex-1 min-h-11 py-3.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all active:scale-[0.98]"
          >레슨 예약</button>
          <button
            onClick={() => navigate(`/chat/new`, { state: chatState })}
            className="flex-1 min-h-11 py-3.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent-light transition-all active:scale-[0.98]"
          >문의 채팅하기</button>
        </div>
      )}
      {!user && (
        <div className="flex gap-2">
          <Link to={loginPath()} className="flex-1 min-h-11 py-3.5 bg-gray-900 text-white rounded-xl font-bold text-sm text-center hover:bg-gray-800 transition-all">레슨 예약</Link>
          <Link to={loginPath()} className="flex-1 min-h-11 py-3.5 bg-accent text-white rounded-xl font-bold text-sm text-center hover:bg-accent-light transition-all">문의 채팅하기</Link>
        </div>
      )}
      {/* 모집 중(앰버서더 등) — 사장님이 올린 모집이 있으면 카드로, 신청은 /recruit/:id (2026-09-23) */}
      {/* 매장 찜 + 답장 속도 (2026-09-24) */}
      <ShopFollowBar shopType="lesson" shopId={item.id} />
      <RecruitCard shopType="lesson" shopId={item.id} />
      <ReservationForm
        open={reserveOpen}
        shopType="lesson"
        shopId={item.id}
        shopName={item.name}
        onClose={() => setReserveOpen(false)}
        onCreated={(roomId) => { setReserveOpen(false); navigate(`/chat/${roomId}`, { state: chatState }); }}
      />

      {item.userId && <ShopPostsFeed shopType="lesson" shopId={item.id} ownerId={item.userId} />}
      <ShopReportButton shopType="lesson" shopId={item.id} ownerId={item.userId} />

      <ShopReviews shopType="lesson" shopId={item.id} ownerId={item.userId} />
    </div>
  );
};

export default LessonDetail;
