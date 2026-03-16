import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const CommunityWrite = () => {
  const navigate = useNavigate();
  const { sport } = useParams<{ sport: string }>();
  const [category, setCategory] = useState('free');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);

  const sportLabel = sport === 'ski' ? '⛷️ 스키' : '🏂 보드';
  const isPoll = category === 'poll';

  const categories = [
    { id: 'free', name: '자유' },
    { id: 'review', name: '장비리뷰' },
    { id: 'resort', name: '스키장' },
    { id: 'tip', name: '초보팁' },
    { id: 'carpool', name: '카풀' },
    { id: 'poll', name: '투표' },
  ];

  const badgeMap: Record<string, string> = {
    free: '자유',
    review: '장비리뷰',
    resort: '스키장후기',
    tip: '초보팁',
    carpool: '카풀/동행',
    poll: '투표',
  };

  const addOption = () => {
    if (pollOptions.length >= 6) return;
    setPollOptions([...pollOptions, '']);
  };

  const removeOption = (idx: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(pollOptions.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, value: string) => {
    const updated = [...pollOptions];
    updated[idx] = value;
    setPollOptions(updated);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!isPoll && !content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }
    if (isPoll) {
      const validOptions = pollOptions.map((o) => o.trim()).filter((o) => o.length > 0);
      if (validOptions.length < 2) {
        alert('선택지를 최소 2개 입력해주세요.');
        return;
      }
    }
    if (!agreed) {
      alert('커뮤니티 이용규칙에 동의해주세요.');
      return;
    }

    if (isPoll) {
      const validOptions = pollOptions.map((o) => o.trim()).filter((o) => o.length > 0);
      const existing = JSON.parse(localStorage.getItem('userPolls') || '[]');
      const newPoll = {
        id: `poll_${Date.now()}`,
        title: title.trim(),
        type: 'poll',
        sport: sport,
        options: validOptions.map((label) => ({ label, votes: 0, pct: 0 })),
        totalVotes: 0,
        views: 0,
        likes: 0,
        author: '나',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('userPolls', JSON.stringify([newPoll, ...existing]));
    } else {
      const existing = JSON.parse(localStorage.getItem('communityPosts') || '[]');
      const newPost = {
        id: `user_${Date.now()}`,
        tab: category,
        badge: badgeMap[category],
        sport: sport,
        title: title.trim(),
        preview: content.trim(),
        author: '나',
        time: '방금 전',
        likes: 0,
        comments: 0,
        views: 0,
      };
      localStorage.setItem('communityPosts', JSON.stringify([newPost, ...existing]));
    }
    navigate(`/community/${sport}`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 text-lg">←</button>
          <h1 className="text-xl font-bold text-gray-900">{sportLabel} 글쓰기</h1>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-400"
        >
          취소
        </button>
      </div>

      {/* Category */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">카테고리</label>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                category === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-500 active:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">
          {isPoll ? '투표 제목' : '제목'}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isPoll ? '예: 올 시즌 최고의 스키장은?' : '제목을 입력하세요'}
          className="w-full h-11 px-3.5 rounded-lg text-sm bg-gray-50 border border-gray-100 text-gray-900 placeholder-gray-400"
          maxLength={50}
        />
      </div>

      {/* Poll Options (only when poll category) */}
      {isPoll && (
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">선택지</label>
          <div className="space-y-2">
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary w-5 text-center">{idx + 1}</span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`선택지 ${idx + 1}`}
                  className="flex-1 h-10 px-3.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:border-primary"
                  maxLength={30}
                />
                {pollOptions.length > 2 && (
                  <button
                    onClick={() => removeOption(idx)}
                    className="w-8 h-8 flex items-center justify-center text-gray-300 active:text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          {pollOptions.length < 6 && (
            <button
              onClick={addOption}
              className="mt-2 w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400 font-medium active:bg-gray-50"
            >
              + 선택지 추가
            </button>
          )}
          <p className="text-[11px] text-gray-400 mt-1">최소 2개, 최대 6개</p>
        </div>
      )}

      {/* Content (only when NOT poll) */}
      {!isPoll && (
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={12}
            className="w-full px-3.5 py-3 rounded-lg text-sm bg-gray-50 border border-gray-100 text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
      )}

      {/* Community Rules Agreement */}
      <div className="card p-4 space-y-3">
        <button
          onClick={() => setShowRules(!showRules)}
          className="flex items-center justify-between w-full"
        >
          <span className="text-sm font-bold text-gray-700">커뮤니티 이용규칙</span>
          <span className="text-gray-400 text-xs">{showRules ? '접기 ▲' : '펼치기 ▼'}</span>
        </button>
        {showRules && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed space-y-2">
            <p className="font-semibold text-gray-700">다음에 해당하는 글은 사전 통보 없이 삭제되며, 반복 위반 시 이용이 제한될 수 있습니다.</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><span className="font-medium text-gray-600">욕설/비방/혐오 표현</span> — 타인을 모욕하거나 특정 집단을 비하하는 표현 금지</li>
              <li><span className="font-medium text-gray-600">허위 정보</span> — 사실과 다른 내용, 근거 없는 루머 유포 금지</li>
              <li><span className="font-medium text-gray-600">광고/홍보/스팸</span> — 무단 광고, 홍보성 게시글, 반복 도배 금지</li>
              <li><span className="font-medium text-gray-600">개인정보 노출</span> — 본인 또는 타인의 개인정보(연락처, 주소 등) 게시 금지</li>
              <li><span className="font-medium text-gray-600">음란/불법 콘텐츠</span> — 음란물, 불법 촬영물, 저작권 침해 콘텐츠 금지</li>
              <li><span className="font-medium text-gray-600">사기/거래 유도</span> — 커뮤니티 내 직접 금전 거래 유도 금지 (중고거래 게시판 이용)</li>
              <li><span className="font-medium text-gray-600">도배/어뷰징</span> — 동일·유사 내용 반복 게시, 추천수 조작 등 금지</li>
            </ul>
            <p className="text-[11px] text-gray-400 pt-1">위반 게시글은 정보통신망법 제44조의2에 의거하여 삭제 조치됩니다.</p>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-sky-500"
          />
          <span className="text-xs text-gray-600">위 커뮤니티 이용규칙을 확인했으며 동의합니다.</span>
        </label>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        className={`w-full h-12 rounded-xl font-bold text-sm transition-colors ${
          agreed
            ? 'bg-primary text-white active:bg-primary-dark'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isPoll ? '투표 올리기' : '등록하기'}
      </button>
    </div>
  );
};

export default CommunityWrite;
