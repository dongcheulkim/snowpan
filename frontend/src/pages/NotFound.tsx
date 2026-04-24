import { Link } from 'react-router-dom';
import { SadIcon } from '../components/Icons';

const NotFound = () => (
  <div className="text-center py-20 animate-fade-in">
    <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center text-gray-300"><SadIcon size={64} strokeWidth={1.4} /></div>
    <h1 className="text-2xl font-bold text-gray-900 mb-2">페이지를 찾을 수 없습니다</h1>
    <p className="text-sm text-gray-400 mb-6">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
    <Link
      to="/"
      className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors"
    >
      홈으로 돌아가기
    </Link>
  </div>
);

export default NotFound;
