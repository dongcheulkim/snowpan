import { toastSuccess, toastError } from '../components/Toast';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, uploadImages } from '../api';
import { BankIcon, CloseIcon, MountainIcon, StarIcon } from '../components/Icons';
import type { ComponentType } from 'react';
import { AD_CATEGORY_LABELS as SHARED_CATEGORY_LABELS } from '../utils/adLabels';

interface SlotPricing {
  id: string;
  slotType: string;
  category: string | null;
  pricePerDay: number;
  maxConcurrent: number;
  description: string | null;
}

// 기간제 — 백엔드 PERIOD_DAYS/PERIOD_DISCOUNT 와 동일해야 함.
const PERIOD_OPTIONS: { months: number; days: number; discount: number; label: string }[] = [
  { months: 1, days: 30, discount: 0, label: '1개월' },
  { months: 6, days: 180, discount: 0.05, label: '6개월' },
  { months: 12, days: 360, discount: 0.1, label: '12개월' },
];

const SLOT_LABELS: Record<string, string> = {
  main_banner: '메인 배너',
  category: '카테고리 배너',
  premium: '프리미엄 노출',
};

const SLOT_DESCRIPTIONS: Record<string, string> = {
  main_banner: '홈 화면 최상단 회전 배너 — 가장 많이 노출',
  category: '카테고리 페이지 상단 배너',
  premium: '내 상품/샵을 리스트 최상단에 고정 노출',
};

const SLOT_ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  main_banner: MountainIcon,
  category: StarIcon,
  premium: StarIcon,
};

const CATEGORY_LABELS: Record<string, string> = {
  skishop: SHARED_CATEGORY_LABELS.skishop,
  repair: SHARED_CATEGORY_LABELS.repair,
  used: SHARED_CATEGORY_LABELS.used,
  rental: SHARED_CATEGORY_LABELS.rental,
  lesson: SHARED_CATEGORY_LABELS.lesson,
  accommodation: SHARED_CATEGORY_LABELS.accommodation,
  community: SHARED_CATEGORY_LABELS.community,
  overseas: SHARED_CATEGORY_LABELS.overseas,
};

// 프리미엄 노출이 가능한 카테고리 — Product/SkiShop/RepairShop 모델만 isPremium 지원.
const PREMIUM_CATEGORIES = ['used', 'skishop', 'repair'];

// 본인 등록물 dropdown 에 쓰일 entity API 경로 + URL 형식.
interface MyListing { id: string; name: string; image?: string }
const MY_LISTINGS_API: Record<string, { url: string; pickArray: (data: any) => any[] }> = {
  used: {
    url: '/products?category=used&userId=__ME__',
    pickArray: (d) => Array.isArray(d) ? d : (d?.products || []),
  },
  skishop: { url: '/ski-shops/my', pickArray: (d) => Array.isArray(d) ? d : [] },
  repair: { url: '/repair-shops/my', pickArray: (d) => Array.isArray(d) ? d : [] },
};
const URL_PREFIX: Record<string, string> = {
  used: '/used/',
  skishop: '/skishop/',
  repair: '/repair/',
};

