// 스키장 소식 목록 (/news) — 홈 "스키장 소식" 섹션의 전체 보기. 커뮤니티와 별개 채널(사용자 결정: 커뮤니티 탭이 아니라 홈 섹션).
// 데이터는 community API 의 category=news(관리자 전용 글)를 그대로 쓴다. 작성·수정은 관리자 대시보드 "스키장 소식 쓰기".
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser } from '../api';
import { useMeta } from '../hooks/useMeta';
import { RowListSkeleton } from '../components/Skeleton';

interface NewsPost { id: string; title: string; content: string; resortIds?: string | null; images?: string | null; createdAt: string }

export const fmtNewsDate = (iso: string): string => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };

export default function News() {
  useMeta({ title: '스키장 소식 | 스노우판', description: '시즌권 판매, 개장일, 리프트권 할인 등 리조트별 스키장 소식을 모아 봅니다.' });
  const [posts, setPosts] = useState<NewsPost[] | null>(null);
  const [total, setTotal] = useState(0);
  const [resortNames, setResortNames] = useState<Record<string, string>>({});
  const isAdmin = getUser()?.role === 'admin';
  const PAGE = 20;

  const load = (offset: number) => api<{ posts: NewsPost[]; totalCount: number }>(`/community?category=news&limit=${PAGE}&offset=${offset}`)
    .then((d) => { setPosts((prev) => (offset && prev ? [...prev, ...d.posts] : d.posts)); setTotal(d.totalCount); })
    .catch(() => setPosts((prev) => prev || []));
  useEffect(() => { load(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api<{ id: string; name: string }[]>('/resorts').then((rs) => setResortNames(Object.fromEntries(rs.map((r) => [r.id, r.name])))).catch(() => {}); }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-500 text-lg">←</Link>
          <h1 className="text-xl font-bold text-gray-900">스키장 소식</h1>
        </div>
        {isAdmin && <Link to="/community/write?category=news" className="px-3 py-1.5 bg-gray-900 text-white rounded-lg font-bold text-xs">소식 쓰기</Link>}
      </div>
      <p className="text-xs text-gray-500 -mt-2">시즌권 판매, 개장일, 리프트권·카드 할인처럼 시즌에 필요한 리조트 소식을 스노우판이 모아 올립니다.</p>

      {posts === null ? <RowListSkeleton /> : posts.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-500">아직 올라온 소식이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => {
            const names = (p.resortIds || '').split(',').filter(Boolean).map((id) => resortNames[id]).filter(Boolean);
            return (
              <Link key={p.id} to={`/news/${p.id}`} className="card p-4 block active:bg-gray-50 transition-colors">
                <p className="text-sm font-bold text-gray-900 line-clamp-2">{p.title}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-line">{p.content}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {names.slice(0, 6).map((n) => <span key={n} className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-300 text-gray-700">{n}</span>)}
                  <span className="text-[10px] text-gray-400 ml-auto tabular-nums">{fmtNewsDate(p.createdAt)}</span>
                </div>
              </Link>
            );
          })}
          {posts.length < total && (
            <button onClick={() => load(posts.length)} className="w-full py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700">더 보기 ({posts.length}/{total})</button>
          )}
        </div>
      )}
    </div>
  );
}
