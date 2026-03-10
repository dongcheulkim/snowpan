import { Link } from 'react-router-dom';

const MySales = () => {
  const userProducts = JSON.parse(localStorage.getItem('usedProducts') || '[]');
  const pendingItems = JSON.parse(localStorage.getItem('pendingItems') || '[]');
  const allSales = [...userProducts, ...pendingItems];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">판매 내역</h1>
      </div>

      {allSales.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">판매 내역이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {allSales.map((item: { id: string; name: string; price: number; image?: string; status?: string }) => (
            <div key={item.id} className="card p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-xl">{item.image || '📦'}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {item.status === 'pending' ? '승인 대기중' : item.status === 'approved' ? '승인 완료' : '판매중'}
                </div>
              </div>
              <div className="text-sm font-bold text-gray-900">{item.price?.toLocaleString()}원</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MySales;
