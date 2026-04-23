import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getUser, uploadImages } from '../api';
import { useUnloadGuard } from '../hooks/useUnloadGuard';

interface Resort {
  id: string;
  name: string;
}

const RentalRegister = () => {
  const navigate = useNavigate();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [bizLicenseFile, setBizLicenseFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: '',
    resortId: '',
    price: '',
    duration: '1일',
    equipment: [] as string[],
    description: '',
  });

  useEffect(() => {
    api<Resort[]>('/resorts').then(data => { setResorts(data); }).catch(() => {});
  }, []);

  const equipmentOptions = ['스키', '보드', '부츠', '폴', '헬멧', '고글', '스키복 상의', '스키복 하의'];

  const isDirty = !loading && (
    form.name.trim() !== '' || form.price !== '' || form.equipment.length > 0 || form.description.trim() !== '' || imageFiles.length > 0 || bizLicenseFile !== null
  );
  useUnloadGuard(isDirty);

  const toggleEquipment = (eq: string) => {
    setForm(prev => ({
      ...prev,
      equipment: prev.equipment.includes(eq)
        ? prev.equipment.filter(e => e !== eq)
        : [...prev.equipment, eq],
    }));
  };

  const handleSubmit = async () => {
    const user = getUser();
    if (!user) { alert('로그인이 필요합니다.'); navigate('/login'); return; }
    const missing: string[] = [];
    if (!form.name.trim()) missing.push('상품명');
    if (!form.resortId) missing.push('스키장');
    if (!form.price) missing.push('가격');
    if (form.equipment.length === 0) missing.push('장비');
    if (missing.length > 0) {
      alert(`다음 항목을 입력해주세요:\n• ${missing.join('\n• ')}`);
      return;
    }

    setLoading(true);
    try {
      let image = form.equipment.includes('보드') ? '🏂' : '⛷️';
      if (imageFiles.length > 0) {
        const urls = await uploadImages(imageFiles);
        image = urls[0];
      }
      let businessLicense = '';
      if (bizLicenseFile) {
        const licUrls = await uploadImages([bizLicenseFile]);
        businessLicense = licUrls[0];
      }
      await api('/rentals', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          resortId: form.resortId,
          price: Number(form.price),
          duration: form.duration,
          equipment: form.equipment.join(', '),
          image,
          businessLicense: businessLicense || undefined,
        },
      });
      alert('등록 신청이 완료되었습니다. 관리자 승인 후 노출됩니다.');
      navigate('/rental');
    } catch (err) {
      alert(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">렌탈 등록</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-400">취소</button>
      </div>
      <p className="text-xs text-coral">* 관리자 승인 후 노출됩니다</p>

      <div>
        <label className={labelClass}>상품명</label>
        <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="예: 스키 풀세트" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>스키장</label>
        <select value={form.resortId} onChange={e => setForm({...form, resortId: e.target.value})} className={inputClass}>
          <option value="" disabled>스키장을 선택하세요</option>
          {resorts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>가격 (원/1일)</label>
          <input type="text" inputMode="numeric" value={form.price ? Number(form.price).toLocaleString() : ''} onChange={e => setForm({...form, price: e.target.value.replace(/[^0-9]/g, '')})} placeholder="예: 45,000" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>기간</label>
          <select value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} className={inputClass}>
            <option value="1일">1일</option>
            <option value="2일">2일</option>
            <option value="시즌">시즌</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>포함 장비</label>
        <div className="flex flex-wrap gap-2">
          {equipmentOptions.map(eq => (
            <button key={eq} onClick={() => toggleEquipment(eq)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.equipment.includes(eq) ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
              {eq}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>사진</label>
        <label className="block w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-400 cursor-pointer hover:border-primary/50 transition-all">
          {imageFiles.length > 0 ? `${imageFiles.length}장 선택됨` : '사진을 선택하세요 (선택사항)'}
          <input type="file" accept="image/*" multiple className="hidden" onChange={e => setImageFiles(Array.from(e.target.files || []))} />
        </label>
      </div>

      <div>
        <label className={labelClass}>사업자등록증 <span className="text-gray-400 font-normal">(선택)</span></label>
        <label className="block w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-400 cursor-pointer hover:border-primary/50 transition-all">
          {bizLicenseFile ? `📄 ${bizLicenseFile.name}` : '사업자등록증 사진을 업로드하세요'}
          <input type="file" accept="image/*" className="hidden" onChange={e => setBizLicenseFile(e.target.files?.[0] || null)} />
        </label>
        <p className="text-[10px] text-gray-400 mt-1">사업 목적 렌탈 시 사업자등록증을 첨부하면 승인이 빨라집니다.</p>
      </div>

      <div>
        <label className={labelClass}>상세 설명</label>
        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="장비 상태, 브랜드 등 상세 정보" rows={4} className={`${inputClass} resize-none`} />
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
