import { toastSuccess, toastError } from '../components/Toast';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getUser, uploadImages } from '../api';
import MultiImageUpload from '../components/MultiImageUpload';
import { resortRegion, RESORT_REGION_ORDER } from '../utils/resortRegion';

interface Resort { id: string; name: string; location?: string | null }
interface LessonData {
  id: string; userId?: string; name: string; type?: string | null; specialties?: string | null; description?: string | null;
  images?: string | null; image?: string | null; resort?: { id: string } | null;
}

const TYPES = ['스키', '보드', '스키·보드'];
const SPECIALTIES = ['초중급', '인터', '레이싱', '모글', '파크', '키즈'];

const LessonEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState('');
  const [form, setForm] = useState({ name: '', resortId: '', type: '스키', description: '' });
  const [providerType, setProviderType] = useState<'' | 'business' | 'freelance'>('');
  const [bizLicenseFile, setBizLicenseFile] = useState<File | null>(null);
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [region, setRegion] = useState('강원');
  const toggleSpecialty = (sp: string) => setSpecialties(prev => prev.includes(sp) ? prev.filter(x => x !== sp) : [...prev, sp]);

  useEffect(() => { api<Resort[]>('/resorts').then(setResorts).catch(() => {}); }, []);
  // 기존 레슨의 리조트 지역으로 대분류 자동 세팅
  useEffect(() => {
    const cur = resorts.find(r => r.id === form.resortId);
    if (cur) setRegion(resortRegion(cur.location));
     
  }, [resorts, form.resortId]);

  useEffect(() => {
    if (!id) return;
    api<LessonData>(`/lessons/${id}`).then(async d => {
      const me = getUser();
      if (!me) { navigate(`/lesson/${id}`, { replace: true }); return; }
      if (d.userId && d.userId !== me.id && me.role !== 'admin') { // 직원(공동 관리)인지 서버에 확인 (2026-09-23)
        const acc = await api<{ canManage: boolean }>(`/shop-staff/access/lesson/${id}`).catch(() => null);
        if (!acc?.canManage) { navigate(`/lesson/${id}`, { replace: true }); return; }
      }
      setForm({ name: d.name || '', resortId: d.resort?.id || '', type: d.type || '스키', description: d.description || '' });
      setProviderType((d as { providerType?: 'business' | 'freelance' | null }).providerType || '');
      setPhone((d as { phone?: string | null }).phone || '');
      setSpecialties(d.specialties ? d.specialties.split(',') : []);
      setImages(d.images || d.image || '');
    }).catch(() => { toastError('불러오지 못했습니다.'); navigate('/lesson', { replace: true }); });
  }, [id, navigate]);

  const submit = async () => {
    if (!form.name.trim()) { toastError('레슨명을 입력해주세요.'); return; }
    if (!form.resortId) { toastError('스키장을 선택해주세요.'); return; }
    if (!form.description.trim()) { toastError('상세설명을 입력해주세요.'); return; }
    setLoading(true);
    try {
      let businessLicense: string | undefined; // 사업자등록증 나중에 첨부 → 재확인 후 '사업자 확인' 배지 (2026-09-23)
      if (bizLicenseFile) { const u = await uploadImages([bizLicenseFile]); businessLicense = u[0]; }
      await api(`/lessons/${id}`, {
        method: 'PUT',
        body: {
          ...(businessLicense ? { businessLicense } : {}),
          name: form.name.trim(), resortId: form.resortId, type: form.type, providerType: providerType || undefined, phone: phone.trim(),
          specialties: specialties.join(','),
          description: form.description.trim(), images, image: images ? images.split(',')[0] : null,
        },
      });
      toastSuccess('수정되었습니다. 관리자 재검토 후 다시 노출됩니다.');
      navigate(`/lesson/${id}`);
    } catch (err) { toastError(err instanceof Error ? err.message : '수정 실패'); }
    finally { setLoading(false); }
  };

  const inputClass = 'w-full px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-2';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">레슨 수정</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500">취소</button>
      </div>

      <div><label className={labelClass}>레슨명</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} /></div>
      <div><label className={labelClass}>연락처 <span className="text-gray-500 font-normal">(선택)</span></label><input type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value.slice(0, 40))} placeholder="예: 010-1234-5678" className={inputClass} /><p className="text-[11px] text-gray-500 mt-1">적으면 레슨 상세에 전화 버튼이 생겨요.</p></div>
      <div>
        <label className={labelClass}>스키장</label>
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
          {resorts.filter(r => resortRegion(r.location) === region || r.id === form.resortId).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>종류</label>
        <div className="flex gap-2">
          {TYPES.map(t => <button key={t} onClick={() => setForm({ ...form, type: t })} className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${form.type === t ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>{t}</button>)}
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
        <label className={labelClass}>소속 구분 <span className="text-gray-500 font-normal">(관리자 확인용)</span></label>
        <div className="flex gap-2">
          {([['business', '스키학교·샵 (사업자)'], ['freelance', '개인 강사']] as const).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setProviderType(v)} className={`flex-1 min-h-11 py-2.5 rounded-lg text-sm font-bold transition-all ${providerType === v ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelClass}>사업자등록증 <span className="text-gray-500 font-normal">(선택)</span></label>
        <label className="block w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-500 cursor-pointer hover:border-gray-400 transition-all">
          {bizLicenseFile ? bizLicenseFile.name : '사업자등록증 사진 올리기 (새로 올리면 교체돼요)'}
          <input type="file" accept="image/*" className="hidden" onChange={e => setBizLicenseFile(e.target.files?.[0] || null)} />
        </label>
        <p className="text-[11px] text-gray-500 mt-1">첨부하면 관리자가 확인한 뒤 레슨에 "사업자 확인" 배지가 붙어요. 수정 내용은 다시 한 번 확인을 거쳐요.</p>
      </div>
      <div><label className={labelClass}>상세 설명</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={7} className={`${inputClass} resize-none`} /></div>
      <div><label className={labelClass}>사진 (포스터)</label><MultiImageUpload value={images} onChange={setImages} /></div>

      <button onClick={submit} disabled={loading} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors disabled:opacity-50">
        {loading ? '수정 중...' : '수정하기'}
      </button>
    </div>
  );
};

export default LessonEdit;
