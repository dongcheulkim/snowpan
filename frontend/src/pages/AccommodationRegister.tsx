import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, uploadImages } from '../api';

interface Resort {
  id: string;
  name: string;
}

const AccommodationRegister = () => {
  const navigate = useNavigate();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
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
    if (!form.name.trim() || !form.price || form.types.length === 0) {
      alert('숙소명, 가격, 숙소 유형을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      let image = '🏨';
      if (imageFiles.length > 0) {
        const urls = await uploadImages(imageFiles);
        image = urls[0];
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
              <button key={key} onClick={() => toggleType(key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.types.includes(key) ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
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
            <button key={f} onClick={() => toggleFeature(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.features.includes(f) ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
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

      <button onClick={handleSubmit} disabled={submitting} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors disabled:opacity-50">
        {submitting ? '등록 중...' : '등록 신청하기'}
      </button>
    </div>
  );
};

export default AccommodationRegister;
