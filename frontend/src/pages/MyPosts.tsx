import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser } from '../api';
import { HeartFilledIcon, ChatIcon } from '../components/Icons';
import EmptyState from '../components/EmptyState';

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
  meetup: '모임',
  poll: '투표',
};

const MyPosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (!user) { setLoading(false); return; } // 무한 스피너 방지
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
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">내 게시글</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">로딩 중...</div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<ChatIcon size={48} strokeWidth={1.4} />}
          title="아직 작성한 게시글이 없어요"
          description={"커뮤니티에 후기·팁·질문을 남겨\n다른 스키어들과 이야기해보세요."}
          ctaLabel="커뮤니티 둘러보기"
          ctaTo="/community"
        />
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Link to={`/community/post/${post.id}`} key={post.id} className="card p-4 block">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-medium text-primary bg-primary-50 px-2 py-0.5 rounded">
                  {CATEGORY_LABEL[post.category] || post.category}
                </span>
                <span className="text-[10px] text-gray-500">{formatDate(post.createdAt)}</span>
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">{post.title}</div>
              <div className="text-xs text-gray-500 line-clamp-1">{post.content}</div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-0.5"><HeartFilledIcon size={11} /> {post.likes}</span>
                <span>댓글 {post.commentCount ?? 0}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPosts;
