import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getUser, uploadImages } from '../api';
import { CloseIcon, SkiIcon, SnowboardIcon } from '../components/Icons';
import { communityCategories } from '../utils/communityLabels';
import { useUnloadGuard } from '../hooks/useUnloadGuard';

const CommunityWrite = () => {
  const navigate = useNavigate();
  const { sport } = useParams<{ sport: string }>();
  const [category, setCategory] = useState('free');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SportLabel = () => (
    <span className="inline-flex items-center gap-1.5">
      {sport === 'ski' ? <SkiIcon size={14} /> : <SnowboardIcon size={14} />}
      {sport === 'ski' ? '스키' : '보드'}
    </span>
  );

  const categories = communityCategories(sport);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newFiles = [...imageFiles, ...files].slice(0, 5);
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
    if (!user) { alert('로그인이 필요합니다.'); navigate('/login'); return; }
    if (!title.trim()) { alert('제목을 입력해주세요.'); return; }
    if (title.trim().length < 2) { alert('제목은 2자 이상이어야 합니다.'); return; }
    if (titleOver) { alert(`제목은 ${TITLE_MAX}자 이내여야 합니다. (현재 ${title.length}자)`); return; }
    if (!content.trim()) { alert('내용을 입력해주세요.'); return; }
    if (contentOver) { alert(`내용은 ${CONTENT_MAX}자 이내여야 합니다. (현재 ${content.length}자)`); return; }
    if (!agreed) { alert('커뮤니티 이용규칙에 동의해주세요.'); return; }

    setSubmitting(true);
    try {
      let images: string | undefined;
      if (imageFiles.length > 0) {
        const urls = await uploadImages(imageFiles);
        images = urls.join(',');
      }

      await api('/community', {
        method: 'POST',
        body: { title: title.trim(), content: content.trim(), category, sport, images },
      });
      navigate(`/community/${sport}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 text-lg">&larr;</button>
          <h1 className="text-xl font-bold text-gray-900 inline-flex items-center gap-2"><SportLabel /> 글쓰기</h1>
        </div>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500">취소</button>
      </div>

      <div>
        <span id="cw-category-label" className="text-sm font-semibold text-gray-700 block mb-2">카테고리</span>
        <div role="radiogroup" aria-labelledby="cw-category-label" className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="radio"
              aria-checked={category === cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all ${category === cat.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
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
            ⚠️ HTML 태그·스크립트는 자동으로 제거됩니다. 일반 텍스트로 입력해주세요.
          </p>
        )}
      </div>

      {/* Image Upload */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">사진 (최대 5장)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleImageSelect}
        />
        <div className="flex gap-2 flex-wrap">
          {imagePreviews.map((preview, idx) => (
            <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
              <img src={preview} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removeImage(idx)} aria-label="이미지 삭제" className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center"><CloseIcon size={11} /></button>
            </div>
          ))}
          {imageFiles.length < 5 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-accent/50 hover:text-accent-light transition-all"
            >
              <span className="text-xl">+</span>
              <span className="text-[10px]">{imageFiles.length}/5</span>
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
        {submitting ? '등록 중...' : '등록하기'}
      </button>
    </div>
  );
};

export default CommunityWrite;
