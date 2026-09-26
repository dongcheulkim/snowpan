import { Link } from 'react-router-dom';
import { privacySections } from '../content/privacySections';


export default function Privacy() {
  const sections = privacySections;
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">개인정보처리방침</h1>
      </div>

      {sections.map((s, idx) => (
        <div key={idx} className="card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3">{s.title}</h2>
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{s.content}</p>
        </div>
      ))}
    </div>
  );
}
