import { toastError, toastSuccess } from '../components/Toast';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, uploadImages, imageUrl } from '../api';
import { adSlotLabelKr } from '../utils/adLabels';
import { CloseIcon, MegaphoneIcon } from '../components/Icons';
import EmptyState from '../components/EmptyState';

interface AdBooking {
  id: string;
  slotType: string;
  category: string | null;
  title: string;
  description?: string | null;
  url?: string | null;
  image?: string | null;
  status: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalPrice: number;
}

const statusLabel: Record<string, string> = {
  pending_payment: '결제 대기', paid: '결제 완료', active: '노출중',
  completed: '종료', cancelled: '취소됨', refunded: '환불됨',
};
const statusColor: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-700', paid: 'bg-blue-100 text-blue-700',
  active: 'bg-mint/20 text-emerald-700', completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-coral/20 text-coral', refunded: 'bg-coral/20 text-coral',
};

export default function MyAds() {
  const [ads, setAds] = useState<AdBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAds = () => {
    api<AdBooking[]>('/ad-booking/my-bookings')
      .then(d => setAds(Array.isArray(d) ? d : []))
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAds(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('이 광고 내역을 삭제하시겠습니까?')) return;
    try {
      await api(`/ad-booking/${id}`, { method: 'DELETE' });
      setAds(prev => prev.filter(a => a.id !== id));
      loadAds();
    } catch { toastError('삭제에 실패했습니다.'); }
  };

  // 광고 소재 수정 — 제목/문구/링크/이미지. 게시 중이어도 즉시 반영 (기간·가격은 수정 불가).
  const [editAd, setEditAd] = useState<AdBooking | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', url: '', image: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editUploading, setEditUploading] = useState(false);

  const openEdit = (ad: AdBooking) => {
    setEditAd(ad);
    setEditForm({ title: ad.title || '', description: ad.description || '', url: ad.url || '', image: ad.image || '' });
  };

  const saveEdit = async () => {
    if (!editAd || editSaving) return;
    if (!editForm.title.trim() && !editForm.image) { toastError('이미지 또는 제목 중 하나는 있어야 합니다.'); return; }
    setEditSaving(true);
    try {
      await api(`/ad-booking/${editAd.id}`, {
        method: 'PUT',
        body: {
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          url: editForm.url.trim(),
          image: editForm.image || null,
          // 이미지를 교체하면 이전 이미지 기준 초점은 무의미 — 중앙으로 리셋 (수정 모달엔 드래그 UI 없음)
          ...(editForm.image && editForm.image !== (editAd.image || '') ? { imagePos: '50% 50%' } : {}),
        },
      });
      toastSuccess(editAd.status === 'active' ? '수정되었습니다. 노출 중인 광고에 바로 반영돼요.' : '수정되었습니다.');
      setEditAd(null);
      loadAds();
    } catch (e) { toastError(e instanceof Error ? e.message : '수정에 실패했습니다.'); }
    finally { setEditSaving(false); }
  };

  // 입금 전(pending_payment)·게시 전(paid)·게시 중(active) 취소 — 백엔드 취소/환불 로직은
  // 이미 있었는데 UI 진입점이 없어 사용자가 취소할 방법이 없었음.
  const handleCancel = async (ad: AdBooking) => {
    const msg = ad.status === 'pending_payment'
      ? '이 예약을 취소하시겠습니까?'
      : ad.status === 'active'
        ? '게시 중인 광고를 취소하면 남은 기간만큼 환불됩니다. 취소하시겠습니까?'
        : '결제된 광고를 취소하면 전액 환불 처리됩니다. 취소하시겠습니까?';
    if (!confirm(msg)) return;
    try {
      await api(`/ad-booking/${ad.id}/cancel`, { method: 'POST' });
      toastSuccess('취소되었습니다.');
      loadAds();
    } catch (e) { toastError(e instanceof Error ? e.message : '취소에 실패했습니다.'); }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
          <h1 className="text-xl font-bold text-gray-900">광고 관리</h1>
        </div>
        <Link to="/ad-booking" className="px-3 py-1.5 bg-accent text-white rounded-lg font-bold text-xs hover:bg-accent-light transition-colors">
          + 광고 신청
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>
      ) : ads.length === 0 ? (
        <EmptyState
          icon={<MegaphoneIcon size={48} strokeWidth={1.4} />}
          title="아직 신청한 광고가 없어요"
          description={"메인 배너·카테고리 광고로 더 많은 노출을\n받아보세요. 베타 기간 무료 노출 기회도 있어요."}
          ctaLabel="광고 신청하기"
          ctaTo="/ad-booking"
        />
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => {
            // 어떤 지면·어떤 카테고리 광고인지 명시 — 예: "카테고리 배너 · 중고거래"
            const slotLabel = adSlotLabelKr(ad.slotType, ad.category);
            const startD = new Date(ad.startDate);
            const endD = new Date(ad.endDate);
            const dateRange = `${startD.getMonth() + 1}.${startD.getDate()} ~ ${endD.getMonth() + 1}.${endD.getDate()}`;
            return (
              <div key={ad.id} className="card p-4 flex items-start justify-between gap-3">
                {ad.image && (
                  <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                    <img src={imageUrl(ad.image, 200)} alt="광고 소재" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColor[ad.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[ad.status] || ad.status}
                    </span>
                    <span className="text-[10px] text-gray-500">{slotLabel}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{ad.title || '(이미지 광고)'}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{dateRange} ({ad.totalDays}일) · {ad.totalPrice.toLocaleString()}원</p>
                </div>
                {['active', 'paid', 'pending_payment'].includes(ad.status) ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {ad.status === 'pending_payment' && (
                      <Link to={`/ad-booking/pay/${ad.id}`} className="text-[11px] font-bold text-white bg-sky-500 rounded-lg px-2.5 py-1.5 transition-colors">카드 결제</Link>
                    )}
                    <button onClick={() => openEdit(ad)} className="text-[11px] font-bold text-sky-600 border border-sky-200 rounded-lg px-2.5 py-1.5 transition-colors">수정</button>
                    {/* 결제 전(pending_payment)만 취소 가능. 결제된 광고는 1년 계약이라 중도 해지 불가 */}
                    {ad.status === 'pending_payment' && (
                      <button onClick={() => handleCancel(ad)} className="text-[11px] font-bold text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors">취소</button>
                    )}
                  </div>
                ) : (
                  <button onClick={() => handleDelete(ad.id)} aria-label="삭제" className="text-gray-500 hover:text-red-400 transition-colors p-1 flex-shrink-0"><CloseIcon size={14} /></button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 광고 소재 수정 모달 — 기간·가격은 과금 영향이라 수정 불가, 소재만 */}
      {editAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !editSaving && setEditAd(null)} />
          <div className="relative bg-snow rounded-xl p-5 w-full max-w-sm border border-gray-300 max-h-[85vh] overflow-y-auto">
            <h3 className="text-base font-bold text-gray-900 mb-1">광고 수정</h3>
            <p className="text-xs text-gray-500 mb-4">
              {editAd.status === 'active' ? '노출 중인 광고에 바로 반영됩니다.' : '노출 시작 전에 자유롭게 수정하세요.'} 기간·금액은 변경되지 않아요.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">제목</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">설명 문구</label>
                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">링크 URL <span className="font-normal">(선택)</span></label>
                <input type="url" value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} placeholder="https://" className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">이미지 <span className="font-normal">(선택)</span></label>
                {editForm.image ? (
                  <div className="relative">
                    <img src={imageUrl(editForm.image, 400)} alt="" className="w-full max-h-32 object-contain rounded-lg border border-gray-200 bg-white" />
                    <button type="button" onClick={() => setEditForm({ ...editForm, image: '' })} className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs">×</button>
                  </div>
                ) : (
                  <label className="block w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-500 cursor-pointer hover:border-gray-400">
                    {editUploading ? '업로드 중...' : '이미지 업로드'}
                    <input type="file" accept="image/*" className="hidden" disabled={editUploading} onChange={async e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setEditUploading(true);
                      try { const urls = await uploadImages([f]); setEditForm(prev => ({ ...prev, image: urls[0] })); }
                      catch { toastError('업로드에 실패했습니다.'); }
                      finally { setEditUploading(false); }
                    }} />
                  </label>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditAd(null)} disabled={editSaving} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium text-sm border border-gray-200">취소</button>
              <button onClick={saveEdit} disabled={editSaving || editUploading} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-sm disabled:opacity-40">{editSaving ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
