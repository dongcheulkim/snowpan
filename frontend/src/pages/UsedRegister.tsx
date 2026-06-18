import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, uploadImages } from '../api';
import { useUnloadGuard } from '../hooks/useUnloadGuard';
import { toastSuccess, toastError } from '../components/Toast';
import MarketPriceBadge from '../components/MarketPriceBadge';

const UsedRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    name: '',
    subcategory: 'ski',
    brand: '',
    size: '',
    length: '',
    radius: '',
    flex: '',
    year: '',
    condition: '새상품',
    price: '',
    tradeMethod: '둘 다 가능',
    location: '',
    description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const isDirty = !loading && (
    form.name.trim() !== '' ||
    form.brand.trim() !== '' ||
    form.price !== '' ||
    form.description.trim() !== '' ||
    imageFiles.length > 0
  );
  useUnloadGuard(isDirty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toastError('중고거래 주의사항에 동의해주세요.');
      return;
    }
    if (imageFiles.length === 0) {
      toastError('상품 사진을 최소 1장 업로드해주세요.');
      return;
    }

    const user = getUser();
    if (!user) {
      toastError('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    setLoading(true);

    // 사진 1장 이상 업로드 강제 (위에서 이미 검증). 외부 placeholder 의존 제거.
    // 백엔드/노출 라벨 통일: 상/중/하 3단계만 유효. "상중" 같은 사이값은 사용 안 함.
    const conditionMap: Record<string, string> = { '새상품': '상', '거의 새 거': '상', '사용감 적음': '중', '사용감 많음': '하' };

    try {
      const urls = await uploadImages(imageFiles);
      if (urls.length === 0) {
        toastError('사진 업로드에 실패했습니다. 다시 시도해주세요.');
        setLoading(false);
        return;
      }
      const imgUrl = urls[0];
      const allImageUrls = urls.join(',');

      await api('/products/used', {
        method: 'POST',
        body: {
          name: form.name,
          brand: form.brand,
          subcategory: form.subcategory,
          price: form.price,
          image: imgUrl,
          images: allImageUrls || undefined,
          description: form.description,
          condition: conditionMap[form.condition] || '중',
          usageCount: form.year ? `${form.year}년식` : undefined,
          length: form.length || undefined,
          radius: form.radius || undefined,
          flex: form.flex || undefined,
          size: form.size || undefined,
        },
      });
      toastSuccess('장비가 등록되었습니다!');
      navigate('/used');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-snow border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-accent/50 transition-all";
  const labelClass = "block text-sm font-medium text-gray-500 mb-2";

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/used" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm transition-colors mb-6">
        ← 중고 장비 목록
      </Link>

      <div className="card rounded-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">중고 장비 등록</h1>
          <p className="text-sm text-gray-500">판매할 장비 정보를 입력해주세요</p>
        </div>

        {(() => {
          const steps = [
            { label: '사진·기본정보', done: imageFiles.length > 0 && form.name.trim() !== '' && form.brand.trim() !== '' },
            { label: '스펙·상태', done: form.condition !== '' && (form.size !== '' || form.length !== '') },
            { label: '가격·거래', done: form.price !== '' && form.description.trim() !== '' && agreed },
          ];
          const completed = steps.filter(s => s.done).length;
          const pct = Math.round((completed / steps.length) * 100);
          return (
            <div className="mb-7">
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-gray-500">진행 {completed}/{steps.length}</span>
                <span className="font-bold text-accent">{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              {/* 스텝 라벨 — 좁은 화면 (≤ 375px) 에선 번호 원 + 현재 스텝만 노출해서 overflow 방지 */}
              <div className="hidden sm:flex justify-between mt-2">
                {steps.map((s, i) => (
                  <span key={i} className={`text-[10px] ${s.done ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                    {`${i + 1}. `}{s.label}
                  </span>
                ))}
              </div>
              <div className="flex sm:hidden items-center justify-between mt-2 gap-2">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${s.done ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {i + 1}
                    </span>
                    {/* 활성 스텝 (첫 미완료) 라벨만 표시, 나머지는 번호만 */}
                    {(completed === i && !s.done) && (
                      <span className="text-[10px] text-gray-900 font-bold truncate">{s.label}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* 사진 업로드 영역 */}
          <div>
            <label className={labelClass}>사진</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              id="photo-upload"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const remaining = 5 - images.length;
                if (remaining <= 0) { toastError('사진은 최대 5장까지 가능합니다.'); return; }
                const MAX_SIZE = 5 * 1024 * 1024; // 5MB
                const tooBig = files.filter(f => f.size > MAX_SIZE);
                if (tooBig.length > 0) {
                  toastError(`다음 파일이 5MB를 초과합니다: ${tooBig.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(', ')}. 이미지 크기를 줄여서 다시 시도해주세요.`);
                  e.target.value = '';
                  return;
                }
                const toProcess = files.slice(0, remaining);
                toProcess.forEach((file) => {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setImages((prev) => {
                      if (prev.length >= 5) return prev;
                      return [...prev, ev.target?.result as string];
                    });
                    setImageFiles((prev) => [...prev, file]);
                  };
                  reader.readAsDataURL(file);
                });
                e.target.value = '';
              }}
            />
            {images.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {images.map((src, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 group">
                    <img src={src} alt={`미리보기 ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImages(images.filter((_, i) => i !== idx)); setImageFiles(imageFiles.filter((_, i) => i !== idx)); }}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >×</button>
                    {idx === 0 && <div className="absolute bottom-0 left-0 right-0 bg-accent text-white text-[9px] text-center py-0.5">대표</div>}
                  </div>
                ))}
              </div>
            )}
            <label
              htmlFor="photo-upload"
              className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 hover:border-accent/50 transition-all cursor-pointer block"
            >
              <div className="text-sm text-gray-500">클릭하여 사진을 업로드하세요</div>
              <div className="text-xs text-gray-500 mt-1">{images.length}/5장 · JPG, PNG</div>
            </label>
          </div>

          {/* 상품명 */}
          <div>
            <label className={labelClass}>상품명 <span className="text-gray-500 text-xs font-normal">(한글로 써주시는게 좋아요!)</span></label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="예: 로시뇰 소울 7 (2022)"
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 카테고리 */}
            <div>
              <label className={labelClass}>카테고리</label>
              <select
                name="subcategory"
                value={form.subcategory}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="ski" className="bg-snow">스키</option>
                <option value="board" className="bg-snow">보드</option>
                <option value="ski_boots" className="bg-snow">스키부츠</option>
                <option value="board_boots" className="bg-snow">보드부츠</option>
                <option value="binding" className="bg-snow">바인딩</option>
                <option value="wear" className="bg-snow">스키복</option>
                <option value="pole" className="bg-snow">폴</option>
                <option value="helmet" className="bg-snow">헬멧</option>
                <option value="goggles" className="bg-snow">고글</option>
                <option value="gloves" className="bg-snow">장갑</option>
                <option value="bag" className="bg-snow">가방</option>
                <option value="accessory" className="bg-snow">악세사리</option>
                <option value="etc" className="bg-snow">기타</option>
              </select>
            </div>

            {/* 브랜드 */}
            <div>
              <label className={labelClass}>브랜드</label>
              <input
                type="text"
                name="brand"
                value={form.brand}
                onChange={handleChange}
                placeholder={form.subcategory === 'helmet' || form.subcategory === 'goggles' ? '예: 오클리' : form.subcategory === 'board' ? '예: SG' : '예: 피셔'}
                className={inputClass}
              />
            </div>
          </div>

          {/* 스펙 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                {['ski', 'board', 'pole'].includes(form.subcategory) ? '사이즈/길이' :
                 form.subcategory === 'binding' ? '바인딩 강도' : '사이즈'}
              </label>
              <input
                type="text"
                name="size"
                value={form.size}
                onChange={handleChange}
                placeholder={
                  ['ski', 'board'].includes(form.subcategory) ? '예: 170cm' :
                  form.subcategory === 'pole' ? '예: 120cm' :
                  form.subcategory === 'binding' ? '예: 16' :
                  ['boots', 'ski_boots', 'board_boots'].includes(form.subcategory) ? '예: 265mm' :
                  '예: L'
                }
                className={inputClass}
              />
            </div>
            {form.subcategory === 'ski' && (
              <div>
                <label className={labelClass}>회전반경(R)</label>
                <input type="text" name="radius" value={form.radius} onChange={handleChange} placeholder="예: 18m" className={inputClass} />
              </div>
            )}
            {['boots', 'ski_boots', 'board_boots'].includes(form.subcategory) && (
              <div>
                <label className={labelClass}>플렉스</label>
                <input type="text" name="flex" value={form.flex} onChange={handleChange} placeholder="예: 130" className={inputClass} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">

            {/* 연식 */}
            <div>
              <label className={labelClass}>연식</label>
              <input
                type="text"
                name="year"
                value={form.year}
                onChange={handleChange}
                placeholder="예: 25-26"
                className={inputClass}
              />
            </div>
          </div>

          {/* 상태 */}
          <div>
            <label className={labelClass}>상태</label>
            <select
              name="condition"
              value={form.condition}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="새상품">새상품</option>
              <option value="거의 새 거">거의 새 거</option>
              <option value="사용감 적음">사용감 적음</option>
              <option value="사용감 많음">사용감 많음</option>
            </select>
          </div>

          {/* 판매 가격 */}
          <div>
            <label className={labelClass}>판매 가격 (원)</label>
            <input
              type="text"
              inputMode="numeric"
              name="price"
              value={form.price ? Number(form.price).toLocaleString() : ''}
              onChange={e => setForm({ ...form, price: e.target.value.replace(/[^0-9]/g, '') })}
              placeholder="예: 450,000"
              required
              className={inputClass}
            />
            {form.price && Number(form.price) > 0 && (
              <MarketPriceBadge
                subcategory={form.subcategory}
                brand={form.brand}
                price={Number(form.price)}
                variant="inline"
              />
            )}
          </div>

          {/* 거래 방법 */}
          <div>
            <label className={labelClass}>거래 방법</label>
            <div className="flex gap-2">
              {['직거래', '택배', '둘 다 가능'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setForm({ ...form, tradeMethod: method })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    form.tradeMethod === method
                      ? 'bg-accent text-white'
                      : 'bg-snow text-gray-500 border border-gray-300 active:bg-gray-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* 직거래 지역 (직거래 시) */}
          {form.tradeMethod !== '택배' && (
            <div>
              <label className={labelClass}>직거래 지역</label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="예: 서울 강남구"
                required
                className={inputClass}
              />
            </div>
          )}

          {/* 상세 설명 */}
          <div>
            <label className={labelClass}>상세 설명</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="장비의 상태, 특이사항, 거래 방법 등을 자세히 적어주세요."
              rows={5}
              required
              className={`${inputClass} resize-none`}
            />
          </div>


          {/* 중고거래 주의사항 */}
          <div className="bg-snow border border-gray-200 rounded-xl p-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowRules(!showRules)}
              className="flex items-center justify-between w-full"
            >
              <span className="text-sm font-bold text-gray-700">중고거래 주의사항</span>
              <span className="text-gray-500 text-xs">{showRules ? '접기 ▲' : '펼치기 ▼'}</span>
            </button>
            {showRules && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed space-y-2">
                <p className="font-semibold text-gray-700">아래 사항을 반드시 확인해주세요.</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><span className="font-medium text-gray-600">허위 매물 금지</span> — 실제 보유하지 않은 장비, 허위 사진·가격 등록 시 즉시 삭제 및 이용 제한</li>
                  <li><span className="font-medium text-gray-600">정확한 상태 기재</span> — 스크래치, 수리 이력, 사용 횟수 등 상품 상태를 정확히 기재해야 합니다</li>
                  <li><span className="font-medium text-gray-600">직거래 안전 거래</span> — 공공장소에서 거래하고, 현금 선송금 요구에 주의하세요</li>
                  <li><span className="font-medium text-gray-600">택배 거래 시</span> — 안전결제(에스크로) 이용을 권장하며, 분쟁 발생 시 증빙자료를 보관하세요</li>
                  <li><span className="font-medium text-gray-600">사기 피해 주의</span> — 시세보다 지나치게 저렴한 매물, 급매를 빙자한 선입금 요구에 주의하세요</li>
                  <li><span className="font-medium text-gray-600">개인정보 보호</span> — 게시글에 연락처, 계좌번호 등 개인정보를 직접 노출하지 마세요</li>
                  <li><span className="font-medium text-gray-600">플랫폼 책임 범위</span> — 스노우판은 통신판매중개자로서 거래 당사자가 아니며, 거래에 대한 책임은 판매자·구매자에게 있습니다</li>
                </ul>
                <p className="text-[11px] text-gray-500 pt-1">전자상거래법 제20조에 의거, 통신판매중개자는 거래 당사자가 아님을 고지합니다.</p>
              </div>
            )}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-sky-500 mt-0.5"
              />
              <span className="text-xs text-gray-600">
                위 중고거래 주의사항과 <Link to="/mypage/terms" target="_blank" className="text-sky-600 underline">이용약관</Link> 및 <Link to="/privacy" target="_blank" className="text-sky-600 underline">개인정보처리방침</Link>에 동의합니다.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-lg font-bold text-sm transition-all active:scale-[0.98] mt-2 ${
              agreed
                ? 'bg-accent text-white hover:bg-accent-light'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                등록 중...
              </span>
            ) : (
              '장비 등록하기'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UsedRegister;
