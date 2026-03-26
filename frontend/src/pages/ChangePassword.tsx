import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const ChangePassword = () => {
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.current || !form.newPw || !form.confirm) {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    if (form.newPw !== form.confirm) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (form.newPw.length < 6) {
      alert('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setSubmitting(true);
    try {
      await api('/auth/change-password', {
        method: 'PUT',
        body: { currentPassword: form.current, newPassword: form.newPw },
      });
      alert('비밀번호가 변경되었습니다.');
      setForm({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">비밀번호 변경</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">현재 비밀번호</label>
          <input type="password" value={form.current} onChange={e => setForm({...form, current: e.target.value})} placeholder="현재 비밀번호 입력" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">새 비밀번호</label>
          <input type="password" value={form.newPw} onChange={e => setForm({...form, newPw: e.target.value})} placeholder="새 비밀번호 (6자 이상)" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">새 비밀번호 확인</label>
          <input type="password" value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} placeholder="새 비밀번호 다시 입력" className={inputClass} />
        </div>
      </div>

      <button onClick={handleSubmit} disabled={submitting} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors disabled:opacity-50">
        {submitting ? '변경 중...' : '변경하기'}
      </button>
    </div>
  );
};

export default ChangePassword;
