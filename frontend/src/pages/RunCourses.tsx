import { useState } from 'react';
import { Link } from 'react-router-dom';

// 러닝 코스 추천 — 큐레이션 정적 데이터 (추후 유저 등록/후기 연동 예정).
interface Course {
  name: string;
  area: string;
  distance: string;
  level: '초급' | '중급' | '상급';
  type: '로드' | '트레일';
  desc: string;
  tip?: string;
}

const COURSES: Course[] = [
  { name: '여의도 한강공원 순환', area: '서울 영등포', distance: '5~8.4km', level: '초급', type: '로드', desc: '평지 위주의 대표 러닝 코스. 밤에도 러너가 많아 안전하고, 물·화장실 인프라 최고.', tip: '주말 오전은 자전거·인파 많음 — 이른 아침 추천' },
  { name: '반포 한강공원', area: '서울 서초', distance: '5~10km', level: '초급', type: '로드', desc: '세빛섬~동작대교 구간. 야경이 좋아 저녁 러닝 명소.', tip: '무지개분수 시간대엔 사람 많음' },
  { name: '석촌호수 순환', area: '서울 송파', distance: '2.5km/바퀴', level: '초급', type: '로드', desc: '한 바퀴 2.5km 순환 코스라 페이스 훈련·인터벌에 최적. 트랙처럼 활용 가능.', tip: '벚꽃 시즌엔 러닝 불가 수준으로 혼잡' },
  { name: '올림픽공원', area: '서울 송파', distance: '5km 내외', level: '초급', type: '로드', desc: '신호 없는 공원 내부 코스. 잔디·포장 섞여 있어 지루하지 않음.' },
  { name: '경의선 숲길', area: '서울 마포', distance: '6km 편도', level: '초급', type: '로드', desc: '홍대~효창공원 직선 숲길. 그늘이 많아 여름 러닝에 좋음.', tip: '연남동 구간은 인파 주의' },
  { name: '남산 북측순환로', area: '서울 중구', distance: '7km 왕복', level: '중급', type: '로드', desc: '완만한 오르막 3.5km — 언덕 훈련의 정석 코스. 차량 통제라 안전.', tip: '오르막 페이스 훈련 후 내리막은 가볍게' },
  { name: '안양천 종주', area: '서울 서남부', distance: '10km+', level: '중급', type: '로드', desc: '평지 장거리 훈련용. 한강 합류 지점까지 신호 없이 쭉 달릴 수 있음.' },
  { name: '불암산~수락산 능선', area: '서울 노원', distance: '10km 내외', level: '상급', type: '트레일', desc: '서울 대표 트레일런 코스. 암릉 구간 있어 경험자용.', tip: '트레일화 필수, 스틱 권장' },
  { name: '관악산 둘레길', area: '서울 관악', distance: '6~12km', level: '중급', type: '트레일', desc: '흙길 위주의 입문용 트레일. 구간별로 끊어 달리기 좋음.' },
  { name: '광안리~해운대 해변', area: '부산', distance: '8km 편도', level: '초급', type: '로드', desc: '바다 보며 달리는 코스. 광안대교 야경 러닝 명소.', tip: '여름 낮은 더위 주의 — 일출 러닝 추천' },
];

const levelColor: Record<string, string> = {
  '초급': 'bg-green-100 text-green-700',
  '중급': 'bg-yellow-100 text-yellow-700',
  '상급': 'bg-red-100 text-red-700',
};

export default function RunCourses() {
  const [filter, setFilter] = useState<'all' | '로드' | '트레일'>('all');
  const filtered = COURSES.filter(c => filter === 'all' || c.type === filter);

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/run" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">러닝 코스 추천</h1>
      </div>

      <div className="flex gap-2">
        {(['all', '로드', '트레일'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filter === f ? 'bg-gray-900 text-white' : 'bg-snow text-gray-500 border border-gray-200'
            }`}
          >
            {f === 'all' ? '전체' : f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.name} className="card p-4">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${levelColor[c.level]}`}>{c.level}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200">{c.type}</span>
              <span className="text-[10px] text-gray-500">{c.area}</span>
              <span className="text-[10px] font-bold text-gray-700 ml-auto">{c.distance}</span>
            </div>
            <h2 className="text-sm font-bold text-gray-900">{c.name}</h2>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{c.desc}</p>
            {c.tip && <p className="text-[11px] text-orange-600 mt-1.5">TIP. {c.tip}</p>}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-gray-400 text-center pb-4">코스 제보·후기는 커뮤니티에 남겨주세요.</p>
    </div>
  );
}
