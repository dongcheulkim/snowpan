// 토스트 알림 상태·함수 — 화면 어디서든 toastSuccess/toastError 로 띄운다. 표시는 components/Toast.tsx(ToastHost).
export type ToastType = 'success' | 'error' | 'info';
export interface ToastItem { id: number; message: string; type: ToastType; }

let nextId = 1;
const listeners = new Set<(items: ToastItem[]) => void>();
let items: ToastItem[] = [];

function emit() {
  listeners.forEach(l => l([...items]));
}

export function toast(message: string, type: ToastType = 'info', durationMs = 2500) {
  const id = nextId++;
  items = [...items, { id, message, type }];
  emit();
  setTimeout(() => {
    items = items.filter(i => i.id !== id);
    emit();
  }, durationMs);
}

export const toastSuccess = (m: string) => toast(m, 'success');
export const toastError = (m: string) => toast(m, 'error', 3500);

export function subscribeToasts(listener: (items: ToastItem[]) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function currentToasts(): ToastItem[] { return items; }
