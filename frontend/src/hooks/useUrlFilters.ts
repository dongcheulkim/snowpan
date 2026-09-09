import { useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

// 목록 필터(리조트·지역·서비스 등)를 URL 쿼리에 보관한다.
// 배경(사용자 신고 2026-09-09): 렌탈샵 → 휘닉스평창 → 매장 상세 → "렌탈샵 목록" 으로 돌아오면 필터가 풀려 전체 목록이 나왔다.
// 필터가 URL 에 있으면 뒤로가기·"목록" 링크(useBackTo)·새로고침·공유 모두에서 고른 그대로 유지된다.
// defaults 는 모듈 상수로 넘길 것(참조가 바뀌면 매 렌더 재계산).
export function useUrlFilters<T extends Record<string, string>>(defaults: T): [T, (patch: Partial<T>) => void] {
  const [sp, setSp] = useSearchParams();
  const values = useMemo(() => {
    const o: Record<string, string> = { ...defaults };
    for (const k of Object.keys(defaults)) {
      const v = sp.get(k);
      if (v !== null && v !== '') o[k] = v;
    }
    return o as T;
  }, [sp, defaults]);
  const set = useCallback((patch: Partial<T>) => {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === defaults[k]) n.delete(k);
        else n.set(k, String(v));
      }
      return n;
    }, { replace: true });
  }, [setSp, defaults]);
  return [values, set];
}

// 목록 카드가 상세로 갈 때 state.from 에 "목록 경로 + 쿼리"를 실어 보내고, 상세의 "목록" 링크는 그 값으로 돌아간다.
export function useListHere(): string {
  const loc = useLocation();
  return `${loc.pathname}${loc.search}`;
}

export function useBackTo(fallback: string): string {
  const { state } = useLocation();
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : fallback;
}
