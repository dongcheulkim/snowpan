import { Link } from 'react-router-dom';

const MyWishlist = () => {
  const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">찜 목록</h1>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">찜한 상품이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {wishlist.map((item: { id: string; name: string; price: number; image?: string }) => (
            <Link to={`/used/${item.id}`} key={item.id} className="card p-4 flex items-center gap-3 block">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-xl">{item.image || '📦'}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
              </div>
              <div className="text-sm font-bold text-gray-900">{item.price?.toLocaleString()}원</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyWishlist;
