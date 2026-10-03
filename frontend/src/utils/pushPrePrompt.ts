// 알림 안내창(PushPrePrompt)과 push.ts 사이의 연결 — 컴포넌트 파일에 함수를 같이 두면 fast-refresh 린트에 걸려 분리.
type Resolver = (ok: boolean) => void;
let pending: Resolver | null = null;
let setVisibleRef: ((v: boolean) => void) | null = null;

export function bindPushPrePrompt(setVisible: ((v: boolean) => void) | null): void { setVisibleRef = setVisible; }
export function answerPushPrePrompt(ok: boolean): void { const r = pending; pending = null; r?.(ok); }
// push.ts 가 호출: 안내창을 띄우고 사용자가 고를 때까지 기다림. 안내창이 안 붙어 있으면(비정상) 그냥 시스템 창으로.
export async function askPushPermission(): Promise<boolean> {
  await waitForUpdatePrompt();
  if (!setVisibleRef) return true;
  return new Promise<boolean>((resolve) => { pending = resolve; setVisibleRef?.(true); });
}

// 업데이트 팝업이 먼저 뜨도록(사장님 2026-10-04): 버전 확인 중이거나 팝업이 열려 있으면 알림 안내는 그 뒤로 미룸 (최대 15초)
let updateBusy = true; // 앱 시작 직후엔 버전 확인 전이라 바쁜 상태로 시작
let updateWaiters: (() => void)[] = [];
export function setUpdatePromptBusy(busy: boolean): void { updateBusy = busy; if (!busy) { const w = updateWaiters; updateWaiters = []; w.forEach((r) => r()); } }
export function waitForUpdatePrompt(): Promise<void> {
  if (!updateBusy) return Promise.resolve();
  return new Promise<void>((resolve) => { updateWaiters.push(resolve); setTimeout(resolve, 15_000); });
}
