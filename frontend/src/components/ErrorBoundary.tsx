import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { hardReload, isChunkError, reloadForStaleChunk } from '../utils/staleChunk';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  stale: boolean; // 배포 직후 옛 파일을 못 받은 경우 — 새로고침이 답
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, stale: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, stale: isChunkError(error) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
    // Stale chunk (배포 직후 흔한 케이스) — 캐시·SW 비우고 자동 새로고침. 같은 파일이 1분 안에 또 실패하면 화면에 안내만.
    if (reloadForStaleChunk(error)) return;
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
            <h1 className="text-xl font-bold text-gray-900 mb-2">{this.state.stale ? '새 버전이 나왔어요' : '문제가 발생했습니다'}</h1>
            <p className="text-sm text-gray-500 mb-6">{this.state.stale ? '새로고침하면 바로 이어서 쓸 수 있어요.' : '잠시 후 다시 시도해주세요.'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { this.setState({ hasError: false, stale: false }); hardReload(); }}
                className="px-5 py-2.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors"
              >
                새로고침
              </button>
              <Link
                to="/"
                onClick={() => this.setState({ hasError: false, stale: false })}
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
