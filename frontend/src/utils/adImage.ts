// 광고 이미지 초점·확대·맞춤 — imagePos 문자열 하나에 담는다.
//   "X% Y%"            초점만 (사진이 칸을 꽉 채움, object-fit: cover)
//   "X% Y% S"          + 확대 배율 S(1~3)
//   "X% Y% [S] fit"    사진 전체 보이기(object-fit: contain) — 남는 자리는 같은 사진을 흐리게 깔아 채운다
// cover 렌더는 object-position(X% Y%) 에 transform: scale(S) 를 같은 점(transform-origin) 기준으로 얹는다.
// 칸의 (X%,Y%) 지점에 사진의 (X%,Y%) 지점이 고정된 채 그 주변이 확대돼, 드래그(초점)와 확대가 서로 어긋나지 않는다.
// S ≥ 1 이면 확대해도 칸이 항상 사진으로 덮인다(빈 여백 없음). 1 미만 축소는 "전체 보이기" 모드가 대신한다.
import type { CSSProperties } from 'react';

export const AD_IMAGE_SCALE_MIN = 1;
export const AD_IMAGE_SCALE_MAX = 3;

export type AdImageFit = 'cover' | 'contain';
export interface AdImageFocus { x: number; y: number; scale: number; fit: AdImageFit }

export function parseImagePos(v?: string | null): AdImageFocus {
  const m = typeof v === 'string' ? v.trim().match(/^(\d{1,3})% (\d{1,3})%(?: ([0-9]+(?:\.[0-9]+)?))?( fit)?$/) : null;
  if (!m) return { x: 50, y: 50, scale: 1, fit: 'cover' };
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  return {
    x: clamp(Number(m[1]), 0, 100),
    y: clamp(Number(m[2]), 0, 100),
    scale: m[3] ? clamp(Number(m[3]), AD_IMAGE_SCALE_MIN, AD_IMAGE_SCALE_MAX) : 1,
    fit: m[4] ? 'contain' : 'cover',
  };
}

export function formatImagePos(f: AdImageFocus): string {
  const x = Math.round(f.x); const y = Math.round(f.y);
  const s = Math.round(f.scale * 100) / 100;
  return `${x}% ${y}%${s > 1 && f.fit !== 'contain' ? ` ${s}` : ''}${f.fit === 'contain' ? ' fit' : ''}`;
}

// cover 모드 <img className="object-cover"> 에 얹을 style (contain 모드는 AdImage 컴포넌트가 처리)
export function adImageStyle(v?: string | null): CSSProperties {
  const f = parseImagePos(v);
  const pos = `${f.x}% ${f.y}%`;
  if (f.fit === 'contain' || f.scale <= 1) return { objectPosition: pos };
  return { objectPosition: pos, transform: `scale(${f.scale})`, transformOrigin: pos };
}
