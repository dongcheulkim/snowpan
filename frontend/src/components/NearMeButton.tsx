// 목록 상단 "내 주변" 토글 — 켜면 카드에 거리가 붙고 가까운 순으로 정렬된다.
import type { useMyLocation } from '../hooks/useMyLocation';

type My = ReturnType<typeof useMyLocation>;

const HINT: Record<string, string> = {
  denied: '위치 권한이 꺼져 있어요. 브라우저·앱 설정에서 허용해 주세요.',
  unsupported: '이 기기에서는 위치를 사용할 수 없어요.',
  error: '위치를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.',
};

export default function NearMeButton({ my, note }: { my: My; note?: string }) {
  const on = my.status === 'ok' && !!my.coords;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => (on ? my.clear() : my.request())}
        disabled={my.status === 'asking'}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
          on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-snow text-gray-700 border-gray-200 hover:bg-gray-100'
        } disabled:opacity-60`}
      >
        {my.status === 'asking' ? '위치 확인 중...' : on ? '내 주변 · 가까운 순 (해제)' : '내 주변'}
      </button>
      {on && note && <span className="text-[11px] text-gray-500">{note}</span>}
      {HINT[my.status] && <span className="text-[11px] text-red-500">{HINT[my.status]}</span>}
    </div>
  );
}
