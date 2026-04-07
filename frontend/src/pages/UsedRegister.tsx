import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, uploadImages } from '../api';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      alert('중고거래 주의사항에 동의해주세요.');
      return;
    }

    const user = getUser();
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    setLoading(true);

    const imageMap: Record<string, string> = { ski: '🎿', board: '🏂', boots: '🥾', binding: '⛓️', helmet: '⛑️', goggles: '🥽', wear: '🧥', etc: '📦' };
    const conditionMap: Record<string, string> = { '새상품': '상', '거의 새 거': '상중', '사용감 적음': '중', '사용감 많음': '하' };

    try {
      let imgUrl = imageMap[form.subcategory] || '📦';
      let allImageUrls = '';
      if (imageFiles.length > 0) {
        const urls = await uploadImages(imageFiles);
        if (urls.length > 0) {
          imgUrl = urls[0];
          allImageUrls = urls.join(',');
        }
      }

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
      alert('장비가 등록되었습니다!');
      navigate('/used');
    } catch (err) {
      alert(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-accent/50 transition-all";
  const labelClass = "block text-sm font-medium text-gray-500 mb-2";

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/used" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 text-sm transition-colors mb-6">
        ← 중고 장비 목록
      </Link>

      <div className="card rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">중고 장비 등록</h1>
          <p className="text-sm text-gray-400">판매할 장비 정보를 입력해주세요</p>
        </div>

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
                if (remaining <= 0) { alert('사진은 최대 5장까지 가능합니다.'); return; }
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
              <div className="text-xs text-gray-400 mt-1">{images.length}/5장 · JPG, PNG</div>
            </label>
          </div>

          {/* 상품명 */}
          <div>
            <label className={labelClass}>상품명 <span className="text-gray-400 text-xs font-normal">(한글로 써주시는게 좋아요!)</span></label>
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
                <option value="ski" className="bg-white">스키</option>
                <option value="board" className="bg-white">보드</option>
                <option value="boots" className="bg-white">부츠</option>
                <option value="binding" className="bg-white">바인딩</option>
                <option value="helmet" className="bg-white">헬멧</option>
                <option value="goggles" className="bg-white">고글</option>
                <option value="wear" className="bg-white">의류</option>
                <option value="etc" className="bg-white">기타</option>
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
                placeholder="예: 피셔"
                className={inputClass}
              />
            </div>
          </div>

          {/* 스펙 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>사이즈/길이</label>
              <input type="text" name="size" value={form.size} onChange={handleChange} placeholder={['ski', 'board'].includes(form.subcategory) ? '예: 170cm' : '예: 265mm'} className={inputClass} />
            </div>
            {form.subcategory === 'ski' && (
              <div>
                <label className={labelClass}>회전반경</label>
                <input type="text" name="radius" value={form.radius} onChange={handleChange} placeholder="예: 14m" className={inputClass} />
              </div>
            )}
            {form.subcategory === 'boots' && (
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
                placeholder="예: 2022"
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
              placeholder="450,000"
              required
              className={inputClass}
            />
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
                      : 'bg-white text-gray-500 border border-gray-300 active:bg-gray-50'
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
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowRules(!showRules)}
              className="flex items-center justify-between w-full"
            >
              <span className="text-sm font-bold text-gray-700">중고거래 주의사항</span>
              <span className="text-gray-400 text-xs">{showRules ? '접기 ▲' : '펼치기 ▼'}</span>
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
                <p className="text-[11px] text-gray-400 pt-1">전자상거래법 제20조에 의거, 통신판매중개자는 거래 당사자가 아님을 고지합니다.</p>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-sky-500"
              />
              <span className="text-xs text-gray-600">위 중고거래 주의사항을 확인했으며 동의합니다.</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-lg font-bold text-sm transition-all active:scale-[0.98] mt-2 ${
              agreed
                ? 'bg-accent text-white hover:bg-accent-light'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
