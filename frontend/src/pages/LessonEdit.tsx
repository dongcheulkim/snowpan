import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getUser, uploadImages, imageUrl } from '../api';

interface Resort { id: string; name: string; }
interface LessonData {
  id: string; userId?: string; name: string; price: number; duration: string;
  level: string; maxStudents: number; description?: string; image: string;
  resort?: { id: string; name: string };
}

// 레슨 수정 — 소유자가 기존 레슨을 불러와 편집. 저장 시 재심사(승인 대기)로 전환됨.
const LessonEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [currentImage, setCurrentImage] = useState('');
  const [form, setForm] = useState({ name: '', resortId: '', price: '', duration: '2시간', level: 'beginner', maxStudents: '4', description: '' });

  useEffect(() => {
    api<Resort[]>('/resorts').then(setResorts).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    const user = getUser();
    api<LessonData>(`/lessons/${id}`).then(d => {
      if (!user || (d.userId && d.userId !== user.id)) {
        alert('수정 권한이 없습니다.');
        navigate(`/lesson/${id}`, { replace: true });
        return;
      }
      setForm({
        name: d.name || '',
        resortId: d.resort?.id || '',
        price: String(d.price ?? ''),
        duration: d.duration || '2시간',
        level: d.level || 'beginner',
        maxStudents: String(d.maxStudents ?? '4'),
        description: d.description || '',
      });
      setCurrentImage(d.image || '');
    }).catch(() => {
      alert('불러오지 못했습니다.');
      navigate('/lesson', { replace: true });
    }).finally(() => setFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = async () => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push('레슨명');
    if (!form.resortId) missing.push('스키장');
    if (!form.price) missing.push('가격');
    if (missing.length > 0) { alert(`다음 항목을 입력해주세요:\n• ${missing.join('\n• ')}`); return; }

    setLoading(true);
    try {
      let image = currentImage;
      if (imageFiles.length > 0) {
        const urls = await uploadImages(imageFiles);
        image = urls[0];
      }
      await api(`/lessons/${id}`, {
        method: 'PUT',
        body: {
          name: form.name.trim(),
          price: Number(form.price),
          duration: form.duration,
          level: form.level,
          maxStudents: Number(form.maxStudents),
          description: form.description?.trim() || '',
          image,
        },
      });
      alert('수정되었습니다. 관리자 재검토 후 다시 노출됩니다.');
      navigate(`/lesson/${id}`);
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
        <h1 className="text-2xl font-bold text-gray-900">레슨 수정</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500">취소</button>
      </div>
      <p className="text-xs text-coral">* 수정 시 관리자 재검토 후 노출됩니다</p>

      <div>
        <label className={labelClass}>레슨명</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: 초급 스키 그룹 레슨" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>스키장</label>
        <select value={form.resortId} onChange={e => setForm({ ...form, resortId: e.target.value })} className={inputClass}>
          <option value="" disabled>스키장을 선택하세요</option>
          {resorts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>난이도</label>
          <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} className={inputClass}>
            <option value="beginner">LV1 (초급)</option>
            <option value="intermediate">LV2 (중급)</option>
            <option value="advanced">LV3 (상급)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>시간</label>
          <select value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} className={inputClass}>
            <option value="1시간">1시간</option>
            <option value="2시간">2시간</option>
            <option value="3시간">3시간</option>
            <option value="반일">반일</option>
            <option value="종일">종일</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>가격 (원)</label>
          <input type="text" inputMode="numeric" value={form.price ? Number(form.price).toLocaleString() : ''} onChange={e => setForm({ ...form, price: e.target.value.replace(/[^0-9]/g, '') })} placeholder="예: 80,000" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>최대 인원</label>
          <input type="number" inputMode="numeric" min="1" max="50" value={form.maxStudents} onChange={e => setForm({ ...form, maxStudents: e.target.value })} placeholder="4" className={inputClass} />
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

      <div>
        <label className={labelClass}>상세 설명</label>
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="강사 경력, 레슨 내용 등" rows={4} className={`${inputClass} resize-none`} />
      </div>

      <button onClick={handleSubmit} disabled={loading} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors disabled:opacity-50">
        {loading ? '수정 중...' : '수정하기'}
      </button>
    </div>
  );
};

export default LessonEdit;
