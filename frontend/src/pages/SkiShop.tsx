import { Link } from 'react-router-dom';

const SkiShop = () => {
  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">스키샵</h1>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sm text-sky-700">
        스키샵 등록은 <a href="mailto:snowpan.help@gmail.com" className="font-bold underline">snowpan.help@gmail.com</a>으로 문의주세요.
      </div>

      <div className="text-center py-16 card">
        <div className="text-4xl mb-3">🏪</div>
        <p className="text-sm text-gray-400">아직 등록된 스키샵이 없습니다.</p>
        <p className="text-xs text-gray-300 mt-1">곧 업데이트됩니다.</p>
      </div>
    </div>
  );
};

export default SkiShop;
