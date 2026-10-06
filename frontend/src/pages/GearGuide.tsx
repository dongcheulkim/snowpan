import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getUser } from '../api';

type Sport = 'ski' | 'board';

interface BrandInfo {
  name: string;
  country: string;
  since: string; // 창업 연도
  style: string;
  history: string; // 브랜드 역사 한두 줄
  desc: string; // 특징
  pick: string; // 이런 분께
  models: string;
}

// 국내 스키샵(피스트·조이레포츠·봄내스포츠·에스코어·스노우뱅크·래드스토어)에서 실제 취급하는 브랜드 기준 (2026-10-06 조사)
const SKI_BRANDS: BrandInfo[] = [
  { name: '오가사카 (Ogasaka)', country: '일본', since: '1912', style: '기술 · 카빙',
    history: '나가노 이이야마에서 1912년 스키 제작소로 시작한 일본에서 가장 오래된 스키 브랜드. 일본 기선전 데몬스트레이터 다수가 타면서 "기술 스키"의 기준이 됐습니다.',
    desc: '정확한 엣지 그립과 턴 전반의 안정감이 특징. 한국 기술 스키어 사이에서 가장 인기가 높고 중고 거래도 활발합니다.',
    pick: '카빙·숏턴 등 기술을 정교하게 다듬고 싶은 중급 이상', models: 'TC-S, TC-M, TC-L, KS-RT, Unity' },
  { name: '아이디원 (ID One)', country: '일본', since: '2004', style: '기술 · 숏턴',
    history: '2000년대 나가노에서 출발한 기술 스키 전문 브랜드. 짧은 역사지만 일본 기선전 상위권 선수들이 쓰면서 빠르게 자리 잡았습니다.',
    desc: '부드럽게 휘면서도 튕겨 나오는 반발력이 좋아 숏턴에서 특히 강점. 오가사카보다 조금 가볍고 경쾌한 느낌입니다.',
    pick: '숏턴·리듬감 있는 턴을 좋아하는 중상급', models: 'FR 시리즈, MR 시리즈, SR 시리즈' },
  { name: '하트 (Hart)', country: '일본', since: '1955', style: '기술 · 카빙',
    history: '1955년 미국에서 알루미늄 스키로 시작했고, 2000년대 일본에서 기술 스키 브랜드로 다시 태어났습니다.',
    desc: '단단한 플렉스와 고속 안정성이 강점. 기선전 스타일의 큰 턴에서 든든한 느낌을 줍니다.',
    pick: '롱턴·고속 카빙 위주의 상급', models: 'Circuit, Infinity' },
  { name: '블루모리스 (Blue Moris)', country: '일본', since: '1952', style: '기술 · 올라운드',
    history: '1952년 창업한 일본 모리스 스키의 브랜드. 오랫동안 일본 국가대표와 데몬스트레이터에게 스키를 공급했습니다.',
    desc: '조작이 쉽고 턴 도입이 부드러워 기술 스키 입문용으로도 좋습니다. 가격 대비 완성도가 높은 편.',
    pick: '기술 스키를 처음 시작하는 중급', models: 'Spider 시리즈, Rapid' },
  { name: '아토믹 (Atomic)', country: '오스트리아', since: '1955', style: '올라운드 · 레이싱',
    history: '1955년 알타인마르크트에서 시작해 월드컵과 올림픽에서 가장 많은 메달을 낸 브랜드 중 하나. 현재 살로몬과 같은 아머스포츠 소속입니다.',
    desc: '입문부터 월드컵 선수까지 라인업이 가장 넓습니다. 레드스터는 공격적인 카빙, 매버릭은 올라운드에 맞습니다.',
    pick: '첫 스키부터 레이싱까지 한 브랜드 안에서 올라가고 싶은 분', models: 'Redster S9/G9, Maverick, Bent' },
  { name: '살로몬 (Salomon)', country: '프랑스', since: '1947', style: '올라운드 · 편안함',
    history: '1947년 안시에서 바인딩 공방으로 시작해 부츠·스키까지 넓혔습니다. 스키·부츠·바인딩을 한 세트로 맞추기 쉬운 몇 안 되는 브랜드입니다.',
    desc: '관대하고 부드러운 조작감으로 초중급에게 편하고, S/Race 라인은 레이싱 성능도 충분합니다.',
    pick: '편하게 배우고 싶은 입문·초급, 장비 세트를 한 번에 맞추고 싶은 분', models: 'S/Race, S/Max, QST, Stance' },
  { name: '피셔 (Fischer)', country: '오스트리아', since: '1924', style: '레이싱 · 기술',
    history: '1924년 리트에서 창업. 알파인과 크로스컨트리 모두에서 월드컵을 휩쓴 레이싱 명가입니다.',
    desc: 'RC4 시리즈는 강한 엣지 그립과 빠른 반응이 특징이고 고속에서 흔들림이 적습니다. The Curv는 카빙 전용.',
    pick: '빠른 속도의 카빙을 즐기는 중상급', models: 'RC4 Worldcup, RC4 Speed, The Curv, Ranger' },
  { name: '헤드 (Head)', country: '오스트리아', since: '1950', style: '올라운드 · 파워',
    history: '1950년 미국의 엔지니어 하워드 헤드가 만든 알루미늄 샌드위치 스키로 시작, 지금은 오스트리아 케네르바흐에 본사를 둡니다.',
    desc: '그래핀 소재로 가벼우면서 파워 전달이 좋습니다. 슈퍼쉐이프는 중상급 카빙용으로 국내에서 꾸준히 인기.',
    pick: '가벼운 스키로 힘 있는 카빙을 하고 싶은 중급', models: 'Supershape, WC Rebels, Kore' },
  { name: '뵐클 (Völkl)', country: '독일', since: '1923', style: '올마운틴 · 카빙',
    history: '1923년 바이에른 슈트라우빙에서 시작한 독일 유일의 대형 스키 제조사. 지금도 독일 공장에서 생산합니다.',
    desc: '단단하고 안정적인 느낌으로 유명. 레이스타이거는 카빙, 만트라·켄도는 올마운틴의 기준으로 꼽힙니다.',
    pick: '안정감 있는 스키를 찾는 중상급, 정설·비정설 둘 다 타는 분', models: 'Racetiger, Deacon, Mantra, Kendo' },
  { name: '로시뇰 (Rossignol)', country: '프랑스', since: '1907', style: '올라운드 · 입문',
    history: '1907년 부아롱에서 시작한 세계 최대 스키 브랜드 중 하나. 1937년 세계 선수권 우승으로 이름을 알렸습니다.',
    desc: '부드럽고 관대해 초보자가 가장 편하게 느끼는 브랜드. 히어로 라인은 레이싱 성능도 갖췄습니다.',
    pick: '처음 스키를 사는 입문자, 가족 장비', models: 'Hero, Experience, Arcade, Sender' },
  { name: '노르디카 (Nordica)', country: '이탈리아', since: '1939', style: '레이싱 · 파워',
    history: '1939년 몬테벨루나에서 부츠로 시작해 스키까지 확장. 지금은 테크니카 그룹 소속으로 부츠와 스키를 함께 만듭니다.',
    desc: '도베르만은 레이싱 혈통의 단단한 스키. 묵직하고 힘 있는 느낌으로 체중이 있는 스키어에게 잘 맞습니다.',
    pick: '힘 있게 밟는 스타일의 상급', models: 'Dobermann, Spitfire, Enforcer' },
  { name: '엘란 (Elan)', country: '슬로베니아', since: '1945', style: '카빙 · 혁신',
    history: '1945년 창업. 1990년대 초 허리가 잘록한 카빙 스키(SCX)를 처음 상용화해 지금의 카빙 시대를 연 브랜드입니다.',
    desc: '좌우 비대칭 캠버(Amphibio) 기술로 턴 도입이 쉽습니다. 가격 대비 성능이 좋아 중급 올라운드로 인기.',
    pick: '카빙을 편하게 배우고 싶은 초중급', models: 'Amphibio, Primetime, Wingman, Ripstick' },
  { name: '블리자드 (Blizzard)', country: '오스트리아', since: '1945', style: '올마운틴 · 안정',
    history: '1945년 미터질에서 창업. 테크니카 부츠와 한 그룹이며 올마운틴 스키로 세계적인 평가를 받습니다.',
    desc: '파이어버드는 레이싱, 블랙펄·러슬러는 올마운틴의 대표작. 고속에서 흔들림이 적은 안정감이 강점.',
    pick: '정설 밖까지 타는 중상급, 여성 올마운틴(블랙펄)', models: 'Firebird, Thunderbird, Black Pearl, Rustler' },
  { name: '다이나스타 (Dynastar)', country: '프랑스', since: '1963', style: '레이싱 · 올마운틴',
    history: '1963년 샤모니에서 시작한 프랑스 브랜드. 로시뇰 그룹 소속이지만 더 레이싱 성향의 캐릭터를 유지합니다.',
    desc: '스피드 라인은 월드컵 피드백을 담은 카빙·레이싱, M 라인은 샤모니 산악 지형용 올마운틴입니다.',
    pick: '정통 레이싱 느낌의 카빙을 원하는 중상급', models: 'Speed, Speedzone, M-Pro' },
  { name: '캐슬 (Kästle)', country: '오스트리아', since: '1924', style: '프리미엄 · 올마운틴',
    history: '1924년 호엔엠스에서 창업. 토니 자일러가 타던 전설적인 브랜드로, 한때 사라졌다가 2007년 부활했습니다.',
    desc: '수제 느낌의 고급 마감과 묵직하고 부드러운 승차감. 가격은 높지만 완성도로 평가받습니다.',
    pick: '프리미엄 올마운틴을 찾는 상급', models: 'MX, RX, FX' },
  { name: '케슬러 (Kessler)', country: '스위스', since: '1990년대', style: '수제 · 카빙',
    history: '스노보드 레이싱 보드로 올림픽을 휩쓴 한스위르크 케슬러가 만든 스위스 공방. 스키는 2000년대부터 소량 수제로 만듭니다.',
    desc: '쉐이프별로 특화된 카빙 전용 스키. 레일 위를 달리는 듯한 엣지 홀드로 카빙 마니아에게 알려져 있습니다.',
    pick: '카빙 하나만 보고 투자하는 전문가', models: 'Ride, Alpha, Phantom' },
  { name: '반디어 (Van Deer)', country: '오스트리아', since: '2021', style: '레이싱',
    history: '월드컵 통산 최다 우승 마르셀 히르셔가 레드불과 함께 2021년 만든 신생 레이싱 브랜드.',
    desc: '월드컵 SL·GS 규격 그대로의 스키가 중심. 역사는 짧지만 이미 월드컵 우승 장비입니다.',
    pick: '레이싱 규격 스키를 타는 전문가', models: 'SL, GS, Race Carver' },
  { name: 'K2', country: '미국', since: '1962', style: '프리스타일 · 올마운틴',
    history: '1962년 워싱턴 배션 섬에서 세계 최초 유리섬유 스키를 만들었습니다. 미국식 자유로운 스키 문화를 대표합니다.',
    desc: '부드럽고 놀기 좋은 스키. 파크·파우더·올마운틴에 강하고 기술 스키 느낌과는 결이 다릅니다.',
    pick: '파크나 자유로운 라이딩을 즐기는 초중급', models: 'Mindbender, Disruption, Reckoner' },
  { name: '블랙크로우즈 (Black Crows)', country: '프랑스', since: '2006', style: '프리라이드 · 올마운틴',
    history: '2006년 샤모니의 프리라이더 두 명이 만든 브랜드. 노란 로고와 미니멀한 디자인으로 유럽 프리라이드 신에서 빠르게 성장했습니다.',
    desc: '폭이 넓은 프리라이드·올마운틴 스키가 중심이지만 정설용 카빙 라인(오르브·미라스)도 있습니다. 디자인 때문에 찾는 분도 많습니다.',
    pick: '파우더·비정설을 즐기거나 디자인을 중시하는 중상급', models: 'Camox, Atris, Orb, Mirus Cor' },
  { name: '데네리아즈 (Dénériaz)', country: '프랑스', since: '2012', style: '럭셔리 · 수제',
    history: '2006년 토리노 올림픽 활강 금메달리스트 앙투안 데네리아즈가 만든 수제 스키 브랜드. 나무 결을 살린 고급 마감이 특징입니다.',
    desc: '주문 제작에 가까운 소량 생산. 우드 톱시트와 가죽 디테일로 "타는 명품"에 가깝지만 성능도 레이서 출신답게 탄탄합니다.',
    pick: '남다른 장비를 원하는 상급, 선물용 프리미엄', models: 'Alpin, Pure, Carbon' },
  { name: '라크로와 (Lacroix)', country: '프랑스', since: '1967', style: '럭셔리 · 카빙',
    history: '1967년 레오 라크로와가 만든 프랑스 럭셔리 스키의 원조. 스키복과 함께 고급 리조트 스타일을 대표합니다.',
    desc: '부드럽고 우아한 카빙 감각. 성능보다 디자인과 소재의 고급스러움을 앞세운 브랜드입니다.',
    pick: '의류와 세트로 고급 스타일을 맞추고 싶은 중상급', models: 'Mach Carbon, Ultime, Pearl' },
  { name: '스톡리 (Stöckli)', country: '스위스', since: '1935', style: '프리미엄 · 카빙',
    history: '1935년 스위스 농가 공방에서 시작해 지금도 스위스 볼후젠에서 전량 생산하는 핸드메이드 브랜드.',
    desc: '최고급 소재와 수작업으로 정밀한 카빙 성능. 가격은 높지만 상급자의 로망으로 불립니다.',
    pick: '최고급 카빙 스키를 원하는 상급', models: 'Laser SL/GS/WRT, Montero' },
];

