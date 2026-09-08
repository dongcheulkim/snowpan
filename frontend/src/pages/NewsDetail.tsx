// 스노우판 매거진 상세 (/news/:id) — 커뮤니티 글 화면과 분리된 읽기 전용 페이지(댓글·좋아요 없음).
// 관리자에게는 수정·삭제만 보인다(인스타 카드 받기·캡션 복사는 사용자 요청으로 뺌, 2026-09-09).
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import { toastError, toastSuccess } from '../components/Toast';
import { useMeta } from '../hooks/useMeta';
import { fmtNewsDate } from './News';
import LinkifyText from '../components/LinkifyText';

interface NewsPost { id: string; title: string; content: string; category: string; resortIds?: string | null; images?: string | null; createdAt: string }

export default function NewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const [post, setPost] = useState<NewsPost | null | undefined>(undefined);
  const [resortNames, setResortNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    api<NewsPost>(`/community/${id}`).then((p) => setPost(p.category === 'news' ? p : null)).catch(() => setPost(null));
    api<{ id: string; name: string }[]>('/resorts').then((rs) => setResortNames(Object.fromEntries(rs.map((r) => [r.id, r.name])))).catch(() => {});
  }, [id]);
  useMeta({ title: post ? `${post.title} | 스노우판 매거진` : undefined, description: post ? post.content.slice(0, 120) : undefined });

  if (post === undefined) return <div className="text-center py-20 text-gray-500 text-sm">로딩 중...</div>;
  if (!post) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <h2 className="text-lg font-bold text-gray-900 mb-2">소식을 찾을 수 없습니다</h2>
        <Link to="/news" className="text-sm text-gray-500">← 스노우판 매거진 목록</Link>
      </div>
    );
  }

  const resortIds = (post.resortIds || '').split(',').filter(Boolean);
  const images = (post.images || '').split(',').filter(Boolean);
  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in pb-4">
      <Link to="/news" className="inline-flex items-center gap-2 text-gray-500 text-sm">← 스노우판 매거진</Link>

      <div className="card overflow-hidden">
        {/* 첫 사진은 제목 위 히어로 (사용자 요청: 사진 + 제목 + 설명) */}
        {images[0] && <img src={imageUrl(images[0], 1000)} alt="" className="w-full aspect-[4/3] object-cover" />}
        <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">스노우판 매거진</span>
          <span className="text-[11px] text-gray-400 tabular-nums">{fmtNewsDate(post.createdAt)}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 leading-snug">{post.title}</h1>
        {resortIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {resortIds.map((rid) => (
              <Link key={rid} to={`/resort/${encodeURIComponent(resortNames[rid] || '')}`} className="text-[11px] font-bold px-2 py-1 rounded-lg border border-gray-300 text-gray-800 bg-white">{resortNames[rid] || '리조트'}</Link>
            ))}
          </div>
        )}
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"><LinkifyText text={post.content} /></p>
        {images.length > 1 && (
          <div className="grid grid-cols-2 gap-2">
            {images.slice(1).map((src) => <img key={src} src={imageUrl(src, 800)} alt="" className="w-full rounded-lg border border-gray-100" />)}
          </div>
        )}
        </div>
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          <Link to={`/community/write?edit=${post.id}`} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm border border-gray-200 text-center">수정</Link>
          <button
            onClick={async () => {
              if (!confirm('이 소식을 삭제할까요?')) return;
              try { await api(`/community/${post.id}`, { method: 'DELETE' }); toastSuccess('삭제되었습니다.'); navigate('/news', { replace: true }); }
              catch (err) { toastError(err instanceof Error ? err.message : '삭제 실패'); }
            }}
            className="flex-1 py-3 bg-gray-100 text-red-500 rounded-xl font-bold text-sm border border-gray-200"
          >삭제</button>
        </div>
      )}
    </div>
  );
}
