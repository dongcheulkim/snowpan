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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">문제가 발생했습니다</h1>
            <p className="text-sm text-gray-400 mb-6">잠시 후 다시 시도해주세요.</p>
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
