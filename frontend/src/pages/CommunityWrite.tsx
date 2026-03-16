import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CommunityWrite = () => {
  const navigate = useNavigate();
  const [sport, setSport] = useState('ski');
  const [category, setCategory] = useState('free');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const categories = [
    { id: 'free', name: '자유게시판' },
    { id: 'review', name: '장비리뷰' },
    { id: 'resort', name: '스키장후기' },
    { id: 'tip', name: '초보팁' },
    { id: 'carpool', name: '카풀/동행' },
  ];

  const badgeMap: Record<string, string> = {
    free: '자유',
    review: '장비리뷰',
    resort: '스키장후기',
    tip: '초보팁',
    carpool: '카풀/동행',
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
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
    navigate('/community');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">글쓰기</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-400"
        >
          취소
        </button>
      </div>

      {/* Sport */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">종목</label>
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setSport('ski')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              sport === 'ski' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            ⛷️ 스키
          </button>
          <button
            onClick={() => setSport('board')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              sport === 'board' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            🏂 보드
          </button>
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">카테고리</label>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                category === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-50 text-gray-500 border border-gray-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="w-full h-11 px-3.5 rounded-lg text-sm bg-gray-50 border border-gray-100 text-gray-900 placeholder-gray-400"
        />
      </div>

      {/* Content */}
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

      {/* Submit */}
      <button
        onClick={handleSubmit}
        className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors"
      >
        등록하기
      </button>
    </div>
  );
};

export default CommunityWrite;
