import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import { toastSuccess, toastError } from './Toast';

// 매장 신고 버튼 — 폐업·잘못된 정보·부적절 콘텐츠 제보. 5종 매장 상세에서 재사용.
// 접수되면 관리자 신고함(/admin)에 유형·매장명·바로가기와 함께 표시됨.

const REASONS = ['폐업한 것 같아요', '정보가 잘못됐어요 (전화·주소 등)', '운영하지 않는 매장 같아요', '부적절한 사진·설명이 있어요', '기타'];

interface Props {
  shopType: 'skishop' | 'repair' | 'rental' | 'lesson' | 'accommodation';
  shopId: string;
  ownerId?: string | null; // 본인 매장이면 버튼 숨김
}

export default function ShopReportButton({ shopType, shopId, ownerId }: Props) {
  const navigate = useNavigate();
  const user = getUser();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user && ownerId && user.id === ownerId) return null; // 본인 매장

  const submit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      await api('/reports', { method: 'POST', body: { type: shopType, targetId: shopId, reason, description: desc.trim() || undefined } });
      toastSuccess('접수되었습니다. 확인 후 조치할게요.');
      setOpen(false);
      setReason('');
      setDesc('');
    } catch (e) {
      toastError(e instanceof Error ? e.message : '접수에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="text-center pt-1">
        <button
          type="button"
          onClick={() => { if (!user) { navigate('/login'); return; } setOpen(true); }}
          className="text-[11px] text-gray-400 underline underline-offset-2 hover:text-gray-600 transition-colors"
        >폐업했거나 정보가 잘못됐나요? 신고하기</button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setOpen(false)} />
          <div className="relative bg-snow rounded-xl p-5 w-full max-w-sm border border-gray-300">
            <h3 className="text-base font-bold text-gray-900 mb-1">매장 신고 · 정보 제보</h3>
            <p className="text-xs text-gray-500 mb-4">확인 후 정보를 바로잡거나 내리겠습니다.</p>
            <div className="space-y-2 mb-3">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border transition-colors ${reason === r ? 'border-sky-400 bg-sky-50 text-sky-700 font-bold' : 'border-gray-200 bg-white text-gray-700'}`}
                >{r}</button>
              ))}
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="자세한 내용 (선택) — 예: 전화해보니 없는 번호예요"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 resize-none mb-4"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)} disabled={submitting} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium text-sm border border-gray-200">취소</button>
              <button type="button" onClick={submit} disabled={!reason || submitting} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-sm disabled:opacity-40">{submitting ? '접수 중...' : '신고하기'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
