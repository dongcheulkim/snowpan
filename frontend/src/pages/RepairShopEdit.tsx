import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, uploadImages, imageUrl } from '../api';
import { CloseIcon } from '../components/Icons';

// 소유자 본인이 자기 정비샵 정보를 수정. 사업자등록증 재업로드 불필요.
const areas = ['서울', '경기', '강원', '충청', '경상', '전라'];

interface Shop {
  id: string;
  name: string; area: string; address: string; description: string;
  services: string | null; phone: string | null; instagram: string | null;
  website: string | null; naverMap: string | null; hours: string | null; image: string | null;
}

export default function RepairShopEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', area: '서울', address: '', description: '',
    services: '', phone: '', instagram: '', website: '', naverMap: '', hours: '',
  });

  useEffect(() => {
    if (!id) return;
    api<Shop[]>('/repair-shops/my')
      .then(shops => {
        const s = shops.find(x => x.id === id);
        if (!s) { navigate('/mypage/shops'); return; }
        setForm({
          name: s.name || '', area: s.area || '서울', address: s.address || '',
          description: s.description || '', services: s.services || '',
          phone: s.phone || '', instagram: s.instagram || '', website: s.website || '',
          naverMap: s.naverMap || '', hours: s.hours || '',
        });
        setExistingImage(s.image || null);
      })
      .catch(() => navigate('/mypage/shops'))
      .finally(() => setFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address || !form.description) { alert('상호명, 주소, 설명은 필수입니다.'); return; }
    setLoading(true);
    try {
      let image = existingImage;
      if (imageFile) { const urls = await uploadImages([imageFile]); image = urls[0]; }

      await api(`/repair-shops/${id}`, {
        method: 'PUT',
        body: { ...form, image: image || null },
      });
      alert('수정되었습니다!');
      navigate('/mypage/shops');
    } catch (err) {
      alert(err instanceof Error ? err.message : '수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-snow border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 transition-all";
  const labelClass = "block text-sm font-medium text-gray-500 mb-1.5";

  if (fetching) return <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>;

  const shownImage = imagePreview || (existingImage ? imageUrl(existingImage) : '');

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/mypage/shops" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">정비샵 수정</h1>
      </div>

      <div className="card p-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className={labelClass}>샵 대표 사진 <span className="text-xs text-gray-500">(선택)</span></label>
            {shownImage ? (
              <div className="relative">
                <img src={shownImage} alt="" className="w-full max-h-40 object-contain rounded-lg border border-gray-200" />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); setExistingImage(null); }} aria-label="제거" className="absolute -top-2 -right-2 min-w-11 min-h-11 w-11 h-11 inline-flex items-center justify-center"><span className="w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center"><CloseIcon size={12} /></span></button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                <span className="text-xs text-gray-500">사진 업로드</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }
                }} />
              </label>
            )}
          </div>

          <div>
            <label className={labelClass}>상호명 *</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>지역 *</label>
            <select name="area" value={form.area} onChange={handleChange} className={inputClass}>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>주소 *</label>
            <input type="text" name="address" value={form.address} onChange={handleChange} required className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>영업시간</label>
            <input type="text" name="hours" value={form.hours} onChange={handleChange} placeholder="예: 10:00~19:00 (월~토)" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>샵 소개 *</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} required className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className={labelClass}>서비스 종류 <span className="text-xs text-gray-500">(콤마로 구분)</span></label>
            <input type="text" name="services" value={form.services} onChange={handleChange} placeholder="예: 튜닝, 왁싱, 엣지, 바인딩, 부츠피팅" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>전화번호</label>
              <input type="tel" inputMode="tel" autoComplete="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="02-1234-5678" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>인스타그램</label>
              <input type="text" name="instagram" value={form.instagram} onChange={handleChange} placeholder="아이디만" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>홈페이지</label>
              <input type="url" name="website" value={form.website} onChange={handleChange} placeholder="https://" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>네이버지도</label>
              <input type="url" name="naverMap" value={form.naverMap} onChange={handleChange} placeholder="https://naver.me/..." className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Link to="/mypage/shops" className="flex-1 py-3 text-center bg-gray-100 text-gray-600 rounded-lg font-medium text-sm border border-gray-200">취소</Link>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-sky-500 text-white rounded-lg font-bold text-sm hover:bg-sky-600 transition-colors disabled:opacity-50">
              {loading ? '수정 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
