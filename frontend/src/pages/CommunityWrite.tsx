import { toastError } from '../components/Toast';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, getUser, uploadImages, imageUrl } from '../api';
import { CloseIcon, SkiIcon, SnowboardIcon } from '../components/Icons';
import { communityCategoryLabel, COMMUNITY_GROUPS } from '../utils/communityLabels';
import { useUnloadGuard } from '../hooks/useUnloadGuard';
import { useVertical } from '../hooks/useVertical';

const CommunityWrite = () => {
  const navigate = useNavigate();
  const { sport } = useParams<{ sport: string }>();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit'); // 수정 모드 — 기존 글 불러와 PUT
  const [category, setCategory] = useState('free');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]); // 수정 모드 — 기존 업로드 이미지
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 수정 모드: 기존 글 프리필 (작성자/관리자만)
  useEffect(() => {
    if (!editId) return;
    api<{ userId?: string; title: string; content: string; category: string; images?: string | null }>(`/community/${editId}`)
      .then(p => {
        const me = getUser();
        if (!me || (p.userId && p.userId !== me.id && me.role !== 'admin')) {
          toastError('수정 권한이 없습니다.');
          navigate(-1);
          return;
        }
        setTitle(p.title || '');
        setContent(p.content || '');
        setCategory(p.category || 'free');
        setExistingImages(p.images ? p.images.split(',').filter(Boolean) : []);
        setAgreed(true); // 최초 작성 시 이미 동의함
      })
      .catch(() => { toastError('글을 불러오지 못했습니다.'); navigate(-1); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const vertical = useVertical();
  const vbase = vertical.slug === 'snow' ? '' : vertical.basePath;
  const sportConf = vertical.sports?.find((s) => s.id === sport);
  const SportLabel = () => (
    <span className="inline-flex items-center gap-1.5">
      {sport === 'ski' && <SkiIcon size={14} />}
      {sport === 'board' && <SnowboardIcon size={14} />}
      {sport === 'ski' ? '스키' : sport === 'board' ? '보드' : (sportConf?.label || sport)}
    </span>
  );

  const isAdmin = getUser()?.role === 'admin';
  // 대분류 → 소분류 2단계 (목록 탭과 동일 그룹). 공지(notice)는 관리자 전용 대분류.
  const writeGroups = isAdmin
    ? [...COMMUNITY_GROUPS, { id: 'notice', name: '공지', subs: ['notice'] }]
    : COMMUNITY_GROUPS;
  const activeWriteGroup = writeGroups.find((g) => g.subs.includes(category));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // 총 5장 — 수정 모드에선 남긴 기존 이미지 포함해서 계산
    const room = Math.max(0, 5 - existingImages.length);
    const newFiles = [...imageFiles, ...files].slice(0, room);
    setImageFiles(newFiles);
    const previews = newFiles.map(f => URL.createObjectURL(f));
    setImagePreviews(previews);
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== idx);
    setImageFiles(newFiles);
    URL.revokeObjectURL(imagePreviews[idx]);
    setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
  };

  const TITLE_MAX = 50;
  const CONTENT_MAX = 5000;
  const titleOver = title.length > TITLE_MAX;
  const contentOver = content.length > CONTENT_MAX;

  // 작성 중인데 실수로 페이지 떠나면 경고 — 카테고리 변경/sport 전환 시도 시 데이터 보호.
  const isDirty = !submitting && (
    title.trim() !== '' || content.trim() !== '' || imageFiles.length > 0
  );
  useUnloadGuard(isDirty);
  // <script>·이벤트 핸들러 등 sanitize 대상 패턴 — 사전 안내용 (백엔드가 실제 정화).
  const looksUnsafe = /<script\b|on\w+\s*=|<iframe\b|javascript:/i.test(title + ' ' + content);

  const handleSubmit = async () => {
    const user = getUser();
    if (!user) { toastError('로그인이 필요합니다.'); navigate('/login'); return; }
    if (!title.trim()) { toastError('제목을 입력해주세요.'); return; }
    if (title.trim().length < 2) { toastError('제목은 2자 이상이어야 합니다.'); return; }
    if (titleOver) { toastError(`제목은 ${TITLE_MAX}자 이내여야 합니다. (현재 ${title.length}자)`); return; }
    if (!content.trim()) { toastError('내용을 입력해주세요.'); return; }
    if (contentOver) { toastError(`내용은 ${CONTENT_MAX}자 이내여야 합니다. (현재 ${content.length}자)`); return; }
    if (!agreed) { toastError('커뮤니티 이용규칙에 동의해주세요.'); return; }

    setSubmitting(true);
    try {
      let newUrls: string[] = [];
      if (imageFiles.length > 0) {
        newUrls = await uploadImages(imageFiles);
      }

      if (editId) {
        // 수정 — 남긴 기존 이미지 + 새 이미지. 전부 지웠으면 '' 로 보내 서버에서 삭제.
        const merged = [...existingImages, ...newUrls].join(',');
        await api(`/community/${editId}`, {
          method: 'PUT',
          body: { title: title.trim(), content: content.trim(), category, images: merged },
        });
        navigate(`${vbase}/community/post/${editId}`);
      } else {
        await api('/community', {
          method: 'POST',
          body: { title: title.trim(), content: content.trim(), category, sport, images: newUrls.join(',') || undefined },
        });
        navigate(`${vbase}/community/${sport}`);
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : editId ? '수정에 실패했습니다.' : '등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 text-lg">&larr;</button>
          <h1 className="text-xl font-bold text-gray-900 inline-flex items-center gap-2"><SportLabel /> {editId ? '글 수정' : '글쓰기'}</h1>
        </div>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500">취소</button>
      </div>

      <div>
        <span id="cw-category-label" className="text-sm font-semibold text-gray-700 block mb-2">카테고리</span>
        <div role="radiogroup" aria-labelledby="cw-category-label" className="space-y-1.5">
          <div className="flex gap-1.5 flex-wrap">
            {writeGroups.map((g) => {
              const on = g.subs.includes(category);
              return (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setCategory(g.subs[0])}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${on ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
          {activeWriteGroup && activeWriteGroup.subs.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {activeWriteGroup.subs.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${category === id ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
                >
                  {communityCategoryLabel(id, sport)}
                </button>
              ))}
            </div>
          )}
        </div>
        {category === 'notice' && (
          <p className="text-[11px] text-sky-600 mt-2 font-medium">공지는 스키·보드 양쪽 목록 맨 위에 고정으로 노출됩니다.</p>
        )}
        <p className="text-[11px] text-gray-500 mt-2">
          투표 글은 별도로 작성합니다.{' '}
          <button
            type="button"
            onClick={() => navigate('/poll/create')}
            className="text-accent font-medium underline underline-offset-2"
          >
            투표 만들기 →
          </button>
        </p>
      </div>

      <div>
        <label htmlFor="cw-title" className="text-sm font-semibold text-gray-700 block mb-2">제목</label>
        <input
          id="cw-title"
          name="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          required
          minLength={2}
          aria-invalid={titleOver}
          className={`w-full h-11 px-3.5 rounded-lg text-sm border text-gray-900 placeholder-gray-400 transition-colors ${
            titleOver ? 'bg-rose-50 border-coral focus:border-coral' : 'bg-gray-50 border-gray-100'
          }`}
        />
        <div className={`text-right text-[10px] mt-0.5 font-medium ${titleOver ? 'text-coral' : 'text-gray-500'}`}>
          {title.length}/{TITLE_MAX}{titleOver ? ` · ${title.length - TITLE_MAX}자 초과` : ''}
        </div>
      </div>

      <div>
        <label htmlFor="cw-content" className="text-sm font-semibold text-gray-700 block mb-2">내용</label>
        <textarea
          id="cw-content"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          rows={12}
          required
          aria-invalid={contentOver}
          className={`w-full px-3.5 py-3 rounded-lg text-sm border text-gray-900 placeholder-gray-400 resize-none transition-colors ${
            contentOver ? 'bg-rose-50 border-coral focus:border-coral' : 'bg-gray-50 border-gray-100'
          }`}
        />
        <div className={`text-right text-[10px] mt-0.5 font-medium ${contentOver ? 'text-coral' : 'text-gray-500'}`}>
          {content.length}/{CONTENT_MAX}{contentOver ? ` · ${content.length - CONTENT_MAX}자 초과` : ''}
        </div>
        {looksUnsafe && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mt-2 leading-relaxed">
            주의: HTML 태그·스크립트는 자동으로 제거됩니다. 일반 텍스트로 입력해주세요.
          </p>
        )}
      </div>

      {/* Image Upload */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">사진 (최대 5장)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageSelect}
        />
        <div className="flex gap-2 flex-wrap">
          {/* 수정 모드 — 기존 업로드 이미지 (제거 가능) */}
          {existingImages.map((url, idx) => (
            <div key={`ex-${idx}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
              <img src={imageUrl(url, 200)} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setExistingImages(prev => prev.filter((_, i) => i !== idx))} aria-label="이미지 삭제" className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center"><CloseIcon size={11} /></button>
            </div>
          ))}
          {imagePreviews.map((preview, idx) => (
            <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
              <img src={preview} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removeImage(idx)} aria-label="이미지 삭제" className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center"><CloseIcon size={11} /></button>
            </div>
          ))}
          {existingImages.length + imageFiles.length < 5 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-accent/50 hover:text-accent-light transition-all"
            >
              <span className="text-xl">+</span>
              <span className="text-[10px]">{existingImages.length + imageFiles.length}/5</span>
            </button>
          )}
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <button onClick={() => setShowRules(!showRules)} className="flex items-center justify-between w-full">
          <span className="text-sm font-bold text-gray-700">커뮤니티 이용규칙</span>
          <span className="text-gray-500 text-xs">{showRules ? '접기' : '펼치기'}</span>
        </button>
        {showRules && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed space-y-2">
            <p className="font-semibold text-gray-700">다음에 해당하는 글은 사전 통보 없이 삭제됩니다.</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>욕설/비방/혐오 표현</li>
              <li>허위 정보, 근거 없는 루머</li>
              <li>무단 광고, 스팸, 도배</li>
              <li>개인정보 노출</li>
              <li>음란/불법 콘텐츠</li>
            </ul>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-4 h-4 rounded border-gray-300 accent-sky-500" />
          <span className="text-xs text-gray-600">위 커뮤니티 이용규칙을 확인했으며 동의합니다.</span>
        </label>
      </div>

      <button onClick={handleSubmit} disabled={!agreed || submitting} className={`w-full h-12 rounded-xl font-bold text-sm transition-colors ${agreed ? 'bg-primary text-white active:bg-primary-dark' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
        {submitting ? (editId ? '수정 중...' : '등록 중...') : (editId ? '수정하기' : '등록하기')}
      </button>
    </div>
  );
};

export default CommunityWrite;
