import { useEffect, useState } from 'react';
import { api } from '../api';
import { toastError, toastSuccess } from './Toast';

// 관리자 설정 — 리조트별 개장·폐장일·시즌 메모. 홈 "시즌 오픈 카운트다운"과 리조트 랜딩 "시즌 정보"가 여기 값을 쓴다.
// 날짜는 한국 날짜(KST) 기준으로 저장된다.
interface ResortRow {
  id: string;
  name: string;
  location?: string | null;
  openDate: string | null;
  closeDate: string | null;
  seasonNote: string | null;
}
interface Draft { openDate: string; closeDate: string; seasonNote: string }

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
// ISO 시각 → 'YYYY-MM-DD' (KST)
function toKstYmd(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, '0')}-${String(k.getUTCDate()).padStart(2, '0')}`;
}

export default function AdminResortsPanel() {
  const [rows, setRows] = useState<ResortRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    // /resorts 는 브라우저에 1시간 공개 캐시 — 방금 저장한 값이 다시 안 보이지 않게 쿼리로 우회
    api<ResortRow[]>(`/resorts?_=${Date.now()}`)
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setRows(arr);
        const d: Record<string, Draft> = {};
        for (const r of arr) d[r.id] = { openDate: toKstYmd(r.openDate), closeDate: toKstYmd(r.closeDate), seasonNote: r.seasonNote || '' };
        setDrafts(d);
      })
      .catch(() => toastError('리조트 목록을 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, []);

  const setDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || { openDate: '', closeDate: '', seasonNote: '' }), ...patch } }));
  };

  const save = async (r: ResortRow) => {
    const d = drafts[r.id];
    if (!d || saving) return;
    if (d.openDate && d.closeDate && d.closeDate < d.openDate) { toastError('폐장일은 개장일보다 빠를 수 없어요.'); return; }
    if (d.seasonNote.length > 100) { toastError('메모는 100자까지 쓸 수 있어요.'); return; }
    setSaving(r.id);
    try {
      const updated = await api<ResortRow>(`/resorts/${r.id}/season`, {
        method: 'PUT',
        body: { openDate: d.openDate || null, closeDate: d.closeDate || null, seasonNote: d.seasonNote.trim() || null },
      });
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, openDate: updated.openDate, closeDate: updated.closeDate, seasonNote: updated.seasonNote } : x)));
      setDraft(r.id, { openDate: toKstYmd(updated.openDate), closeDate: toKstYmd(updated.closeDate), seasonNote: updated.seasonNote || '' });
      toastSuccess(`${r.name} 시즌 정보를 저장했어요.`);
    } catch (e) { toastError(e instanceof Error ? e.message : '저장에 실패했어요.'); }
    finally { setSaving(null); }
  };

  const input = 'w-full px-2.5 py-2 bg-snow border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none';

  return (
    <div className="card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-gray-900">리조트 시즌 (개장·폐장일)</h3>
        <p className="text-xs text-gray-500 mt-1">홈 카운트다운은 가장 빠른 개장일 기준이에요. 비워 두면 그 리조트는 카운트다운·시즌 정보에서 빠져요.</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">등록된 리조트가 없어요.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const d = drafts[r.id] || { openDate: '', closeDate: '', seasonNote: '' };
            const dirty = d.openDate !== toKstYmd(r.openDate) || d.closeDate !== toKstYmd(r.closeDate) || d.seasonNote !== (r.seasonNote || '');
            return (
              <div key={r.id} className="p-3 bg-gray-50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900 truncate">{r.name}{r.location ? <span className="text-xs text-gray-400 font-normal ml-1.5">{r.location}</span> : null}</p>
                  <button
                    type="button"
                    onClick={() => save(r)}
                    disabled={saving === r.id || !dirty}
                    className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold disabled:opacity-40 flex-shrink-0"
                  >
                    {saving === r.id ? '저장 중...' : '저장'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="block text-[11px] text-gray-500 mb-1">개장일</span>
                    <input type="date" value={d.openDate} onChange={(e) => setDraft(r.id, { openDate: e.target.value })} className={input} />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] text-gray-500 mb-1">폐장일</span>
                    <input type="date" value={d.closeDate} min={d.openDate || undefined} onChange={(e) => setDraft(r.id, { closeDate: e.target.value })} className={input} />
                  </label>
                </div>
                <label className="block">
                  <span className="block text-[11px] text-gray-500 mb-1">메모 (100자)</span>
                  <input
                    type="text"
                    value={d.seasonNote}
                    maxLength={100}
                    onChange={(e) => setDraft(r.id, { seasonNote: e.target.value })}
                    placeholder="예: 야간 슬로프 12/5부터, 부분 개장"
                    className={input}
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
