// 사장님 이용 안내 — 공개 페이지 (/partners/guide). 입점 안내(/partners)에서 "이용 안내 자세히 보기"로 들어온다.
// 입점하는 사장님이 스노우판에 무엇이 있고 어떻게 쓰는지 한 페이지에서 읽도록 정리 (2026-09-26).
// 광고 요금은 사이트에 공개하지 않는다(상담 안내만). 관리자·심사용 계정 등 내부 정보는 쓰지 않는다.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';

const STEPS = [
  { title: '가입과 로그인', body: '카카오, 네이버, 애플, 이메일 중 하나로 로그인합니다. 앱은 앱스토어와 구글 플레이에서 "스노우판"으로 받습니다.' },
  { title: '매장 등록', body: '마이 탭 → 사장님 대시보드 → 매장 등록하기. 업종을 고르고 상호, 주소, 영업시간, 인근 리조트, 취급 장비, 사진, 사업자등록증을 올립니다. 내 매장이 이미 올라와 있으면 먼저 찾아 주고, "직접 관리하기"에서 사업자등록증만 올리면 소유권이 넘어옵니다. 지점이 여러 개면 지점마다 따로 등록합니다.' },
  { title: '승인', body: '스노우판이 사업자등록증을 확인하고 승인하면 알림이 오고 손님에게 보이기 시작합니다. 보통 1~2일이 걸리고, 승인 전에는 손님에게 보이지 않습니다.' },
  { title: '첫 설정', body: '답장 문구 몇 개를 저장하고, 직원이 있으면 초대 링크로 붙이고, 카운터에 매장 QR을 붙여 두면 준비가 끝납니다.' },
];

const PAGE_ROWS: [string, string, string][] = [
  ['사진', '매장 사진 여러 장, 누르면 크게 보기', '매장 수정'],
  ['기본 정보', '상호, 주소와 지도, 전화, 영업시간과 "지금 영업 중" 표시, 인근 리조트, 취급 장비와 서비스', '매장 수정'],
  ['배지', '레슨은 "사업자 확인" 배지, 강사 자격 배지(LV1~3, 데몬, 티칭, 프로)', '서류 제출 후 스노우판이 부여'],
  ['소식·이벤트', '사장님이 올린 글. 매장 페이지와 홈 피드에 나옴', '매장 카드 → 소식·이벤트'],
  ['리뷰', '별점과 글, 사진 3장까지, 사장님 답글', '답글만 가능'],
  ['답장 속도', '"보통 1시간 안에 답장 · 답장률 95%" 같은 표시', '문의에 빨리 답하면 자동으로 좋아짐'],
  ['버튼', '방문 예약, 채팅 문의, 매장 찜, 전화 걸기', '자동'],
];

const DASH_ROWS: [string, string][] = [
  ['오늘 할 일', '새 예약 요청, 읽지 않은 문의, 답글 없는 리뷰, 새 모집 신청. 누르면 그 화면으로 감'],
  ['예약 일정', '앞으로 2주 예약을 날짜별로'],
  ['30일 통계', '최근 30일 예약, 문의, 리뷰 수와 매장별 찜 수, 답장 속도'],
  ['매장 수정', '사진, 영업시간, 인근 리조트, 취급 장비, 겸업 설정'],
  ['소식·이벤트', '매장 소식 올리기. 하루 5개까지'],
  ['모집', '직원, 앰버서더 같은 모집 글을 올리고 신청서 받기'],
  ['답장 문구', '자주 쓰는 답 20개 저장'],
  ['QR', '카운터용 매장 QR 이미지 내려받기'],
  ['직원', '초대 링크 만들기, 직원 해제'],
  ['예약 관리', '확정, 거절, 취소, 정비 작업 현황, 끝난 예약 정리'],
  ['광고 관리', '광고 신청과 결제 내역'],
  ['알림 설정', '앱 푸시 알림 켜고 끄기'],
];

