import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PollCreate = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [agreed, setAgreed] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, value: string) => {
    const updated = [...options];
    updated[idx] = value;
    setOptions(updated);
  };

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    const validOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);

    if (!trimmedTitle) {
      alert('투표 제목을 입력해주세요.');
      return;
    }
    if (validOptions.length < 2) {
      alert('선택지를 최소 2개 입력해주세요.');
      return;
    }
    if (!agreed) {
      alert('커뮤니티 이용규칙에 동의해주세요.');
      return;
    }

    const existing = JSON.parse(localStorage.getItem('userPolls') || '[]');
    const newPoll = {
      id: `poll_${Date.now()}`,
      title: trimmedTitle,
      type: 'poll',
      options: validOptions.map((label) => ({ label, votes: 0, pct: 0 })),
      totalVotes: 0,
      views: 0,
      likes: 0,
      author: '나',
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('userPolls', JSON.stringify([newPoll, ...existing]));
    navigate(-1);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-lg">←</button>
        <h1 className="text-xl font-bold text-gray-900">투표 만들기</h1>
      </div>

      <div className="card p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="text-sm font-bold text-gray-700 block mb-1.5">투표 제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 올 시즌 최고의 스키장은?"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            maxLength={50}
          />
          <p className="text-[11px] text-gray-400 mt-1 text-right">{title.length}/50</p>
        </div>

        {/* Options */}
        <div>
          <label className="text-sm font-bold text-gray-700 block mb-1.5">선택지</label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary-dark w-5 text-center">{idx + 1}</span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`선택지 ${idx + 1}`}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                  maxLength={30}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(idx)}
                    className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button
              onClick={addOption}
              className="mt-2 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 font-medium active:bg-gray-50 transition-colors"
            >
              + 선택지 추가
            </button>
          )}
          <p className="text-[11px] text-gray-400 mt-1">최소 2개, 최대 6개까지 가능</p>
        </div>
      </div>

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
            <p className="font-semibold text-gray-700">다음에 해당하는 투표는 사전 통보 없이 삭제되며, 반복 위반 시 이용이 제한될 수 있습니다.</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><span className="font-medium text-gray-600">욕설/비방/혐오 표현</span> — 타인을 모욕하거나 특정 집단을 비하하는 표현 금지</li>
              <li><span className="font-medium text-gray-600">허위 정보</span> — 사실과 다른 내용, 근거 없는 루머 유포 금지</li>
              <li><span className="font-medium text-gray-600">광고/홍보/스팸</span> — 무단 광고, 홍보성 게시글, 반복 도배 금지</li>
              <li><span className="font-medium text-gray-600">개인정보 노출</span> — 본인 또는 타인의 개인정보(연락처, 주소 등) 게시 금지</li>
              <li><span className="font-medium text-gray-600">선정적/불법 콘텐츠</span> — 음란물, 불법 촬영물, 저작권 침해 콘텐츠 금지</li>
              <li><span className="font-medium text-gray-600">여론 조작</span> — 특정 목적의 편향된 투표, 조작 의도가 있는 선택지 구성 금지</li>
              <li><span className="font-medium text-gray-600">도배/어뷰징</span> — 동일·유사 투표 반복 생성, 투표수 조작 등 금지</li>
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

      <button
        onClick={handleSubmit}
        className={`w-full py-3.5 font-bold rounded-xl text-sm transition-colors ${
          agreed
            ? 'bg-primary text-white active:bg-primary-dark'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        투표 올리기
      </button>
    </div>
  );
};

export default PollCreate;
