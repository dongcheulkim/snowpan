import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, uploadImages } from '../api';

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
}

const conditionOptions = ['새상품', '거의 새 거', '사용감 적음', '사용감 많음'];
const conditionToCode: Record<string, string> = { '새상품': '상', '거의 새 거': '상', '사용감 적음': '중', '사용감 많음': '하' };
const codeToCondition: Record<string, string> = { '상': '새상품', '중': '사용감 적음', '하': '사용감 많음' };

const UsedEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    subcategory: 'ski',
    brand: '',
    price: '',
    condition: '사용감 적음',
    usageCount: '',
    description: '',
  });

  useEffect(() => {
    if (!id) return;
    api<Product>(`/products/${id}`)
      .then(p => {
        setForm({
          name: p.name,
          subcategory: p.subcategory || 'ski',
          brand: p.brand || '',
          price: String(p.price),
          condition: codeToCondition[p.condition || '중'] || '사용감 적음',
          usageCount: p.usageCount?.replace('년식', '') || '',
          description: p.description || '',
        });
        const imgs = p.images
          ? p.images.split(',').filter(Boolean)
          : p.image?.startsWith('http') ? [p.image] : [];
        setExistingImages(imgs);
      })
      .catch(() => navigate('/mypage/sales'))
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
      let imageUrl = existingImages[0] || '';
      let allImageUrls = existingImages.join(',');

      if (imageFiles.length > 0) {
        const urls = await uploadImages(imageFiles);
        imageUrl = urls[0];
        allImageUrls = [...existingImages, ...urls].join(',');
      }

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
          usageCount: form.usageCount ? `${form.usageCount}년식` : undefined,
        },
      });
      alert('수정되었습니다!');
      navigate('/mypage/sales');
    } catch (err) {
      alert(err instanceof Error ? err.message : '수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-sky-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 transition-all";
  const labelClass = "block text-sm font-medium text-gray-500 mb-2";

  if (fetching) return <div className="text-center py-20 text-gray-400 text-sm">불러오는 중...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/mypage/sales" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 text-sm transition-colors mb-6">
        ← 판매 내역으로
      </Link>

      <div className="card rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">상품 수정</h1>
          <p className="text-sm text-gray-400">장비 정보를 수정해주세요</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* 기존 이미지 */}
          {existingImages.length > 0 && (
            <div>
              <label className={labelClass}>현재 이미지</label>
              <div className="flex gap-2 flex-wrap">
                {existingImages.map((src, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-sky-200 group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setExistingImages(existingImages.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >×</button>
                    {idx === 0 && <div className="absolute bottom-0 left-0 right-0 bg-sky-400 text-white text-[9px] text-center py-0.5">대표</div>}
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
              accept="image/jpeg,image/png"
              multiple
              id="photo-upload"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const total = existingImages.length + images.length;
                const remaining = 5 - total;
                if (remaining <= 0) { alert('사진은 최대 5장까지 가능합니다.'); return; }
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
              <div className="text-xs text-gray-400 mt-1">{existingImages.length + images.length}/5장</div>
            </label>
          </div>

          {/* 상품명 */}
          <div>
            <label className={labelClass}>상품명</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 카테고리 */}
            <div>
              <label className={labelClass}>카테고리</label>
              <select name="subcategory" value={form.subcategory} onChange={handleChange} className={inputClass}>
                <option value="ski">스키</option>
                <option value="board">보드</option>
                <option value="boots">부츠</option>
                <option value="binding">바인딩</option>
                <option value="helmet">헬멧</option>
                <option value="goggles">고글</option>
                <option value="wear">의류</option>
                <option value="etc">기타</option>
              </select>
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
            <input type="number" name="price" value={form.price} onChange={handleChange} required className={inputClass} />
          </div>

          {/* 설명 */}
          <div>
            <label className={labelClass}>상세 설명</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={5} className={`${inputClass} resize-none`} />
          </div>

          <div className="flex gap-3 pt-2">
            <Link to="/mypage/sales" className="flex-1 py-3.5 text-center bg-gray-100 text-gray-500 rounded-lg font-medium text-sm border border-sky-200 hover:bg-gray-200 transition-colors">
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
