import { toastSuccess, toastError } from '../components/Toast';
import { loginPath } from '../utils/loginPath';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, uploadImages } from '../api';
import { useUnloadGuard } from '../hooks/useUnloadGuard';
import MultiImageUpload from '../components/MultiImageUpload';
import { resortRegion, RESORT_REGION_ORDER } from '../utils/resortRegion';

interface Resort { id: string; name: string; location?: string | null }

const TYPES = ['스키', '보드', '스키·보드'];
// 강습 분야 (복수 선택) — 백엔드 화이트리스트와 1:1
const SPECIALTIES = ['초중급', '인터', '레이싱', '모글', '파크', '키즈'];

const LessonRegister = () => {
  const navigate = useNavigate();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [images, setImages] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [bizLicenseFile, setBizLicenseFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: '', resortId: '', type: '스키', description: '' });
  const [providerType, setProviderType] = useState<'' | 'business' | 'freelance'>('');
  const [phone, setPhone] = useState(''); // 연락처 (선택) — 상세 전화 버튼·관리자 매장 관리에 표시 // 소속 구분 — 관리자 심사용(공개 안 됨)
  const [region, setRegion] = useState('강원'); // 대분류: 지역 → 스키장 선택지 좁힘
  const [specialties, setSpecialties] = useState<string[]>([]);
  const toggleSpecialty = (sp: string) => setSpecialties(prev => prev.includes(sp) ? prev.filter(x => x !== sp) : [...prev, sp]);

  useEffect(() => { api<Resort[]>('/resorts').then(setResorts).catch(() => {}); }, []);

  const isDirty = !loading && (form.name.trim() !== '' || form.description.trim() !== '' || images !== '' || certFile !== null || bizLicenseFile !== null);
  useUnloadGuard(isDirty);

  const handleSubmit = async () => {
    const user = getUser();
    if (!user) { toastError('로그인이 필요합니다.'); navigate(loginPath()); return; }
    const missing: string[] = [];
    if (!form.name.trim()) missing.push('레슨명');
    if (!form.resortId) missing.push('스키장');
    if (!form.description.trim()) missing.push('상세설명');
    if (!providerType) missing.push('소속 구분');
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
          name: form.name.trim(), resortId: form.resortId, type: form.type, providerType, phone: phone.trim() || undefined,
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
        <label className={labelClass}>연락처 <span className="text-gray-500 font-normal">(선택)</span></label>
        <input type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value.slice(0, 40))} placeholder="예: 010-1234-5678" className={inputClass} />
        <p className="text-[11px] text-gray-500 mt-1">적으면 레슨 상세에 전화 버튼이 생겨요. 채팅으로만 받으려면 비워 두세요.</p>
      </div>

      <div>
        <label className={labelClass}>스키장 *</label>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {RESORT_REGION_ORDER.filter((rg) => resorts.some((r) => resortRegion(r.location) === rg)).map((rg) => (
            <button key={rg} type="button" onClick={() => { setRegion(rg); setForm((f) => ({ ...f, resortId: '' })); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${region === rg ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
              {rg}
            </button>
          ))}
        </div>
        <select value={form.resortId} onChange={e => setForm({ ...form, resortId: e.target.value })} className={inputClass}>
          <option value="" disabled>스키장을 선택하세요</option>
          {resorts.filter(r => resortRegion(r.location) === region).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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
        <label className={labelClass}>강습 분야 <span className="font-normal text-gray-500">(복수 선택 가능)</span></label>
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
        <label className={labelClass}>소속 구분 <span className="text-gray-500 font-normal">(관리자 확인용, 손님에게는 표시되지 않아요)</span></label>
        <div className="flex gap-2">
          {([['business', '스키학교·샵 (사업자)'], ['freelance', '개인 강사']] as const).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setProviderType(v)} className={`flex-1 min-h-11 py-2.5 rounded-lg text-sm font-bold transition-all ${providerType === v ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mt-1.5">{providerType === 'freelance' ? '개인 강사는 아래 강사 자격증 사진을 올려 주시면 확인이 빨라요.' : providerType === 'business' ? '사업자는 아래 사업자등록증 사진을 올려 주시면 확인이 빨라요.' : '심사할 때 참고하는 정보예요.'}</p>
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
        <p className="text-[11px] text-gray-500 mt-1">첨부하면 관리자가 확인한 뒤 레슨에 "사업자 확인" 배지가 붙어요.</p>
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
