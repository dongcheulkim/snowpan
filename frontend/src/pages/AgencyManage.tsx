import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { toastSuccess, toastError } from '../components/Toast';
import { requestTossPayment, tossConfigured } from '../toss';

interface Agency {
  id: string; name: string; description?: string | null; website: string; phone?: string | null; kakao?: string | null;
  image?: string | null; countries?: string | null; resortSlugs?: string | null; approved: boolean;
  paidUntil?: string | null; signupPaid?: boolean; viewCount?: number;
}
interface Deal {
  id: string; title: string; price?: number | null; originalPrice?: number | null; description?: string | null;
  image?: string | null; link: string; badge?: string | null; resortId?: string | null; active: boolean; order: number;
  resort?: { slug: string; name: string } | null; clickCount?: number;
}
interface ResortOpt { id: string; slug: string; name: string; scope?: string }

const inputCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900';
const emptyDeal: Partial<Deal> = { title: '', link: '', description: '', badge: '', image: '', resortId: '', active: true, order: 0 };

export default function AgencyManage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [sel, setSel] = useState<Agency | null>(null);
  const [resorts, setResorts] = useState<ResortOpt[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [prof, setProf] = useState<Partial<Agency>>({});
  const [dForm, setDForm] = useState<Partial<Deal>>(emptyDeal);
  const [editDId, setEditDId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<{ signupFee: number; monthlyFee: number; betaFree?: boolean } | null>(null);
  const [months, setMonths] = useState(1);
  const [paying, setPaying] = useState(false);

  const betaFree = !!pricing?.betaFree;
  const paidActive = !!sel?.paidUntil && new Date(sel.paidUntil).getTime() > Date.now();
  const active = !!sel?.approved && (betaFree || paidActive);

  useEffect(() => {
    document.title = '여행사 관리';
    Promise.all([
      api<Agency[]>('/agencies/my').catch(() => []),
      api<ResortOpt[]>('/overseas/resorts').catch(() => []),
    ]).then(([a, r]) => {
      setAgencies(a); setResorts(r.filter((x) => x.scope !== '국내')); // 딜 연결은 해외 리조트만 (국내는 여행사 섹션 없음)
      if (a[0]) { setSel(a[0]); setProf(a[0]); }
    }).finally(() => setLoading(false));
    api<{ signupFee: number; monthlyFee: number }>('/agencies/billing/pricing').then(setPricing).catch(() => {});
  }, []);

  useEffect(() => {
    if (sel) api<Deal[]>(`/agencies/${sel.id}/deals`).then(setDeals).catch(() => setDeals([]));
    else setDeals([]);
  }, [sel]);

  const estAmount = pricing ? (sel?.signupPaid ? 0 : pricing.signupFee) + pricing.monthlyFee * months : 0;

  const startPayment = async () => {
    if (!sel) return;
    if (!tossConfigured()) { toastError('결제 준비 중이에요. 잠시 후 다시 시도해주세요.'); return; }
    setPaying(true);
    try {
      const order = await api<{ orderId: string; amount: number; orderName: string }>(`/agencies/${sel.id}/subscribe`, { method: 'POST', body: { months } });
      const origin = window.location.origin;
      await requestTossPayment({
        amount: order.amount,
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${origin}/overseas/agency/pay/success`,
        failUrl: `${origin}/overseas/agency/pay/fail`,
        customerName: sel.name,
      });
    } catch (e) {
      toastError(e instanceof Error ? e.message : '결제를 시작하지 못했어요.');
      setPaying(false);
    }
  };

  const saveProfile = async () => {
    if (!sel) return;
    setSaving(true);
    try {
      const updated = await api<Agency>(`/agencies/${sel.id}`, { method: 'PUT', body: prof });
      toastSuccess('저장했어요.');
      setAgencies((p) => p.map((a) => a.id === updated.id ? updated : a));
      setSel(updated);
    } catch (e) { toastError(e instanceof Error ? e.message : '저장 실패'); }
    finally { setSaving(false); }
  };

  const saveDeal = async () => {
    if (!sel) return;
    if (!dForm.title || !dForm.link) { toastError('제목·링크는 필수예요.'); return; }
    setSaving(true);
    try {
      const body = { ...dForm, resortId: dForm.resortId || null };
      if (editDId) await api(`/agencies/${sel.id}/deals/${editDId}`, { method: 'PUT', body });
      else await api(`/agencies/${sel.id}/deals`, { method: 'POST', body });
      toastSuccess('저장했어요.'); setDForm(emptyDeal); setEditDId(null);
      api<Deal[]>(`/agencies/${sel.id}/deals`).then(setDeals).catch(() => {});
    } catch (e) { toastError(e instanceof Error ? e.message : '저장 실패'); }
    finally { setSaving(false); }
  };
  const delDeal = async (d: Deal) => {
    if (!sel || !confirm(`"${d.title}" 삭제할까요?`)) return;
    try { await api(`/agencies/${sel.id}/deals/${d.id}`, { method: 'DELETE' }); setDeals((p) => p.filter((x) => x.id !== d.id)); }
    catch (e) { toastError(e instanceof Error ? e.message : '삭제 실패'); }
  };

  if (loading) return <div className="text-center py-12 text-gray-500 text-sm">불러오는 중...</div>;

  if (agencies.length === 0) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3"><Link to="/overseas" className="text-gray-500 text-lg">←</Link><h1 className="text-xl font-bold text-gray-900">여행사 관리</h1></div>
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-600">등록한 여행사가 없어요.</p>
          <Link to="/overseas/agency/register" className="inline-block mt-3 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-bold">여행사 등록하기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3"><Link to="/overseas" className="text-gray-500 text-lg">←</Link><h1 className="text-xl font-bold text-gray-900">여행사 관리</h1></div>

      {agencies.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {agencies.map((a) => (
            <button key={a.id} onClick={() => { setSel(a); setProf(a); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${sel?.id === a.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{a.name}</button>
          ))}
        </div>
      )}

      {sel && (
        <>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">{sel.name}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${active ? 'bg-green-100 text-green-700' : sel.approved ? 'bg-sky-100 text-sky-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {active ? '노출중 (구독)' : sel.approved ? '결제 필요' : '승인 대기중'}
              </span>
            </div>
            {!sel.approved && <p className="text-[11px] text-gray-500 mt-1">{betaFree ? '관리자 승인 후 무료로 노출돼요 (베타 기간).' : '관리자 승인 후 구독 결제를 하면 노출돼요.'}</p>}
            {active && !betaFree && sel.paidUntil && <p className="text-[11px] text-gray-500 mt-1">구독 만료: {new Date(sel.paidUntil).toLocaleDateString('ko-KR')}</p>}

            {/* 베타 무료 안내 */}
            {sel.approved && betaFree && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-bold text-mint">베타 기간 무료 노출 중</p>
                <p className="text-[11px] text-gray-500 mt-0.5">정식 오픈 후에는 가입비 {(pricing?.signupFee ?? 100000).toLocaleString()}원 + 월 구독료가 적용될 예정이에요.</p>
              </div>
            )}

            {/* 구독 결제 (베타 종료 후) */}
            {sel.approved && !betaFree && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs font-bold text-gray-900 mb-1.5">{paidActive ? '구독 연장' : '구독 시작'}</div>
                <div className="flex gap-1.5 mb-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button key={m} onClick={() => setMonths(m)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${months === m ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{m}개월</button>
                  ))}
                </div>
                {pricing && (
                  <p className="text-[11px] text-gray-500 mb-2">
                    {!sel.signupPaid && <>가입비 {pricing.signupFee.toLocaleString()}원 + </>}
                    월 {pricing.monthlyFee.toLocaleString()}원 × {months}개월 = <b className="text-gray-900">{estAmount.toLocaleString()}원</b>
                  </p>
                )}
                <button onClick={startPayment} disabled={paying} className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-bold disabled:opacity-50">
                  {paying ? '결제 진행 중...' : `${estAmount.toLocaleString()}원 결제하기`}
                </button>
                <p className="text-[10px] text-gray-400 mt-1 text-center">토스페이먼츠 안전 결제</p>
              </div>
            )}
          </div>

          {/* 페이지 꾸미기 / 보기 */}
          <div className="flex gap-2">
            <Link to="/overseas/agency/design" className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-bold text-center">페이지 꾸미기</Link>
            {active && <Link to={`/agency/${sel.id}`} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold text-center">내 페이지 보기</Link>}
          </div>

          {/* 프로필 수정 */}
          <div className="card p-4 space-y-2">
            <div className="text-sm font-bold text-gray-900">프로필</div>
            <input className={inputCls} placeholder="상호명" value={prof.name || ''} onChange={(e) => setProf({ ...prof, name: e.target.value })} />
            <input className={inputCls} placeholder="예약/홈페이지 링크" value={prof.website || ''} onChange={(e) => setProf({ ...prof, website: e.target.value })} />
            <div className="flex gap-2">
              <input className={inputCls} placeholder="전화" value={prof.phone || ''} onChange={(e) => setProf({ ...prof, phone: e.target.value })} />
              <input className={inputCls} placeholder="카카오채널 URL" value={prof.kakao || ''} onChange={(e) => setProf({ ...prof, kakao: e.target.value })} />
            </div>
            <textarea className={inputCls} rows={3} placeholder="소개" value={prof.description || ''} onChange={(e) => setProf({ ...prof, description: e.target.value })} />
            <input className={inputCls} placeholder="취급 리조트 slug (콤마: niseko,hakuba)" value={prof.resortSlugs || ''} onChange={(e) => setProf({ ...prof, resortSlugs: e.target.value })} />
            <button onClick={saveProfile} disabled={saving} className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-bold disabled:opacity-50">프로필 저장</button>
          </div>

          {/* 딜 관리 (구독중일 때만) */}
          {active ? (
            <>
              <div className="card p-4 space-y-2">
                <div className="text-sm font-bold text-gray-900">{editDId ? '상품 수정' : '여행 상품 등록'}</div>
                <input className={inputCls} placeholder="상품명 *" value={dForm.title || ''} onChange={(e) => setDForm({ ...dForm, title: e.target.value })} />
                <input className={inputCls} placeholder="예약 링크 (https) *" value={dForm.link || ''} onChange={(e) => setDForm({ ...dForm, link: e.target.value })} />
                <div className="flex gap-2">
                  <input className={inputCls} type="number" placeholder="가격(원, 비우면 문의)" value={dForm.price ?? ''} onChange={(e) => setDForm({ ...dForm, price: e.target.value === '' ? null : Number(e.target.value) })} />
                  <input className={inputCls} type="number" placeholder="정가(선택)" value={dForm.originalPrice ?? ''} onChange={(e) => setDForm({ ...dForm, originalPrice: e.target.value === '' ? null : Number(e.target.value) })} />
                </div>
                <div className="flex gap-2">
                  <input className={inputCls} placeholder="뱃지(특가 등)" value={dForm.badge || ''} onChange={(e) => setDForm({ ...dForm, badge: e.target.value })} />
                  <select className={inputCls} value={dForm.resortId || ''} onChange={(e) => setDForm({ ...dForm, resortId: e.target.value })}>
                    <option value="">리조트 연결(선택)</option>
                    {resorts.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <input className={inputCls} placeholder="설명" value={dForm.description || ''} onChange={(e) => setDForm({ ...dForm, description: e.target.value })} />
                <input className={inputCls} placeholder="이미지 URL(https, 선택)" value={dForm.image || ''} onChange={(e) => setDForm({ ...dForm, image: e.target.value })} />
                <div className="flex gap-2">
                  <button onClick={saveDeal} disabled={saving} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold disabled:opacity-50">{editDId ? '수정' : '등록'}</button>
                  {editDId && <button onClick={() => { setEditDId(null); setDForm(emptyDeal); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold">취소</button>}
                </div>
              </div>

              <div className="space-y-2">
                {deals.map((d) => (
                  <div key={d.id} className="card p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{d.title}</p>
                      <p className="text-[11px] text-gray-500 truncate">{d.resort?.name || '메인'} · {d.price != null ? `${d.price.toLocaleString()}원` : '문의'} · 클릭 {d.clickCount ?? 0}{d.active === false ? ' · 숨김' : ''}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => { setEditDId(d.id); setDForm({ ...d, resortId: d.resortId || '' }); window.scrollTo(0, 0); }} className="px-2.5 py-1 text-xs font-bold text-sky-600 bg-sky-50 rounded">수정</button>
                      <button onClick={() => delDeal(d)} className="px-2.5 py-1 text-xs font-bold text-red-500 bg-red-50 rounded">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
