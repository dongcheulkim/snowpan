import { useState, type ComponentType } from 'react';
import { AlertIcon, BotIcon, ChatIcon, MegaphoneIcon, UserIcon } from './Icons';
import { SecondHandIcon, SkiShopIcon } from './CategoryIcons';

// 고객센터 채팅 상단 고정 안내 메뉴 — 메시지 영역 위에 항상 떠 있어(스크롤해도 그대로) 손님이 언제든 다시 눌러 물어볼 수 있다.
// 세부 항목을 고르면 "[문의] 카테고리 > 세부" 메시지가 나가고 메뉴는 첫 화면으로 돌아온다(계속 펼쳐진 채).
// 화면이 좁을 때를 위해 접기 버튼만 두고, 접어도 "어떤 도움이 필요하신가요?" 줄은 남는다.

interface Props {
  onSelect: (category: string, sub: string) => void;
}

type IconComp = ComponentType<{ size?: number; className?: string }>;

const categories: Record<string, { label: string; Icon: IconComp; subs: string[] }> = {
  trade:    { label: '거래 관련',    Icon: SecondHandIcon, subs: ['상품 문의', '거래 분쟁', '환불/취소', '사기 신고'] },
  account:  { label: '계정/인증',    Icon: UserIcon,       subs: ['로그인 문제', '비밀번호 변경', '자격증 뱃지', '회원 탈퇴'] },
  business: { label: '사업자 등록',  Icon: SkiShopIcon,    subs: ['스키·보드샵 등록', '정비샵 등록', '렌탈샵/레슨 등록', '숙소 등록'] },
  ad:       { label: '광고',         Icon: MegaphoneIcon,  subs: ['광고 신청 방법', '광고 비용', '광고 수정/취소', '프리미엄 문의'] },
  report:   { label: '신고/불편',    Icon: AlertIcon,      subs: ['게시글 신고', '유저 신고', '버그/오류', '서비스 건의'] },
  other:    { label: '기타',         Icon: ChatIcon,       subs: ['제휴/협력', '기타 문의'] },
};

export default function ChatBotGuide({ onSelect }: Props) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const cat = selectedCat ? categories[selectedCat] : null;

  return (
    <div className="flex-shrink-0 border-b border-gray-200 bg-snow/95 backdrop-blur">
      <div className="max-w-2xl mx-auto px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => { if (cat) setSelectedCat(null); else setOpen(v => !v); }}
            className="flex items-center gap-2 min-w-0"
            aria-expanded={open}
          >
            <BotIcon size={16} className="text-gray-700 flex-shrink-0" />
            {cat ? (
              <span className="text-sm font-bold text-gray-900 inline-flex items-center gap-1.5 truncate"><cat.Icon size={14} /> {cat.label}</span>
            ) : (
              <span className="text-sm font-bold text-gray-900 truncate">어떤 도움이 필요하신가요?</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { if (cat) setSelectedCat(null); else setOpen(v => !v); }}
            className="flex-shrink-0 text-[11px] text-gray-500 px-2 py-1"
          >
            {cat ? '뒤로' : open ? '접기' : '메뉴 열기'}
          </button>
        </div>

        {open && !cat && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(categories).map(([key, c]) => {
              const { Icon } = c;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedCat(key)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-full text-xs font-medium text-gray-700 border border-gray-200 transition-colors"
                >
                  <Icon size={14} className="text-gray-700" />
                  {c.label}
                </button>
              );
            })}
          </div>
        )}

        {open && cat && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cat.subs.map(sub => (
              <button
                key={sub}
                type="button"
                onClick={() => { onSelect(cat.label, sub); setSelectedCat(null); }}
                className="px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700 rounded-full text-xs font-medium transition-colors"
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
