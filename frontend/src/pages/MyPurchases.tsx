import { Link } from 'react-router-dom';
import { PackageIcon } from '../components/Icons';

const MyPurchases = () => {
  const purchases = JSON.parse(localStorage.getItem('myPurchases') || '[]');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">구매 내역</h1>
      </div>

      {purchases.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">구매 내역이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {purchases.map((item: { id: string; name: string; price: number; image?: string; date?: string }) => (
            <div key={item.id} className="card p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 overflow-hidden">{item.image && (item.image.startsWith('http') || item.image.startsWith('/')) ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <PackageIcon size={20} />}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{item.date || '날짜 없음'}</div>
              </div>
              <div className="text-sm font-bold text-gray-900">{item.price?.toLocaleString()}원</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPurchases;
