// 매장 소식 단건 상세 페이지.
// 진입 경로: /shop-post/:id

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, imageUrl, getUser } from '../api';
import { toastError, toastSuccess } from '../components/Toast';

interface ShopPost {
  id: string;
  shopType: string;
  shopId: string;
  userId: string;
  title: string;
  content: string;
  images: string | null;
  postType: string;
  pinned: boolean;
  viewCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    nickname: string | null;
    profileImage: string | null;
  };
}

const POST_TYPE_LABEL: Record<string, { text: string; color: string }> = {
  general: { text: '일반', color: 'bg-gray-100 text-gray-600' },
  promo: { text: '프로모션', color: 'bg-sky-100 text-sky-700' },
  event: { text: '이벤트', color: 'bg-orange-100 text-orange-700' },
  notice: { text: '공지', color: 'bg-emerald-100 text-emerald-700' },
};

const SHOP_LINK: Record<string, (id: string) => string> = {
  skishop: (id) => `/skishop/${id}`,
  repair: (id) => `/repair/${id}`,
  rental: (id) => `/rental/${id}`,
  lesson: (id) => `/lesson/${id}`,
  accommodation: (id) => `/accommodation/${id}`,
};

export default function ShopPostDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<ShopPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const user = getUser();

  useEffect(() => {
    if (!id) return;
    api<ShopPost>(`/shop-posts/${id}`)
      .then((p) => { setPost(p); document.title = `${p.title} - 스노우판`; })
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = user && post && (user.id === post.userId || user.role === 'admin');
  const images = post?.images ? post.images.split(',').filter(Boolean) : [];

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm('이 소식을 삭제할까요? 되돌릴 수 없어요.')) return;
    try {
      await api(`/shop-posts/${post.id}`, { method: 'DELETE' });
      toastSuccess('소식을 삭제했어요.');
      const back = SHOP_LINK[post.shopType]?.(post.shopId) || '/';
      navigate(back);
    } catch (err) {
      toastError(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  if (loading) {
    return <p className="text-center py-20 text-sm text-gray-500">불러오는 중…</p>;
  }
  if (!post) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-gray-500 mb-4">포스트를 찾을 수 없어요.</p>
        <button onClick={() => navigate(-1)} className="text-xs font-bold underline">돌아가기</button>
      </div>
    );
  }

  const label = POST_TYPE_LABEL[post.postType] || POST_TYPE_LABEL.general;
  const shopLink = SHOP_LINK[post.shopType]?.(post.shopId) || '/';
  const author = post.user?.nickname || post.user?.name || '매장';

  return (
    <div className="min-h-screen bg-white pb-10">
      <div className="px-4 pt-4 space-y-4">
        {/* 상단 바 */}
        <div className="flex items-center justify-between">
          <Link to={shopLink} className="text-gray-500 text-sm inline-flex items-center gap-1">
            <span>←</span> 매장으로
          </Link>
          {isOwner && (
            <div className="flex gap-1.5">
              <Link
                to={`/shop-post/${post.id}/edit`}
                className="text-[11px] font-bold text-gray-700 border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50"
              >
                수정
              </Link>
              <button
                onClick={handleDelete}
                className="text-[11px] font-bold text-coral border border-coral/40 rounded-lg px-2.5 py-1 hover:bg-coral/5"
              >
                삭제
              </button>
            </div>
          )}
        </div>

        {/* 이미지 갤러리 */}
        {images.length > 0 && (
          <div>
            <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden">
              <img
                src={imageUrl(images[currentImage], 900)}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <span className="absolute bottom-3 right-3 text-[11px] font-bold text-white bg-black/50 px-2 py-0.5 rounded-full">
                    {currentImage + 1} / {images.length}
                  </span>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-1.5 mt-2 overflow-x-auto">
                {images.map((u, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 ${
                      i === currentImage ? 'border-gray-900' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={imageUrl(u, 200)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 메타 + 제목 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${label.color}`}>{label.text}</span>
            {post.pinned && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">고정</span>
            )}
            <span className="text-[10px] text-gray-400 ml-auto">조회 {post.viewCount}</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 leading-snug">{post.title}</h1>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {post.user?.profileImage && (
                <img src={imageUrl(post.user.profileImage, 100)} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <span>{author}</span>
            <span>·</span>
            <span>{new Date(post.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
          </div>
        </div>

        {/* 본문 */}
        <div className="pt-2 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>

        {/* 매장 링크 */}
        <div className="pt-4 mt-6 border-t border-gray-100">
          <Link
            to={shopLink}
            className="block w-full py-3 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 text-center hover:bg-gray-50"
          >
            매장 상세 보기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
