// 알림 안내창(PushPrePrompt)과 push.ts 사이의 연결 — 컴포넌트 파일에 함수를 같이 두면 fast-refresh 린트에 걸려 분리.
type Resolver = (ok: boolean) => void;
let pending: Resolver | null = null;
let setVisibleRef: ((v: boolean) => void) | null = null;

export function bindPushPrePrompt(setVisible: ((v: boolean) => void) | null): void { setVisibleRef = setVisible; }
export function answerPushPrePrompt(ok: boolean): void { const r = pending; pending = null; r?.(ok); }
// push.ts 가 호출: 안내창을 띄우고 사용자가 고를 때까지 기다림. 안내창이 안 붙어 있으면(비정상) 그냥 시스템 창으로.
export function askPushPermission(): Promise<boolean> {
  if (!setVisibleRef) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => { pending = resolve; setVisibleRef?.(true); });
}
