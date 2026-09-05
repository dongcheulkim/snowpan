import { toastSuccess, toastError } from '../components/Toast';
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, uploadImages, imageUrl } from '../api';
import { useVertical } from '../hooks/useVertical';
import { SNOW_USED_GROUPS } from '../config/verticals';

interface Product {
  id: string;
  name: string;
  brand: string;
  subcategory: string | null;
  price: number;
  image: string;
  images: string | null;
  description: string | null;
  condition: string | null;
  usageCount: string | null;
  tradeMethod?: string | null;
  location?: string | null;
}

// 백엔드는 '상/중/하' 3단계만 사용 (UsedRegister 와 동일). '상중' 은 미지원 —
// 이전 Edit 매핑이 '거의 새 거'→'상중' 으로 저장해 데이터·라벨 손상시키던 것 수정.
const conditionOptions = ['새상품', '거의 새 거', '사용감 적음', '사용감 많음'];
const conditionToCode: Record<string, string> = { '새상품': '상', '거의 새 거': '상', '사용감 적음': '중', '사용감 많음': '하' };
const codeToCondition: Record<string, string> = { '상': '새상품', '중': '사용감 적음', '하': '사용감 많음' };

const UsedEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // 판(vertical)별 카테고리·링크 — run 매물 수정 시 스키 카테고리로 덮어쓰는 버그 방지.
  const vertical = useVertical();
  const isSnow = vertical.slug === 'snow';
  const vbase = isSnow ? '' : vertical.basePath;
  const backTo = isSnow ? '/mypage/sales' : `${vbase}/used`;
  const subcategories = vertical.usedSubcategories || [];
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    subcategory: '',
    brand: '',
    price: '',
    condition: '사용감 적음',
    usageCount: '',
    description: '',
    tradeMethod: '직거래',
    location: '',
  });

  useEffect(() => {
    if (!id) return;
    api<Product>(`/products/${id}`)
      .then(p => {
        setForm({
          name: p.name,
          subcategory: p.subcategory || (subcategories[0]?.id ?? 'ski'),
          brand: p.brand || '',
          price: String(p.price),
          condition: codeToCondition[p.condition || '중'] || '사용감 적음',
          usageCount: p.usageCount?.replace('년식', '') || '',
          description: p.description || '',
          tradeMethod: p.tradeMethod || '직거래',
          location: p.location || '',
        });
        const imgs = p.images
          ? p.images.split(',').filter(Boolean)
          : (p.image && (p.image.startsWith('http') || p.image.startsWith('/'))) ? [p.image] : [];
        setExistingImages(imgs);
      })
      .catch(() => navigate(backTo))
      .finally(() => setFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (existingImages.length === 0 && imageFiles.length === 0) {
        toastError('이미지를 최소 1장 등록해주세요.');
        setLoading(false);
        return;
      }

      let allImageUrls = existingImages.join(',');
      if (imageFiles.length > 0) {
        const urls = await uploadImages(imageFiles);
        allImageUrls = [...existingImages, ...urls].join(',');
      }
      // 대표 이미지 = 갤러리 첫 장 (기존이 있으면 기존, 없으면 새로 올린 첫 장).
      // 이전엔 새 파일 추가 시 무조건 urls[0] 이라 썸네일≠갤러리첫장 불일치.
      const allList = allImageUrls.split(',').filter(Boolean);
      const imageUrl = allList[0] || '';

      await api(`/products/${id}`, {
        method: 'PUT',
        body: {
          name: form.name,
          subcategory: form.subcategory,
          brand: form.brand,
          price: form.price,
          image: imageUrl,
          images: allImageUrls || undefined,
          description: form.description,
          condition: conditionToCode[form.condition] || '중',
          // 비우면 null 로 보내 서버에서 지움 (undefined 는 "변경 없음"이라 옛 연식이 남았음)
          usageCount: form.usageCount ? `${form.usageCount}년식` : null,
          tradeMethod: form.tradeMethod,
          location: form.location.trim() || null,
        },
      });
      toastSuccess('수정되었습니다!');
      navigate(backTo);
    } catch (err) {
      toastError(err instanceof Error ? err.message : '수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-snow border border-sky-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 transition-all";
  const labelClass = "block text-sm font-medium text-gray-500 mb-2";

  if (fetching) return <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to={backTo} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm transition-colors mb-6">
        ← 판매 내역으로
      </Link>

      <div className="card rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">상품 수정</h1>
          <p className="text-sm text-gray-500">장비 정보를 수정해주세요</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* 기존 이미지 */}
          {existingImages.length > 0 && (
            <div>
              <label className={labelClass}>현재 이미지</label>
              <div className="flex gap-2 flex-wrap">
                {existingImages.map((src, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-sky-200">
                    <img src={imageUrl(src)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setExistingImages(existingImages.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center"
                    >×</button>
                    <div className="absolute bottom-0 inset-x-0 flex justify-between px-0.5 pb-0.5">
                      {idx > 0 ? (
                        <button type="button" onClick={() => setExistingImages(a => { const b = [...a]; [b[idx-1], b[idx]] = [b[idx], b[idx-1]]; return b; })} className="w-5 h-5 bg-black/55 text-white rounded-full text-[11px] flex items-center justify-center" aria-label="왼쪽으로">‹</button>
                      ) : <span />}
                      {idx < existingImages.length - 1 ? (
                        <button type="button" onClick={() => setExistingImages(a => { const b = [...a]; [b[idx+1], b[idx]] = [b[idx], b[idx+1]]; return b; })} className="w-5 h-5 bg-black/55 text-white rounded-full text-[11px] flex items-center justify-center" aria-label="오른쪽으로">›</button>
                      ) : <span />}
                    </div>
                    {idx === 0 && <div className="absolute top-0 left-0 bg-sky-400 text-white text-[9px] px-1 py-0.5 rounded-br">대표</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 새 이미지 추가 */}
          <div>
            <label className={labelClass}>이미지 추가</label>
            <input
              type="file"
              accept="image/*"
              multiple
              id="photo-upload"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const total = existingImages.length + images.length;
                const remaining = 10 - total;
                if (remaining <= 0) { toastError('사진은 최대 10장까지 가능합니다.'); return; }
                files.slice(0, remaining).forEach(file => {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setImages(prev => [...prev, ev.target?.result as string]);
                    setImageFiles(prev => [...prev, file]);
                  };
                  reader.readAsDataURL(file);
                });
                e.target.value = '';
              }}
            />
            {images.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {images.map((src, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-sky-200 group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImages(images.filter((_, i) => i !== idx)); setImageFiles(imageFiles.filter((_, i) => i !== idx)); }}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <label htmlFor="photo-upload" className="bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed border-sky-200 hover:border-sky-400 transition-all cursor-pointer block">
              <div className="text-sm text-gray-500">클릭하여 사진 추가</div>
              <div className="text-xs text-gray-500 mt-1">{existingImages.length + images.length}/10장</div>
            </label>
          </div>

          {/* 상품명 */}
          <div>
            <label className={labelClass}>상품명</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 카테고리 — 대분류 칩 → 소분류 칩 2단계 (snow). 다른 vertical 은 기존 셀렉트 */}
            <div className={isSnow ? 'col-span-2' : undefined}>
              <label className={labelClass}>카테고리</label>
              {isSnow ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {SNOW_USED_GROUPS.map((g) => {
                      const on = g.subs.includes(form.subcategory);
                      return (
                        <button key={g.id} type="button" onClick={() => setForm({ ...form, subcategory: g.subs[0] })}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${on ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(SNOW_USED_GROUPS.find((g) => g.subs.includes(form.subcategory))?.subs || subcategories.map((sc) => sc.id)).map((id) => {
                      const c = subcategories.find((sc) => sc.id === id);
                      if (!c) return null;
                      return (
                        <button key={id} type="button" onClick={() => setForm({ ...form, subcategory: id })}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${form.subcategory === id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <select name="subcategory" value={form.subcategory} onChange={handleChange} className={inputClass}>
                  {subcategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              )}
            </div>

            {/* 브랜드 */}
            <div>
              <label className={labelClass}>브랜드</label>
              <input type="text" name="brand" value={form.brand} onChange={handleChange} placeholder="예: Rossignol" className={inputClass} />
            </div>
          </div>

          {/* 연식 */}
          <div>
            <label className={labelClass}>연식</label>
            <input type="text" name="usageCount" value={form.usageCount} onChange={handleChange} placeholder="예: 2022" className={inputClass} />
          </div>

          {/* 거래 방식 · 직거래 지역 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>거래 방식</label>
              <select name="tradeMethod" value={form.tradeMethod} onChange={handleChange} className={inputClass}>
                {['직거래', '택배', '둘 다 가능'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>직거래 지역</label>
              <input type="text" name="location" value={form.location} onChange={handleChange} placeholder="예: 서울 강남구" className={inputClass} />
            </div>
          </div>

          {/* 상태 */}
          <div>
            <label className={labelClass}>상태</label>
            <select name="condition" value={form.condition} onChange={handleChange} className={inputClass}>
              {conditionOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* 가격 */}
          <div>
            <label className={labelClass}>판매 가격 (원)</label>
            <input type="text" inputMode="numeric" name="price" value={form.price ? Number(form.price).toLocaleString() : ''} onChange={e => setForm({ ...form, price: e.target.value.replace(/[^0-9]/g, '') })} required className={inputClass} />
          </div>

          {/* 설명 */}
          <div>
            <label className={labelClass}>상세 설명</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={5} className={`${inputClass} resize-none`} />
          </div>

          <div className="flex gap-3 pt-2">
            <Link to={backTo} className="flex-1 py-3.5 text-center bg-gray-100 text-gray-600 rounded-lg font-medium text-sm border border-sky-200 hover:bg-gray-200 transition-colors">
              취소
            </Link>
            <button type="submit" disabled={loading} className="flex-1 py-3.5 bg-sky-400 text-white rounded-lg font-bold text-sm hover:bg-sky-500 transition-colors active:scale-[0.98] disabled:opacity-50">
              {loading ? '수정 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsedEdit;