const AUTO_ROWS: [string, string][] = [
  ['예약 전날 저녁 7시 이후', '"내일 예약 안내"'],
  ['예약 당일 아침 8시 이후', '"오늘 예약 안내"'],
  ['정비 접수·작업 중·완료 버튼을 누를 때', '장비 접수, 작업 중, 작업 끝남(찾아가세요)'],
  ['다녀간 다음 날 11시 이후', '리뷰 요청(이미 쓴 손님 제외)'],
  ['소식을 올릴 때', '찜한 손님에게 "{매장} 새 소식"'],
  ['예약 확정·거절할 때', '확정 또는 거절 사유'],
];

const AD_ROWS: [string, string][] = [
  ['메인 배너', '홈 화면 맨 위. 모든 방문자에게'],
  ['카테고리 배너', '스키·보드샵, 렌탈샵, 정비샵, 레슨, 숙소 같은 카테고리 목록 맨 위'],
  ['프리미엄 노출', '카테고리 목록 최상단에 내 매장 고정'],
];

const FAQ = [
  { q: '비용이 드나요?', a: '등록, 소식, 리뷰, 노출은 무료입니다. 광고만 유료이고 원할 때만 신청합니다.' },
  { q: '승인은 얼마나 걸리나요?', a: '사업자등록증 확인 뒤 보통 1~2일입니다. 승인 전에는 손님에게 보이지 않습니다.' },
  { q: '카카오 계정만 있으면 되나요?', a: '네. 카카오 로그인 후 마이 탭의 사장님 대시보드에서 바로 시작합니다.' },
  { q: '제 매장이 이미 올라와 있는데 정보가 달라요.', a: '매장 등록하기를 누르면 먼저 내 매장을 찾아 줍니다. "직접 관리하기"로 가져와 고치시면 됩니다.' },
  { q: '지점이 여러 개예요.', a: '지점마다 따로 등록합니다. 각 지점은 가까운 리조트 목록에 나옵니다.' },
  { q: '판매도 하고 정비도 해요.', a: '한 번만 등록하고 겸업에서 판매·렌탈·정비를 고릅니다.' },
  { q: '직원이 대신 관리해도 되나요?', a: '네. 매장 카드의 직원 → 초대 링크 만들기로 붙이면 예약, 소식, 리뷰 답글, 손님 채팅까지 함께 합니다.' },
  { q: '예약 요청을 놓치면요?', a: '앱 푸시와 대시보드 오늘 할 일에 남아 있습니다. 답장이 늦으면 매장 페이지의 답장 속도 표시가 낮아집니다.' },
  { q: '앱이 꼭 필요한가요?', a: '웹에서도 같은 기능을 다 쓰지만, 손님 요청을 바로 받으려면 앱 푸시 알림이 편합니다.' },
];

