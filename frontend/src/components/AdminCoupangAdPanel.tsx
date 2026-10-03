import { useEffect, useState } from 'react';
import { api } from '../api';
import { toastError, toastSuccess } from '../utils/toast';

// 관리자 광고관리 → 쿠팡 광고 카드 (2026-10-02). 쿠팡 파트너스에서 만든 상품 링크·사진·가격을 등록하면 중고 목록 사이에 매물 모양으로 끼어 노출.
interface Card { id: string; title: string; image: string | null; price: number | null; link: string; active: boolean; order: number; clickCount: number }
const empty = { title: '', image: '', price: '', link: '' };

export default function AdminCoupangAdPanel() {
  const [items, setItems] = useState<Card[]>([]);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [pasted, setPasted] = useState(''); // 쿠팡 파트너스 "HTML 복사" 붙여넣기 → 이름·사진·링크 자동 채움
  const [resolving, setResolving] = useState(false);
  const load = () => api<Card[]>('/coupang-ads/admin').then(setItems).catch(() => toastError('쿠팡 카드를 불러오지 못했어요.'));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title.trim() || !form.link.trim()) { toastError('제목과 쿠팡 링크를 넣어 주세요.'); return; }
    setBusy(true);
    try {
      await api('/coupang-ads/admin', { method: 'POST', body: { title: form.title, image: form.image || null, price: form.price ? Number(form.price.replace(/[^0-9]/g, '')) : null, link: form.link } });
      toastSuccess('등록했어요.'); setForm(empty); load();
    } catch (e) { toastError(e instanceof Error ? e.message : '등록하지 못했어요.'); }
    finally { setBusy(false); }
  };
  const resolve = async () => {
    if (!pasted.trim()) { toastError('쿠팡 파트너스에서 "HTML 복사"한 내용을 붙여넣어 주세요.'); return; }
    setResolving(true);
    try {
      const r = await api<{ title: string; image: string | null; link: string }>('/coupang-ads/admin/resolve', { method: 'POST', body: { url: pasted } });
      setForm((f) => ({ ...f, title: r.title, image: r.image || '', link: r.link }));
      toastSuccess('상품 이름·사진·링크를 채웠어요. 가격만 적고 등록하세요.');
      setPasted('');
    } catch (e) { toastError(e instanceof Error ? e.message : '불러오지 못했어요.'); }
    finally { setResolving(false); }
  };
  const toggle = async (c: Card) => { try { await api(`/coupang-ads/admin/${c.id}`, { method: 'PUT', body: { active: !c.active } }); load(); } catch { toastError('변경하지 못했어요.'); } };
  const remove = async (c: Card) => { if (!window.confirm(`'${c.title}' 카드를 지울까요?`)) return; try { await api(`/coupang-ads/admin/${c.id}`, { method: 'DELETE' }); load(); } catch { toastError('지우지 못했어요.'); } };
  const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm';

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900">쿠팡 광고 카드</h3>
        <p className="text-[11px] text-gray-500 mt-1">쿠팡 파트너스 → 링크 생성 → 상품 링크 만들기 → 아래쪽 "이미지+텍스트"의 <b>HTML 복사</b> → 여기 붙여넣고 불러오기. 이름·사진·링크가 채워지면 가격만 적고 등록. 중고거래 목록에 매물 20개마다 1개씩 매물 모양으로 돌아가며 노출됩니다.</p>
      </div>
      <div className="grid gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
        <textarea className={input + ' font-mono text-[11px]'} rows={2} placeholder='<iframe src="https://coupa.ng/…" …></iframe>  ← 쿠팡 파트너스 "HTML 복사" 붙여넣기' value={pasted} onChange={(e) => setPasted(e.target.value)} />
        <button onClick={resolve} disabled={resolving} className="py-2 rounded-lg border border-gray-900 text-gray-900 text-sm font-bold disabled:opacity-40">{resolving ? '불러오는 중' : '상품 정보 불러오기'}</button>
      </div>
      <div className="grid gap-2">
        <input className={input} placeholder="상품 이름 (예: 오클리 스키 고글 플라이트덱)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={input} placeholder="사진 주소 (https://…jpg)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
        <input className={input} placeholder="가격 (숫자만, 예: 189000)" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input className={input} placeholder="쿠팡 파트너스 링크 (https://link.coupang.com/a/…)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
        <button onClick={submit} disabled={busy} className="py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-40">등록</button>
      </div>
      {items.length === 0 ? <p className="text-xs text-gray-500">등록된 카드가 없어요. 카드가 없으면 중고 목록에 아무것도 끼지 않습니다.</p> : (
        <ul className="divide-y divide-gray-100">
          {items.map((c) => (
            <li key={c.id} className="py-2.5 flex items-center gap-3">
              {c.image ? <img src={c.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100 flex-shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold truncate ${c.active ? 'text-gray-900' : 'text-gray-400'}`}>{c.title}</p>
                <p className="text-[11px] text-gray-500">{c.price ? `${c.price.toLocaleString()}원 · ` : ''}클릭 {c.clickCount}</p>
              </div>
              <button onClick={() => toggle(c)} className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border ${c.active ? 'border-gray-900 text-gray-900' : 'border-gray-200 text-gray-500'}`}>{c.active ? '노출 중' : '숨김'}</button>
              <button onClick={() => remove(c)} className="text-[11px] font-bold text-gray-500 underline">삭제</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
