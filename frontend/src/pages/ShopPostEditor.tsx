// 매장 소식 작성/편집 페이지.
// 진입 경로:
//   /shop/:shopType/:shopId/post/new    — 신규
//   /shop-post/:id/edit                 — 편집
//
// 소유자만 접근 가능. 백엔드에서도 검증.

import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, uploadImages, imageUrl } from '../api';
import { toastError, toastSuccess } from '../components/Toast';

interface ShopPost {
  id: string;
  shopType: string;
  shopId: string;
  title: string;
  content: string;
  images: string | null;
  postType: string;
}

const POST_TYPE_OPTIONS = [
  { id: 'general', label: '일반' },
  { id: 'promo', label: '프로모션' },
  { id: 'event', label: '이벤트' },
  { id: 'notice', label: '공지' },
];

export default function ShopPostEditor() {
  const navigate = useNavigate();
  const params = useParams<{ shopType?: string; shopId?: string; id?: string }>();
  const isEdit = Boolean(params.id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('general');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);
  const [shopMeta, setShopMeta] = useState<{ shopType: string; shopId: string } | null>(
    isEdit ? null : { shopType: params.shopType!, shopId: params.shopId! }
  );

  useEffect(() => {
    document.title = isEdit ? '소식 수정 - 스노우판' : '새 소식 - 스노우판';
    if (!isEdit) return;
    // 편집 모드 — 기존 포스트 로드
    api<ShopPost>(`/shop-posts/${params.id}`)
      .then((p) => {
        setTitle(p.title);
        setContent(p.content);
        setPostType(p.postType);
        setImages(p.images ? p.images.split(',').filter(Boolean) : []);
        setShopMeta({ shopType: p.shopType, shopId: p.shopId });
        setLoaded(true);
      })
      .catch((e) => {
        toastError(e instanceof Error ? e.message : '포스트를 불러오지 못했어요.');
        setLoaded(true);
      });
  }, [isEdit, params.id]);

  const onFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - images.length;
    if (remaining <= 0) {
      toastError('사진은 최대 5장까지 가능해요.');
      return;
    }
    // 실제 업로드 대상 (남은 슬롯만큼) 에만 크기 검증 — 잘려나갈 파일 때문에 차단 안 되게.
    const toUpload = files.slice(0, remaining);
    const MAX_SIZE = 5 * 1024 * 1024;
    const tooBig = toUpload.filter((f) => f.size > MAX_SIZE);
    if (tooBig.length) {
      toastError(`5MB 초과 파일: ${tooBig.map((f) => f.name).join(', ')}`);
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const urls = await uploadImages(toUpload);
      setImages((prev) => [...prev, ...urls]);
    } catch (err) {
      toastError(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopMeta) return;
    if (!title.trim()) { toastError('제목을 입력해주세요.'); return; }
    if (!content.trim()) { toastError('내용을 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      const body = {
        shopType: shopMeta.shopType,
        shopId: shopMeta.shopId,
        title: title.trim(),
        content: content.trim(),
        images: images.join(','),
        postType,
      };
      if (isEdit) {
        await api(`/shop-posts/${params.id}`, { method: 'PUT', body });
        toastSuccess('소식을 수정했어요.');
        navigate(`/shop-post/${params.id}`);
      } else {
        const created = await api<{ id: string }>(`/shop-posts`, { method: 'POST', body });
        toastSuccess('소식을 등록했어요.');
        navigate(`/shop-post/${created.id}`);
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) return <p className="text-center py-10 text-sm text-gray-500">불러오는 중…</p>;

  return (
    <div className="min-h-screen bg-white pb-10">
      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-gray-500">←</button>
          <h1 className="text-lg font-bold text-gray-900">{isEdit ? '소식 수정' : '새 소식'}</h1>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* 타입 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">유형</label>
            <div className="flex gap-1.5 flex-wrap">
              {POST_TYPE_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setPostType(o.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    postType === o.id
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="예: 신상 살로몬 입고 · 설날 20% 할인"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-900"
            />
            <p className="text-[10px] text-gray-400 mt-1 text-right">{title.length}/100</p>
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              maxLength={5000}
              placeholder={`매장 소식 · 이벤트 · 신상품 등을 자유롭게 작성하세요.\n\n줄바꿈은 그대로 유지돼요.`}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-900 resize-none leading-relaxed"
            />
            <p className="text-[10px] text-gray-400 mt-1 text-right">{content.length}/5000</p>
          </div>

          {/* 이미지 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">사진 ({images.length}/5)</label>
            <div className="grid grid-cols-3 gap-2">
              {images.map((url, idx) => (
                <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img src={imageUrl(url, 300)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-gray-900 hover:text-gray-900 cursor-pointer transition-colors">
                  <input type="file" accept="image/*" multiple onChange={onFilePick} className="hidden" disabled={uploading} />
                  <span className="text-2xl leading-none">+</span>
                  <span className="text-[10px] mt-1">{uploading ? '업로드 중' : '사진 추가'}</span>
                </label>
              )}
            </div>
          </div>

          {/* 액션 */}
          <div className="flex gap-2 pt-2">
            <Link
              to={-1 as unknown as string}
              onClick={(e) => { e.preventDefault(); navigate(-1); }}
              className="flex-1 py-3 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 text-center hover:bg-gray-50"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="flex-1 py-3 bg-gray-900 text-white rounded-lg text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {submitting ? '저장 중…' : isEdit ? '수정 완료' : '소식 올리기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
