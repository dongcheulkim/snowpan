// 마이 → 차단한 사용자 — 목록과 해제 (앱스토어 지침 1.2: 사용자 생성 콘텐츠 앱은 차단 기능 필수, 2026-09-11)
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { toastError, toastSuccess } from '../components/Toast';
import { UserIcon } from '../components/Icons';

interface BlockedUser { id: string; name: string; profileImage?: string | null; blockedAt: string; }

export default function MyBlocks() {
  const [items, setItems] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    api<BlockedUser[]>('/blocks')
      .then((rows) => setItems(Array.isArray(rows) ? rows : []))
      .catch((e) => toastError(e instanceof Error ? e.message : '차단 목록을 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const unblock = async (u: BlockedUser) => {
    if (busy) return;
    setBusy(u.id);
    try {
      await api(`/blocks/${u.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((x) => x.id !== u.id));
      toastSuccess(`${u.name}님 차단을 해제했어요.`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : '해제에 실패했어요.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-lg font-bold text-gray-900">차단한 사용자</h1>
      </div>
      <p className="text-xs text-gray-500 mb-4">차단한 사용자와는 서로 채팅할 수 없고, 그 사용자의 글과 댓글이 보이지 않아요. 언제든 해제할 수 있어요.</p>

      {loading ? (
        <div className="text-center py-16 text-gray-500 text-sm">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">차단한 사용자가 없어요.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((u) => (
            <li key={u.id} className="flex items-center gap-3 p-3 bg-snow rounded-xl border border-gray-200">
              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-gray-500 flex-shrink-0">
                {u.profileImage ? <img src={imageUrl(u.profileImage)} alt="" className="w-full h-full object-cover" /> : <UserIcon size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 truncate">{u.name}</div>
                <div className="text-[11px] text-gray-500">{new Date(u.blockedAt).toLocaleDateString('ko-KR')} 차단</div>
              </div>
              <button
                type="button"
                onClick={() => unblock(u)}
                disabled={busy === u.id}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold disabled:opacity-60"
              >
                {busy === u.id ? '해제 중...' : '차단 해제'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
