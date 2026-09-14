// 목록 첫 로드 실패 안내 — 빈 상태("아직 없어요")와 구분해 원인을 알리고 다시 시도할 수 있게 한다.
// api.ts 가 던지는 친절한 한국어 메시지(오프라인·서버 연결 실패 등)를 그대로 보여준다.
interface LoadErrorProps {
  message?: string | null;
  onRetry: () => void;
  className?: string;
}

export default function LoadError({ message, onRetry, className = '' }: LoadErrorProps) {
  return (
    <div role="alert" className={`text-center py-16 px-6 card animate-fade-in ${className}`}>
      <h3 className="text-base font-bold text-gray-800 mb-1.5">불러오지 못했어요</h3>
      <p className="text-sm text-gray-500 mb-5 whitespace-pre-line">{message || '잠시 후 다시 시도해 주세요.'}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center min-h-11 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold active:bg-gray-800 transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}
