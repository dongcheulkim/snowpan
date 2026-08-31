// 마우스(정밀 포인터) 환경 감지 — PC 에서만 화살표 버튼 노출용.
// 터치 기기는 스와이프가 자연스러워 버튼이 오히려 시야를 가림.
export const hasMouse =
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;
