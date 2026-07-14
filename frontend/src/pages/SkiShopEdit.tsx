import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, uploadImages, imageUrl } from '../api';
import { CloseIcon } from '../components/Icons';

// 소유자 본인이 자기 스키샵 정보를 수정. 사업자등록증은 재업로드 불필요(등록 시 검증 완료).
const areas = ['강원', '경기', '서울', '충청', '경상', '전라'];
const resorts = [
  '용평리조트', '웰리힐리파크', '하이원리조트', '휘닉스평창',
  '곤지암리조트', '비발디파크', '엘리시안강촌', '지산리조트',
  '오크밸리', '무주덕유산', '에덴밸리', '기타/없음',
];

interface Shop {
  id: string;
  name: string; area: string; resort: string | null; address: string; description: string;
  brands: string | null; phone: string | null; instagram: string | null;
  website: string | null; naverMap: string | null; hours: string | null; image: string | null;
}

export default function SkiShopEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', area: '강원', resort: '', address: '', description: '',
    brands: '', phone: '', instagram: '', website: '', naverMap: '', hours: '',
  });

  useEffect(() => {
    if (!id) return;
    // 내 매장 목록에서 찾기 — 미승인 매장도 편집 가능(공개 GET 은 승인된 것만 반환).
    api<Shop[]>('/ski-shops/my')
      .then(shops => {
        const s = shops.find(x => x.id === id);
        if (!s) { navigate('/mypage/shops'); return; }
        setForm({
          name: s.name || '', area: s.area || '강원', resort: s.resort || '',
          address: s.address || '', description: s.description || '', brands: s.brands || '',
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

      await api(`/ski-shops/${id}`, {
        method: 'PUT',
        body: {
          ...form,
          resort: form.resort === '기타/없음' ? null : form.resort || null,
          image: image || null,
        },
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
        <h1 className="text-xl font-bold text-gray-900">스키샵 수정</h1>
      </div>

      <div className="card p-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* 샵 대표 이미지 */}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>지역 *</label>
              <select name="area" value={form.area} onChange={handleChange} className={inputClass}>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>소속 스키장</label>
              <select name="resort" value={form.resort} onChange={handleChange} className={inputClass}>
                <option value="">선택 안 함</option>
                {resorts.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>주소 *</label>
            <input type="text" name="address" value={form.address} onChange={handleChange} required className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>영업시간</label>
            <input type="text" name="hours" value={form.hours} onChange={handleChange} placeholder="예: 08:30~18:00 (시즌 중 매일)" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>샵 소개 *</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} required className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className={labelClass}>취급 브랜드 <span className="text-xs text-gray-500">(콤마로 구분)</span></label>
            <input type="text" name="brands" value={form.brands} onChange={handleChange} placeholder="예: Rossignol, Atomic, Salomon" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>전화번호</label>
              <input type="tel" inputMode="tel" autoComplete="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="033-335-1234" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>인스타그램</label>
              <input type="text" name="instagram" value={form.instagram} onChange={handleChange} placeholder="아이디만 입력" className={inputClass} />
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
