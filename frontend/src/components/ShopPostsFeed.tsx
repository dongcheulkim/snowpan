// 매장 상세 페이지에 붙이는 "매장 소식" 피드.
// SkiShopDetail / RepairShopDetail / RentalDetail / LessonDetail / AccommodationDetail 재사용.
// 소유자면 상단에 "+ 새 소식" 버튼 노출.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imageUrl, getUser } from '../api';

interface ShopPost {
  id: string;
  title: string;
  content: string;
  images: string | null;
  postType: string;
  pinned: boolean;
  viewCount: number;
  createdAt: string;
  user: { id: string; name: string; nickname: string | null };
}

const TYPE_LABEL: Record<string, { text: string; color: string }> = {
  general: { text: '일반', color: 'bg-gray-100 text-gray-600' },
  promo: { text: '프로모션', color: 'bg-sky-100 text-sky-700' },
  event: { text: '이벤트', color: 'bg-orange-100 text-orange-700' },
  notice: { text: '공지', color: 'bg-emerald-100 text-emerald-700' },
};

interface Props {
  shopType: 'skishop' | 'repair' | 'rental' | 'lesson' | 'accommodation';
  shopId: string;
  ownerId: string; // shop 의 userId — 소유자 여부 판단용
  compact?: boolean; // true 면 4개만 노출 + "더보기" 링크
}

export default function ShopPostsFeed({ shopType, shopId, ownerId, compact = true }: Props) {
  const [posts, setPosts] = useState<ShopPost[] | null>(null);
  const user = getUser();
  const isOwner = user && (user.id === ownerId || user.role === 'admin');

  useEffect(() => {
    if (!shopId) return;
    api<{ items: ShopPost[] }>(`/shop-posts?shopType=${shopType}&shopId=${shopId}&limit=${compact ? 4 : 20}`)
      .then((r) => setPosts(r.items))
      .catch(() => setPosts([]));
  }, [shopType, shopId, compact]);

  if (posts === null) {
    return (
      <div className="pt-6">
        <p className="text-xs text-gray-400 text-center py-4">불러오는 중…</p>
      </div>
    );
  }

  return (
    <section className="pt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-black text-gray-900">매장 소식</h2>
        {isOwner && (
          <Link
            to={`/shop/${shopType}/${shopId}/post/new`}
            className="text-xs font-bold text-gray-900 border border-gray-900 rounded-full px-3 py-1 hover:bg-gray-900 hover:text-white transition-colors"
          >
            + 새 소식
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-2xl">
          <p className="text-xs text-gray-500">
            {isOwner ? '아직 등록한 소식이 없어요. 첫 소식을 올려보세요.' : '아직 등록된 소식이 없어요.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {posts.map((p) => {
              const label = TYPE_LABEL[p.postType] || TYPE_LABEL.general;
              const cover = p.images?.split(',').filter(Boolean)[0];
              return (
                <li key={p.id}>
                  <Link
                    to={`/shop-post/${p.id}`}
                    className="flex gap-3 p-3 bg-white border border-gray-200 rounded-2xl hover:border-gray-900 transition-colors"
                  >
                    {cover && (
                      <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        <img src={imageUrl(cover, 300)} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${label.color}`}>
                          {label.text}
                        </span>
                        {p.pinned && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">고정</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-900 mt-1 line-clamp-1">{p.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">{p.content}</p>
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        {new Date(p.createdAt).toLocaleDateString('ko-KR')} · 조회 {p.viewCount}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
