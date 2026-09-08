// 관리자 대시보드 광고관리 → "초대 링크" — 고객센터 상담에서 정한 조건(자리·기간·금액)으로 링크를 만들어 광고주에게 보낸다.
// 광고주는 링크(/ad-booking/invite/:token)에서 소재만 작성하면 협의 금액으로 예약이 생기고, 입금 확인 후 게시된다.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { toastError, toastSuccess } from './Toast';
import { SLOT_LABELS, AD_CATEGORY_LABELS, AD_PLAN_PRESETS } from '../utils/adLabels';

interface Invite {
  id: string; slotType: string; category: string; periodMonths: number; startDate: string | null; price: number;
  advertiser: string | null; plan: string | null; note: string | null; status: string; effectiveStatus: string; expiresAt: string; createdAt: string; link: string;
  booking: { id: string; status: string; title: string } | null;
}

const STATUS_LABEL: Record<string, string> = { sent: '보냄', used: '소재 접수됨', cancelled: '취소', expired: '기한 지남' };
const CATS = ['skishop', 'repair', 'rental', 'lesson', 'accommodation', 'used', 'community', 'overseas'];

interface Props {
  chatRoomId?: string;        // 고객센터 채팅에서 발급 — 만들면서 그 방에 링크 메시지를 보낸다
  advertiserDefault?: string; // 채팅 상대 이름으로 미리 채움
  compact?: boolean;          // 목록 없이 발급 폼만
  onCreated?: () => void;
}