function formatPrice(n: number): string {
  return n.toLocaleString('ko-KR');
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function AdBooking() {
  const navigate = useNavigate();
  getUser(); // auth check
  const [step, setStep] = useState(1);
  const [pricings, setPricings] = useState<SlotPricing[]>([]);
  // 입금 계좌 — 백엔드 env 단일 소스 (Render 만 갱신하면 반영). VITE_ env 는 레거시 폴백.
  const [deposit, setDeposit] = useState<{ bank: string | null; account: string | null; holder: string | null }>({ bank: null, account: null, holder: null });
  const [loading, setLoading] = useState(true);

  // Step 1: 슬롯 선택
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Step 2: 기간 선택 (1/6/12개월) + 희망 시작일 (선택 — 비우면 입금 확인 즉시 시작)
  const [periodMonths, setPeriodMonths] = useState<number | null>(null);
  const [desiredStart, setDesiredStart] = useState('');

  // Step 3: 광고 내용
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [noUrl, setNoUrl] = useState(false); // URL 없음 체크 — 광고 클릭해도 이동 없음
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [textColor, setTextColor] = useState('#1e293b');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  // 이미지 초점 (object-position) — 미리보기에서 드래그로 "사진의 어느 부분을 보여줄지" 지정.
  const [imgPos, setImgPos] = useState('50% 50%');
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const startImgDrag = (e: React.PointerEvent) => {
    if (!imagePreview) return;
    const [px, py] = imgPos.split(' ').map((v) => parseFloat(v));
    dragRef.current = { x: e.clientX, y: e.clientY, px, py };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const moveImgDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = Math.min(100, Math.max(0, d.px - ((e.clientX - d.x) / r.width) * 100));
    const ny = Math.min(100, Math.max(0, d.py - ((e.clientY - d.y) / r.height) * 100));
    setImgPos(`${Math.round(nx)}% ${Math.round(ny)}%`);
  };
  const endImgDrag = () => { dragRef.current = null; };

  // Step 4: 결제
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [inquiring, setInquiring] = useState(false);

  // 신청이 부담스러운 사장님용 — 관리자 1:1 채팅으로 바로 연결 (고객센터와 동일 패턴).
  const handleInquiry = async () => {
    const u = getUser();
    if (!u) { navigate('/login'); return; }
    setInquiring(true);
    try {
      const admin = await api<{ id: string; name: string }>('/contact/admin-id');
      if (admin.id === u.id) { toastError('관리자 계정입니다.'); return; }
      const room = await api<{ id: string }>('/chat/rooms', { method: 'POST', body: { targetUserId: admin.id } });
      navigate(`/chat/${room.id}`, { state: { seller: admin.name, sellerId: admin.id, isAdmin: true } });
    } catch {
      toastError('관리자 연결에 실패했습니다.');
    } finally {
      setInquiring(false);
    }
  };

  // 프리미엄 슬롯: 자기 등록물 dropdown 데이터.
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const me = getUser();

  useEffect(() => {
    if (selectedSlot !== 'premium' || !selectedCategory || !me) {
      setMyListings([]);
      return;
    }
    const config = MY_LISTINGS_API[selectedCategory];
    if (!config) { setMyListings([]); return; }
    setMyListingsLoading(true);
    const path = config.url.replace('__ME__', me.id);
    api<any>(path)
      .then((data) => setMyListings(config.pickArray(data).slice(0, 50)))
      .catch(() => setMyListings([]))
      .finally(() => setMyListingsLoading(false));
  }, [selectedSlot, selectedCategory, me?.id]);

  useEffect(() => {
    api<SlotPricing[]>('/ad-booking/slots')
      .then(setPricings)
      .catch(() => {})
      .finally(() => setLoading(false));
    api<{ bank: string | null; account: string | null; holder: string | null }>('/ad-booking/deposit-info')
      .then(setDeposit)
      .catch(() => {});
  }, []);

  const currentPricing = pricings.find(
    (p) =>
      p.slotType === selectedSlot &&
      (selectedSlot === 'main_banner'
        ? p.category === 'none'
        : p.category === selectedCategory)
  );

  const selectedPeriod = PERIOD_OPTIONS.find((p) => p.months === periodMonths) || null;
  const totalDays = selectedPeriod?.days || 0;
  const originalPrice = currentPricing ? totalDays * currentPricing.pricePerDay : 0;
  const discountAmount = selectedPeriod ? Math.round(originalPrice * selectedPeriod.discount) : 0;
  const totalPrice = originalPrice - discountAmount;

  const handleSlotSelect = (slotType: string) => {
    setSelectedSlot(slotType);
    setSelectedCategory('');
    setPeriodMonths(null);
    // 슬롯 바꾸면 이전 선택 URL 초기화 — 남은 URL 로 잘못된(가격 불일치) 프리미엄 예약 방지.
    setUrl('');
    setNoUrl(false);
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setPeriodMonths(null);
    setUrl('');
    setNoUrl(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      // 사진 위엔 흰 글자가 기본 (스크림 위 에디토리얼 스타일) — 사용자가 이미 색을 골랐으면 존중
      setTextColor((prev) => (prev === '#1e293b' ? '#ffffff' : prev));
    }
  };

  const canProceedStep1 = selectedSlot === 'main_banner' || (selectedSlot && selectedCategory);
  const canProceedStep2 = periodMonths !== null && !!currentPricing;
  // 프리미엄은 url 이 등록물에서 자동 채워지므로 별도 noUrl 체크 불필요.
  // 일반 슬롯은 noUrl 체크 시 url 비어도 통과.
  const urlOk = selectedSlot === 'premium' ? !!url.trim() : (noUrl || !!url.trim());
  // 이미지형 광고는 제목·설명 생략 가능 (로고만 노출). 이미지가 없으면 텍스트 필수.
  const canProceedStep3 = urlOk && (imagePreview ? true : (title.trim() && description.trim()));

  const handlePayment = async () => {
    if (paying) return;
    setPaying(true);
    setError('');

    try {
      // 1. 이미지 업로드
      let imageUrl = '';
      if (imageFile) {
        const urls = await uploadImages([imageFile]);
        imageUrl = urls[0];
      }

      // 2. 예약 생성 — 백엔드가 관리자 채팅방에 입금 안내 메시지 자동 발송.
      const result = await api<{ bookingId: string; totalPrice: number; chatRoomId: string | null }>('/ad-booking/create', {
        method: 'POST',
        body: {
          slotType: selectedSlot,
          category: selectedSlot === 'main_banner' ? 'none' : selectedCategory,
          title,
          description,
          // noUrl 체크면 빈 문자열로 전송 — 표시는 되지만 클릭 시 이동 없음.
          url: selectedSlot !== 'premium' && noUrl ? '' : url,
          image: imageUrl,
          textColor: selectedSlot !== 'premium' ? textColor : undefined,
          textAlign: selectedSlot !== 'premium' ? textAlign : undefined,
          imagePos: selectedSlot !== 'premium' && imageUrl ? imgPos : undefined,
          periodMonths,
          desiredStart: desiredStart || undefined,
          payMethod: 'TRANSFER',
        },
      });

      toastSuccess('광고 신청이 완료되었습니다!\n관리자 채팅방에 입금 안내가 전송되었습니다.');
      // 채팅방 자동 생성됐으면 바로 이동, 아니면 채팅 목록으로.
      if (result.chatRoomId) {
        navigate(`/chat/${result.chatRoomId}`);
      } else {
        navigate('/chat/rooms');
      }
    } catch (err: any) {
      setError(err.message || '광고 신청 중 오류가 발생했습니다.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* 상단 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))} className="p-1">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">광고 신청</h1>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex-1 flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                s === step
                  ? 'bg-sky-500 text-white'
                  : s < step
                  ? 'bg-sky-100 text-sky-600'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {s}
            </div>
            {s < 4 && (
              <div className={`flex-1 h-0.5 mx-1 ${s < step ? 'bg-sky-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: 슬롯 선택 */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold mb-2">광고 위치 선택</h2>
          <div className="grid gap-3">
            {['main_banner', 'category', 'premium'].map((slotType) => {
              const slotPricings = pricings.filter((p) => p.slotType === slotType);
              const minPrice = slotPricings.length
                ? Math.min(...slotPricings.map((p) => p.pricePerDay))
                : 0;

              return (
                <button
                  key={slotType}
                  onClick={() => handleSlotSelect(slotType)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedSlot === slotType
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {(() => { const Icon = SLOT_ICONS[slotType]; return Icon ? <Icon size={22} className="text-gray-700" /> : null; })()}
                    <div className="flex-1">
                      <div className="font-bold text-gray-800">
                        {SLOT_LABELS[slotType]}
                      </div>
                      <div className="text-sm text-gray-500">{SLOT_DESCRIPTIONS[slotType]}</div>
                    </div>
                    {minPrice > 0 && (
                      <div className="text-right">
                        <div className="text-sky-600 font-bold">{formatPrice(minPrice)}원</div>
                        <div className="text-xs text-gray-500">/ 1일</div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 카테고리 선택 (category/premium 타입일 때) */}
          {(selectedSlot === 'category' || selectedSlot === 'premium') && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                카테고리 선택
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CATEGORY_LABELS)
                  .filter(([key]) => selectedSlot !== 'premium' || PREMIUM_CATEGORIES.includes(key))
                  .map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => handleCategorySelect(key)}
                      className={`p-3 rounded-lg border text-center text-sm font-medium transition-all ${
                        selectedCategory === key
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
              </div>
              {selectedSlot === 'premium' && (
                <p className="text-xs text-gray-500 mt-2">
                  프리미엄 노출은 본인이 등록한 상품/스키샵/정비샵만 가능합니다.
                </p>
              )}
            </div>
          )}

          <button
            disabled={!canProceedStep1}
            onClick={() => setStep(2)}
            className="w-full mt-4 py-3 rounded-xl bg-sky-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sky-600 transition-colors"
          >
            다음
          </button>

          <button
            type="button"
            onClick={handleInquiry}
            disabled={inquiring}
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:border-sky-300 hover:text-sky-600 transition-colors disabled:opacity-50"
          >
            {inquiring ? '연결 중...' : '고민되시나요? 채팅으로 편하게 문의하기'}
          </button>
        </div>
      )}

      {/* Step 2: 기간 선택 (1/6/12개월) */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold mb-2">광고 기간 선택</h2>

          <div className="grid gap-3">
            {PERIOD_OPTIONS.map((opt) => {
              const base = currentPricing ? opt.days * currentPricing.pricePerDay : 0;
              const dc = Math.round(base * opt.discount);
              const price = base - dc;
              const selected = periodMonths === opt.months;
              return (
                <button
                  key={opt.months}
                  onClick={() => setPeriodMonths(opt.months)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selected ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{opt.label}</span>
                        {opt.discount > 0 && (
                          <span className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-100 rounded px-1.5 py-0.5">
                            {Math.round(opt.discount * 100)}% 할인
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{opt.days}일 노출</div>
                    </div>
                    <div className="text-right">
                      {dc > 0 && (
                        <div className="text-xs text-gray-400 line-through">{formatPrice(base)}원</div>
                      )}
                      <div className="text-sky-600 font-bold text-lg">{formatPrice(price)}원</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 희망 시작일 (선택) */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <label className="text-sm font-medium text-gray-600">시작일 <span className="text-xs text-gray-400">(선택)</span></label>
            <input
              type="date"
              value={desiredStart}
              min={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
              onChange={(e) => setDesiredStart(e.target.value)}
              className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-sky-400 outline-none"
            />
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              {desiredStart
                ? `${formatDate(desiredStart)}부터 ${selectedPeriod ? selectedPeriod.label : ''} 동안 노출됩니다.`
                : '비워두면 입금 확인 즉시 광고가 시작돼요. 특정 날짜부터 시작하려면 선택하세요.'}
            </p>
          </div>

          {selectedPeriod && currentPricing && (
            <div className="bg-sky-50 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {selectedPeriod.label} ({totalDays}일) × {formatPrice(currentPricing.pricePerDay)}원
                {discountAmount > 0 && ` − 할인 ${formatPrice(discountAmount)}원`}
              </span>
              <span className="font-bold text-sky-700 text-lg">{formatPrice(totalPrice)}원</span>
            </div>
          )}

          <button
            disabled={!canProceedStep2}
            onClick={() => setStep(3)}
            className="w-full py-3 rounded-xl bg-sky-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sky-600 transition-colors"
          >
            다음
          </button>
        </div>
      )}

      {/* Step 3: 광고 내용 */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold mb-2">광고 내용 작성</h2>

          <div>
            <label className="text-sm font-medium text-gray-600">광고 제목 <span className="text-xs text-gray-400 font-normal">(이미지 광고면 생략 가능)</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="광고 제목을 입력하세요"
              className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-sky-400 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">광고 설명 <span className="text-xs text-gray-400 font-normal">(이미지 광고면 생략 가능)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="광고 설명을 입력하세요"
              rows={3}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-sky-400 outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">
              {selectedSlot === 'premium' ? '프리미엄 띄울 내 등록물 *' : '연결 URL *'}
            </label>
            {selectedSlot === 'premium' ? (
              <div className="mt-1">
                {myListingsLoading ? (
                  <div className="px-4 py-3 rounded-xl border border-gray-200 bg-snow text-sm text-gray-500">
                    내 등록물 불러오는 중...
                  </div>
                ) : myListings.length === 0 ? (
                  <div className="px-4 py-3 rounded-xl border border-dashed border-gray-300 bg-snow text-sm text-gray-500">
                    이 카테고리에 등록한 항목이 없습니다.{' '}
                    <Link to={`/${selectedCategory === 'used' ? 'used' : selectedCategory === 'skishop' ? 'skishop' : 'repair'}/register`} className="text-sky-600 underline">
                      먼저 등록
                    </Link>
                    하고 다시 와주세요.
                  </div>
                ) : (
                  <>
                    <select
                      value={url ? url.split('/').pop() || '' : ''}
                      onChange={(e) => {
                        const id = e.target.value;
                        setUrl(id ? `${URL_PREFIX[selectedCategory]}${id}` : '');
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-sky-400 outline-none"
                    >
                      <option value="">선택해주세요</option>
                      {myListings.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    {url && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        연결 URL: <span className="font-mono">{url}</span>
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={noUrl}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-sky-400 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                />
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={noUrl}
                    onChange={(e) => {
                      setNoUrl(e.target.checked);
                      if (e.target.checked) setUrl('');
                    }}
                    className="w-4 h-4 accent-gray-900"
                  />
                  연결 URL 없음 (클릭해도 이동 없는 노출용 광고)
                </label>
              </>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">광고 이미지</label>
            <div className="mt-1">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="preview" className="w-full max-h-64 object-contain rounded-xl bg-gray-100" />
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview('');
                    }}
                    aria-label="제거"
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center"
                  >
                    <CloseIcon size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-sky-400 transition-colors">
                  <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-500">이미지 업로드</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* 디자인 커스터마이징 (프리미엄 제외) */}
          {selectedSlot !== 'premium' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-600">글자 색상</label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                  <div className="flex gap-2">
                    {['#1e293b', '#ffffff', '#0ea5e9', '#ef4444', '#f59e0b'].map(c => (
                      <button key={c} type="button" onClick={() => setTextColor(c)} className={`w-8 h-8 rounded-full border-2 ${textColor === c ? 'border-sky-500 scale-110' : 'border-gray-200'} transition-all`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 ml-auto">{textColor}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">글자 위치</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {([['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setTextAlign(val)} className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${textAlign === val ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 미리보기 — 선택한 슬롯의 실제 노출 모양 그대로 (비율·AD 칩 포함) */}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  미리보기 <span className="text-xs text-gray-400 font-normal">— 실제 노출과 동일 · 사진을 드래그해 보여줄 부분을 맞춰보세요</span>
                </label>
                {selectedSlot === 'main_banner' ? (
                  /* 홈 메인 배너 — 5:4 큰 카드, AD 칩은 좌하단 (Home.tsx 와 동일) */
                  <div
                    className={`mt-1 relative overflow-hidden rounded-2xl border border-gray-200 aspect-[5/4] max-w-sm mx-auto select-none ${imagePreview ? 'touch-none cursor-grab active:cursor-grabbing' : ''}`}
                    style={{ backgroundColor: '#ffffff' }}
                    onPointerDown={startImgDrag} onPointerMove={moveImgDrag} onPointerUp={endImgDrag} onPointerCancel={endImgDrag}
                  >
                    {imagePreview && (
                      <img src={imagePreview} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: imgPos }} />
                    )}
                    {/* 실노출(홈 배너)과 동일한 가독성 스크림 */}
                    {imagePreview && (title || description) && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />
                    )}
                    {(title || description || !imagePreview) && (
                    <div className={`relative z-10 flex items-center h-full px-5 ${textAlign === 'center' ? 'justify-center text-center' : textAlign === 'right' ? 'justify-end text-right' : 'justify-start text-left'}`}>
                      <div>
                        {(title || !imagePreview) && <div className={imagePreview ? 'text-xl font-black leading-snug' : 'text-[15px] font-bold'} style={{ color: textColor }}>{title || '광고 제목'}</div>}
                        {(description || !imagePreview) && <p className={imagePreview ? 'text-[13px]' : 'text-sm'} style={{ color: textColor, opacity: 0.85 }}>{description || '광고 설명'}</p>}
                      </div>
                    </div>
                    )}
                    <span className="absolute bottom-2 left-3 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/55 text-white z-10">AD</span>
                  </div>
                ) : (
                  /* 카테고리 배너 — 슬림 카드, AD 칩은 제목 앞 (CategoryAdBanner 와 동일) */
                  <div
                    className={`mt-1 relative overflow-hidden rounded-2xl border border-gray-200 h-24 select-none ${imagePreview ? 'touch-none cursor-grab active:cursor-grabbing' : ''}`}
                    style={{ backgroundColor: '#ffffff' }}
                    onPointerDown={startImgDrag} onPointerMove={moveImgDrag} onPointerUp={endImgDrag} onPointerCancel={endImgDrag}
                  >
                    {imagePreview && (
                      <img src={imagePreview} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: imgPos }} />
                    )}
                    {(title || description || !imagePreview) ? (
                    <div className={`relative z-10 flex items-center h-full px-6 ${textAlign === 'center' ? 'justify-center' : textAlign === 'right' ? 'justify-end' : ''}`}>
                      <div className={textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : ''}>
                        <div className={`flex items-center gap-2 mb-0.5 ${textAlign === 'center' ? 'justify-center' : textAlign === 'right' ? 'justify-end' : ''}`}>
                          <span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">AD</span>
                          {(title || !imagePreview) && <span className="text-base font-bold" style={{ color: textColor }}>{title || '광고 제목'}</span>}
                        </div>
                        {(description || !imagePreview) && <p className="text-sm" style={{ color: textColor, opacity: 0.8 }}>{description || '광고 설명'}</p>}
                      </div>
                    </div>
                    ) : (
                      <span className="absolute bottom-1.5 left-3 z-10 text-[9px] font-bold bg-black/55 text-white px-1.5 py-0.5 rounded">AD</span>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <button
            disabled={!canProceedStep3}
            onClick={() => setStep(4)}
            className="w-full py-3 rounded-xl bg-sky-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sky-600 transition-colors"
          >
            다음
          </button>
        </div>
      )}

      {/* Step 4: 입금 안내 */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold mb-2">입금 안내</h2>

          {/* 주문 요약 */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">광고 위치</span>
              <span className="font-medium">
                {SLOT_LABELS[selectedSlot]}
                {selectedCategory && ` - ${CATEGORY_LABELS[selectedCategory]}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">광고 제목</span>
              <span className="font-medium">{title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">광고 기간</span>
              <span className="font-medium">{selectedPeriod?.label} ({totalDays}일)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">시작일</span>
              <span className="font-medium">{desiredStart ? formatDate(desiredStart) : '입금 확인 즉시'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">단가</span>
              <span className="font-medium">{currentPricing && formatPrice(currentPricing.pricePerDay)}원/일</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">장기 할인 ({selectedPeriod && Math.round(selectedPeriod.discount * 100)}%)</span>
                <span className="font-medium text-red-500">−{formatPrice(discountAmount)}원</span>
              </div>
            )}
            {imagePreview && (
              <div>
                <span className="text-gray-500 text-sm">광고 이미지</span>
                <img src={imagePreview} alt="ad" className="w-full max-h-48 object-contain rounded-lg mt-1 bg-gray-100" />
              </div>
            )}

            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">총 금액</span>
                <span className="text-2xl font-bold text-sky-600">{formatPrice(totalPrice)}원</span>
              </div>
            </div>
          </div>

          {/* 입금 계좌 안내 */}
          {(() => {
            const bank = deposit.bank || import.meta.env.VITE_AD_DEPOSIT_BANK;
            const account = deposit.account || import.meta.env.VITE_AD_DEPOSIT_ACCOUNT;
            const holder = deposit.holder || import.meta.env.VITE_AD_DEPOSIT_HOLDER;
            if (!bank || !account || !holder) {
              return (
                <div className="bg-sky-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BankIcon size={18} className="text-gray-700" />
                    <span className="text-sm font-bold text-sky-800">입금 계좌 안내</span>
                  </div>
                  <p className="text-xs text-sky-700 mt-2 leading-relaxed">
                    아래 <span className="font-bold">"광고 신청하기"</span> 버튼을 누르면 관리자와의 채팅방이 자동 생성되고
                    예약 내역 + 입금 계좌 정보가 안내됩니다.
                  </p>
                </div>
              );
            }
            return (
              <div className="bg-sky-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <BankIcon size={18} className="text-gray-700" />
                  <span className="text-sm font-bold text-sky-800">입금 계좌 안내</span>
                </div>
                <div className="bg-white rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">은행</span>
                    <span className="font-bold">{bank}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">계좌번호</span>
                    <span className="font-bold">{account}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">예금주</span>
                    <span className="font-bold">{holder}</span>
                  </div>
                </div>
                <p className="text-[11px] text-sky-600 mt-2">
                  입금 시 광고 제목을 입금자명에 적어주세요. 관리자 확인 후 바로 광고가 노출됩니다.
                </p>
              </div>
            );
          })()}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <label className="flex items-start gap-2 py-2">
            <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} className="w-4 h-4 accent-sky-500 mt-0.5" />
            <span className="text-xs text-gray-500">
              <Link to="/mypage/terms" target="_blank" className="text-sky-600 underline">이용약관</Link> 및 <Link to="/privacy" target="_blank" className="text-sky-600 underline">개인정보처리방침</Link>에 동의합니다.
            </span>
          </label>

          <button
            disabled={paying || !agreeTerms}
            onClick={handlePayment}
            className="w-full py-4 rounded-xl bg-sky-500 text-white font-bold text-lg disabled:opacity-60 hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
          >
            {paying ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                처리 중...
              </>
            ) : (
              '광고 신청하기'
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            신청 후 채팅방으로 입금 안내가 전송됩니다. 입금 확인 후 관리자가 승인하면 광고가 노출됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
