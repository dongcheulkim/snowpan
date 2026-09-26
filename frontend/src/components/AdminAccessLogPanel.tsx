import { useEffect, useState } from 'react';
import { api } from '../api';

// 관리자 설정 → 개인정보 열람 기록 (2026-09-26). 탈퇴 회원 원래 신원·지운 매물 기록·로그인 기록을 누가 언제 봤는지.
interface AccessLog {
  id: string;
  action: string;
  targetId: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
  admin: { id: string; name: string; email: string } | null;
}

const ACTION_LABEL: Record<string, string> = {
  withdrawn_identity_view: '탈퇴 회원 원래 정보',
  deleted_products_view: '지운 매물 기록',
  login_history_view: '로그인 기록',
};

export default function AdminAccessLogPanel() {
  const [items, setItems] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await api<{ items: AccessLog[] }>('/admin/access-logs?limit=100');
      setItems(data.items || []);
    } catch { setError('열람 기록을 불러오지 못했어요.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-900">개인정보 열람 기록</h3>
        <button onClick={load} className="text-[11px] font-bold text-gray-700 underline">새로고침</button>
      </div>
      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">탈퇴 회원의 원래 정보, 지운 매물 기록, 로그인 기록을 본 관리자와 시각입니다. 2년 보관 후 자동 삭제됩니다. 탈퇴 5년이 지난 회원의 원래 정보와 지운 지 5년 지난 매물은 매일 새벽 자동으로 파기됩니다.</p>
      {loading ? (
        <p className="text-xs text-gray-500 mt-3">불러오는 중</p>
      ) : error ? (
        <p className="text-xs text-gray-700 mt-3">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-500 mt-3">아직 열람 기록이 없어요.</p>
      ) : (
        <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
          {items.map((l) => (
            <div key={l.id} className="text-[11px] text-gray-700 flex flex-wrap gap-x-2 border-b border-gray-100 pb-1.5">
              <span className="text-gray-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="font-bold text-gray-900">{l.admin?.name || '관리자'}</span>
              <span>{ACTION_LABEL[l.action] || l.action}</span>
              {l.targetId && <span className="text-gray-500 font-mono">{l.targetId.slice(0, 8)}</span>}
              {l.detail && <span className="text-gray-500">"{l.detail}"</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