// 국내 보드샵(풍류·원에잇·911스포츠·쇼군·베스트스노우보드)에서 실제 취급하는 브랜드 기준 (2026-10-06 조사)
const BOARD_BRANDS: BrandInfo[] = [
  { name: '버튼 (Burton)', country: '미국', since: '1977', style: '올라운드 · 스탠다드',
    history: '1977년 제이크 버튼 카펜터가 버몬트 헛간에서 시작해 스노보드를 하나의 스포츠로 만든 브랜드. 스텝온 바인딩도 버튼 작품입니다.',
    desc: '입문부터 프로까지 가장 넓은 라인업. 어떤 스타일에도 무난하게 맞고 부츠·바인딩 호환이 쉽습니다.',
    pick: '첫 보드를 고르는 입문자, 올라운드 한 장', models: 'Custom, Process, Feelgood, Step On' },
  { name: '모스 (Moss)', country: '일본', since: '1971', style: '파우더 · 카빙',
    history: '1971년 일본에서 "스노스틱"을 만든, 세계에서 가장 오래된 스노보드 브랜드로 불립니다. 버튼보다 앞섭니다.',
    desc: '서핑 감각의 파우더 보드와 묵직한 카빙 보드가 양대 축. 장인 생산으로 수량이 적습니다.',
    pick: '파우더·서프 라이딩을 즐기는 중상급', models: 'Snowstick, Twister, Toto' },
  { name: '그레이 (Gray)', country: '일본', since: '1997', style: '카빙',
    history: '1997년 일본에서 시작한 카빙 전문 브랜드. 데스페라도 한 모델로 한국 카버들 사이에서 가장 유명합니다.',
    desc: '단단한 플렉스와 강한 엣지 홀드로 깊은 카빙에 특화. 햄머헤드 노즈 모델이 대표적입니다.',
    pick: '카빙 한 길로 가는 중상급', models: 'Desperado 시리즈, Trance' },
  { name: 'BC스트림 (BC Stream)', country: '일본', since: '2001', style: '카빙 · 올라운드',
    history: '2001년 일본에서 시작해 카빙과 테크니컬 라이딩 보드로 성장. 한국 카빙 붐과 함께 국내 보드샵의 주력 브랜드가 됐습니다.',
    desc: '카빙용(RX·S)부터 올라운드까지 라인이 정리돼 있고, 반발력이 좋아 턴 마무리가 경쾌합니다.',
    pick: '카빙 중심으로 다양한 슬로프를 타는 중급 이상', models: 'RX, S 시리즈, DR' },
  { name: '요넥스 (Yonex)', country: '일본', since: '1946', style: '경량 · 카빙',
    history: '1946년 배드민턴 라켓으로 시작한 요넥스가 1995년 카본 기술로 스노보드에 진출했습니다.',
    desc: '풀 카본 보드로 매우 가볍고 반발력이 강합니다. 카빙·테크니컬 모두 상위권 평가.',
    pick: '가벼운 보드로 빠른 반응을 원하는 중상급', models: 'Thrust, Symarc, Regna, Achse' },
  { name: '011 아티스틱 (011 Artistic)', country: '일본', since: '2000년대', style: '그라운드 트릭',
    history: '일본 그라운드 트릭(평지 기술) 문화를 대표하는 브랜드. 이름은 "공일일"로 읽습니다.',
    desc: '부드러운 플렉스와 가벼운 무게로 평지 스핀·프레스에 최적화. 국내 그라트 라이더에게 인기.',
    pick: '그라운드 트릭을 연습하는 초중급', models: 'Double Spin, Flat King, X-Fly' },
  { name: '오가사카 (Ogasaka)', country: '일본', since: '1990년대', style: '카빙 · 올라운드',
    history: '스키 명가 오가사카가 1990년대 시작한 스노보드 라인. 스키와 같은 공장에서 만듭니다.',
    desc: '정직한 캠버와 안정적인 엣지 그립. 카빙 입문부터 테크니컬까지 폭넓게 쓰입니다.',
    pick: '카빙을 제대로 배우고 싶은 중급', models: 'CT, FC, FC-X' },
  { name: '겐템스틱 (Gentemstick)', country: '일본', since: '1998', style: '파우더 · 서프',
    history: '1998년 홋카이도 니세코에서 서퍼이자 라이더인 타마이 타로가 만든 브랜드. "눈 위의 서핑" 철학으로 유명합니다.',
    desc: '피쉬테일과 넓은 노즈의 파우더 보드가 중심. 정설 슬로프보다 파우더와 자연설에서 빛납니다.',
    pick: '일본·해외 파우더 투어를 다니는 중상급', models: 'Rocket Fish, Mantaray, Giant Mantaray' },
  { name: '라이스28 (Rice28)', country: '일본', since: '2000년대', style: '그라운드 트릭',
    history: '일본 그라운드 트릭 전문 브랜드. 011과 함께 평지 기술 보드의 양대 산맥으로 꼽힙니다.',
    desc: '가볍고 반발력이 좋아 올리·프레스가 쉽습니다. 모델별 플렉스 차이가 명확합니다.',
    pick: '그라운드 트릭·지빙 위주의 초중급', models: 'RT7, RT9, Divers' },
  { name: '노벰버 (November)', country: '일본', since: '1990년대', style: '올라운드 · 테크니컬',
    history: '1990년대 일본에서 시작한 "노벰버 아티스틱". 그라운드 트릭과 카빙을 모두 아우르는 라인업입니다.',
    desc: '부드러운 조작감과 안정감의 균형이 좋아 한 장으로 여러 스타일을 소화합니다.',
    pick: '트릭과 라이딩을 함께 즐기는 중급', models: 'Desire, Artiste, D4' },
  { name: 'FNTC', country: '일본', since: '2000년대', style: '그라운드 트릭 · 올라운드',
    history: '일본 그라운드 트릭 신에서 자란 브랜드. 더블 캠버 구조로 평지 기술을 쉽게 만들었습니다.',
    desc: 'TNT 시리즈가 대표. 가격이 합리적이라 그라트 입문용으로 많이 찾습니다.',
    pick: '그라운드 트릭을 시작하는 입문·초급', models: 'TNT, Cat, SoT' },
  { name: '살로몬 (Salomon)', country: '프랑스', since: '1997', style: '올라운드 · 프리스타일',
    history: '스키 브랜드 살로몬이 1997년 스노보드에 진출. 보드·바인딩·부츠를 한 브랜드로 맞출 수 있습니다.',
    desc: '부드럽고 관대한 보드가 많아 초중급에게 편하고, 어쌔신 같은 올마운틴 프리스타일도 평가가 좋습니다.',
    pick: '편하게 배우는 입문자, 장비 세트를 한 번에 맞추고 싶은 분', models: 'Assassin, Huck Knife, Dancehaul' },
  { name: '바탈레온 (Bataleon)', country: '노르웨이', since: '2002', style: '프리스타일 · 혁신',
    history: '2002년 네덜란드에서 시작해 노르웨이로 옮긴 브랜드. 베이스 양끝을 들어 올린 3BT 구조로 유명합니다.',
    desc: '엣지가 잘 안 걸려 역엣지가 적고 버터·프레스가 쉽습니다. 입문자도 두려움 없이 탈 수 있습니다.',
    pick: '역엣지가 무서운 입문자, 파크·버터 위주의 중급', models: 'Evil Twin, Goliath, Whatever' },
  { name: '암플리드 (Amplid)', country: '독일', since: '2005', style: '카빙 · 프리라이드',
    history: '2005년 전 월드컵 라이더 페터 바우어가 만든 독일 브랜드. 소량 생산과 독특한 설계로 마니아층이 있습니다.',
    desc: '펜타쿼크 등 카빙·프리라이드 보드가 유명. 반응이 빠르고 가볍습니다.',
    pick: '남들과 다른 카빙·프리라이드 보드를 찾는 상급', models: 'Pentaquark, Souly Grail, UNW8' },
  { name: '케슬러 (Kessler)', country: '스위스', since: '1990년대', style: '알파인 · 레이싱',
    history: '한스위르크 케슬러의 스위스 공방. 올림픽 알파인 스노보드 메달 대부분이 케슬러 보드에서 나왔습니다.',
    desc: '하드부츠 알파인 레이싱과 익스트림 카빙의 정점. 주문 제작 위주라 수량이 적습니다.',
    pick: '알파인(하드부츠) 레이싱 전문가', models: 'The Alpine, The Cross, Custom' },
  { name: '라이드 (Ride)', country: '미국', since: '1992', style: '프리스타일 · 올마운틴',
    history: '1992년 시애틀에서 시작한 브랜드. 워피그 같은 짧고 넓은 보드로 새 유행을 만들었습니다.',
    desc: '튼튼하고 반응이 빠르며 가격이 합리적. 파크부터 올마운틴까지 다양한 모델.',
    pick: '튼튼한 올라운드 보드를 찾는 초중급', models: 'Warpig, Algorhythm, Twinpig' },
  { name: '존스 (Jones)', country: '미국', since: '2010', style: '프리라이드 · 백컨트리',
    history: '2010년 전설적 백컨트리 라이더 제레미 존스가 만든 브랜드. 니데커 그룹과 함께 생산합니다.',
    desc: '프리라이드와 백컨트리에 특화. 플래그십은 깊은 눈과 험한 지형에서 안정적입니다.',
    pick: '파우더·백컨트리를 타는 중상급', models: 'Flagship, Mountain Twin, Frontier' },
  { name: '리브텍 (Lib Tech)', country: '미국', since: '1989', style: '혁신 · 올라운드',
    history: '1989년 마이크 올슨이 GNU와 함께 세운 머빈 제조사의 브랜드. 미국 워싱턴 공장에서 직접 만듭니다.',
    desc: '물결 엣지(Magne-Traction)와 바나나 캠버로 유명. 아이스 슬로프에서도 엣지가 잘 걸립니다.',
    pick: '아이스 설면이 많은 국내 슬로프에서 엣지 그립을 원하는 중급', models: 'T.Rice Pro, Skate Banana, Orca' },
  { name: '카피타 (Capita)', country: '미국', since: '2000', style: '프리스타일 · 파크',
    history: '2000년 시애틀에서 시작해 오스트리아의 자체 공장 "마더십"에서 생산하는 프리스타일 명가.',
    desc: 'DOA는 파크 보드의 기준으로 불립니다. 팝이 좋고 가격 대비 성능이 뛰어납니다.',
    pick: '파크·킥커를 즐기는 중급', models: 'DOA, Mercury, Outerspace Living' },
  { name: 'GNU', country: '미국', since: '1977', style: '프리스타일 · 혁신',
    history: '1977년 마이크 올슨이 만든 미국에서 가장 오래된 스노보드 브랜드 중 하나. 리브텍과 같은 공장.',
    desc: '비대칭 설계와 바나나 캠버로 독특한 조작감. 가볍고 재미있는 보드가 많습니다.',
    pick: '개성 있는 프리스타일 보드를 찾는 초중급', models: 'Riders Choice, Money, Head Space' },
  { name: '나이트로 (Nitro)', country: '독일', since: '1990', style: '올라운드 · 입문',
    history: '1990년 시애틀에서 시작해 독일에 본사를 둔 브랜드. 가성비 좋은 입문·중급 보드로 유럽과 한국에서 인기.',
    desc: '프라임 시리즈는 입문자에게 편하고, 팀 시리즈는 중상급 올라운드로 평가가 좋습니다.',
    pick: '합리적인 가격의 첫 보드', models: 'Prime, Team, Magnum' },
  { name: 'YES.', country: '스위스', since: '2009', style: '올라운드 · 프리라이드',
    history: '2009년 프로 라이더 DCP·로맹 드 마르시·JP 솔버그가 함께 만든 라이더 중심 브랜드. 니데커 그룹 소속.',
    desc: '베이직은 가성비 올라운드의 대표. 스탠다드는 넓은 허리로 파우더와 카빙을 모두 소화합니다.',
    pick: '한 장으로 여러 지형을 타고 싶은 중급', models: 'Basic, Standard, Greats' },
];

