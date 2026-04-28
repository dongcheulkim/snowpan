import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getUser } from '../api';

type Sport = 'ski' | 'board';
type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert';

interface BrandInfo {
  name: string;
  country: string;
  style: string;
  desc: string;
  models: string;
  levels: Level[];
}

const SKI_BRANDS: BrandInfo[] = [
  {
    name: '오가사카 (Ogasaka)',
    country: '🇯🇵 일본',
    style: '기술 지향 · 카빙',
    desc: '일본 장인 정신으로 만든 기술 스키의 대명사. TC 시리즈가 유명하며 정확한 엣지 그립과 안정적인 카빙이 특징. 한국 스키어들에게 인기가 높고, 기술 중심의 정교한 턴을 추구하는 스키어에게 적합합니다.',
    models: 'TC-S, TC-M, TC-L, KS-RT',
    levels: ['intermediate', 'advanced', 'expert'],
  },
  {
    name: '아토믹 (Atomic)',
    country: '🇦🇹 오스트리아',
    style: '올라운드 · 레이싱',
    desc: '초보부터 월드컵 선수까지 폭넓은 라인업. 가볍고 안정적이며 반응이 빠른 것이 특징. 레이싱 라인(Redster)은 공격적인 카빙에 강하고, MAVERICK 라인은 올라운드 스키어에게 적합합니다.',
    models: 'Redster S9, Maverick, Vantage',
    levels: ['beginner', 'intermediate', 'advanced', 'expert'],
  },
  {
    name: '살로몬 (Salomon)',
    country: '🇫🇷 프랑스',
    style: '올라운드 · 편안함',
    desc: '부드러운 조작감과 관대한 성능으로 유명. 초중급자도 쉽게 탈 수 있으며, S/Race 라인은 레이싱 성능도 뛰어남. 스키뿐 아니라 부츠, 바인딩까지 토탈 시스템이 강점입니다.',
    models: 'S/Race, Stance, QST',
    levels: ['beginner', 'intermediate', 'advanced', 'expert'],
  },
  {
    name: '피셔 (Fischer)',
    country: '🇦🇹 오스트리아',
    style: '레이싱 · 기술',
    desc: '월드컵 레이싱에서 검증된 성능. RC4 시리즈는 강한 엣지 그립과 빠른 반응이 특징이며, 고속 안정성이 뛰어남. 기술 스키어와 레이서에게 사랑받는 브랜드입니다.',
    models: 'RC4 Worldcup, RC4 Speed, The Curv',
    levels: ['intermediate', 'advanced', 'expert'],
  },
  {
    name: '헤드 (Head)',
    country: '🇦🇹 오스트리아',
    style: '올라운드 · 파워',
    desc: '그래핀 소재 기술로 가벼우면서도 강한 파워 전달. Supershape 라인은 중상급 카빙에 최적화되어 있으며, 다양한 설면에서 안정적인 퍼포먼스를 보여줍니다.',
    models: 'Supershape, WC Rebels, e-Rally',
    levels: ['beginner', 'intermediate', 'advanced'],
  },
  {
    name: '뵐클 (Völkl)',
    country: '🇩🇪 독일',
    style: '정밀 카빙 · 올마운틴',
    desc: '독일 공학의 정밀함이 담긴 스키. 정확한 엣지 컨트롤과 안정감이 뛰어나며, Racetiger 시리즈는 카빙의 정석으로 불림. 중급 이상에서 진가를 발휘합니다.',
    models: 'Racetiger, Deacon, Mantra M7',
    levels: ['intermediate', 'advanced', 'expert'],
  },
  {
    name: '로시뇰 (Rossignol)',
    country: '🇫🇷 프랑스',
    style: '입문 · 올라운드',
    desc: '130년 전통의 프랑스 브랜드. 부드럽고 관대한 조작감으로 초보자에게 특히 인기. PURSUIT 라인은 중급자 성장에 좋고, HERO 라인은 레이싱 성능도 갖추고 있습니다.',
    models: 'Hero, Pursuit, Experience',
    levels: ['beginner', 'intermediate', 'advanced'],
  },
  {
    name: '노르디카 (Nordica)',
    country: '🇮🇹 이탈리아',
    style: '올마운틴 · 카빙',
    desc: '이탈리안 장인 정신과 올마운틴 성능의 조화. Enforcer 시리즈는 다양한 지형에서 뛰어난 컨트롤을 보여주며, Dobermann 라인은 공격적인 레이서용입니다.',
    models: 'Enforcer, Dobermann, Santa Ana',
    levels: ['intermediate', 'advanced', 'expert'],
  },
  {
    name: '스톡리 (Stöckli)',
    country: '🇨🇭 스위스',
    style: '프리미엄 · 정밀 카빙',
    desc: '스위스 핸드메이드 프리미엄 스키. 최고급 소재와 수작업 제작으로 정밀한 카빙 성능을 자랑. 가격대가 높지만 그만큼 퀄리티가 뛰어나며, 상급자들의 로망 브랜드입니다.',
    models: 'Laser AX/SX/MX, GSR',
    levels: ['advanced', 'expert'],
  },
];

