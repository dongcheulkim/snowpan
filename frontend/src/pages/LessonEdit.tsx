import { toastSuccess, toastError } from '../components/Toast';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getUser } from '../api';
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
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [region, setRegion] = useState('강원');
  const toggleSpecialty = (sp: string) => setSpecialties(prev => prev.includes(sp) ? prev.filter(x => x !== sp) : [...prev, sp]);

  useEffect(() => { api<Resort[]>('/resorts').then(setResorts).catch(() => {}); }, []);
  // 기존 레슨의 리조트 지역으로 대분류 자동 세팅
  useEffect(() => {
    const cur = resorts.find(r => r.id === form.resortId);
    if (cur) setRegion(resortRegion(cur.location));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resorts, form.resortId]);

  useEffect(() => {
    if (!id) return;
    api<LessonData>(`/lessons/${id}`).then(d => {
      const me = getUser();
      if (!me || (d.userId && d.userId !== me.id && me.role !== 'admin')) { navigate(`/lesson/${id}`, { replace: true }); return; }
      setForm({ name: d.name || '', resortId: d.resort?.id || '', type: d.type || '스키', description: d.description || '' });
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
      await api(`/lessons/${id}`, {
        method: 'PUT',
        body: {
          name: form.name.trim(), resortId: form.resortId, type: form.type,
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
      <div><label className={labelClass}>상세 설명</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={7} className={`${inputClass} resize-none`} /></div>
      <div><label className={labelClass}>사진 (포스터)</label><MultiImageUpload value={images} onChange={setImages} /></div>

      <button onClick={submit} disabled={loading} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors disabled:opacity-50">
        {loading ? '수정 중...' : '수정하기'}
      </button>
    </div>
  );
};

export default LessonEdit;
