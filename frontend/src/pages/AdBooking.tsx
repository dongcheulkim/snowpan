import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, uploadImages } from '../api';
import BookingCalendar from '../components/BookingCalendar';
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

interface AvailabilityResponse {
  unavailableDates: string[];
  maxConcurrent: number;
  pricePerDay: number;
}

const SLOT_LABELS: Record<string, string> = {
  main_banner: '메인 배너',
  category: '카테고리 배너',
  premium: '프리미엄 노출',
};

const SLOT_DESCRIPTIONS: Record<string, string> = {
  main_banner: '홈 화면 상단 배너 (1개월 단위)',
  category: '카테고리 페이지 상단 배너 (1개월 단위)',
  premium: '상품 리스트 최상단 고정 (카테고리당 3개 한정, 1,000원/일)',
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
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

function calcDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function AdBooking() {
  const navigate = useNavigate();
  getUser(); // auth check
  const [step, setStep] = useState(1);
  const [pricings, setPricings] = useState<SlotPricing[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 1: 슬롯 선택
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Step 2: 날짜 선택
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [viewMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Step 3: 광고 내용
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [textColor, setTextColor] = useState('#1e293b');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');

  // Step 4: 결제
  const payMethod = 'TRANSFER';
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

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
  }, []);

  // 날짜 가용성 조회
  useEffect(() => {
    if (!selectedSlot) return;
    const cat = selectedSlot === 'category' || selectedSlot === 'premium' ? selectedCategory : '';
    if ((selectedSlot === 'category' || selectedSlot === 'premium') && !cat) return;

    api<AvailabilityResponse>(
      `/ad-booking/availability?slotType=${selectedSlot}&category=${cat}&month=${viewMonth}`
    )
      .then((data) => setUnavailableDates(data.unavailableDates))
      .catch(() => {});
  }, [selectedSlot, selectedCategory, viewMonth]);

  const currentPricing = pricings.find(
    (p) =>
      p.slotType === selectedSlot &&
      (selectedSlot === 'main_banner'
        ? p.category === 'none'
        : p.category === selectedCategory)
  );

  const totalDays = startDate && endDate ? calcDays(startDate, endDate) : 0;
  const originalPrice = currentPricing ? totalDays * currentPricing.pricePerDay : 0;
  const isTransfer = payMethod === 'TRANSFER';
  const discountRate = isTransfer ? 0.05 : 0;
  const discountAmount = Math.round(originalPrice * discountRate);
  const totalPrice = originalPrice - discountAmount;

  const handleSlotSelect = (slotType: string) => {
    setSelectedSlot(slotType);
    setSelectedCategory('');
    setStartDate(null);
    setEndDate(null);
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setStartDate(null);
    setEndDate(null);
  };

  const handleDateSelect = (start: string, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const canProceedStep1 = selectedSlot === 'main_banner' || (selectedSlot && selectedCategory);
  const canProceedStep2 = startDate && endDate;
  const canProceedStep3 = title.trim() && description.trim() && url.trim();

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

      // 2. 예약 생성
      await api<{ bookingId: string; totalPrice: number }>('/ad-booking/create', {
        method: 'POST',
        body: {
          slotType: selectedSlot,
          category: selectedSlot === 'main_banner' ? 'none' : selectedCategory,
          title,
          description,
          url,
          image: imageUrl,
          textColor: selectedSlot !== 'premium' ? textColor : undefined,
          textAlign: selectedSlot !== 'premium' ? textAlign : undefined,
          startDate,
          endDate,
          payMethod: 'TRANSFER',
        },
      });

      // 시작일이 오늘이면 바로 노출됨
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(startDate!);
      const isImmediate = start <= today;

      if (isImmediate) {
        alert('광고가 바로 노출되었습니다!\n아래 계좌로 입금해주세요.');
      } else {
        alert('광고 신청이 완료되었습니다!\n아래 계좌로 입금 후 관리자 승인을 기다려주세요.');
      }
      navigate('/mypage');
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
              {s < step ? '✓' : s}
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
        </div>
      )}

      {/* Step 2: 날짜 선택 */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold mb-2">광고 기간 선택</h2>

          {/* 빠른 선택 */}
          <div className="flex gap-2">
            {(selectedSlot === 'premium' ? [
              { label: '1일', days: 1 },
              { label: '7일', days: 7 },
              { label: '30일', days: 30 },
            ] : [
              { label: '1개월', days: 30 },
              { label: '2개월', days: 60 },
              { label: '3개월', days: 90 },
            ]).map(({ label, days }) => (
              <button
                key={days}
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const start = tomorrow.toISOString().split('T')[0];
                  const end = new Date(tomorrow.getTime() + (days - 1) * 86400000)
                    .toISOString()
                    .split('T')[0];
                  handleDateSelect(start, end);
                }}
                className="flex-1 py-2 px-3 rounded-lg border border-gray-200 text-sm font-medium hover:border-sky-400 hover:text-sky-600 transition-all"
              >
                {label}
              </button>
            ))}
          </div>

          {/* 캘린더 */}
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <BookingCalendar
              unavailableDates={unavailableDates}
              selectedStart={startDate}
              selectedEnd={endDate}
              onSelectRange={handleDateSelect}
            />
          </div>

          {/* 선택된 기간 표시 */}
          {startDate && (
            <div className="bg-sky-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">시작일</span>
                  <div className="font-bold text-sky-700">{formatDate(startDate)}</div>
                </div>
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <div className="text-right">
                  <span className="text-sm text-gray-500">종료일</span>
                  <div className="font-bold text-sky-700">
                    {endDate ? formatDate(endDate) : '선택해주세요'}
                  </div>
                </div>
              </div>
              {endDate && currentPricing && (
                <div className="mt-3 pt-3 border-t border-sky-200 flex justify-between">
                  <span className="text-sm text-gray-600">
                    {totalDays}일 × {formatPrice(currentPricing.pricePerDay)}원
                  </span>
                  <span className="font-bold text-sky-700">
                    {formatPrice(totalPrice)}원
                  </span>
                </div>
              )}
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
            <label className="text-sm font-medium text-gray-600">광고 제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="광고 제목을 입력하세요"
              className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-sky-400 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">광고 설명 *</label>
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
                      value={url}
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
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-sky-400 outline-none"
              />
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

              {/* 미리보기 */}
              <div>
                <label className="text-sm font-medium text-gray-600">미리보기</label>
                <div className="mt-1 relative overflow-hidden rounded-xl bg-gray-100 border border-gray-200 aspect-[3.5/1]">
                  {imagePreview && (
                    <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className={`relative z-10 flex items-center h-full px-5 ${textAlign === 'center' ? 'justify-center text-center' : textAlign === 'right' ? 'justify-end text-right' : 'justify-start text-left'}`}>
                    <div>
                      <div className="text-[15px] font-bold" style={{ color: textColor }}>{title || '광고 제목'}</div>
                      <p className="text-sm opacity-80" style={{ color: textColor }}>{description || '광고 설명'}</p>
                    </div>
                  </div>
                </div>
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
              <span className="font-medium">
                {startDate && formatDate(startDate)} ~ {endDate && formatDate(endDate)} ({totalDays}일)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">단가</span>
              <span className="font-medium">{currentPricing && formatPrice(currentPricing.pricePerDay)}원/일</span>
            </div>
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
            const bank = import.meta.env.VITE_AD_DEPOSIT_BANK;
            const account = import.meta.env.VITE_AD_DEPOSIT_ACCOUNT;
            const holder = import.meta.env.VITE_AD_DEPOSIT_HOLDER;
            if (!bank || !account || !holder) {
              return (
                <div className="bg-yellow-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BankIcon size={18} className="text-gray-700" />
                    <span className="text-sm font-bold text-yellow-800">입금 계좌 안내</span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-2">
                    계좌 정보를 관리자에게 문의해주세요. (1:1 문의로 입금 계좌를 안내해드립니다.)
                  </p>
                  <Link to="/mypage/support" className="inline-block mt-2 px-3 py-1.5 bg-yellow-500 text-white rounded text-xs font-bold">1:1 문의하기</Link>
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
              '입금 완료 · 광고 신청하기'
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            입금 확인 후 관리자가 승인하면 광고가 바로 노출됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
