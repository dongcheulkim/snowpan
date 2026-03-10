import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RentalRegister = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    resortId: 'yongpyong',
    resort: '용평리조트',
    price: '',
    duration: '1일',
    equipment: [] as string[],
    description: '',
  });

  const resorts = [
    { id: 'yongpyong', name: '용평리조트' },
    { id: 'phoenix', name: '휘닉스평창' },
    { id: 'high1', name: '하이원' },
    { id: 'vivaldi', name: '비발디파크' },
    { id: 'elysian', name: '엘리시안' },
    { id: 'wellihilli', name: '웰리힐리' },
    { id: 'o2', name: '오투리조트' },
    { id: 'alpensia', name: '알펜시아' },
    { id: 'konjiam', name: '곤지암' },
    { id: 'jisan', name: '지산' },
    { id: 'muju', name: '무주' },
    { id: 'oakvalley', name: '오크밸리' },
    { id: 'eden', name: '에덴밸리' },
  ];

  const equipmentOptions = ['스키', '보드', '부츠', '폴', '헬멧', '고글', '스키복 상의', '스키복 하의'];

  const toggleEquipment = (eq: string) => {
    setForm(prev => ({
      ...prev,
      equipment: prev.equipment.includes(eq)
        ? prev.equipment.filter(e => e !== eq)
        : [...prev.equipment, eq],
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.price || form.equipment.length === 0) {
      alert('상품명, 가격, 장비를 입력해주세요.');
      return;
    }
    const existing = JSON.parse(localStorage.getItem('pendingItems') || '[]');
    const newItem = {
      id: `rental_${Date.now()}`,
      type: 'rental',
      status: 'pending',
      name: form.name.trim(),
      resortId: form.resortId,
      resort: form.resort,
      price: Number(form.price),
      duration: form.duration,
      equipment: form.equipment,
      description: form.description.trim(),
      image: form.equipment.includes('보드') ? '🏂' : '⛷️',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('pendingItems', JSON.stringify([newItem, ...existing]));
    alert('등록 신청이 완료되었습니다. 관리자 승인 후 노출됩니다.');
    navigate('/rental');
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
        <select value={form.resortId} onChange={e => { const r = resorts.find(r => r.id === e.target.value); setForm({...form, resortId: e.target.value, resort: r?.name || ''}); }} className={inputClass}>
          {resorts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>가격 (원/1일)</label>
          <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="45000" className={inputClass} />
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
        <label className={labelClass}>상세 설명</label>
        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="장비 상태, 브랜드 등 상세 정보" rows={4} className={`${inputClass} resize-none`} />
      </div>

      <button onClick={handleSubmit} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors">
        등록 신청하기
      </button>
    </div>
  );
};

export default RentalRegister;
