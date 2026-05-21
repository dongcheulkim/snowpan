import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
    // Stale chunk (배포 직후 흔한 케이스) — 한 번만 자동 새로고침
    const msg = error?.message || '';
    if (/(ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed)/i.test(msg)) {
      if (sessionStorage.getItem('chunkReloaded') !== '1') {
        sessionStorage.setItem('chunkReloaded', '1');
        if ('caches' in window) caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {});
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
        }
        setTimeout(() => window.location.reload(), 50);
        return;
      }
    }
    // Sentry가 로드되어 있으면 forward — DSN 형식 검증 후에만.
    try {
      const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
      if (dsn && /^https?:\/\/[^@]+@[^/]+\/\d+/.test(dsn)) {
        import('@sentry/react').then((S) => {
          S.withScope((scope) => {
            scope.setExtra('componentStack', info.componentStack);
            S.captureException(error);
          });
        }).catch(() => { /* Sentry 로드 실패는 silent */ });
      }
    } catch { /* ignore */ }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto mb-4 w-14 h-14 flex items-center justify-center text-gray-500"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.3L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.3a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg></div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">문제가 발생했습니다</h1>
            <p className="text-sm text-gray-500 mb-6">잠시 후 다시 시도해주세요.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
                className="px-5 py-2.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors"
              >
                새로고침
              </button>
              <Link
                to="/"
                onClick={() => this.setState({ hasError: false })}
                className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium text-sm border border-gray-200 hover:bg-gray-200 transition-colors"
              >
                홈으로
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
