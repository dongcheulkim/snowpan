import { useEffect } from 'react';

// Warn before unload/reload/close when `dirty` is true.
// React Router v6 doesn't ship Prompt; in-app back navigation will still happen
// silently, but browser-level back/close/refresh will get the native prompt.
export function useUnloadGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