export default function AdInvitePanel({ chatRoomId, advertiserDefault = '', compact = false, onCreated }: Props = {}) {
  const [list, setList] = useState<Invite[]>([]);
  const [slotType, setSlotType] = useState('main_banner');
  const [category, setCategory] = useState('skishop');
  const [months, setMonths] = useState(12);
  const [startDate, setStartDate] = useState('');
  const [price, setPrice] = useState('');
  const [plan, setPlan] = useState(''); // 결제 방식 라벨 (프리셋 누르면 채워짐, 직접 바꿔도 됨)
  const [advertiser, setAdvertiser] = useState(advertiserDefault);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastLink, setLastLink] = useState('');

  const load = useCallback(() => { if (compact) return; api<Invite[]>('/ad-booking/admin/invites').then(setList).catch(() => {}); }, [compact]);
  useEffect(() => { load(); }, [load]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toastSuccess('링크를 복사했습니다.'); }
    catch { window.prompt('링크를 복사하세요:', text); }
  };

  const create = async () => {
    const p = Number(price.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(p)) { toastError('금액을 숫자로 입력하세요.'); return; }
    setBusy(true);
    try {
      const inv = await api<Invite>('/ad-booking/admin/invites', {
        method: 'POST',
        body: { slotType, category: slotType === 'main_banner' ? 'none' : category, periodMonths: months, startDate: startDate || undefined, price: p, plan: plan || undefined, advertiser: advertiser || undefined, note: note || undefined, chatRoomId },
      });
      if (chatRoomId) { toastSuccess('링크를 채팅방에 보냈습니다.'); onCreated?.(); }
      else { setLastLink(inv.link); await copy(inv.link); }
      setPrice(''); setPlan(''); setNote(''); load();
    } catch (e) { toastError(e instanceof Error ? e.message : '초대 링크를 만들지 못했습니다.'); }
    finally { setBusy(false); }
  };

  const cancel = async (id: string) => {
    if (!confirm('이 초대 링크를 취소할까요? 광고주가 더 이상 열 수 없습니다.')) return;
    try { await api(`/ad-booking/admin/invites/${id}/cancel`, { method: 'POST' }); load(); }
    catch (e) { toastError(e instanceof Error ? e.message : '취소 실패'); }
  };

  const input = 'w-full px-3 py-2 bg-snow border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none';

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div>
          <p className="text-sm font-bold text-gray-900">{chatRoomId ? '이 광고주에게 소재 작성 링크 보내기' : '초대 링크 만들기'}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{chatRoomId ? '상담한 조건을 넣고 만들면 이 채팅방에 링크가 메시지로 들어갑니다. 광고주는 그 링크에서 문구·이미지만 작성합니다.' : '전화·채팅으로 정한 조건을 넣고 만들면 링크가 복사됩니다. 광고주에게 보내면 그 링크에서 광고 문구·이미지만 작성합니다.'}</p>
        </div>
        {/* 공식 요금 프리셋 — 누르면 기간·금액·결제 방식이 채워진다. 협의 금액이 다르면 아래에서 고쳐도 됨 */}
        <div className="flex flex-wrap gap-1.5">
          {(AD_PLAN_PRESETS[slotType] || []).map((pl) => (
            <button
              key={pl.key}
              type="button"
              onClick={() => { setMonths(pl.months); setPrice(String(pl.price)); setPlan(pl.label); }}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${plan === pl.label && price === String(pl.price) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'}`}
            >
              {pl.label} {pl.price.toLocaleString()}원{pl.note ? ` (${pl.note})` : ''}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-600">광고 자리
            <select value={slotType} onChange={(e) => setSlotType(e.target.value)} className={input + ' mt-1'}>
              {Object.entries(SLOT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-600">카테고리
            <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={slotType === 'main_banner'} className={input + ' mt-1 disabled:opacity-40'}>
              {CATS.map((c) => <option key={c} value={c}>{AD_CATEGORY_LABELS[c] || c}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-600">기간(개월)
            <input type="number" min={1} max={12} value={months} onChange={(e) => setMonths(Math.min(12, Math.max(1, Number(e.target.value) || 1)))} className={input + ' mt-1'} />
          </label>
          <label className="text-xs text-gray-600">시작일 (비우면 입금 확인 즉시)
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input + ' mt-1'} />
          </label>
          <label className="text-xs text-gray-600">협의 금액(원)
            <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="예: 6000000 (무료면 0)" className={input + ' mt-1'} />
          </label>
          <label className="text-xs text-gray-600">결제 방식
            <input value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="예: 현금 일시불" className={input + ' mt-1'} />
          </label>
          <label className="text-xs text-gray-600">광고주 상호·담당자
            <input value={advertiser} onChange={(e) => setAdvertiser(e.target.value)} placeholder="예: 메가폰 렌탈 김사장" className={input + ' mt-1'} />
          </label>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모 (선택, 관리자만 봄)" className={input} />
        <button onClick={create} disabled={busy} className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40">{busy ? '만드는 중...' : chatRoomId ? '링크 만들어 채팅으로 보내기' : '링크 만들고 복사'}</button>
        {lastLink && (
          <div className="flex items-center gap-2 text-[11px] text-gray-600 bg-snow border border-gray-200 rounded-lg px-3 py-2">
            <span className="truncate flex-1">{lastLink}</span>
            <button onClick={() => copy(lastLink)} className="font-bold text-gray-900 whitespace-nowrap">다시 복사</button>
          </div>
        )}
      </div>

      {!compact && (
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-900">보낸 링크 {list.length}</p>
        {list.length === 0 && <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-500 text-sm">아직 만든 링크가 없습니다.</div>}
        {list.map((inv) => (
          <div key={inv.id} className="card p-4 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${inv.effectiveStatus === 'used' ? 'bg-emerald-50 text-emerald-700' : inv.effectiveStatus === 'sent' ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-500'}`}>{STATUS_LABEL[inv.effectiveStatus] || inv.effectiveStatus}</span>
              <span className="text-sm font-bold text-gray-900">{inv.advertiser || '(광고주 미기재)'}</span>
              <span className="text-[11px] text-gray-500">{SLOT_LABELS[inv.slotType]}{inv.category !== 'none' ? ` · ${AD_CATEGORY_LABELS[inv.category] || inv.category}` : ''}</span>
            </div>
            <p className="text-[11px] text-gray-500 tabular-nums">
              {inv.periodMonths}개월 · {inv.startDate ? inv.startDate.slice(0, 10) + ' 시작' : '입금 확인 즉시'} · {inv.plan ? `${inv.plan} ` : ''}{inv.price.toLocaleString()}원 · 기한 {inv.expiresAt.slice(0, 10)}
              {inv.note ? ` · ${inv.note}` : ''}
            </p>
            {inv.booking && <p className="text-[11px] text-gray-700">접수된 광고: {inv.booking.title || '(이미지 광고)'} · {inv.booking.status}</p>}
            <div className="flex gap-1.5">
              <button onClick={() => copy(inv.link)} className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-bold text-gray-700">링크 복사</button>
              {inv.effectiveStatus === 'sent' && <button onClick={() => cancel(inv.id)} className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-bold text-red-500">취소</button>}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
