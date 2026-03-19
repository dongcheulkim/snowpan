import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUser, uploadImages } from '../api';

interface Resort {
  id: string;
  name: string;
}

const LessonRegister = () => {
  const navigate = useNavigate();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    name: '',
    resortId: '',
    price: '',
    duration: '2시간',
    level: 'beginner',
    maxStudents: '4',
    type: 'ski',
    description: '',
  });

  useEffect(() => {
    api<Resort[]>('/resorts').then(data => {
      setResorts(data);
      if (data.length > 0) setForm(f => ({ ...f, resortId: data[0].id }));
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    const user = getUser();
    if (!user) { alert('로그인이 필요합니다.'); navigate('/login'); return; }
    if (!form.name.trim() || !form.price) {
      alert('레슨명과 가격을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      let image = form.type === 'board' ? '🏂' : '⛷️';
      if (imageFiles.length > 0) {
        const urls = await uploadImages(imageFiles);
        image = urls[0];
      }
      await api('/lessons', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          resortId: form.resortId,
          price: Number(form.price),
          duration: form.duration,
          level: form.level,
          maxStudents: Number(form.maxStudents),
          image,
        },
      });
      alert('등록 신청이 완료되었습니다. 관리자 승인 후 노출됩니다.');
      navigate('/lesson');
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
        <select value={form.resortId} onChange={e => setForm({...form, resortId: e.target.value})} className={inputClass}>
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
            <option value="beginner">LV1 (초급)</option>
            <option value="intermediate">LV2 (중급)</option>
            <option value="advanced">LV3 (상급)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>가격 (원)</label>
          <input type="text" inputMode="numeric" value={form.price ? Number(form.price).toLocaleString() : ''} onChange={e => setForm({...form, price: e.target.value.replace(/[^0-9]/g, '')})} placeholder="80,000" className={inputClass} />
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
        <label className={labelClass}>사진</label>
        <label className="block w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-400 cursor-pointer hover:border-primary/50 transition-all">
          {imageFiles.length > 0 ? `${imageFiles.length}장 선택됨` : '사진을 선택하세요 (선택사항)'}
          <input type="file" accept="image/*" multiple className="hidden" onChange={e => setImageFiles(Array.from(e.target.files || []))} />
        </label>
      </div>

      <div>
        <label className={labelClass}>상세 설명</label>
        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="강사 경력, 레슨 내용 등" rows={4} className={`${inputClass} resize-none`} />
      </div>

      <button onClick={handleSubmit} disabled={loading} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors disabled:opacity-50">
        {loading ? '등록 중...' : '등록 신청하기'}
      </button>
    </div>
  );
};

export default LessonRegister;
