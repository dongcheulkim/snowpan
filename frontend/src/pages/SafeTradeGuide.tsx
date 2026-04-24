import { Link } from 'react-router-dom';
import type { ComponentType } from 'react';
import { AlertIcon, ChatIcon, PackageIcon, SearchIcon, ShieldIcon, UsersIcon, WarningIcon } from '../components/Icons';

type IconComp = ComponentType<{ size?: number; className?: string }>;

const tips: { Icon: IconComp; title: string; items: string[] }[] = [
  {
    Icon: SearchIcon,
    title: '상품 확인',
    items: [
      '실물 사진이 여러 장 있는지 확인하세요',
      '브랜드, 모델명, 연식이 명확한지 확인하세요',
      '상태 설명이 구체적인지 확인하세요',
      '가격이 시세에 비해 너무 싸면 의심하세요',
    ],
  },
  {
    Icon: ChatIcon,
    title: '채팅할 때',
    items: [
      '실물 추가 사진이나 영상을 요청하세요',
      '사용 기간, 하자 여부를 구체적으로 물어보세요',
      '거래 전에 판매자 프로필과 리뷰를 확인하세요',
      '외부 메신저로 유도하면 의심하세요',
    ],
  },
  {
    Icon: UsersIcon,
    title: '직거래',
    items: [
      '사람이 많은 공공장소에서 만나세요',
      '스키장 로비, 카페 등 안전한 장소를 추천합니다',
      '실물을 꼭 확인한 후 결제하세요',
      '가능하면 동행인과 함께 가세요',
    ],
  },
  {
    Icon: PackageIcon,
    title: '택배거래',
    items: [
      '선입금을 요구하면 주의하세요',
      '안전결제(에스크로)를 이용하세요',
      '운송장 번호를 꼭 받으세요',
      '수령 후 바로 상태를 확인하고 기록하세요',
    ],
  },
  {
    Icon: AlertIcon,
    title: '사기 의심 신호',
    items: [
      '시세보다 터무니없이 싼 가격',
      '급하게 입금을 재촉하는 경우',
      '다른 사이트/앱으로 대화를 옮기려는 경우',
      '실물 사진 제공을 거부하는 경우',
      '계좌 명의가 다른 경우',
      '연락이 갑자기 두절되는 경우',
    ],
  },
  {
    Icon: ShieldIcon,
    title: '피해 발생 시',
    items: [
      '거래 내역(채팅, 입금 기록)을 캡처해 보관하세요',
      '스노우판 고객센터에 신고해주세요',
      '경찰청 사이버수사대 (182)에 신고하세요',
      '금융감독원 (1332)에 피해 상담하세요',
    ],
  },
];

export default function SafeTradeGuide() {
  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">안전거래 가이드</h1>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          스노우판은 <strong>중계 플랫폼</strong>으로, 거래는 판매자와 구매자 간 직접 이루어집니다.
          안전한 거래를 위해 아래 가이드를 꼭 확인해주세요.
        </p>
      </div>

      {tips.map((section, idx) => {
        const { Icon } = section;
        return (
          <div key={idx} className="card p-5">
            <div className="flex items-center gap-2 mb-3 text-gray-900">
              <Icon size={20} />
              <h2 className="text-base font-bold text-gray-900">{section.title}</h2>
            </div>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-gray-900 mt-0.5 flex-shrink-0">•</span>
                  <span className="text-sm text-gray-600 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <div className="card p-5 bg-coral/5 border-coral/20">
        <h2 className="text-base font-bold text-coral mb-2 inline-flex items-center gap-2"><WarningIcon size={18} /> 스노우판은 책임지지 않습니다</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          스노우판은 거래 당사자가 아닌 중계자 역할만 합니다. 거래로 인한 분쟁, 사기 피해에 대해 법적 책임을 지지 않습니다.
          반드시 위 가이드를 참고하여 안전하게 거래해주세요.
        </p>
      </div>

      <div className="text-center pb-4">
        <Link to="/mypage/support" className="text-sm text-gray-900 font-medium hover:underline">
          문제가 생겼나요? 고객센터에 문의하세요 →
        </Link>
      </div>
    </div>
  );
}
