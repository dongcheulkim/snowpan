import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface SavedSearch { id: string; keyword: string; createdAt: string; }

export default function KeywordAlerts() {
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api<SavedSearch[]>('/saved-searches').then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const add = async () => {
    const kw = input.trim();
    if (kw.length < 2) { alert('키워드는 2글자 이상 입력해주세요.'); return; }
    setAdding(true);
    try {
      const created = await api<SavedSearch>('/saved-searches', { method: 'POST', body: { keyword: kw } });
      setItems(prev => prev.some(i => i.id === created.id) ? prev : [created, ...prev]);
      setInput('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '등록 실패');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/saved-searches/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">키워드 알림</h1>
      </div>

      <div className="card p-5">
        <p className="text-xs text-gray-500 mb-3">등록한 키워드가 포함된 중고매물이 올라오면 푸시로 알려드려요. (예: 살로몬, 160 스키, 버튼 보드)</p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add(); }}
            placeholder="관심 키워드 입력"
            maxLength={40}
            className="flex-1 px-3 py-2.5 bg-snow border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400"
          />
          <button onClick={add} disabled={adding || input.trim().length < 2} className="px-4 py-2.5 bg-sky-500 text-white rounded-lg font-bold text-sm disabled:opacity-40">추가</button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">내 키워드 ({items.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-4">로딩 중...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">등록한 키워드가 없어요.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map(i => (
              <span key={i.id} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-sky-50 text-sky-700 rounded-full text-sm font-medium">
                {i.keyword}
                <button onClick={() => remove(i.id)} aria-label="삭제" className="w-4 h-4 flex items-center justify-center text-sky-400 hover:text-sky-700">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
