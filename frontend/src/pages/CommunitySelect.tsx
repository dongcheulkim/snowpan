import { Link } from 'react-router-dom';
import { SkiIcon, SnowboardIcon } from '../components/Icons';

const CommunitySelect = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">커뮤니티</h1>
      <p className="text-sm text-gray-400 mb-10">종목을 선택해주세요</p>

      <div className="flex gap-4 w-full max-w-xs">
        <Link
          to="/community/ski"
          className="flex-1 flex flex-col items-center gap-3 py-8 bg-white border-2 border-gray-200 rounded-2xl active:scale-95 active:border-gray-900 transition-all shadow-sm text-gray-900"
        >
          <SkiIcon size={48} strokeWidth={1.6} />
          <span className="text-lg font-bold text-gray-900">스키</span>
          <span className="text-[11px] text-gray-400">SKI</span>
        </Link>

        <Link
          to="/community/board"
          className="flex-1 flex flex-col items-center gap-3 py-8 bg-white border-2 border-gray-200 rounded-2xl active:scale-95 active:border-gray-900 transition-all shadow-sm text-gray-900"
        >
          <SnowboardIcon size={48} strokeWidth={1.6} />
          <span className="text-lg font-bold text-gray-900">보드</span>
          <span className="text-[11px] text-gray-400">BOARD</span>
        </Link>
      </div>
    </div>
  );
};

export default CommunitySelect;
