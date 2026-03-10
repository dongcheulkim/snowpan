import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AccommodationRegister = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    resortId: 'yongpyong',
    resort: '용평리조트',
    type: 'pension',
    price: '',
    originalPrice: '',
    rating: '4.5',
    maxGuests: '4',
    features: [] as string[],
    description: '',
  });

  const resorts = [
    { id: 'yongpyong', name: '용평' },
    { id: 'phoenix', name: '휘닉스' },
    { id: 'high1', name: '하이원' },
    { id: 'vivaldi', name: '비발디' },
    { id: 'elysian', name: '엘리시안' },
    { id: 'wellihilli', name: '웰리힐리' },
    { id: 'o2', name: '오투' },
    { id: 'alpensia', name: '알펜시아' },
    { id: 'konjiam', name: '곤지암' },
    { id: 'jisan', name: '지산' },
    { id: 'muju', name: '무주' },
    { id: 'oakvalley', name: '오크밸리' },
    { id: 'eden', name: '에덴밸리' },
  ];

  const typeMap: Record<string, string> = { hotel: '호텔', pension: '펜션', condo: '콘도', minbak: '민박' };
  const featureOptions = ['스키장 셔틀', '조식 포함', '주차 무료', '온수풀', '사우나', 'BBQ', '넷플릭스', '와이파이'];

  const toggleFeature = (f: string) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f],
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.price) {
      alert('숙소명과 가격을 입력해주세요.');
      return;
    }
    const existing = JSON.parse(localStorage.getItem('pendingItems') || '[]');
    const newItem = {
      id: `accommodation_${Date.now()}`,
      type: 'accommodation',
      status: 'pending',
      name: form.name.trim(),
      resortId: form.resortId,
      resort: form.resort,
      accommodationType: form.type,
      typeName: typeMap[form.type],
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : Number(form.price),
      rating: Number(form.rating),
      reviews: 0,
      maxGuests: Number(form.maxGuests),
      features: form.features,
      description: form.description.trim(),
      image: '🏨',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('pendingItems', JSON.stringify([newItem, ...existing]));
    alert('등록 신청이 완료되었습니다. 관리자 승인 후 노출됩니다.');
    navigate('/accommodation');
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
          <select value={form.resortId} onChange={e => { const r = resorts.find(r => r.id === e.target.value); setForm({...form, resortId: e.target.value, resort: r?.name || ''}); }} className={inputClass}>
            {resorts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>숙소 유형</label>
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputClass}>
            <option value="hotel">호텔</option>
            <option value="pension">펜션</option>
            <option value="condo">콘도</option>
            <option value="minbak">민박</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>1박 가격 (원)</label>
          <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="150000" className={inputClass} />
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
        <label className={labelClass}>상세 설명</label>
        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="숙소 위치, 특징 등" rows={4} className={`${inputClass} resize-none`} />
      </div>

      <button onClick={handleSubmit} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors">
        등록 신청하기
      </button>
    </div>
  );
};

export default AccommodationRegister;
