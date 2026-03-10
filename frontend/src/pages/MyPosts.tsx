import { Link } from 'react-router-dom';

const MyPosts = () => {
  const userPosts = JSON.parse(localStorage.getItem('communityPosts') || '[]');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">내 게시글</h1>
      </div>

      {userPosts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">작성한 게시글이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {userPosts.map((post: { id: string; title: string; badge: string; preview: string; time: string; likes: number; comments: number }) => (
            <Link to={`/community/${post.id}`} key={post.id} className="card p-4 block">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-medium text-primary bg-primary-50 px-2 py-0.5 rounded">{post.badge}</span>
                <span className="text-[10px] text-gray-400">{post.time}</span>
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">{post.title}</div>
              <div className="text-xs text-gray-400 line-clamp-1">{post.preview}</div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                <span>♥ {post.likes}</span>
                <span>댓글 {post.comments}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPosts;
