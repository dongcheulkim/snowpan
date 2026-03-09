import { useParams, Link } from 'react-router-dom';

const RentalDetail = () => {
  const { id } = useParams();

  const allItems: Record<string, {
    id: string; name: string; resort: string; price: number; duration: string;
    equipment: string[]; image: string; description: string; location: string;
    operatingHours: string; contact: string; options: { name: string; price: number }[];
  }> = {
    '1': {
      id: '1', name: '스키 풀세트', resort: '용평리조트', price: 45000, duration: '1일',
      equipment: ['스키', '부츠', '폴'], image: '⛷️',
      description: '최신 시즌 장비로 구성된 스키 풀세트입니다. 카빙 스키 기준이며 사이즈는 현장에서 맞춤 제공됩니다. 부츠 피팅 서비스 포함.',
      location: '용평리조트 렌탈샵 1층', operatingHours: '08:00 ~ 17:00', contact: '033-335-5757',
      options: [{ name: '반일권 (4시간)', price: 30000 }, { name: '1일권', price: 45000 }, { name: '시즌권', price: 350000 }],
    },
    '2': {
      id: '2', name: '보드 풀세트', resort: '용평리조트', price: 40000, duration: '1일',
      equipment: ['보드', '부츠'], image: '🏂',
      description: '올시즌 최신 보드로 구성된 풀세트입니다. 프리스타일/올마운틴 선택 가능하며 부츠 사이즈 현장 맞춤.',
      location: '용평리조트 렌탈샵 1층', operatingHours: '08:00 ~ 17:00', contact: '033-335-5757',
      options: [{ name: '반일권 (4시간)', price: 28000 }, { name: '1일권', price: 40000 }, { name: '시즌권', price: 300000 }],
    },
    '3': {
      id: '3', name: '스키 풀세트', resort: '휘닉스평창', price: 42000, duration: '1일',
      equipment: ['스키', '부츠', '폴'], image: '⛷️',
      description: '휘닉스평창 공식 렌탈샵의 스키 풀세트입니다. 고급 장비 옵션도 추가 가능합니다.',
      location: '휘닉스평창 스키하우스 B1', operatingHours: '07:30 ~ 17:30', contact: '033-330-6000',
      options: [{ name: '반일권 (4시간)', price: 28000 }, { name: '1일권', price: 42000 }, { name: '프리미엄 1일', price: 65000 }],
    },
    '4': {
      id: '4', name: '보드 풀세트', resort: '휘닉스평창', price: 38000, duration: '1일',
      equipment: ['보드', '부츠'], image: '🏂',
      description: '휘닉스평창 렌탈샵 보드 풀세트. 다양한 사이즈와 스타일 보유.',
      location: '휘닉스평창 스키하우스 B1', operatingHours: '07:30 ~ 17:30', contact: '033-330-6000',
      options: [{ name: '반일권 (4시간)', price: 25000 }, { name: '1일권', price: 38000 }, { name: '프리미엄 1일', price: 58000 }],
    },
    '5': {
      id: '5', name: '스키 풀세트', resort: '하이원', price: 40000, duration: '1일',
      equipment: ['스키', '부츠', '폴'], image: '⛷️',
      description: '하이원리조트 공식 렌탈샵. 곤돌라 탑승장 바로 옆에 위치하여 편리합니다.',
      location: '하이원리조트 마운틴허브', operatingHours: '08:00 ~ 17:00', contact: '033-590-7000',
      options: [{ name: '반일권 (4시간)', price: 27000 }, { name: '1일권', price: 40000 }, { name: '2일권', price: 70000 }],
    },
    '6': {
      id: '6', name: '보드 풀세트', resort: '하이원', price: 35000, duration: '1일',
      equipment: ['보드', '부츠'], image: '🏂',
      description: '하이원리조트 보드 렌탈. 초보자용부터 상급자용까지 다양한 보드 보유.',
      location: '하이원리조트 마운틴허브', operatingHours: '08:00 ~ 17:00', contact: '033-590-7000',
      options: [{ name: '반일권 (4시간)', price: 23000 }, { name: '1일권', price: 35000 }, { name: '2일권', price: 60000 }],
    },
    '7': {
      id: '7', name: '스키 풀세트', resort: '비발디파크', price: 43000, duration: '1일',
      equipment: ['스키', '부츠', '폴'], image: '⛷️',
      description: '비발디파크 오션700 렌탈샵의 스키 풀세트. 야간권도 별도 운영합니다.',
      location: '비발디파크 스키하우스 1층', operatingHours: '08:00 ~ 22:00', contact: '033-434-7000',
      options: [{ name: '주간권', price: 43000 }, { name: '야간권', price: 35000 }, { name: '올데이', price: 55000 }],
    },
    '8': {
      id: '8', name: '헬멧+고글 세트', resort: '용평리조트', price: 15000, duration: '1일',
      equipment: ['헬멧', '고글'], image: '⛑️',
      description: '안전 필수 장비인 헬멧과 고글 세트입니다. 다양한 사이즈 보유.',
      location: '용평리조트 렌탈샵 1층', operatingHours: '08:00 ~ 17:00', contact: '033-335-5757',
      options: [{ name: '헬멧만', price: 8000 }, { name: '고글만', price: 10000 }, { name: '세트', price: 15000 }],
    },
    '9': {
      id: '9', name: '스키복 상하세트', resort: '휘닉스평창', price: 25000, duration: '1일',
      equipment: ['상의', '하의'], image: '🧥',
      description: '방수/방풍 기능의 스키복 상하세트. 남녀 모두 다양한 사이즈 준비.',
      location: '휘닉스평창 스키하우스 B1', operatingHours: '07:30 ~ 17:30', contact: '033-330-6000',
      options: [{ name: '상의만', price: 15000 }, { name: '하의만', price: 15000 }, { name: '상하세트', price: 25000 }],
    },
    '10': {
      id: '10', name: '보드 풀세트', resort: '엘리시안', price: 35000, duration: '1일',
      equipment: ['보드', '부츠'], image: '🏂',
      description: '엘리시안강촌 렌탈샵 보드 풀세트. 서울 근교 가성비 렌탈.',
      location: '엘리시안강촌 스키하우스', operatingHours: '08:30 ~ 17:00', contact: '033-260-2000',
      options: [{ name: '반일권', price: 23000 }, { name: '1일권', price: 35000 }, { name: '야간권', price: 28000 }],
    },
  };

  const item = id ? allItems[id] : null;

  if (!item) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">렌탈 정보를 찾을 수 없습니다</h2>
        <Link to="/rental" className="text-gray-400 hover:text-gray-900 text-sm">
          ← 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link to="/rental" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 text-sm transition-colors">
        ← 렌탈 목록
      </Link>

      {/* Hero */}
      <div className="card rounded-2xl h-48 flex items-center justify-center text-8xl relative overflow-hidden bg-gray-100">
        <span className="relative">{item.image}</span>
      </div>

      {/* Info */}
      <div className="card rounded-2xl p-5">
        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
          {item.resort}
        </span>
        <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-1">{item.name}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
      </div>

      {/* Equipment */}
      <div className="card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">포함 장비</h3>
        <div className="flex flex-wrap gap-2">
          {item.equipment.map((eq, idx) => (
            <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs border border-gray-300">
              {eq}
            </span>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">이용 옵션</h3>
        <div className="space-y-2">
          {item.options.map((opt, idx) => (
            <div key={idx} className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-gray-100 border border-gray-200">
              <span className="text-sm text-gray-600">{opt.name}</span>
              <span className="text-sm font-bold text-mint">{opt.price.toLocaleString()}원</span>
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">이용 안내</h3>
        <div className="space-y-2.5">
          {[
            { label: '위치', value: item.location },
            { label: '운영시간', value: item.operatingHours },
            { label: '연락처', value: item.contact },
          ].map((info) => (
            <div key={info.label} className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-xs text-gray-400">{info.label}</span>
              <span className="text-sm text-gray-900">{info.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      <button className="w-full py-3.5 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-light transition-all active:scale-[0.98]">
        예약하기
      </button>
    </div>
  );
};

export default RentalDetail;
