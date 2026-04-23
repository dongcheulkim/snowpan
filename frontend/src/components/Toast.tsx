import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; type: ToastType; }

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
export const toastInfo = (m: string) => toast(m, 'info');

export default function ToastHost() {
  const [list, setList] = useState<ToastItem[]>(items);
  useEffect(() => {
    listeners.add(setList);
    return () => { listeners.delete(setList); };
  }, []);

  if (list.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      {list.map(it => {
        const bg = it.type === 'success' ? 'bg-emerald-500' : it.type === 'error' ? 'bg-coral' : 'bg-gray-800';
        return (
          <div
            key={it.id}
            role="status"
            className={`pointer-events-auto px-4 py-2.5 rounded-xl shadow-lg text-white text-sm font-medium max-w-[90vw] animate-fade-in ${bg}`}
          >
            {it.message}
          </div>
        );
      })}
    </div>
  );
}
