// 광고 이미지 초점·확대 — imagePos 문자열 하나에 담는다: "X% Y%" 또는 "X% Y% S"(S = 확대 배율 1~3).
// 렌더는 object-fit: cover + object-position(X% Y%) 에 transform: scale(S) 를 같은 점(transform-origin X% Y%) 기준으로 얹는다.
// 그러면 칸의 (X%,Y%) 지점에 사진의 (X%,Y%) 지점이 고정된 채 그 주변이 확대돼, 드래그(초점)와 확대가 서로 어긋나지 않는다.
// S ≥ 1 이면 확대해도 칸이 항상 사진으로 덮인다(빈 여백 없음). 1 미만은 cover 로 잘린 사진이 줄어들며 여백이 생겨 허용하지 않는다.
import type { CSSProperties } from 'react';

export const AD_IMAGE_SCALE_MIN = 1;
export const AD_IMAGE_SCALE_MAX = 3;

export interface AdImageFocus { x: number; y: number; scale: number }

export function parseImagePos(v?: string | null): AdImageFocus {
  const m = typeof v === 'string' ? v.trim().match(/^(\d{1,3})% (\d{1,3})%(?: ([0-9]+(?:\.[0-9]+)?))?$/) : null;
  if (!m) return { x: 50, y: 50, scale: 1 };
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  return {
    x: clamp(Number(m[1]), 0, 100),
    y: clamp(Number(m[2]), 0, 100),
    scale: m[3] ? clamp(Number(m[3]), AD_IMAGE_SCALE_MIN, AD_IMAGE_SCALE_MAX) : 1,
  };
}

export function formatImagePos(f: AdImageFocus): string {
  const x = Math.round(f.x); const y = Math.round(f.y);
  const s = Math.round(f.scale * 100) / 100;
  return s > 1 ? `${x}% ${y}% ${s}` : `${x}% ${y}%`;
}

// <img className="object-cover"> 에 얹을 style
export function adImageStyle(v?: string | null): CSSProperties {
  const f = parseImagePos(v);
  const pos = `${f.x}% ${f.y}%`;
  if (f.scale <= 1) return { objectPosition: pos };
  return { objectPosition: pos, transform: `scale(${f.scale})`, transformOrigin: pos };
}
