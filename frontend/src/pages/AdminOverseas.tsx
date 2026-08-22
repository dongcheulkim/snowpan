import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { toastSuccess, toastError } from '../components/Toast';

interface Resort {
  id: string; slug: string; name: string; scope?: string; country: string; continent?: string | null; popular?: boolean;
  region?: string | null; address?: string | null; liftPrice?: string | null; website?: string | null; phone?: string | null;
  nightSki?: boolean; lifts?: number | null;
  image?: string | null; summary?: string | null; description: string;
  season?: string | null; snowType?: string | null; highlights?: string | null;
  slopes?: number | null; bestFor?: string | null; published: boolean; order: number;
}
interface Deal {
  id: string; title: string; partner?: string | null; price?: number | null; originalPrice?: number | null;
  description?: string | null; image?: string | null; link: string; badge?: string | null;
  resortId?: string | null; resort?: { slug: string; name: string } | null;
  featured: boolean; active: boolean; order: number; clickCount?: number;
}

const emptyResort: Partial<Resort> = { slug: '', name: '', scope: '국내', country: '한국', continent: '', popular: false, region: '', address: '', liftPrice: '', website: '', phone: '', nightSki: false, summary: '', description: '', season: '', snowType: '', highlights: '', bestFor: '', image: '', published: true, order: 0 } as Partial<Resort>;
const emptyDeal: Partial<Deal> = { title: '', partner: '', link: '', badge: '', description: '', image: '', resortId: '', featured: false, active: true, order: 0 };

const inputCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900';

