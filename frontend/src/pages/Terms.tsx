import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-400 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">이용약관</h1>
      </div>

      <div className="card p-5 space-y-4">
        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-2">제1조 (목적)</h2>
          <p className="text-xs text-gray-500 leading-relaxed">이 약관은 스노우판(이하 "서비스")이 제공하는 스키/보드 장비 중고거래, 렌탈, 레슨, 숙소 예약 및 커뮤니티 서비스의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.</p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-2">제2조 (이용자의 의무)</h2>
          <p className="text-xs text-gray-500 leading-relaxed">이용자는 서비스 이용 시 관련 법령, 이 약관, 서비스 이용안내 및 공지사항 등을 준수해야 하며, 기타 서비스의 업무에 방해되는 행위를 하여서는 안 됩니다.</p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-2">제3조 (거래 관련)</h2>
          <p className="text-xs text-gray-500 leading-relaxed">서비스는 이용자 간 거래의 중개 플랫폼 역할을 하며, 거래 당사자 간의 분쟁에 대해 직접적인 책임을 지지 않습니다. 다만, 안전한 거래 환경 조성을 위해 노력합니다.</p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-2">제4조 (개인정보 보호)</h2>
          <p className="text-xs text-gray-500 leading-relaxed">서비스는 이용자의 개인정보를 보호하기 위해 개인정보처리방침을 수립하고 이를 준수합니다. 수집된 개인정보는 서비스 제공 목적 외에 사용되지 않습니다.</p>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-2">제5조 (서비스 변경 및 중단)</h2>
          <p className="text-xs text-gray-500 leading-relaxed">서비스는 운영상 또는 기술상의 필요에 따라 서비스 내용을 변경하거나 중단할 수 있으며, 이 경우 사전에 공지합니다.</p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
