import { Link } from 'react-router-dom';
import { useVertical } from '../hooks/useVertical';

// 버티컬 하위의 미구현 메뉴 공용 페이지 (예: /run/event, /run/coach, /run/course).
export default function ComingSoon() {
  const vertical = useVertical();
  const base = vertical.slug === 'snow' ? '/' : vertical.basePath;

  return (
    <div className="max-w-md mx-auto text-center py-20 animate-fade-in">
      <p className="text-[11px] font-black tracking-[0.2em] mb-3" style={{ color: vertical.accentColor }}>
        {vertical.name}
      </p>
      <h1 className="text-xl font-bold text-gray-900 mb-2">준비 중이에요</h1>
      <p className="text-sm text-gray-500 mb-8">곧 만나볼 수 있도록 열심히 만들고 있어요.</p>
      <Link
        to={base}
        className="inline-block px-5 py-2.5 rounded-xl text-white text-sm font-bold"
        style={{ backgroundColor: vertical.accentColor }}
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
