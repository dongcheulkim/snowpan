import { useParams, Link } from 'react-router-dom';

const LessonDetail = () => {
  const { id } = useParams();

  const allItems: Record<string, {
    id: string; name: string; resort: string; price: number; duration: string;
    level: string; levelText: string; maxStudents: number; image: string;
    instructor: string; description: string; schedule: string; includes: string[];
    contact: string;
  }> = {
    '1': {
      id: '1', name: '스키 그룹레슨', resort: '용평리조트', price: 80000, duration: '2시간',
      level: 'lv1', levelText: 'LV1', maxStudents: 8, image: '⛷️',
      instructor: '김강사 (KSIA 레벨2)',
      description: '스키를 처음 접하는 분들을 위한 그룹레슨입니다. 기본 자세부터 플루그 턴까지 배울 수 있으며, 안전한 환경에서 즐겁게 스키를 시작할 수 있습니다.',
      schedule: '09:00 / 11:00 / 14:00 / 16:00', includes: ['레슨비', '리프트 이용', '보험'],
      contact: '033-335-5757',
    },
    '2': {
      id: '2', name: '스키 개인레슨', resort: '용평리조트', price: 150000, duration: '2시간',
      level: 'lv2', levelText: 'LV2', maxStudents: 1, image: '⛷️',
      instructor: '박강사 (KSIA 레벨3)',
      description: '1:1 맞춤 개인레슨으로 본인의 실력에 맞는 집중 교육을 받을 수 있습니다. 패러렐 턴, 숏턴 등 중급 기술을 완성합니다.',
      schedule: '예약 시 협의', includes: ['레슨비', '리프트 이용', '보험', '영상 촬영'],
      contact: '033-335-5757',
    },
    '3': {
      id: '3', name: '보드 그룹레슨', resort: '휘닉스평창', price: 75000, duration: '2시간',
      level: 'lv1', levelText: 'LV1', maxStudents: 6, image: '🏂',
      instructor: '이강사 (KSIA 레벨2)',
      description: '보드 입문자를 위한 그룹레슨입니다. 사이드슬립부터 기본 턴까지 단계별로 지도합니다.',
      schedule: '09:30 / 11:30 / 14:00', includes: ['레슨비', '리프트 이용', '보험'],
      contact: '033-330-6000',
    },
    '4': {
      id: '4', name: '보드 개인레슨', resort: '휘닉스평창', price: 140000, duration: '2시간',
      level: 'lv2', levelText: 'LV2', maxStudents: 1, image: '🏂',
      instructor: '최강사 (KSIA 레벨3)',
      description: '1:1 보드 개인레슨. 카빙턴, 그라운드트릭 등 중급 테크닉을 체계적으로 배웁니다.',
      schedule: '예약 시 협의', includes: ['레슨비', '리프트 이용', '보험', '영상 촬영'],
      contact: '033-330-6000',
    },
    '5': {
      id: '5', name: '스키 LV3반', resort: '하이원', price: 200000, duration: '3시간',
      level: 'lv3', levelText: 'LV3', maxStudents: 4, image: '⛷️',
      instructor: '정강사 (데모팀 출신)',
      description: 'LV3 레벨 스키어를 위한 고급 기술 클리닉. 급사면 카빙, 모글, 오프피스테 등 고난도 기술을 연마합니다.',
      schedule: '10:00 / 14:00', includes: ['레슨비', '리프트 이용', '보험', '영상분석'],
      contact: '033-590-7000',
    },
    '6': {
      id: '6', name: '보드 그룹레슨', resort: '하이원', price: 70000, duration: '2시간',
      level: 'lv1', levelText: 'LV1', maxStudents: 8, image: '🏂',
      instructor: '한강사 (KSIA 레벨2)',
      description: '하이원 초급 슬로프에서 진행하는 보드 그룹레슨. 안전하고 넓은 슬로프에서 편하게 배웁니다.',
      schedule: '09:00 / 11:00 / 14:00', includes: ['레슨비', '보험'],
      contact: '033-590-7000',
    },
    '7': {
      id: '7', name: '스키 그룹레슨', resort: '비발디파크', price: 75000, duration: '2시간',
      level: 'lv1', levelText: 'LV1', maxStudents: 10, image: '⛷️',
      instructor: '윤강사 (KSIA 레벨2)',
      description: '비발디파크 초급 코스에서 진행되는 스키 그룹레슨. 서울 근교에서 편하게 배울 수 있습니다.',
      schedule: '09:00 / 11:00 / 14:00 / 19:00', includes: ['레슨비', '보험'],
      contact: '033-434-7000',
    },
    '8': {
      id: '8', name: '보드 개인레슨', resort: '비발디파크', price: 130000, duration: '2시간',
      level: 'lv3', levelText: 'LV3', maxStudents: 1, image: '🏂',
      instructor: '강강사 (프로보더)',
      description: '프로보더 출신 강사의 1:1 LV3 레슨. 점프, 지빙, 카빙 등 원하는 기술을 집중 훈련합니다.',
      schedule: '예약 시 협의', includes: ['레슨비', '보험', '영상 촬영', '장비 점검'],
      contact: '033-434-7000',
    },
  };

  const item = id ? allItems[id] : null;

  if (!item) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">레슨 정보를 찾을 수 없습니다</h2>
        <Link to="/lesson" className="text-gray-400 hover:text-gray-900 text-sm">
          ← 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link to="/lesson" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 text-sm transition-colors">
        ← 레슨 목록
      </Link>

      {/* Hero */}
      <div className="card rounded-2xl h-48 flex items-center justify-center text-8xl relative overflow-hidden bg-gray-100">
        <span className="relative">{item.image}</span>
      </div>

      {/* Info */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
            {item.resort}
          </span>
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
            {item.levelText}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{item.name}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
      </div>

      {/* Price & Key Info */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl font-black text-mint">{item.price.toLocaleString()}원</span>
          <span className="text-sm text-gray-500">{item.duration}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '강사', value: item.instructor },
            { label: '정원', value: item.maxStudents === 1 ? '1:1 개인' : `최대 ${item.maxStudents}명` },
            { label: '시간', value: item.schedule },
            { label: '연락처', value: item.contact },
          ].map((info) => (
            <div key={info.label} className="py-2 border-b border-gray-200">
              <span className="text-[10px] text-gray-400 block">{info.label}</span>
              <span className="text-sm text-gray-900">{info.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Includes */}
      <div className="card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">포함 사항</h3>
        <div className="flex flex-wrap gap-2">
          {item.includes.map((inc, idx) => (
            <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs border border-gray-300">
              {inc}
            </span>
          ))}
        </div>
      </div>

      {/* Action */}
      <button className="w-full py-3.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-all active:scale-[0.98]">
        레슨 예약하기
      </button>
    </div>
  );
};

export default LessonDetail;