const BOARD_BRANDS: BrandInfo[] = [
  {
    name: '버튼 (Burton)',
    country: '🇺🇸 미국',
    style: '올라운드 · 스탠다드',
    desc: '스노보드의 원조이자 세계 1위 브랜드. 커스텀(Custom) 시리즈는 현대 스노보드의 기준이 된 올라운드 데크. 다중 파이버글래스(4결)를 사용하여 안정적인 플렉스와 반응을 제공하며, 초보부터 프로까지 모든 레벨을 커버합니다.',
    models: 'Custom, Custom X, Process, Ripcord',
    levels: ['beginner', 'intermediate', 'advanced', 'expert'],
  },
  {
    name: '라이드 (Ride)',
    country: '🇺🇸 미국',
    style: '내구성 · 카빙',
    desc: '대나무와 오동나무 코어로 가볍고 스냅이 강함. 폴리우레탄 사이드월로 접착력과 내진동성이 업계 최고 수준. 거의 모든 라인이 M캠버라 카빙(그루밍)을 좋아하는 라이더에게 최적. 내구성이 가장 강한 브랜드로 정평.',
    models: 'Algorythm, Berzerker, Warpig',
    levels: ['intermediate', 'advanced', 'expert'],
  },
  {
    name: '존스 (Jones)',
    country: '🇨🇭 스위스',
    style: '올라운드 · 프리라이딩',
    desc: '니데커 그룹 산하 유럽의 버튼격 브랜드. 우드 사용에서 업계 탑급이며, W캠버를 최초로 고안. 얼티메이트 트랙션(잔잔한 웨이브 엣지)으로 엣지 그립이 뛰어남. 올라운드 및 초보에게도 좋으며, 백컨트리/프리라이딩에 강점.',
    models: 'Flagship, Mountain Twin, Frontier',
    levels: ['beginner', 'intermediate', 'advanced'],
  },
  {
    name: '리브텍 (Lib Tech)',
    country: '🇺🇸 미국',
    style: '혁신 · 올라운드',
    desc: '해외 판매 최상위권 브랜드. 바나나 캠버, 물결 엣지(Magne-Traction) 등 혁신적인 기술로 유명. 아이스 바닥에서도 강한 엣지 그립을 제공하며, 환경 친화적 제조 공정으로도 알려져 있습니다.',
    models: 'T.Rice Pro, Skate Banana, Cold Brew',
    levels: ['beginner', 'intermediate', 'advanced', 'expert'],
  },
  {
    name: '카피타 (Capita)',
    country: '🇺🇸 미국 (오스트리아 생산)',
    style: '프리스타일 · 파크',
    desc: '오스트리아 Mothership 공장에서 100% 청정에너지로 생산. DOA(Defenders of Awesome)는 프리스타일의 아이콘. 강한 팝과 반응성으로 파크와 점프에 특화되어 있으며, 디자인도 독특하고 과감합니다.',
    models: 'DOA, Mercury, Mega Merc, Birds of a Feather',
    levels: ['intermediate', 'advanced', 'expert'],
  },
  {
    name: 'GNU',
    country: '🇺🇸 미국',
    style: '프리스타일 · 그라운드트릭',
    desc: 'Lib Tech의 형제 브랜드로 같은 Mervin 공장에서 생산. Magne-Traction 엣지 기술을 공유하며, 프리스타일과 그라운드트릭에 특화. 재밌고 장난기 넘치는 라이딩을 추구하는 보더에게 인기.',
    models: 'Headspace, Money, Riders Choice',
    levels: ['intermediate', 'advanced'],
  },
  {
    name: '나이트로 (Nitro)',
    country: '🇺🇸 미국',
    style: '올라운드 · 입문',
    desc: '가성비와 품질의 균형이 좋은 브랜드. Prime 시리즈는 입문자에게 가장 편안한 컨트롤을 제공하며, Team 시리즈는 중상급 올라운드 데크. 다양한 지형에서 무난하게 대응 가능합니다.',
    models: 'Prime, Team Pro, Magnum, Banker',
    levels: ['beginner', 'intermediate', 'advanced'],
  },
  {
    name: 'YES.',
    country: '🇳🇴 노르웨이',
    style: '올라운드 · 서핑감',
    desc: '노르웨이 출신의 감성적인 브랜드. UnDisrupted 캠버 기술로 부드러운 서핑 같은 라이딩감을 제공. 파우더와 그루밍 모두에서 자연스러운 느낌을 주며, 디자인도 깔끔하고 세련됩니다.',
    models: 'Standard, Basic, Greats, Optimistic',
    levels: ['intermediate', 'advanced'],
  },
];

