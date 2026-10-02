import { useEffect, useState } from 'react';
import { api } from '../api';
import { toastError, toastSuccess } from '../utils/toast';

// 관리자 설정 → 외부 링크 점검 (2026-10-02). 서버가 매일 04시에 사이트의 외부 링크·사진·웹캠 스트림을 전부 열어 본 결과.
interface Item { kind: 'link' | 'image' | 'stream'; src: string; label: string; url: string; code: number | string; fixPath?: string }
interface Report {
  ranAt: string; durationMs: number;
  total: { links: number; images: number; streams: number };
  dead: Item[]; blocked: Item[]; offlineStreams: Item[]; unknown: Item[];
}

const List = ({ title, items, hint }: { title: string; items: Item[]; hint?: string }) => (
  <details className="mt-3" open={items.length > 0 && items.length <= 30}>
    <summary className="text-xs font-bold text-gray-900 cursor-pointer">{title} <span className="text-gray-500 font-medium">{items.length}</span></summary>
    {hint && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
    {items.length === 0 ? <p className="text-[11px] text-gray-500 mt-1">없음</p> : (
      <ul className="mt-1 divide-y divide-gray-100">
        {items.map((it, i) => (
          <li key={i} className="py-1.5 text-[11px] flex items-start gap-2">
            <span className="text-gray-500 flex-shrink-0 w-28 truncate">{it.src}</span>
            <span className="text-gray-900 font-medium flex-shrink-0 max-w-[30%] truncate">{it.label}</span>
            <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-gray-500 underline truncate flex-1">{it.url.replace(/^https?:\/\//, '')}</a>
            <span className="text-gray-500 flex-shrink-0">{String(it.code)}</span>
            {it.fixPath && !it.fixPath.startsWith('/admin') && <a href={it.fixPath} target="_blank" rel="noopener noreferrer" className="text-gray-900 font-bold flex-shrink-0">열기</a>}
          </li>
        ))}
      </ul>
    )}
  </details>
);

export default function AdminLinkHealthPanel() {
  const [report, setReport] = useState<Report | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const d = await api<{ running: boolean; report: Report | null }>('/admin/jobs/link-health'); setReport(d.report); setRunning(d.running); }
    catch { toastError('점검 결과를 불러오지 못했어요.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!running) return; const t = setInterval(load, 20_000); return () => clearInterval(t); }, [running]);

  const runNow = async () => {
    try { await api('/admin/jobs/link-health/run', { method: 'POST' }); setRunning(true); toastSuccess('점검을 시작했어요. 몇 분 걸려요.'); }
    catch (e) { toastError(e instanceof Error ? e.message : '점검을 시작하지 못했어요.'); }
  };

  const ranAt = report ? new Date(report.ranAt).toLocaleString('ko-KR') : null;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-900">외부 링크 점검</h3>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-[11px] font-bold text-gray-700 underline">새로고침</button>
          <button onClick={runNow} disabled={running} className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-gray-900 text-white disabled:opacity-40">{running ? '점검 중' : '지금 점검'}</button>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 mt-1">매일 새벽 4시에 매장 홈페이지, 스키장 투어 링크·웹캠, 상품·여행사 링크, 사진 주소, 국내 웹캠 스트림을 전부 열어 봅니다. 새로 죽은 게 생기면 알림이 와요.</p>
      {loading && !report ? <p className="text-xs text-gray-500 mt-3">불러오는 중</p> : !report ? (
        <p className="text-xs text-gray-500 mt-3">아직 점검 기록이 없어요. 지금 점검을 눌러 주세요.</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[['링크', report.total.links], ['사진', report.total.images], ['웹캠', report.total.streams], ['죽음', report.dead.length]].map(([k, v]) => (
              <div key={String(k)} className="bg-gray-50 rounded-xl py-2"><div className="text-base font-bold text-gray-900">{v}</div><div className="text-[10px] text-gray-500">{k}</div></div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">마지막 점검 {ranAt} · {Math.round(report.durationMs / 1000)}초</p>
          <List title="죽은 링크·사진" items={report.dead} hint="주소가 없어지거나 404 인 것. 매장은 홈페이지 주소를 비우거나 새 주소로, 투어는 관리자에서 링크 교체." />
          <List title="꺼진 웹캠 스트림" items={report.offlineStreams} hint="리조트가 송출을 끈 것(시즌 오프 포함). 시즌 중에도 계속 꺼져 있으면 주소가 바뀐 것." />
          <List title="확인 불가" items={report.unknown} hint="응답이 너무 느린 곳. 다음 점검에서 다시 봅니다." />
          <List title="봇 차단" items={report.blocked} hint="네이버 스마트스토어 등 자동 접속을 막는 곳. 브라우저에서는 정상이라 손댈 필요 없음." />
        </>
      )}
    </div>
  );
}
