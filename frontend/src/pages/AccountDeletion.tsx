// 계정 삭제 안내 (/account-deletion) — 구글 플레이 데이터 보안 양식이 요구하는 "앱 밖에서도 접근 가능한 계정 삭제 안내 URL".
// 앱·웹 안의 회원 탈퇴(마이 → 회원 탈퇴)와 이메일·고객센터 요청 경로, 삭제되는 것과 법령상 남는 것을 개인정보처리방침·탈퇴 로직과 같은 내용으로 적는다.
import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';

export default function AccountDeletion() {
  useMeta({
    title: '계정 삭제 안내 | 스노우판',
    description: '스노우판 계정을 삭제하는 방법과 삭제 시 처리되는 데이터 안내.',
  });

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">계정 삭제 안내</h1>
      </div>
      <p className="text-xs text-gray-500 -mt-2">스노우판(SNOWPAN) 계정과 관련 데이터를 삭제하는 방법입니다. 앱을 지우기 전에 아래 중 한 가지로 탈퇴해 주세요.</p>

      <section className="card p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-900">방법 1. 앱 또는 웹에서 직접 탈퇴 (즉시 처리)</h2>
        <ol className="text-xs text-gray-700 leading-relaxed list-decimal pl-4 space-y-1">
          <li>스노우판 앱 또는 <a href="https://snowpan.kr" className="underline">snowpan.kr</a>에 로그인합니다.</li>
          <li>아래 탭의 <b>마이</b>로 들어가 맨 아래 <b>회원 탈퇴</b>를 누릅니다.</li>
          <li>안내 내용을 확인하고 <b>탈퇴하기</b>를 누르면 바로 처리됩니다. 카카오 계정은 비밀번호 확인 없이 진행됩니다.</li>
        </ol>
        <Link to="/mypage" className="block w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold text-center">마이 페이지로 가기</Link>
      </section>

      <section className="card p-5 space-y-2">
        <h2 className="text-sm font-bold text-gray-900">방법 2. 이메일이나 고객센터로 요청</h2>
        <p className="text-xs text-gray-700 leading-relaxed">
          로그인이 어려우면 가입한 계정 정보(카카오 로그인 여부, 닉네임, 이메일)를 적어 <a href="mailto:info@snowpan.kr" className="underline">info@snowpan.kr</a> 로 보내거나,
          로그인 후 <Link to="/mypage/support" className="underline">고객센터 채팅</Link>으로 요청해 주세요. 본인 확인 후 3영업일 안에 처리하고 회신합니다.
        </p>
      </section>

      <section className="card p-5 space-y-2">
        <h2 className="text-sm font-bold text-gray-900">삭제되는 것</h2>
        <ul className="text-xs text-gray-700 leading-relaxed list-disc pl-4 space-y-1">
          <li>이메일, 전화번호, 이름, 닉네임, 프로필 사진, 푸시 알림 토큰 등 개인 식별 정보는 즉시 익명값으로 바뀝니다.</li>
          <li>카카오 등 소셜 로그인 연결이 끊기고, 같은 계정으로 다시 로그인할 수 없습니다.</li>
          <li>판매 중이거나 예약 중인 중고 매물은 목록에서 내려갑니다.</li>
        </ul>
      </section>

      <section className="card p-5 space-y-2">
        <h2 className="text-sm font-bold text-gray-900">법령에 따라 일정 기간 남는 것</h2>
        <ul className="text-xs text-gray-700 leading-relaxed list-disc pl-4 space-y-1">
          <li>거래 기록(상품명, 가격, 거래 일시)은 거래 상대방 보호와 분쟁 해결을 위해 익명화된 상태로 5년간 보관 후 삭제됩니다(전자상거래법).</li>
          <li>작성한 게시글, 댓글, 채팅 내용은 작성자가 "탈퇴한 회원"으로 표시된 채 남을 수 있습니다. 특정 글의 삭제를 원하면 위 이메일로 함께 요청해 주세요.</li>
        </ul>
        <p className="text-[11px] text-gray-500">자세한 보관 기간과 처리 기준은 <Link to="/privacy" className="underline">개인정보처리방침</Link>에 있습니다.</p>
      </section>

      <section className="card p-5 text-center">
        <p className="text-xs text-gray-500">운영: 스노우판 · 문의 <a href="mailto:info@snowpan.kr" className="underline">info@snowpan.kr</a></p>
      </section>
    </div>
  );
}