const LEVEL_INFO: Record<Level, { label: string; desc: string; badge: string }> = {
  beginner: { label: '입문~초급', desc: 'KSIA LV1 이하 · 처음 시작하는 분', badge: 'bg-green-500' },
  intermediate: { label: '중급', desc: 'KSIA LV2 · 패러렐 턴 가능', badge: 'bg-accent' },
  advanced: { label: '상급', desc: 'KSIA LV3 · 숏턴/카빙 가능', badge: 'bg-purple-500' },
  expert: { label: '전문가', desc: '데몬/티칭/프로 · 기술 시범 가능', badge: 'bg-red-500' },
};

export default function GearGuide() {
  const user = getUser();
  const [sport, setSport] = useState<Sport>('ski');
  const [level, setLevel] = useState<Level>('beginner');

  const brands = sport === 'ski' ? SKI_BRANDS : BOARD_BRANDS;
  const filtered = brands.filter(b => b.levels.includes(level));

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">🎿 장비 추천 가이드</h1>
        <Link to="/" className="text-sm text-gray-500">← 홈</Link>
      </div>

      <p className="text-sm text-gray-500">레벨에 맞는 브랜드와 모델을 확인해보세요</p>

      {/* 스포츠 선택 */}
      <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
        <button
          onClick={() => setSport('ski')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${sport === 'ski' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          ⛷️ 스키
        </button>
        <button
          onClick={() => setSport('board')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${sport === 'board' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          🏂 스노보드
        </button>
      </div>

      {/* 레벨 선택 */}
      <div className="flex gap-1.5 flex-wrap">
        {(Object.keys(LEVEL_INFO) as Level[]).map(lv => {
          const info = LEVEL_INFO[lv];
          return (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                level === lv
                  ? `${info.badge} text-white ring-2 ring-offset-1 ring-primary`
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {info.label}
            </button>
          );
        })}
      </div>

      {/* 레벨 설명 */}
      <div className="bg-gray-50 rounded-xl p-3">
        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full text-white ${LEVEL_INFO[level].badge} mr-2`}>
          {LEVEL_INFO[level].label}
        </span>
        <span className="text-xs text-gray-500">{LEVEL_INFO[level].desc}</span>
      </div>

      {/* 브랜드 목록 */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">해당 레벨에 맞는 브랜드가 없습니다.</div>
        ) : (
          filtered.map(brand => (
            <div key={brand.name} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{brand.name}</h3>
                  <span className="text-[10px] text-gray-500">{brand.country}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">{brand.style}</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-3">{brand.desc}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500">추천 모델</span>
                <span className="text-xs text-primary-dark font-medium">{brand.models}</span>
              </div>
              <div className="flex gap-1 mt-2">
                {brand.levels.map(lv => (
                  <span key={lv} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${lv === level ? `${LEVEL_INFO[lv].badge} text-white` : 'bg-gray-100 text-gray-600'}`}>
                    {LEVEL_INFO[lv].label}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 중고 매물 연결 */}
      {user && (
        <Link to="/used" className="block text-center py-3 bg-primary/10 text-primary-dark rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors">
          🏷️ 중고장터에서 장비 찾아보기
        </Link>
      )}
    </div>
  );
}
