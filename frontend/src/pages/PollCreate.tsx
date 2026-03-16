import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PollCreate = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);

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

      <button
        onClick={handleSubmit}
        className="w-full py-3.5 bg-primary text-white font-bold rounded-xl text-sm active:bg-primary-dark transition-colors"
      >
        투표 올리기
      </button>
    </div>
  );
};

export default PollCreate;
