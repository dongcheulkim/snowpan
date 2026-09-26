import { useEffect, useState } from 'react';
import { subscribeToasts, currentToasts, type ToastItem } from '../utils/toast';

export default function ToastHost() {
  const [list, setList] = useState<ToastItem[]>(currentToasts());
  useEffect(() => subscribeToasts(setList), []);

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
