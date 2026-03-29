import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="text-center py-20 animate-fade-in">
    <div className="text-6xl mb-4">🎿</div>
    <h1 className="text-2xl font-bold text-gray-900 mb-2">페이지를 찾을 수 없습니다</h1>
    <p className="text-sm text-gray-400 mb-6">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
    <Link
      to="/"
      className="inline-block px-6 py-3 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-colors"
    >
      홈으로 돌아가기
    </Link>
  </div>
);

export default NotFound;
