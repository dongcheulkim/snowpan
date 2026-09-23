import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useMeta } from '../hooks/useMeta';
import { toastError, toastSuccess } from '../components/Toast';

// 매장 직원 초대 링크 (/invite/:code) — 사장님이 보낸 링크를 직원이 로그인한 채 열고 "참여"를 누르면 그 매장을 함께 관리한다. 2026-09-23
interface Preview {
  shopType: string; shopId: string; shopName: string; label: string; ownerName?: string | null;
  valid: boolean; reason?: string | null; isOwner: boolean; alreadyStaff: boolean;
}

export default function InviteAccept() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useMeta({ title: '매장 직원 초대' });

  useEffect(() => {
    if (!code) return;
    api<Preview>(`/shop-staff/invites/${code}`)
      .then(setInfo)
      .catch((e) => setError(e instanceof Error ? e.message : '초대 링크를 확인하지 못했어요.'));
  }, [code]);

  const accept = async () => {
    if (!code || busy) return;
    setBusy(true);
    try {
      const r = await api<{ message: string }>(`/shop-staff/invites/${code}/accept`, { method: 'POST' });
      toastSuccess(r.message || '참여했어요.');
      navigate('/mypage/shops', { replace: true });
    } catch (e) {
      toastError(e instanceof Error ? e.message : '참여하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 animate-fade-in">
      <h1 className="text-xl font-bold text-gray-900">매장 직원 초대</h1>
      {error ? (
        <div className="card p-6 text-center space-y-3">
          <p className="text-sm text-gray-700">{error}</p>
          <Link to="/mypage" className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">마이 페이지로</Link>
        </div>
      ) : !info ? (
        <div className="text-center py-12 text-gray-500 text-sm">확인 중...</div>
      ) : (
        <div className="card p-6 space-y-4">
          <div>
            <p className="text-[11px] text-gray-500">{info.label}{info.ownerName ? ` · 사장님 ${info.ownerName}` : ''}</p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">{info.shopName}</h2>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            직원으로 참여하면 이 매장의 예약 확정·거절, 매장 정보 수정, 소식·이벤트, 리뷰 답글, 광고 신청을 사장님과 함께 할 수 있어요.
            매장 삭제와 직원 관리는 사장님만 할 수 있고, 손님 문의 채팅은 사장님 계정으로 갑니다.
          </p>
          {info.isOwner ? (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">이 매장의 사장님 계정이에요. 직원에게 링크를 보내 주세요.</p>
          ) : info.alreadyStaff ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">이미 이 매장의 직원이에요.</p>
              <Link to="/mypage/shops" className="block w-full min-h-11 py-3 text-center bg-gray-900 text-white rounded-xl text-sm font-bold">사장님 대시보드로</Link>
            </div>
          ) : !info.valid ? (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{info.reason || '쓸 수 없는 링크예요.'}</p>
          ) : (
            <button type="button" onClick={accept} disabled={busy} className="w-full min-h-11 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-40">
              {busy ? '참여 중...' : `'${info.shopName}' 직원으로 참여`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