export default function AdminOverseas() {
  const [tab, setTab] = useState<'resorts' | 'deals'>('resorts');
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [rForm, setRForm] = useState<Partial<Resort>>(emptyResort);
  const [dForm, setDForm] = useState<Partial<Deal>>(emptyDeal);
  const [editRId, setEditRId] = useState<string | null>(null);
  const [editDId, setEditDId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api<Resort[]>('/overseas/admin/resorts').then(setResorts).catch(() => {});
    api<Deal[]>('/overseas/admin/deals').then(setDeals).catch(() => {});
  };
  useEffect(() => { document.title = '해외 스키 관리'; load(); }, []);

  // ---- 리조트 저장/삭제 ----
  const saveResort = async () => {
    if (!rForm.slug || !rForm.name || !rForm.country || !rForm.description) { toastError('slug·이름·국가·본문은 필수예요.'); return; }
    setSaving(true);
    try {
      if (editRId) await api(`/overseas/resorts/${editRId}`, { method: 'PUT', body: rForm });
      else await api('/overseas/resorts', { method: 'POST', body: rForm });
      toastSuccess('저장했어요.'); setRForm(emptyResort); setEditRId(null); load();
    } catch (e) { toastError(e instanceof Error ? e.message : '저장 실패'); } finally { setSaving(false); }
  };
  const editResort = (r: Resort) => { setEditRId(r.id); setRForm(r); setTab('resorts'); window.scrollTo(0, 0); };
  const delResort = async (r: Resort) => {
    if (!confirm(`"${r.name}" 삭제할까요?`)) return;
    try { await api(`/overseas/resorts/${r.id}`, { method: 'DELETE' }); toastSuccess('삭제했어요.'); load(); }
    catch (e) { toastError(e instanceof Error ? e.message : '삭제 실패'); }
  };

  // ---- 딜 저장/삭제 ----
  const saveDeal = async () => {
    if (!dForm.title || !dForm.link) { toastError('제목·링크는 필수예요.'); return; }
    setSaving(true);
    try {
      const body = { ...dForm, resortId: dForm.resortId || null };
      if (editDId) await api(`/overseas/deals/${editDId}`, { method: 'PUT', body });
      else await api('/overseas/deals', { method: 'POST', body });
      toastSuccess('저장했어요.'); setDForm(emptyDeal); setEditDId(null); load();
    } catch (e) { toastError(e instanceof Error ? e.message : '저장 실패'); } finally { setSaving(false); }
  };
  const editDeal = (d: Deal) => { setEditDId(d.id); setDForm({ ...d, resortId: d.resortId || '' }); setTab('deals'); window.scrollTo(0, 0); };
  const delDeal = async (d: Deal) => {
    if (!confirm(`"${d.title}" 삭제할까요?`)) return;
    try { await api(`/overseas/deals/${d.id}`, { method: 'DELETE' }); toastSuccess('삭제했어요.'); load(); }
    catch (e) { toastError(e instanceof Error ? e.message : '삭제 실패'); }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">해외 스키 관리</h1>
      </div>

      <div className="flex gap-2">
        {(['resorts', 'deals'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-bold ${tab === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {t === 'resorts' ? `스키장 (${resorts.length})` : `딜 (${deals.length})`}
          </button>
        ))}
      </div>

      {tab === 'resorts' ? (
        <>
          <div className="card p-4 space-y-2">
            <div className="text-sm font-bold text-gray-900">{editRId ? '스키장 수정' : '스키장 추가'}</div>
            <input className={inputCls} placeholder="slug (예: niseko)" value={rForm.slug || ''} onChange={(e) => setRForm({ ...rForm, slug: e.target.value })} />
            <input className={inputCls} placeholder="이름 (예: 니세코 / 용평리조트)" value={rForm.name || ''} onChange={(e) => setRForm({ ...rForm, name: e.target.value })} />
            <div className="flex gap-2">
              <select className={inputCls} value={rForm.scope || '국내'} onChange={(e) => setRForm({ ...rForm, scope: e.target.value })}>
                <option value="국내">국내</option>
                <option value="해외">해외</option>
              </select>
              <input className={inputCls} placeholder="국가 (한국/일본)" value={rForm.country || ''} onChange={(e) => setRForm({ ...rForm, country: e.target.value })} />
              <input className={inputCls} placeholder="지역 (강원/홋카이도)" value={rForm.region || ''} onChange={(e) => setRForm({ ...rForm, region: e.target.value })} />
            </div>
            <input className={inputCls} placeholder="위치/주소" value={rForm.address || ''} onChange={(e) => setRForm({ ...rForm, address: e.target.value })} />
            <input className={inputCls} placeholder="리프트권 가격 (예: 1일권 약 9만원대)" value={rForm.liftPrice || ''} onChange={(e) => setRForm({ ...rForm, liftPrice: e.target.value })} />
            <div className="flex gap-2 items-center">
              <input className={inputCls} placeholder="공식 사이트 (https)" value={rForm.website || ''} onChange={(e) => setRForm({ ...rForm, website: e.target.value })} />
              <input className={inputCls} placeholder="전화" value={rForm.phone || ''} onChange={(e) => setRForm({ ...rForm, phone: e.target.value })} />
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 whitespace-nowrap px-2"><input type="checkbox" checked={!!rForm.nightSki} onChange={(e) => setRForm({ ...rForm, nightSki: e.target.checked })} /> 야간</label>
            </div>
            <div className="flex gap-2 items-center">
              <select className={inputCls} value={rForm.continent || ''} onChange={(e) => setRForm({ ...rForm, continent: e.target.value })}>
                <option value="">대륙 선택</option>
                <option value="아시아">아시아</option>
                <option value="유럽">유럽</option>
                <option value="북미">북미</option>
                <option value="기타">기타</option>
              </select>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 whitespace-nowrap px-2"><input type="checkbox" checked={!!rForm.popular} onChange={(e) => setRForm({ ...rForm, popular: e.target.checked })} /> 인기</label>
            </div>
            <input className={inputCls} placeholder="한 줄 소개" value={rForm.summary || ''} onChange={(e) => setRForm({ ...rForm, summary: e.target.value })} />
            <textarea className={inputCls} rows={5} placeholder="본문 가이드 (엔터로 문단 구분)" value={rForm.description || ''} onChange={(e) => setRForm({ ...rForm, description: e.target.value })} />
            <div className="flex gap-2">
              <input className={inputCls} placeholder="시즌 (12월~4월)" value={rForm.season || ''} onChange={(e) => setRForm({ ...rForm, season: e.target.value })} />
              <input className={inputCls} placeholder="설질" value={rForm.snowType || ''} onChange={(e) => setRForm({ ...rForm, snowType: e.target.value })} />
            </div>
            <input className={inputCls} placeholder="하이라이트 (콤마: 파우더,온천)" value={rForm.highlights || ''} onChange={(e) => setRForm({ ...rForm, highlights: e.target.value })} />
            <div className="flex gap-2">
              <input className={inputCls} type="number" placeholder="슬로프 수" value={rForm.slopes ?? ''} onChange={(e) => setRForm({ ...rForm, slopes: e.target.value === '' ? null : Number(e.target.value) })} />
              <input className={inputCls} placeholder="추천 대상" value={rForm.bestFor || ''} onChange={(e) => setRForm({ ...rForm, bestFor: e.target.value })} />
            </div>
            <input className={inputCls} placeholder="이미지 URL (https)" value={rForm.image || ''} onChange={(e) => setRForm({ ...rForm, image: e.target.value })} />
            <div className="flex items-center gap-3 text-xs text-gray-700">
              <label className="flex items-center gap-1"><input type="checkbox" checked={rForm.published !== false} onChange={(e) => setRForm({ ...rForm, published: e.target.checked })} /> 공개</label>
              <label className="flex items-center gap-1">순서 <input className="w-16 px-2 py-1 border border-gray-200 rounded" type="number" value={rForm.order ?? 0} onChange={(e) => setRForm({ ...rForm, order: Number(e.target.value) })} /></label>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveResort} disabled={saving} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold disabled:opacity-50">{editRId ? '수정' : '추가'}</button>
              {editRId && <button onClick={() => { setEditRId(null); setRForm(emptyResort); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold">취소</button>}
            </div>
          </div>

          <div className="space-y-2">
            {resorts.map((r) => (
              <div key={r.id} className="card p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{r.name} <span className="text-[10px] text-gray-400">/{r.slug}</span></p>
                  <p className="text-[11px] text-gray-500">{r.country}{r.region ? ` · ${r.region}` : ''} {r.published ? '' : '· 비공개'}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => editResort(r)} className="px-2.5 py-1 text-xs font-bold text-sky-600 bg-sky-50 rounded">수정</button>
                  <button onClick={() => delResort(r)} className="px-2.5 py-1 text-xs font-bold text-red-500 bg-red-50 rounded">삭제</button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="card p-4 space-y-2">
            <div className="text-sm font-bold text-gray-900">{editDId ? '딜 수정' : '딜 추가'}</div>
            <input className={inputCls} placeholder="제목" value={dForm.title || ''} onChange={(e) => setDForm({ ...dForm, title: e.target.value })} />
            <input className={inputCls} placeholder="파트너 (여행사·리조트명)" value={dForm.partner || ''} onChange={(e) => setDForm({ ...dForm, partner: e.target.value })} />
            <input className={inputCls} placeholder="링크 (https 파트너 URL)" value={dForm.link || ''} onChange={(e) => setDForm({ ...dForm, link: e.target.value })} />
            <div className="flex gap-2">
              <input className={inputCls} type="number" placeholder="가격(원, 비우면 문의)" value={dForm.price ?? ''} onChange={(e) => setDForm({ ...dForm, price: e.target.value === '' ? null : Number(e.target.value) })} />
              <input className={inputCls} type="number" placeholder="정가(선택)" value={dForm.originalPrice ?? ''} onChange={(e) => setDForm({ ...dForm, originalPrice: e.target.value === '' ? null : Number(e.target.value) })} />
            </div>
            <input className={inputCls} placeholder="설명" value={dForm.description || ''} onChange={(e) => setDForm({ ...dForm, description: e.target.value })} />
            <div className="flex gap-2">
              <input className={inputCls} placeholder="뱃지 (특가 등)" value={dForm.badge || ''} onChange={(e) => setDForm({ ...dForm, badge: e.target.value })} />
              <select className={inputCls} value={dForm.resortId || ''} onChange={(e) => setDForm({ ...dForm, resortId: e.target.value })}>
                <option value="">메인 노출 (리조트 미지정)</option>
                {resorts.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <input className={inputCls} placeholder="이미지 URL (https)" value={dForm.image || ''} onChange={(e) => setDForm({ ...dForm, image: e.target.value })} />
            <div className="flex items-center gap-3 text-xs text-gray-700">
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!dForm.featured} onChange={(e) => setDForm({ ...dForm, featured: e.target.checked })} /> 추천(메인)</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={dForm.active !== false} onChange={(e) => setDForm({ ...dForm, active: e.target.checked })} /> 노출</label>
              <label className="flex items-center gap-1">순서 <input className="w-16 px-2 py-1 border border-gray-200 rounded" type="number" value={dForm.order ?? 0} onChange={(e) => setDForm({ ...dForm, order: Number(e.target.value) })} /></label>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveDeal} disabled={saving} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold disabled:opacity-50">{editDId ? '수정' : '추가'}</button>
              {editDId && <button onClick={() => { setEditDId(null); setDForm(emptyDeal); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold">취소</button>}
            </div>
          </div>

          <div className="space-y-2">
            {deals.map((d) => (
              <div key={d.id} className="card p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{d.title}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {d.resort?.name || '메인'} · {d.price != null ? `${d.price.toLocaleString()}원` : '문의'} · 클릭 {d.clickCount ?? 0}
                    {d.featured ? ' · 추천' : ''}{d.active === false ? ' · 숨김' : ''}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => editDeal(d)} className="px-2.5 py-1 text-xs font-bold text-sky-600 bg-sky-50 rounded">수정</button>
                  <button onClick={() => delDeal(d)} className="px-2.5 py-1 text-xs font-bold text-red-500 bg-red-50 rounded">삭제</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
