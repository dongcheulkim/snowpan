import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, uploadImages, getUser } from '../api';
import { useUnloadGuard } from '../hooks/useUnloadGuard';
import { ClipboardIcon, CloseIcon } from '../components/Icons';

const areas = ['강원', '경기', '서울', '충청', '경상', '전라'];
const resorts = [
  '용평리조트', '웰리힐리파크', '하이원리조트', '휘닉스평창',
  '곤지암리조트', '비발디파크', '엘리시안강촌', '지산리조트',
  '오크밸리', '무주덕유산', '에덴밸리', '기타/없음',
];

export default function SkiShopRegister() {
  const navigate = useNavigate();
  const user = getUser();
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [form, setForm] = useState({
    name: '', area: '강원', resort: '', address: '', description: '',
    brands: '', phone: '', instagram: '', website: '', naverMap: '', hours: '',
  });

  useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const isDirty = !loading && (
    form.name.trim() !== '' || form.address.trim() !== '' || form.description.trim() !== '' || form.brands.trim() !== '' || licenseFile !== null || imageFile !== null
  );
  useUnloadGuard(isDirty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseFile) { alert('사업자등록증을 업로드해주세요.'); return; }
    if (!form.name || !form.address || !form.description) { alert('상호명, 주소, 설명은 필수입니다.'); return; }

    setLoading(true);
    try {
      const licenseUrls = await uploadImages([licenseFile]);
      let shopImage = '';
      if (imageFile) {
        const urls = await uploadImages([imageFile]);
        shopImage = urls[0];
      }

      await api('/ski-shops', {
        method: 'POST',
        body: {
          ...form,
          resort: form.resort === '기타/없음' ? null : form.resort || null,
          image: shopImage || null,
          businessLicense: licenseUrls[0],
        },
      });

      alert('스키샵 등록이 완료되었습니다!\n관리자 승인 후 게시됩니다.');
      navigate('/new-equipment');
    } catch (err) {
      alert(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 transition-all";
  const labelClass = "block text-sm font-medium text-gray-500 mb-1.5";

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/new-equipment" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">스키샵 등록</h1>
      </div>

      <div className="card p-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* 사업자등록증 */}
          <div>
            <label className={labelClass}>사업자등록증 * <span className="text-xs text-gray-500">(필수)</span></label>
            {licensePreview ? (
              <div className="relative">
                <img src={licensePreview} alt="" className="w-full max-h-48 object-contain rounded-lg border border-gray-200" />
                <button type="button" onClick={() => { setLicenseFile(null); setLicensePreview(''); }} aria-label="제거" className="absolute -top-2 -right-2 min-w-11 min-h-11 w-11 h-11 inline-flex items-center justify-center"><span className="w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center"><CloseIcon size={12} /></span></button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-sky-300 rounded-lg cursor-pointer hover:border-sky-500 transition-colors bg-sky-50/50">
                <ClipboardIcon size={28} className="text-gray-500 mb-1" />
                <span className="text-xs text-sky-600 font-medium">사업자등록증 사진 업로드</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setLicenseFile(f); setLicensePreview(URL.createObjectURL(f)); }
                }} />
              </label>
            )}
          </div>

          {/* 샵 대표 이미지 */}
          <div>
            <label className={labelClass}>샵 대표 사진 <span className="text-xs text-gray-500">(선택)</span></label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="" className="w-full max-h-40 object-contain rounded-lg border border-gray-200" />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); }} aria-label="제거" className="absolute -top-2 -right-2 min-w-11 min-h-11 w-11 h-11 inline-flex items-center justify-center"><span className="w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center"><CloseIcon size={12} /></span></button>
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
            <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="예: 용평 스키프로샵" required className={inputClass} />
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
            <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="예: 강원도 평창군 대관령면 올림픽로 715" required className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>영업시간</label>
            <input type="text" name="hours" value={form.hours} onChange={handleChange} placeholder="예: 08:30~18:00 (시즌 중 매일)" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>샵 소개 *</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="어떤 서비스를 제공하는지 소개해주세요" required className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className={labelClass}>취급 브랜드 <span className="text-xs text-gray-500">(콤마로 구분)</span></label>
            <input type="text" name="brands" value={form.brands} onChange={handleChange} placeholder="예: Rossignol, Atomic, Salomon" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>전화번호</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="033-335-1234" className={inputClass} />
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

          <label className="flex items-start gap-2 py-2">
            <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} className="w-4 h-4 accent-sky-500 mt-0.5" />
            <span className="text-xs text-gray-500">
              <Link to="/mypage/terms" target="_blank" className="text-sky-600 underline">이용약관</Link> 및 <Link to="/privacy" target="_blank" className="text-sky-600 underline">개인정보처리방침</Link>에 동의합니다.
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <Link to="/new-equipment" className="flex-1 py-3 text-center bg-gray-100 text-gray-600 rounded-lg font-medium text-sm border border-gray-200">취소</Link>
            <button type="submit" disabled={loading || !agreeTerms} className="flex-1 py-3 bg-sky-500 text-white rounded-lg font-bold text-sm hover:bg-sky-600 transition-colors disabled:opacity-50">
              {loading ? '등록 중...' : '등록 신청'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
