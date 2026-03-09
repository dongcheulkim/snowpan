import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const UsedRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: 'ski',
    size: '',
    year: '',
    condition: '1시즌 이하',
    usageCount: '',
    originalPrice: '',
    price: '',
    location: '',
    description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/used', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        alert('장비가 등록되었습니다!');
        navigate('/used');
      } else {
        const data = await res.json();
        alert(data.error || '등록에 실패했습니다.');
      }
    } catch {
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-accent/50 transition-all";
  const labelClass = "block text-sm font-medium text-gray-500 mb-2";

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/used" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 text-sm transition-colors mb-6">
        ← 중고 장비 목록
      </Link>

      <div className="card rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">중고 장비 등록</h1>
          <p className="text-sm text-zinc-500">판매할 장비 정보를 입력해주세요</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* 사진 업로드 영역 */}
          <div>
            <label className={labelClass}>사진</label>
            <div className="bg-zinc-950 rounded-lg p-8 text-center border-2 border-dashed border-zinc-700 hover:border-accent/40 transition-all cursor-pointer">
              <div className="text-sm text-zinc-400">클릭하여 사진을 업로드하세요</div>
              <div className="text-xs text-zinc-600 mt-1">최대 5장 · JPG, PNG</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 브랜드 */}
            <div>
              <label className={labelClass}>브랜드</label>
              <input
                type="text"
                name="brand"
                value={form.brand}
                onChange={handleChange}
                placeholder="예: Rossignol"
                required
                className={inputClass}
              />
            </div>

            {/* 상품명 */}
            <div>
              <label className={labelClass}>상품명</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="예: Soul 7 (2022)"
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* 카테고리 */}
            <div>
              <label className={labelClass}>카테고리</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="ski" className="bg-zinc-900">스키</option>
                <option value="board" className="bg-zinc-900">보드</option>
                <option value="boots" className="bg-zinc-900">부츠</option>
                <option value="binding" className="bg-zinc-900">바인딩</option>
                <option value="helmet" className="bg-zinc-900">헬멧</option>
                <option value="goggles" className="bg-zinc-900">고글</option>
                <option value="wear" className="bg-zinc-900">의류</option>
                <option value="etc" className="bg-zinc-900">기타</option>
              </select>
            </div>

            {/* 사이즈 */}
            <div>
              <label className={labelClass}>사이즈</label>
              <input
                type="text"
                name="size"
                value={form.size}
                onChange={handleChange}
                placeholder="예: 172cm"
                className={inputClass}
              />
            </div>

            {/* 연식 */}
            <div>
              <label className={labelClass}>연식</label>
              <input
                type="text"
                name="year"
                value={form.year}
                onChange={handleChange}
                placeholder="예: 2022"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 상태 */}
            <div>
              <label className={labelClass}>상태</label>
              <select
                name="condition"
                value={form.condition}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="1시즌 이하" className="bg-zinc-900">1시즌 이하</option>
                <option value="2시즌 이하" className="bg-zinc-900">2시즌 이하</option>
                <option value="3시즌 이상" className="bg-zinc-900">3시즌 이상</option>
              </select>
            </div>

            {/* 사용횟수 */}
            <div>
              <label className={labelClass}>사용 횟수</label>
              <input
                type="text"
                name="usageCount"
                value={form.usageCount}
                onChange={handleChange}
                placeholder="예: 5회"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 원래 가격 */}
            <div>
              <label className={labelClass}>구매 당시 가격 (원)</label>
              <input
                type="number"
                name="originalPrice"
                value={form.originalPrice}
                onChange={handleChange}
                placeholder="850000"
                required
                className={inputClass}
              />
            </div>

            {/* 판매 가격 */}
            <div>
              <label className={labelClass}>판매 가격 (원)</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="450000"
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* 거래 지역 */}
          <div>
            <label className={labelClass}>거래 지역</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="예: 서울 강남구"
              required
              className={inputClass}
            />
          </div>

          {/* 상세 설명 */}
          <div>
            <label className={labelClass}>상세 설명</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="장비의 상태, 특이사항, 거래 방법 등을 자세히 적어주세요."
              rows={5}
              required
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Price Preview */}
          {form.price && form.originalPrice && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
              <span className="text-sm text-zinc-500">할인율</span>
              <span className="text-lg font-bold text-white">
                {Math.round((1 - Number(form.price) / Number(form.originalPrice)) * 100)}% 할인
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                등록 중...
              </span>
            ) : (
              '장비 등록하기'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UsedRegister;
