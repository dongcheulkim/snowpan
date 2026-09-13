// 앱 스토어 링크 — 승인되면 채운다. 비어 있으면 화면에서 그 버튼을 숨긴다.
// iOS: 2026-09-13 승인. 링크는 사장님이 "이 버전 출시"를 누르고 앱스토어에 뜬 뒤 확정 (apps.apple.com/kr/app/id…).
export const APP_STORE_URL = 'https://apps.apple.com/kr/app/id6810708515'; // 2026-09-13 출시
// Android: 구글 플레이 심사 중 (2026-09-08 제출). 승인되면 채움.
export const PLAY_STORE_URL = '';
export const hasAppLinks = () => !!APP_STORE_URL || !!PLAY_STORE_URL;
