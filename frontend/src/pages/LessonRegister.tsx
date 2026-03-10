import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LessonRegister = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    resortId: 'yongpyong',
    resort: '용평리조트',
    price: '',
    duration: '2시간',
    level: 'LV1',
    maxStudents: '4',
    type: 'ski',
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

  const handleSubmit = () => {
    if (!form.name.trim() || !form.price) {
      alert('레슨명과 가격을 입력해주세요.');
      return;
    }
    const existing = JSON.parse(localStorage.getItem('pendingItems') || '[]');
    const newItem = {
      id: `lesson_${Date.now()}`,
      type: 'lesson',
      status: 'pending',
      name: form.name.trim(),
      resortId: form.resortId,
      resort: form.resort,
      price: Number(form.price),
      duration: form.duration,
      level: form.level,
      maxStudents: Number(form.maxStudents),
      lessonType: form.type,
      description: form.description.trim(),
      image: form.type === 'board' ? '🏂' : '⛷️',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('pendingItems', JSON.stringify([newItem, ...existing]));
    alert('등록 신청이 완료되었습니다. 관리자 승인 후 노출됩니다.');
    navigate('/lesson');
  };

  const inputClass = "w-full px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">레슨 등록</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-400">취소</button>
      </div>
      <p className="text-xs text-coral">* 관리자 승인 후 노출됩니다</p>

      <div>
        <label className={labelClass}>레슨명</label>
        <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="예: 초급 스키 그룹 레슨" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>스키장</label>
        <select value={form.resortId} onChange={e => { const r = resorts.find(r => r.id === e.target.value); setForm({...form, resortId: e.target.value, resort: r?.name || ''}); }} className={inputClass}>
          {resorts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>종류</label>
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputClass}>
            <option value="ski">스키</option>
            <option value="board">보드</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>난이도</label>
          <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className={inputClass}>
            <option value="LV1">LV1 (초급)</option>
            <option value="LV2">LV2 (중급)</option>
            <option value="LV3">LV3 (상급)</option>
            <option value="데몬">데몬</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>가격 (원)</label>
          <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="80000" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>시간</label>
          <select value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} className={inputClass}>
            <option value="1시간">1시간</option>
            <option value="2시간">2시간</option>
            <option value="3시간">3시간</option>
            <option value="반일">반일</option>
            <option value="종일">종일</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>최대 인원</label>
          <input type="number" value={form.maxStudents} onChange={e => setForm({...form, maxStudents: e.target.value})} placeholder="4" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>상세 설명</label>
        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="강사 경력, 레슨 내용 등" rows={4} className={`${inputClass} resize-none`} />
      </div>

      <button onClick={handleSubmit} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors">
        등록 신청하기
      </button>
    </div>
  );
};

export default LessonRegister;
