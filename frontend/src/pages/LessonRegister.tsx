import { toastSuccess, toastError } from '../components/Toast';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, uploadImages } from '../api';
import { useUnloadGuard } from '../hooks/useUnloadGuard';
import MultiImageUpload from '../components/MultiImageUpload';

interface Resort { id: string; name: string }

const TYPES = ['스키', '보드', '스키·보드'];
// 강습 분야 (복수 선택) — 백엔드 화이트리스트와 1:1
const SPECIALTIES = ['입문', '초중급', '인터', '상급', '레이싱', '모글', '파크', '키즈'];

const LessonRegister = () => {
  const navigate = useNavigate();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [images, setImages] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [bizLicenseFile, setBizLicenseFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: '', resortId: '', type: '스키', description: '' });
  const [specialties, setSpecialties] = useState<string[]>([]);
  const toggleSpecialty = (sp: string) => setSpecialties(prev => prev.includes(sp) ? prev.filter(x => x !== sp) : [...prev, sp]);

  useEffect(() => { api<Resort[]>('/resorts').then(setResorts).catch(() => {}); }, []);

  const isDirty = !loading && (form.name.trim() !== '' || form.description.trim() !== '' || images !== '' || certFile !== null || bizLicenseFile !== null);
  useUnloadGuard(isDirty);

  const handleSubmit = async () => {
    const user = getUser();
    if (!user) { toastError('로그인이 필요합니다.'); navigate('/login'); return; }
    const missing: string[] = [];
    if (!form.name.trim()) missing.push('레슨명');
    if (!form.resortId) missing.push('스키장');
    if (!form.description.trim()) missing.push('상세설명');
    if (missing.length) { toastError(`필수 항목: ${missing.join(', ')}`); return; }

    setLoading(true);
    try {
      let instructorCert: string | undefined;
      if (certFile) { const u = await uploadImages([certFile]); instructorCert = u[0]; }
      let businessLicense: string | undefined;
      if (bizLicenseFile) { const u = await uploadImages([bizLicenseFile]); businessLicense = u[0]; }
      await api('/lessons', {
        method: 'POST',
        body: {
          name: form.name.trim(), resortId: form.resortId, type: form.type,
          specialties: specialties.join(',') || undefined,
          description: form.description.trim(),
          images: images || undefined, image: images ? images.split(',')[0] : undefined,
          instructorCert, businessLicense,
        },
      });
      toastSuccess('등록 신청이 완료되었습니다. 관리자 승인 후 노출됩니다.');
      navigate('/lesson');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally { setLoading(false); }
  };

  const inputClass = 'w-full px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-2';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">레슨 등록</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500">취소</button>
      </div>
      <p className="text-xs text-coral">* 관리자 승인 후 노출됩니다 · 가격·시간·인원은 상세설명·사진에 자유롭게 안내하세요</p>

      <div>
        <label className={labelClass}>레슨명 *</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: OO스키스쿨 개인/그룹 레슨" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>스키장 *</label>
        <select value={form.resortId} onChange={e => setForm({ ...form, resortId: e.target.value })} className={inputClass}>
          <option value="" disabled>스키장을 선택하세요</option>
          {resorts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}>종류 *</label>
        <div className="flex gap-2">
          {TYPES.map(t => (
            <button key={t} onClick={() => setForm({ ...form, type: t })} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${form.type === t ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>강습 분야 <span className="font-normal text-gray-400">(복수 선택 가능)</span></label>
        <div className="flex flex-wrap gap-1.5">
          {SPECIALTIES.map(sp => (
            <button key={sp} onClick={() => toggleSpecialty(sp)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${specialties.includes(sp) ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>{sp}</button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>상세 설명 *</label>
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="강사 경력, 레슨 내용, 가격·시간·인원, 예약 방법 등을 자유롭게 적어주세요." rows={7} className={`${inputClass} resize-none`} />
      </div>

      <div>
        <label className={labelClass}>사진 (포스터)</label>
        <MultiImageUpload value={images} onChange={setImages} />
      </div>

      <div>
        <label className={labelClass}>강사 자격증 <span className="text-gray-500 font-normal">(선택)</span></label>
        <label className="block w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-500 cursor-pointer hover:border-primary/50 transition-all">
          {certFile ? certFile.name : '강사 자격증 사진 (있으면 신뢰도 ↑)'}
          <input type="file" accept="image/*" className="hidden" onChange={e => setCertFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      <div>
        <label className={labelClass}>사업자등록증 <span className="text-gray-500 font-normal">(선택)</span></label>
        <label className="block w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-500 cursor-pointer hover:border-primary/50 transition-all">
          {bizLicenseFile ? bizLicenseFile.name : '사업자등록증 사진'}
          <input type="file" accept="image/*" className="hidden" onChange={e => setBizLicenseFile(e.target.files?.[0] || null)} />
        </label>
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

export default LessonRegister;
