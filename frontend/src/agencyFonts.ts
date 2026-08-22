// 여행사 페이지 꾸미기 — 글꼴/크기/정렬 옵션 + 웹폰트 로더.

export interface PageBlock {
  type: 'text' | 'image';
  text?: string;
  image?: string;
  font?: string;  // FONTS id
  size?: string;  // SIZES id
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}

export const FONTS: { id: string; label: string; css: string }[] = [
  { id: 'sans', label: '기본', css: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif" },
  { id: 'serif', label: '명조', css: "'Nanum Myeongjo', serif" },
  { id: 'hand', label: '손글씨', css: "'Gaegu', cursive" },
  { id: 'round', label: '둥근', css: "'Jua', sans-serif" },
];

export const SIZES: { id: string; label: string; css: string }[] = [
  { id: 'sm', label: '작게', css: '0.9rem' },
  { id: 'base', label: '보통', css: '1.05rem' },
  { id: 'lg', label: '크게', css: '1.35rem' },
  { id: 'xl', label: '제목', css: '1.9rem' },
];

export function fontCss(id?: string): string {
  return (FONTS.find((f) => f.id === id) || FONTS[0]).css;
}
export function sizeCss(id?: string): string {
  return (SIZES.find((s) => s.id === id) || SIZES[1]).css;
}

export function blockStyle(b: PageBlock): React.CSSProperties {
  return {
    fontFamily: fontCss(b.font),
    fontSize: sizeCss(b.size),
    textAlign: (b.align || 'left') as React.CSSProperties['textAlign'],
    fontWeight: b.bold ? 700 : 400,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };
}

// 웹폰트(명조·손글씨·둥근) 1회 로드. 실패 시 CSS 폴백 스택이 받쳐줌.
export function loadAgencyFonts(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('agency-fonts')) return;
  const link = document.createElement('link');
  link.id = 'agency-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&family=Gaegu:wght@400;700&family=Jua&display=swap';
  document.head.appendChild(link);
}
