import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getUser } from '../api';

const CommunityWrite = () => {
  const navigate = useNavigate();
  const { sport } = useParams<{ sport: string }>();
  const [category, setCategory] = useState('free');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sportLabel = sport === 'ski' ? '⛷️ 스키' : '🏂 보드';

  const categories = [
    { id: 'free', name: '자유' },
    { id: 'review', name: '장비리뷰' },
    { id: 'resort', name: '스키장' },
    { id: 'tip', name: '초보팁' },
    { id: 'carpool', name: '카풀' },
  ];

  const handleSubmit = async () => {
    const user = getUser();
    if (!user) { alert('로그인이 필요합니다.'); navigate('/login'); return; }
    if (!title.trim()) { alert('제목을 입력해주세요.'); return; }
    if (!content.trim()) { alert('내용을 입력해주세요.'); return; }
    if (!agreed) { alert('커뮤니티 이용규칙에 동의해주세요.'); return; }

    setSubmitting(true);
    try {
      await api('/community', {
        method: 'POST',
        body: { title: title.trim(), content: content.trim(), category, sport },
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
          <button onClick={() => navigate(-1)} className="text-gray-400 text-lg">←</button>
          <h1 className="text-xl font-bold text-gray-900">{sportLabel} 글쓰기</h1>
        </div>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-400">취소</button>
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">카테고리</label>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setCategory(cat.id)} className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all ${category === cat.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 active:bg-gray-200'}`}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">제목</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" className="w-full h-11 px-3.5 rounded-lg text-sm bg-gray-50 border border-gray-100 text-gray-900 placeholder-gray-400" maxLength={50} />
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">내용</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="내용을 입력하세요" rows={12} className="w-full px-3.5 py-3 rounded-lg text-sm bg-gray-50 border border-gray-100 text-gray-900 placeholder-gray-400 resize-none" />
      </div>

      <div className="card p-4 space-y-3">
        <button onClick={() => setShowRules(!showRules)} className="flex items-center justify-between w-full">
          <span className="text-sm font-bold text-gray-700">커뮤니티 이용규칙</span>
          <span className="text-gray-400 text-xs">{showRules ? '접기 ▲' : '펼치기 ▼'}</span>
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

      <button onClick={handleSubmit} disabled={!agreed || submitting} className={`w-full h-12 rounded-xl font-bold text-sm transition-colors ${agreed ? 'bg-primary text-white active:bg-primary-dark' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
        {submitting ? '등록 중...' : '등록하기'}
      </button>
    </div>
  );
};

export default CommunityWrite;
