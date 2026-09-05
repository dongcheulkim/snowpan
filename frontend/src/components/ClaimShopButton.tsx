// "이 매장 사장님이신가요? 직접 관리하기" — 시딩 매장(claimable=true) 전용.
// 사업자등록증 업로드 → POST /shop-claims → 관리자 승인 시 소유권 이전. 이미 사장님이 관리 중인 매장엔 노출되지 않음.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser, uploadImages } from '../api';
import { toastSuccess, toastError } from './Toast';

interface Props {
  shopType: 'skishop' | 'repair' | 'rental' | 'accommodation';
  shopId: string;
  ownerId?: string;
  claimable?: boolean;
}

export default function ClaimShopButton({ shopType, shopId, ownerId, claimable }: Props) {
  const me = getUser();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!claimable) return null;
  if (me && (me.id === ownerId || me.role === 'admin')) return null;
  if (!me) {
    return (
      <Link to="/login" className="block w-full py-2 text-center text-xs font-bold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
        이 매장 사장님이신가요? 로그인 후 직접 관리하기 →
      </Link>
    );
  }

  const submit = async () => {
    if (!file) { toastError('사업자등록증을 업로드해주세요.'); return; }
    setBusy(true);
    try {
      const urls = await uploadImages([file]);
      await api('/shop-claims', {
        method: 'POST',
        body: { shopType, shopId, businessLicense: urls[0], message: msg || undefined },
      });
      toastSuccess('매장 관리 요청이 접수되었습니다.\n관리자 확인 후 소유권이 이전됩니다.');
      setOpen(false); setFile(null); setMsg('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '요청 처리에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full py-2 text-xs font-bold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
        이 매장 사장님이신가요? 직접 관리하기 →
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-t-2xl p-5 space-y-3 animate-[slideUp_.25s_ease-out]" onClick={e => e.stopPropagation()}>
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
            <h3 className="text-sm font-bold text-gray-900">매장 직접 관리 요청</h3>
            <p className="text-xs text-gray-500">사업자등록증으로 본인 확인 후, 관리자가 승인하면 이 매장을 사장님 대시보드에서 직접 수정·관리할 수 있어요.</p>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-sky-300 rounded-lg cursor-pointer hover:border-sky-500 bg-sky-50/50">
              {file ? <span className="text-xs text-sky-600 font-medium">{file.name}</span> : <span className="text-xs text-sky-600 font-medium">사업자등록증 업로드</span>}
              <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={2} placeholder="관리자에게 전할 말 (선택)" className="w-full px-3 py-2 rounded-lg text-sm bg-snow border border-gray-200 text-gray-900 placeholder-gray-400 resize-none" />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium border border-gray-200">취소</button>
              <button onClick={submit} disabled={!file || busy} className="flex-1 py-2.5 bg-sky-500 text-white rounded-lg text-sm font-bold disabled:opacity-30">
                {busy ? '접수 중...' : '요청하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
