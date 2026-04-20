import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, uploadImages } from '../api';

interface Resort {
  id: string;
  name: string;
}

const AccommodationRegister = () => {
  const navigate = useNavigate();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [bizLicenseFile, setBizLicenseFile] = useState<File | null>(null);
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [form, setForm] = useState({
    name: '',
    resortId: '',
    types: [] as string[],
    price: '',
    originalPrice: '',
    maxGuests: '4',
    features: [] as string[],
  });

  const typeMap: Record<string, string> = { hotel: '호텔', pension: '펜션', condo: '콘도', minbak: '민박', season: '시즌방' };
  const featureOptions = ['스키장 셔틀', '조식 포함', '주차 무료', '온수풀', '사우나', 'BBQ', '넷플릭스', '와이파이'];

  useEffect(() => {
    api<Resort[]>('/resorts').then(data => {
      setResorts(data);
      if (data.length > 0) setForm(prev => ({ ...prev, resortId: data[0].id }));
    }).catch(() => {});
  }, []);

  const toggleType = (t: string) => {
    setForm(prev => ({
      ...prev,
      types: prev.types.includes(t) ? prev.types.filter(x => x !== t) : [...prev.types, t],
    }));
  };

  const toggleFeature = (f: string) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f],
    }));
  };

  const handleSubmit = async () => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push('숙소명');
    if (!form.resortId) missing.push('스키장');
    if (form.types.length === 0) missing.push('숙소 유형');
    if (!form.price) missing.push('특가 1박 가격');
    if (!form.maxGuests) missing.push('최대 인원');
    if (missing.length > 0) {
      alert(`다음 항목을 입력해주세요:\n• ${missing.join('\n• ')}`);
      return;
    }
    if (!bizLicenseFile) {
      alert('숙소 등록 시 사업자등록증은 필수입니다.');
      return;
    }
    setSubmitting(true);
    try {
      let image = '🏨';
      if (imageFiles.length > 0) {
        const urls = await uploadImages(imageFiles);
        image = urls[0];
      }
      const bizUrls = await uploadImages([bizLicenseFile]);
      let accommodationPermit = '';
      if (permitFile) {
        const permitUrls = await uploadImages([permitFile]);
        accommodationPermit = permitUrls[0];
      }
      await api('/accommodations', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          type: form.types.join(','),
          price: form.price,
          originalPrice: form.originalPrice || form.price,
          guests: `${form.maxGuests}인`,
          features: form.features.join(','),
          image,
          businessLicense: bizUrls[0],
          accommodationPermit: accommodationPermit || undefined,
          resortId: form.resortId,
        },
      });
      alert('등록 신청이 완료되었습니다. 관리자 승인 후 노출됩니다.');
      navigate('/accommodation');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '등록에 실패했습니다. 로그인이 필요합니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">숙소 등록</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-400">취소</button>
      </div>
      <p className="text-xs text-coral">* 관리자 승인 후 노출됩니다</p>

      <div>
        <label className={labelClass}>숙소명</label>
        <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="예: 용평 파인빌리지 펜션" className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>스키장</label>
          <select value={form.resortId} onChange={e => setForm({...form, resortId: e.target.value})} className={inputClass}>
            {resorts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>숙소 유형 (복수 선택)</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(typeMap).map(([key, label]) => (
              <button type="button" key={key} onClick={() => toggleType(key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.types.includes(key) ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>특가 1박 가격 (원)</label>
          <input type="text" inputMode="numeric" value={form.price ? Number(form.price).toLocaleString() : ''} onChange={e => setForm({...form, price: e.target.value.replace(/[^0-9]/g, '')})} placeholder="150,000" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>정가 (원)</label>
          <input type="number" value={form.originalPrice} onChange={e => setForm({...form, originalPrice: e.target.value})} placeholder="200000" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>최대 인원</label>
          <input type="number" value={form.maxGuests} onChange={e => setForm({...form, maxGuests: e.target.value})} placeholder="4" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>편의시설</label>
        <div className="flex flex-wrap gap-2">
          {featureOptions.map(f => (
            <button type="button" key={f} onClick={() => toggleFeature(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.features.includes(f) ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
              {f}
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
        <label className={labelClass}>사업자등록증 <span className="text-coral text-xs">*필수</span></label>
        <label className={`block w-full py-4 border-2 border-dashed rounded-lg text-center text-xs cursor-pointer transition-all ${bizLicenseFile ? 'border-primary/50 text-primary bg-primary/5' : 'border-gray-200 text-gray-400 hover:border-primary/50'}`}>
          {bizLicenseFile ? `📄 ${bizLicenseFile.name}` : '사업자등록증 사진 업로드'}
          <input type="file" accept="image/*" className="hidden" onChange={e => setBizLicenseFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      <div>
        <label className={labelClass}>숙박업 신고증 <span className="text-gray-400 font-normal">(선택)</span></label>
        <label className="block w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-400 cursor-pointer hover:border-primary/50 transition-all">
          {permitFile ? `📄 ${permitFile.name}` : '숙박업 신고증 사진 업로드'}
          <input type="file" accept="image/*" className="hidden" onChange={e => setPermitFile(e.target.files?.[0] || null)} />
        </label>
        <p className="text-[10px] text-gray-400 mt-1">관광진흥법/공중위생관리법에 따른 숙박업 신고증이 있으면 첨부해주세요.</p>
      </div>

      <label className="flex items-start gap-2 py-2">
        <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} className="w-4 h-4 accent-sky-500 mt-0.5" />
        <span className="text-xs text-gray-500">
          <Link to="/mypage/terms" target="_blank" className="text-sky-600 underline">이용약관</Link> 및 <Link to="/privacy" target="_blank" className="text-sky-600 underline">개인정보처리방침</Link>에 동의합니다.
        </span>
      </label>

      <button onClick={handleSubmit} disabled={submitting || !agreeTerms} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors disabled:opacity-50">
        {submitting ? '등록 중...' : '등록 신청하기'}
      </button>
    </div>
  );
};

export default AccommodationRegister;