function Section({ title, lead, children }: { title: string; lead: string; children?: ReactNode }) {
  return (
    <section className="card p-5 space-y-3">
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      <p className="text-xs text-gray-600 leading-relaxed">{lead}</p>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="text-left font-bold text-gray-900 border-b border-gray-200 px-1 py-1.5 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="align-top">
              {r.map((c, i) => (
                <td key={i} className={`border-b border-gray-100 px-1 py-1.5 leading-relaxed ${i === 0 ? 'font-bold text-gray-900 whitespace-nowrap' : 'text-gray-600'}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PartnerGuide() {
  useMeta({
    title: '사장님 이용 안내 | 스노우판',
    description: '스노우판에 입점한 매장 사장님이 예약·채팅·소식·리뷰·직원·QR을 어떻게 쓰는지 한 페이지에 정리했습니다. 등록부터 노출까지 무료입니다.',
  });

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      <header className="text-center pt-2">
        <p className="text-[10px] font-bold tracking-widest text-gray-500">SNOWPAN PARTNERS</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">사장님 이용 안내</h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          스노우판은 스키장 근처 매장을 손님이 한곳에서 찾고, 예약과 채팅으로 바로 연락하는 앱입니다.<br />
          매장 등록, 소식, 리뷰, 노출은 전부 무료이고 예약금이나 수수료가 없습니다.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Link to="/partners/find" className="py-3 rounded-xl bg-gray-900 text-white text-sm font-bold text-center hover:bg-gray-800 transition-colors">
          매장 등록하기
        </Link>
        <Link to="/partners" className="py-3 rounded-xl bg-white border border-gray-200 text-gray-800 text-sm font-bold text-center hover:bg-gray-50 transition-colors">
          입점 안내로
        </Link>
      </div>

      <Section title="스노우판이 하는 일" lead="손님은 스노우판에서 스키장 근처 매장을 찾아 예약하거나 채팅으로 물어보고, 사장님은 그 요청을 앱에서 받아 확정합니다. 돈은 현장에서 오가고 스노우판은 연결만 합니다.">
        <ul className="text-xs text-gray-600 leading-relaxed space-y-1">
          <li>· 매장 종류 5가지: 스키·보드샵, 정비샵, 렌탈샵, 레슨, 숙소. 판매·렌탈·정비를 함께 하는 매장은 겸업으로 여러 곳에 같이 나옵니다.</li>
          <li>· 손님이 매장을 만나는 길: 리조트별 목록, 내 주변 거리순, 검색(매장 이름이 바로 추천됨), 리조트 페이지의 근처 매장, 홈 화면의 매장 소식 피드.</li>
          <li>· 손님이 매장에서 하는 일: 방문 예약, 채팅 문의, 리뷰, 매장 찜, 소식 알림 받기.</li>
          <li>· 웹(snowpan.kr)과 아이폰·안드로이드 앱이 같은 화면입니다. 앱이면 손님 요청이 푸시 알림으로 바로 옵니다.</li>
          <li>· 같은 앱 안에 스키·보드 장비 중고거래와 커뮤니티가 있어 시즌 내내 손님이 드나듭니다.</li>
        </ul>
      </Section>

      <Section title="입점 순서" lead="카카오 계정만 있으면 10분 안에 등록할 수 있고, 사업자등록증 확인 뒤 보통 1~2일 안에 공개됩니다.">
        <div className="space-y-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
              <div>
                <p className="text-sm font-bold text-gray-900">{s.title}</p>
                <p className="text-xs text-gray-600 leading-relaxed mt-1">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">정보를 크게 고치거나 겸업을 새로 추가하면 사진이나 영상 링크로 한 번 더 확인한 뒤 반영됩니다.</p>
      </Section>

      <Section title="손님에게 보이는 매장 페이지" lead="손님은 매장 페이지 한 곳에서 사진을 보고, 영업 중인지 확인하고, 바로 예약이나 채팅을 누릅니다. 대시보드에서 고치면 바로 반영됩니다.">
        <Table head={['항목', '손님에게 보이는 것', '관리하는 곳']} rows={PAGE_ROWS} />
        <p className="text-xs text-gray-500">리뷰는 매장당 한 사람이 하나만 쓸 수 있고 다시 쓰면 갱신됩니다. 겸업을 설정한 매장은 스키·보드샵, 렌탈샵, 정비샵 목록에 같이 나옵니다.</p>
      </Section>

      <Section title="예약과 문의 응대" lead="손님의 예약 요청과 문의는 모두 채팅방으로 들어오고, 사장님은 그 방에서 확정·거절·답장을 합니다. 예약금은 없고 사장님이 확정하면 예약이 끝납니다.">
        <p className="text-xs font-bold text-gray-900">방문 예약</p>
        <ul className="text-xs text-gray-600 leading-relaxed space-y-1">
          <li>· 손님이 날짜, 시간, 인원과 업종별 항목을 적어 요청합니다. 렌탈은 장비와 사이즈, 정비는 정비 항목, 레슨은 수준과 종목, 숙소는 객실과 박 수입니다.</li>
          <li>· 요청이 오면 푸시 알림이 오고 채팅방에 예약 카드가 생깁니다. 카드에서 확정(안내 메시지 첨부 가능), 거절(사유 입력), 취소를 누릅니다.</li>
          <li>· 확정하면 손님에게 알림이 가고, 예약 전날과 당일에 스노우판이 자동으로 다시 안내합니다.</li>
          <li>· 정비샵은 확정 뒤 장비 접수 → 작업 시작 → 작업 완료 버튼을 차례로 누르면 손님에게 "접수했어요", "작업 중이에요", "작업이 끝났어요, 찾아가세요" 알림이 갑니다. 전화로 알릴 필요가 없습니다.</li>
          <li>· 끝난 예약은 목록에서 정리할 수 있고, 앞으로 2주 일정은 대시보드에서 한눈에 봅니다.</li>
        </ul>
        <p className="text-xs font-bold text-gray-900">채팅 문의</p>
        <ul className="text-xs text-gray-600 leading-relaxed space-y-1">
          <li>· 매장 페이지의 채팅 문의 버튼으로 손님이 1:1 대화를 시작합니다. 사진도 주고받고 읽음 표시가 있습니다.</li>
          <li>· 답장 문구: 자주 하는 답(영업시간, 가격표, 오시는 길 등)을 20개까지 저장해 두고 채팅 입력줄의 "문구" 버튼으로 바로 넣습니다.</li>
          <li>· 직원 함께 응대: 매장 카드의 "직원"에서 초대 링크(7일, 10명까지)를 만들어 보내면 직원이 자기 계정으로 참여합니다. 직원은 손님 문의 채팅을 같이 보고 답하며, 손님 화면에는 "닉네임 · 직원"으로 표시됩니다. 예약 확정·거절, 매장 수정, 소식, 리뷰 답글도 함께 합니다. 매장 삭제와 직원 추가·해제는 사장님만 할 수 있습니다.</li>
          <li>· 대화 기록은 상대가 지워도 내 쪽에 남아 분쟁 때 근거가 됩니다.</li>
        </ul>
      </Section>

      <Section title="사장님 대시보드 한눈에" lead="마이 탭의 사장님 대시보드가 매장 관리의 전부입니다. 들어가면 오늘 할 일이 맨 위에 있어 그것만 처리해도 됩니다.">
        <Table head={['메뉴', '하는 일']} rows={DASH_ROWS} />
        <p className="text-xs text-gray-500">채팅은 아래 채팅 탭에서 손님 대화와 예약 카드를 한 번에 봅니다.</p>
      </Section>

      <Section title="손님을 다시 오게 하는 도구" lead="한 번 온 손님이 매장을 찜하면 사장님이 올리는 소식이 그 손님의 폰에 알림으로 갑니다. 문자를 보낼 필요가 없습니다.">
        <ul className="text-xs text-gray-600 leading-relaxed space-y-1">
          <li>· 소식·이벤트: 신상 입고, 시즌 할인, 임시 휴무 같은 글을 사진과 함께 올립니다. 매장 페이지와 홈 화면 매장 소식 피드에 나오고, 찜한 손님 모두에게 알림이 갑니다. 하루 5개까지.</li>
          <li>· 매장 찜: 손님이 찜을 누르면 마이 탭의 찜한 매장에 남고 소식 알림을 받습니다. 찜 수는 대시보드에서 봅니다.</li>
          <li>· 리뷰 답글: 리뷰마다 사장님 답글을 달 수 있고 다른 손님도 봅니다. 답글 없는 리뷰는 오늘 할 일에 뜹니다.</li>
          <li>· 답장 속도: 문의가 3건 이상 쌓이면 최근 30일 첫 답장 시간과 답장률이 매장 페이지에 표시됩니다.</li>
          <li>· 매장 QR: 대시보드에서 QR 이미지를 내려받아 카운터나 입구에 붙입니다. 손님이 찍으면 매장 페이지로 와서 리뷰를 쓰거나 찜하거나 다음 예약을 합니다.</li>
          <li>· 모집: 직원이나 앰버서더를 모집하는 글을 올리면 스노우판 회원이 신청서를 냅니다.</li>
        </ul>
      </Section>

      <Section title="자동으로 손님에게 가는 안내" lead="사장님이 따로 하지 않아도 스노우판이 손님에게 보내는 알림입니다. 노쇼와 리뷰 누락을 줄입니다.">
        <Table head={['언제', '손님이 받는 알림']} rows={AUTO_ROWS} />
      </Section>

      <Section title="광고 (선택)" lead="기본 노출은 무료이고, 더 많이 보이고 싶을 때만 광고를 신청합니다. 가격과 기간은 고객센터 채팅으로 상담하면 안내해 드립니다.">
        <Table head={['종류', '어디에 보이나']} rows={AD_ROWS} />
        <p className="text-xs text-gray-500">
          신청은 대시보드의 광고 관리 또는 <Link to="/advertise" className="text-gray-900 underline">광고 안내</Link>에서 하고, 토스로 결제하면 스노우판이 검수한 뒤 노출됩니다. 게시가 시작된 뒤에는 중도 해지·환불이 되지 않으니 신중히 결정해 주세요. 입금 전 신청은 취소할 수 있습니다.
        </p>
      </Section>

      <Section title="비용과 정책" lead="매장 등록, 사진·정보 관리, 소식·이벤트, 리뷰, 예약·채팅, 직원 계정, QR, 노출은 전부 무료입니다. 유료는 광고 하나뿐입니다.">
        <ul className="text-xs text-gray-600 leading-relaxed space-y-1">
          <li>· 예약금과 수수료가 없습니다. 예약은 사장님 확정으로 끝나고 돈은 현장에서 오갑니다.</li>
          <li>· 리뷰는 매장당 1인 1개이고 사장님이 지울 수 없습니다. 답글로 대응하고, 허위·악의 리뷰는 신고하면 스노우판이 확인합니다.</li>
          <li>· 손님이 대화를 지워도 사장님 쪽 기록은 남습니다.</li>
          <li>· 사업자등록증은 승인 확인에만 쓰고 손님에게 보이지 않습니다.</li>
          <li>· 한도: 소식 하루 5개, 답장 문구 20개, 직원 초대 링크 7일·10명, 사진 업로드 분당 30장.</li>
          <li>· 찜 알림은 사장님과 직원 본인에게는 가지 않습니다.</li>
          <li>· 매장을 내리고 싶으면 대시보드에서 직접 삭제하거나 고객센터에 알려 주세요.</li>
        </ul>
      </Section>

      <section className="card p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-900">자주 묻는 질문</h2>
        {FAQ.map((f) => (
          <div key={f.q}>
            <p className="text-xs font-bold text-gray-900">{f.q}</p>
            <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{f.a}</p>
          </div>
        ))}
      </section>

      <section className="card p-5 text-center">
        <p className="text-sm font-bold text-gray-900">궁금한 점은 채팅으로 물어보세요</p>
        <p className="text-xs text-gray-500 mt-1">
          고객센터에서 관리자와 1:1 채팅으로 바로 답해 드립니다. 이메일 <a href="mailto:info@snowpan.kr" className="text-gray-900 underline">info@snowpan.kr</a>도 됩니다.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Link to="/mypage/support" className="py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-sm font-bold text-center hover:bg-gray-50 transition-colors">
            관리자 채팅 문의
          </Link>
          <Link to="/mypage/shops" className="py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold text-center hover:bg-gray-800 transition-colors">
            사장님 대시보드
          </Link>
        </div>
      </section>
    </div>
  );
}
