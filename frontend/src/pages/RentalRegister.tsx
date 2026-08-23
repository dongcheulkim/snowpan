import { toastSuccess, toastError } from '../components/Toast';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, uploadImages } from '../api';
import { useUnloadGuard } from '../hooks/useUnloadGuard';
import MultiImageUpload from '../components/MultiImageUpload';

interface Resort { id: string; name: string }

const AREAS = ['강원', '경기', '서울', '충청', '경상', '전라'];

const RentalRegister = () => {
  const navigate = useNavigate();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [images, setImages] = useState('');
  const [bizLicenseFile, setBizLicenseFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: '', area: '강원', resortId: '', address: '', phone: '', hours: '',
    brands: '', description: '', website: '', instagram: '', naverMap: '',
  });

  useEffect(() => { api<Resort[]>('/resorts').then(setResorts).catch(() => {}); }, []);

  const isDirty = !loading && (form.name.trim() !== '' || form.address !== '' || form.description.trim() !== '' || images !== '' || bizLicenseFile !== null);
  useUnloadGuard(isDirty);

  const handleSubmit = async () => {
    const user = getUser();
    if (!user) { toastError('로그인이 필요합니다.'); navigate('/login'); return; }
    const missing: string[] = [];
    if (!form.name.trim()) missing.push('상호명');
    if (!form.area) missing.push('지역');
    if (!bizLicenseFile) missing.push('사업자등록증');
    if (missing.length) { toastError(`필수 항목: ${missing.join(', ')}`); return; }

    setLoading(true);
    try {
      let businessLicense = '';
      if (bizLicenseFile) { const licUrls = await uploadImages([bizLicenseFile]); businessLicense = licUrls[0]; }
      await api('/rentals', {
        method: 'POST',
        body: {
          name: form.name.trim(), area: form.area, resortId: form.resortId || undefined,
          address: form.address.trim() || undefined, phone: form.phone.trim() || undefined,
          hours: form.hours.trim() || undefined, brands: form.brands.trim() || undefined,
          description: form.description.trim() || undefined, website: form.website.trim() || undefined,
          instagram: form.instagram.trim() || undefined, naverMap: form.naverMap.trim() || undefined,
          images: images || undefined, image: images ? images.split(',')[0] : undefined,
          businessLicense,
        },
      });
      toastSuccess('등록 신청이 완료되었습니다. 관리자 승인 후 노출됩니다.');
      navigate('/rental');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally { setLoading(false); }
  };

  const inputClass = 'w-full px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-2';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">렌탈샵 등록</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500">취소</button>
      </div>
      <p className="text-xs text-coral">* 관리자 승인 후 노출됩니다</p>

      <div>
        <label className={labelClass}>상호명 *</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: OO렌탈샵" className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>지역 *</label>
          <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} className={inputClass}>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>근처 스키장</label>
          <select value={form.resortId} onChange={e => setForm({ ...form, resortId: e.target.value })} className={inputClass}>
            <option value="">선택 안 함</option>
            {resorts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>주소</label>
        <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="매장 주소" className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>전화</label>
          <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="매장 전화번호" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>영업시간</label>
          <input type="text" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} placeholder="예: 08:00~22:00" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>취급 장비 · 브랜드</label>
        <input type="text" value={form.brands} onChange={e => setForm({ ...form, brands: e.target.value })} placeholder="예: 스키, 보드, 부츠 / 살로몬, 버튼 (콤마 구분)" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>매장 소개</label>
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="매장 소개, 렌탈 안내 등" rows={4} className={`${inputClass} resize-none`} />
      </div>

      <div>
        <label className={labelClass}>사진 (포스터)</label>
        <MultiImageUpload value={images} onChange={setImages} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>홈페이지</label>
          <input type="text" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>인스타 / 네이버지도</label>
          <input type="text" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="인스타 아이디" className={`${inputClass} mb-2`} />
          <input type="text" value={form.naverMap} onChange={e => setForm({ ...form, naverMap: e.target.value })} placeholder="네이버지도 링크" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>사업자등록증 *</label>
        <label className="block w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-500 cursor-pointer hover:border-primary/50 transition-all">
          {bizLicenseFile ? bizLicenseFile.name : '사업자등록증 사진을 업로드하세요'}
          <input type="file" accept="image/*" className="hidden" onChange={e => setBizLicenseFile(e.target.files?.[0] || null)} />
        </label>
        <p className="text-[10px] text-gray-500 mt-1">본인 확인용 · 비공개로 관리됩니다.</p>
      </div>

      <label className="flex items-start gap-2 py-2">
        <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} className="w-4 h-4 accent-sky-500 mt-0.5" />
        <span className="text-xs text-gray-500">
          <Link to="/mypage/terms" target="_blank" className="text-sky-600 underline">이용약관</Link> 및 <Link to="/privacy" target="_blank" className="text-sky-600 underline">개인정보처리방침</Link>에 동의합니다.
        </span>
      </label>

      <button onClick={handleSubmit} disabled={loading || !agreeTerms} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors disabled:opacity-50">
        {loading ? '등록 중...' : '등록 신청하기'}
      </button>
    </div>
  );
};

export default RentalRegister;
