import { useEffect, useState } from 'react';
import { api } from '../api';
import { toastError, toastSuccess } from '../utils/toast';

// 관리자 설정 → 앱 버전 안내 (2026-09-25). 최신 버전보다 낮은 앱엔 '새 버전이 있어요' 띠, 최소 버전보다 낮으면 업데이트 전까지 사용 불가 창.
interface Values { iosLatest: string; iosMin: string; androidLatest: string; androidMin: string }
const FIELDS: { key: keyof Values; label: string }[] = [
  { key: 'iosLatest', label: 'iOS 최신 버전' }, { key: 'iosMin', label: 'iOS 최소 지원 버전' },
  { key: 'androidLatest', label: '안드로이드 최신 버전' }, { key: 'androidMin', label: '안드로이드 최소 지원 버전' },
];

export default function AdminAppVersionPanel() {
  const [v, setV] = useState<Values | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api<Values>('/admin/app-version').then(setV).catch(() => toastError('앱 버전 설정을 불러오지 못했어요.')); }, []);
  const save = async () => {
    if (!v || saving) return;
    setSaving(true);
    try { setV(await api<Values>('/admin/app-version', { method: 'PUT', body: v })); toastSuccess('저장했어요. 앱은 다음에 켤 때 안내가 나가요.'); }
    catch (e) { toastError(e instanceof Error ? e.message : '저장하지 못했어요.'); }
    finally { setSaving(false); }
  };
  return (
    <section className="card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-gray-900">앱 업데이트 안내</h3>
        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">스토어에 새 버전이 나가면 최신 버전을 올려 두세요. 그보다 낮은 앱에는 "새 버전이 있어요" 띠가 뜹니다. 최소 지원 버전보다 낮은 앱은 업데이트할 때까지 쓸 수 없으니 꼭 필요할 때만 올리세요. 이 안내는 1.8 이후 앱에서 동작합니다.</p>
      </div>
      {v ? (
        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="text-[11px] text-gray-500">
              {f.label}
              <input value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} placeholder="예: 1.7" className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-900" />
            </label>
          ))}
        </div>
      ) : <p className="text-xs text-gray-500">불러오는 중...</p>}
      <button type="button" onClick={save} disabled={!v || saving} className="min-h-10 px-4 rounded-xl bg-gray-900 text-white text-xs font-bold disabled:opacity-40">{saving ? '저장 중...' : '저장'}</button>
    </section>
  );
}