export default function GearGuide() {
  const user = getUser();
  const [sport, setSport] = useState<Sport>('ski');

  const brands = sport === 'ski' ? SKI_BRANDS : BOARD_BRANDS;
  // 브랜드가 44개라 접어서 보여준다 — 위 이름 목록에서 누르면 그 카드만 펼치고 스크롤 (2026-10-06)
  const [openName, setOpenName] = useState<string | null>(null);
  const [seenSport, setSeenSport] = useState(sport);
  if (seenSport !== sport) { setSeenSport(sport); setOpenName(null); }
  const cardId = (name: string) => 'brand-' + name.replace(/[^0-9A-Za-z가-힣]+/g, '-');
  const jumpTo = (name: string) => {
    setOpenName(name);
    requestAnimationFrame(() => document.getElementById(cardId(name))?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">장비 추천 가이드</h1>
        <Link to="/" className="text-sm text-gray-500">← 홈</Link>
      </div>

      <p className="text-sm text-gray-500">국내 스키샵·보드샵에서 취급하는 브랜드의 역사와 특징, 추천입니다</p>

      {/* 스포츠 선택 */}
      <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
        <button
          onClick={() => setSport('ski')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${sport === 'ski' ? 'bg-snow text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          스키
        </button>
        <button
          onClick={() => setSport('board')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${sport === 'board' ? 'bg-snow text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          스노보드
        </button>
      </div>

      {/* 이름 목록 — 누르면 해당 브랜드로 */}
      <div className="flex flex-wrap gap-1.5">
        {brands.map(brand => {
          const short = brand.name.replace(/\s*\(.*\)$/, '');
          const on = openName === brand.name;
          return (
            <button key={brand.name} type="button" onClick={() => jumpTo(brand.name)} aria-pressed={on} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${on ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {short}
            </button>
          );
        })}
      </div>

      {/* 브랜드 목록 — 접힌 카드. 제목을 누르면 펼침 */}
      <div className="space-y-2">
        {brands.map(brand => {
          const open = openName === brand.name;
          return (
            <div key={brand.name} id={cardId(brand.name)} className="card scroll-mt-20">
              <button type="button" onClick={() => setOpenName(open ? null : brand.name)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 p-4 text-left">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900">{brand.name}</h3>
                  <span className="text-[10px] text-gray-500">{brand.country} · {brand.since}년 시작 · {brand.style}</span>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {open && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-gray-500 leading-relaxed mb-1.5">{brand.history}</p>
                  <p className="text-xs text-gray-600 leading-relaxed mb-2">{brand.desc}</p>
                  <p className="text-xs text-gray-900 leading-relaxed mb-3"><span className="font-bold">이런 분께</span> {brand.pick}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500">추천 모델</span>
                    <span className="text-xs text-primary-dark font-medium">{brand.models}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 중고 매물 연결 */}
      {user && (
        <Link to="/used" className="block text-center py-3 bg-primary/10 text-primary-dark rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors">
          중고장터에서 장비 찾아보기 →
        </Link>
      )}
    </div>
  );
}
