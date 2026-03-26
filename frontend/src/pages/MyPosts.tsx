import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser } from '../api';

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  sport: string;
  likes: number;
  commentCount: number;
  createdAt: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  free: '자유',
  review: '후기',
  resort: '리조트',
  tip: '팁',
  carpool: '카풀',
  poll: '투표',
};

const MySales = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (!user) return;
    api<{ posts: Post[]; totalCount: number }>(`/community?userId=${user.id}`)
      .then(data => setPosts(data.posts))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">내 게시글</h1>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-400 text-sm">작성한 게시글이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Link to={`/community/post/${post.id}`} key={post.id} className="card p-4 block">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-medium text-primary bg-primary-50 px-2 py-0.5 rounded">
                  {CATEGORY_LABEL[post.category] || post.category}
                </span>
                <span className="text-[10px] text-gray-400">{formatDate(post.createdAt)}</span>
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">{post.title}</div>
              <div className="text-xs text-gray-400 line-clamp-1">{post.content}</div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                <span>♥ {post.likes}</span>
                <span>댓글 {post.commentCount ?? 0}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MySales;
