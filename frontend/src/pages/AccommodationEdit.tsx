import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getUser, uploadImages, imageUrl } from '../api';

interface Resort { id: string; name: string; }
interface AccommodationData {
  id: string; userId?: string; name: string; type: string; price: number; originalPrice?: number;
  guests: string; features: string; image: string; resort?: { id: string; name: string };
}

const typeMap: Record<string, string> = { hotel: '호텔', pension: '펜션', condo: '콘도', minbak: '민박', season: '시즌방' };
const featureOptions = ['스키장 셔틀', '조식 포함', '주차 무료', '온수풀', '사우나', 'BBQ', '넷플릭스', '와이파이'];

// 숙소 수정 — 소유자가 기존 숙소를 불러와 편집. 저장 시 재심사(승인 대기)로 전환됨.
const AccommodationEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [currentImage, setCurrentImage] = useState('');
  const [form, setForm] = useState({ name: '', resortId: '', types: [] as string[], price: '', originalPrice: '', maxGuests: '4', features: [] as string[] });

  useEffect(() => {
    api<Resort[]>('/resorts').then(setResorts).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    const user = getUser();
    api<AccommodationData>(`/accommodations/${id}`).then(d => {
      if (!user || (d.userId && d.userId !== user.id)) {
        alert('수정 권한이 없습니다.');
        navigate(`/accommodation/${id}`, { replace: true });
        return;
      }
      setForm({
        name: d.name || '',
        resortId: d.resort?.id || '',
        types: d.type ? d.type.split(',').map(s => s.trim()).filter(Boolean) : [],
        price: String(d.price ?? ''),
        originalPrice: d.originalPrice ? String(d.originalPrice) : '',
        maxGuests: String(d.guests || '').replace(/[^0-9]/g, '') || '4',
        features: d.features ? d.features.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      setCurrentImage(d.image || '');
    }).catch(() => {
      alert('불러오지 못했습니다.');
      navigate('/accommodation', { replace: true });
    }).finally(() => setFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleType = (t: string) => setForm(prev => ({ ...prev, types: prev.types.includes(t) ? prev.types.filter(x => x !== t) : [...prev.types, t] }));
  const toggleFeature = (f: string) => setForm(prev => ({ ...prev, features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f] }));

  const handleSubmit = async () => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push('숙소명');
    if (!form.resortId) missing.push('스키장');
    if (form.types.length === 0) missing.push('숙소 유형');
    if (!form.price) missing.push('특가 1박 가격');
    if (missing.length > 0) { alert(`다음 항목을 입력해주세요:\n• ${missing.join('\n• ')}`); return; }

    setLoading(true);
    try {
      let image = currentImage;
      if (imageFiles.length > 0) {
        const urls = await uploadImages(imageFiles);
        image = urls[0];
      }
      await api(`/accommodations/${id}`, {
        method: 'PUT',
        body: {
          name: form.name.trim(),
          type: form.types.join(','),
          price: form.price,
          originalPrice: form.originalPrice || form.price,
          guests: `${form.maxGuests}인`,
          features: form.features.join(','),
          image,
        },
      });
      alert('수정되었습니다. 관리자 재검토 후 다시 노출됩니다.');
      navigate(`/accommodation/${id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

  if (fetching) return <div className="text-center py-16 text-gray-500 text-sm">불러오는 중...</div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">숙소 수정</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500">취소</button>
      </div>
      <p className="text-xs text-coral">* 수정 시 관리자 재검토 후 노출됩니다</p>

      <div>
        <label className={labelClass}>숙소명</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: 용평 파인빌리지 펜션" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>스키장</label>
        <select value={form.resortId} onChange={e => setForm({ ...form, resortId: e.target.value })} className={inputClass}>
          <option value="" disabled>스키장을 선택하세요</option>
          {resorts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}>숙소 유형</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(typeMap).map(([k, label]) => (
            <button type="button" key={k} onClick={() => toggleType(k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.types.includes(k) ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>특가 1박 (원)</label>
          <input type="text" inputMode="numeric" value={form.price ? Number(form.price).toLocaleString() : ''} onChange={e => setForm({ ...form, price: e.target.value.replace(/[^0-9]/g, '') })} placeholder="예: 150,000" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>정상가 (원)</label>
          <input type="text" inputMode="numeric" value={form.originalPrice ? Number(form.originalPrice).toLocaleString() : ''} onChange={e => setForm({ ...form, originalPrice: e.target.value.replace(/[^0-9]/g, '') })} placeholder="예: 200,000" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>최대 인원</label>
        <input type="number" inputMode="numeric" min="1" max="50" value={form.maxGuests} onChange={e => setForm({ ...form, maxGuests: e.target.value })} placeholder="4" className={inputClass} />
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
        <label className={labelClass}>사진 <span className="text-gray-500 font-normal">(바꿀 때만 선택)</span></label>
        {currentImage && imageFiles.length === 0 && (
          <img src={imageUrl(currentImage)} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />
        )}
        <label className="block w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-500 cursor-pointer hover:border-primary/50 transition-all">
          {imageFiles.length > 0 ? `${imageFiles.length}장 선택됨 (교체)` : '사진을 바꾸려면 선택하세요'}
          <input type="file" accept="image/*" multiple className="hidden" onChange={e => setImageFiles(Array.from(e.target.files || []))} />
        </label>
      </div>

      <button onClick={handleSubmit} disabled={loading} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors disabled:opacity-50">
        {loading ? '수정 중...' : '수정하기'}
      </button>
    </div>
  );
};

export default AccommodationEdit;
