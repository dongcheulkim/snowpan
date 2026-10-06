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

// 국내 스키샵(피스트·조이레포츠·봄내스포츠·에스코어·스노우뱅크·래드스토어)에서 취급하거나 국내 유통되는 브랜드 기준 (2026-10-06 조사)
const SKI_BRANDS: BrandInfo[] = [
  { name: '오가사카 (Ogasaka)', country: '일본', since: '1912', style: '기술 · 카빙',
    history: '나가노 이이야마에서 1912년 스키 제작소로 시작한 일본에서 가장 오래된 스키 브랜드. 일본 기선전 데몬스트레이터 다수가 타면서 "기술 스키"의 기준이 됐습니다.',
    desc: '정확한 엣지 그립과 턴 전반의 안정감이 특징. 한국 기술 스키어 사이에서 가장 인기가 높고 중고 거래도 활발합니다.',
    pick: '카빙·숏턴 등 기술을 정교하게 다듬고 싶은 중급 이상', models: 'TC-S (숏턴 기술), TC-M (미들턴), TC-L (롱턴), KS-RT (올라운드 기술), KS-GT, Unity U-VS, Unity U-AS, Keo’s KS-NX (입문·여성), AG (레이싱 GS), Triun S/G (레이싱)' },
  { name: '아이디원 (ID One)', country: '일본', since: '2004', style: '기술 · 숏턴',
    history: '2000년대 나가노에서 출발한 기술 스키 전문 브랜드. 짧은 역사지만 일본 기선전 상위권 선수들이 쓰면서 빠르게 자리 잡았습니다.',
    desc: '부드럽게 휘면서도 튕겨 나오는 반발력이 좋아 숏턴에서 특히 강점. 오가사카보다 조금 가볍고 경쾌한 느낌입니다.',
    pick: '숏턴·리듬감 있는 턴을 좋아하는 중상급', models: 'FR-X (숏턴 기술), FR-LTD, MR-G (미들턴), MR-C, SR-M (숏턴 레이스), TR-S (슬라럼), TR-G (GS)' },
  { name: '하트 (Hart)', country: '일본', since: '1955', style: '기술 · 카빙',
    history: '1955년 미국에서 알루미늄 스키로 시작했고, 2000년대 일본에서 기술 스키 브랜드로 다시 태어났습니다.',
    desc: '단단한 플렉스와 고속 안정성이 강점. 기선전 스타일의 큰 턴에서 든든한 느낌을 줍니다.',
    pick: '롱턴·고속 카빙 위주의 상급', models: 'Circuit 8.5 (기술 상급), Circuit 8.0, Circuit 7.5, Circuit 7.0 (기술 입문), Infinity (올라운드·여성), Pro Racer (레이싱)' },
  { name: '블루모리스 (Blue Moris)', country: '일본', since: '1952', style: '기술 · 올라운드',
    history: '1952년 창업한 일본 모리스 스키의 브랜드. 오랫동안 일본 국가대표와 데몬스트레이터에게 스키를 공급했습니다.',
    desc: '조작이 쉽고 턴 도입이 부드러워 기술 스키 입문용으로도 좋습니다. 가격 대비 완성도가 높은 편.',
    pick: '기술 스키를 처음 시작하는 중급', models: 'Spider (기술), Super Spider (기술 상급), Rapid (올라운드), Alpha (입문·여성), BM 시리즈' },
  { name: '아토믹 (Atomic)', country: '오스트리아', since: '1955', style: '올라운드 · 레이싱',
    history: '1955년 알타인마르크트에서 시작해 월드컵과 올림픽에서 가장 많은 메달을 낸 브랜드 중 하나. 현재 살로몬과 같은 아머스포츠 소속입니다.',
    desc: '입문부터 월드컵 선수까지 라인업이 가장 넓습니다. 레드스터는 공격적인 카빙, 매버릭은 올라운드에 맞습니다.',
    pick: '첫 스키부터 레이싱까지 한 브랜드 안에서 올라가고 싶은 분', models: 'Redster S9 (슬라럼 카빙), Redster S9i, Redster G9 (GS 카빙), Redster X9 (올라운드 카빙), Redster X7, Maverick 95 Ti (올마운틴), Maverick 88 Ti, Maverick 83, Bent 100 (프리스타일), Cloud (여성)' },
  { name: '살로몬 (Salomon)', country: '프랑스', since: '1947', style: '올라운드 · 편안함',
    history: '1947년 안시에서 바인딩 공방으로 시작해 부츠·스키까지 넓혔습니다. 스키·부츠·바인딩을 한 세트로 맞추기 쉬운 몇 안 되는 브랜드입니다.',
    desc: '관대하고 부드러운 조작감으로 초중급에게 편하고, S/Race 라인은 레이싱 성능도 충분합니다.',
    pick: '편하게 배우고 싶은 입문·초급, 장비 세트를 한 번에 맞추고 싶은 분', models: 'S/Race SL (슬라럼), S/Race GS, S/Race MT, S/Max 12 (카빙), S/Max 10, S/Max Blast, S/Force Bold (올라운드), S/Force 9, Stance 90/96 (올마운틴), QST 98/106 (프리라이드), Addikt' },
  { name: '피셔 (Fischer)', country: '오스트리아', since: '1924', style: '레이싱 · 기술',
    history: '1924년 리트에서 창업. 알파인과 크로스컨트리 모두에서 월드컵을 휩쓴 레이싱 명가입니다.',
    desc: 'RC4 시리즈는 강한 엣지 그립과 빠른 반응이 특징이고 고속에서 흔들림이 적습니다. The Curv는 카빙 전용.',
    pick: '빠른 속도의 카빙을 즐기는 중상급', models: 'RC4 Worldcup SC (숏턴 카빙), RC4 Worldcup RC (롱턴 카빙), RC4 Worldcup CT, RC4 The Curv (카빙), RC4 The Curv DTX, RC4 The Curv GT, RC4 RCS/RC4 WC SL (레이싱), RC One 86/78 (올라운드), Ranger 96/102 (프리라이드)' },
  { name: '헤드 (Head)', country: '오스트리아', since: '1950', style: '올라운드 · 파워',
    history: '1950년 미국의 엔지니어 하워드 헤드가 만든 알루미늄 샌드위치 스키로 시작, 지금은 오스트리아 케네르바흐에 본사를 둡니다.',
    desc: '그래핀 소재로 가벼우면서 파워 전달이 좋습니다. 슈퍼쉐이프는 중상급 카빙용으로 국내에서 꾸준히 인기.',
    pick: '가벼운 스키로 힘 있는 카빙을 하고 싶은 중급', models: 'Supershape e-Magnum (올라운드 카빙), Supershape e-Titan, Supershape e-Speed (롱턴), Supershape e-Rally, Supershape e-Original, WC Rebels e-SL (슬라럼), WC Rebels e-GS, WC Rebels e-Race, Shape V8/V10 (입문·중급), Kore 93/99 (올마운틴)' },
  { name: '뵐클 (Völkl)', country: '독일', since: '1923', style: '올마운틴 · 카빙',
    history: '1923년 바이에른 슈트라우빙에서 시작한 독일 유일의 대형 스키 제조사. 지금도 독일 공장에서 생산합니다.',
    desc: '단단하고 안정적인 느낌으로 유명. 레이스타이거는 카빙, 만트라·켄도는 올마운틴의 기준으로 꼽힙니다.',
    pick: '안정감 있는 스키를 찾는 중상급, 정설·비정설 둘 다 타는 분', models: 'Racetiger SL (슬라럼), Racetiger GS, Racetiger SC (숏턴 카빙), Racetiger SX, Deacon 84 (올라운드 카빙), Deacon 80, Deacon 76, Peregrine 80/82 (신형 카빙), Kendo 88 (올마운틴), Mantra M7, Blaze 94' },
  { name: '로시뇰 (Rossignol)', country: '프랑스', since: '1907', style: '올라운드 · 입문',
    history: '1907년 부아롱에서 시작한 세계 최대 스키 브랜드 중 하나. 1937년 세계 선수권 우승으로 이름을 알렸습니다.',
    desc: '부드럽고 관대해 초보자가 가장 편하게 느끼는 브랜드. 히어로 라인은 레이싱 성능도 갖췄습니다.',
    pick: '처음 스키를 사는 입문자, 가족 장비', models: 'Hero Elite ST Ti (숏턴 카빙), Hero Elite LT Ti (롱턴), Hero Elite MT Ca, Hero Athlete FIS SL/GS (레이싱), Forza 70°/60° (카빙), Arcade 84/88 (올마운틴), Experience 86, Sender 94/104 (프리라이드), Nova 8/10 (여성), Escaper (투어링)' },
  { name: '노르디카 (Nordica)', country: '이탈리아', since: '1939', style: '레이싱 · 파워',
    history: '1939년 몬테벨루나에서 부츠로 시작해 스키까지 확장. 지금은 테크니카 그룹 소속으로 부츠와 스키를 함께 만듭니다.',
    desc: '도베르만은 레이싱 혈통의 단단한 스키. 묵직하고 힘 있는 느낌으로 체중이 있는 스키어에게 잘 맞습니다.',
    pick: '힘 있게 밟는 스타일의 상급', models: 'Dobermann SLR (슬라럼), Dobermann GSR, Dobermann Spitfire 80 RB (카빙), Spitfire 76, Spitfire 72, Spitfire 70 (입문), Steadfast 85/80 (올라운드), Enforcer 94/99/104 (올마운틴), Santa Ana (여성), Wild Belle (여성)' },
  { name: '엘란 (Elan)', country: '슬로베니아', since: '1945', style: '카빙 · 혁신',
    history: '1945년 창업. 1990년대 초 허리가 잘록한 카빙 스키(SCX)를 처음 상용화해 지금의 카빙 시대를 연 브랜드입니다.',
    desc: '좌우 비대칭 캠버(Amphibio) 기술로 턴 도입이 쉽습니다. 가격 대비 성능이 좋아 중급 올라운드로 인기.',
    pick: '카빙을 편하게 배우고 싶은 초중급', models: 'Ace SLX (슬라럼), Ace GSX, Ace SCX (숏턴 카빙), Amphibio 16 Ti2 (카빙), Amphibio 14 Ti, Amphibio 12 C (입문), Primetime 55/44 (카빙), Wingman 86 CTi/82 CTi/78 (올라운드), Ripstick 96/106 (프리라이드), Voyager (접이식)' },
  { name: '블리자드 (Blizzard)', country: '오스트리아', since: '1945', style: '올마운틴 · 안정',
    history: '1945년 미터질에서 창업. 테크니카 부츠와 한 그룹이며 올마운틴 스키로 세계적인 평가를 받습니다.',
    desc: '파이어버드는 레이싱, 블랙펄·러슬러는 올마운틴의 대표작. 고속에서 흔들림이 적은 안정감이 강점.',
    pick: '정설 밖까지 타는 중상급, 여성 올마운틴(블랙펄)', models: 'Firebird SRC (숏턴 카빙), Firebird WRC (롱턴), Firebird Race Ti, Thunderbird R15 WB (카빙), Thunderbird R13, Anomaly 84/88/94 (올마운틴), Black Pearl 88/94 (여성), Rustler 9/10/11 (프리라이드), Phoenix (여성 프리라이드), Brahma' },
  { name: '다이나스타 (Dynastar)', country: '프랑스', since: '1963', style: '레이싱 · 올마운틴',
    history: '1963년 샤모니에서 시작한 프랑스 브랜드. 로시뇰 그룹 소속이지만 더 레이싱 성향의 캐릭터를 유지합니다.',
    desc: '스피드 라인은 월드컵 피드백을 담은 카빙·레이싱, M 라인은 샤모니 산악 지형용 올마운틴입니다.',
    pick: '정통 레이싱 느낌의 카빙을 원하는 중상급', models: 'Speed Omeglass Master SL (슬라럼), Speed Omeglass Master GS, Speed 963 (카빙), Speed 763, Speed 563 (중급), M-Cross 82/88 (올라운드), M-Pro 90/99/108 (올마운틴), M-Free 99/108 (프리스타일), E-Cross (여성)' },
  { name: '캐슬 (Kästle)', country: '오스트리아', since: '1924', style: '프리미엄 · 올마운틴',
    history: '1924년 호엔엠스에서 창업. 토니 자일러가 타던 전설적인 브랜드로, 한때 사라졌다가 2007년 부활했습니다.',
    desc: '수제 느낌의 고급 마감과 묵직하고 부드러운 승차감. 가격은 높지만 완성도로 평가받습니다.',
    pick: '프리미엄 올마운틴을 찾는 상급', models: 'RX12 SL (슬라럼), RX12 GS, MX 83 (올라운드 카빙), MX 88, MX 98, DX 85/73 (중급), FX 96/106 (프리라이드), XX 100, ZX 100, TX 98 (투어링)' },
  { name: '케슬러 (Kessler)', country: '스위스', since: '1990년대', style: '수제 · 카빙',
    history: '스노보드 레이싱 보드로 올림픽을 휩쓴 한스위르크 케슬러가 만든 스위스 공방. 스키는 2000년대부터 소량 수제로 만듭니다.',
    desc: '쉐이프별로 특화된 카빙 전용 스키. 레일 위를 달리는 듯한 엣지 홀드로 카빙 마니아에게 알려져 있습니다.',
    pick: '카빙 하나만 보고 투자하는 전문가', models: 'The Ride (올라운드 카빙), The Alpha (숏턴 카빙), The Phantom (롱턴), The Cross, The Edge, Custom (주문 제작)' },
  { name: '반디어 (Van Deer)', country: '오스트리아', since: '2021', style: '레이싱',
    history: '월드컵 통산 최다 우승 마르셀 히르셔가 레드불과 함께 2021년 만든 신생 레이싱 브랜드.',
    desc: '월드컵 SL·GS 규격 그대로의 스키가 중심. 역사는 짧지만 이미 월드컵 우승 장비입니다.',
    pick: '레이싱 규격 스키를 타는 전문가', models: 'Race Carver (카빙), Slalom Carver, SL Pro FIS (슬라럼), GS Pro FIS (GS), Flow Carver (올라운드)' },
  { name: 'K2', country: '미국', since: '1962', style: '프리스타일 · 올마운틴',
    history: '1962년 워싱턴 배션 섬에서 세계 최초 유리섬유 스키를 만들었습니다. 미국식 자유로운 스키 문화를 대표합니다.',
    desc: '부드럽고 놀기 좋은 스키. 파크·파우더·올마운틴에 강하고 기술 스키 느낌과는 결이 다릅니다.',
    pick: '파크나 자유로운 라이딩을 즐기는 초중급', models: 'Disruption 82 Ti (카빙), Disruption 78 C, Disruption SC, Mindbender 90 C (올마운틴), Mindbender 99 Ti, Mindbender 108 Ti, Reckoner 92/102/112 (프리스타일), Poacher (파크), Wayback (투어링), Anthem (여성)' },
  { name: '블랙크로우즈 (Black Crows)', country: '프랑스', since: '2006', style: '프리라이드 · 올마운틴',
    history: '2006년 샤모니의 프리라이더 두 명이 만든 브랜드. 노란 로고와 미니멀한 디자인으로 유럽 프리라이드 신에서 빠르게 성장했습니다.',
    desc: '폭이 넓은 프리라이드·올마운틴 스키가 중심이지만 정설용 카빙 라인(오르브·미라스)도 있습니다. 디자인 때문에 찾는 분도 많습니다.',
    pick: '파우더·비정설을 즐기거나 디자인을 중시하는 중상급', models: 'Orb (카빙), Mirus Cor (카빙·프리스타일), Serpo (올마운틴), Captis, Camox (올마운틴), Atris, Corvus, Navis (프리라이드), Anima, Daemon' },
  { name: '데네리아즈 (Dénériaz)', country: '프랑스', since: '2012', style: '럭셔리 · 수제',
    history: '2006년 토리노 올림픽 활강 금메달리스트 앙투안 데네리아즈가 만든 수제 스키 브랜드. 나무 결을 살린 고급 마감이 특징입니다.',
    desc: '주문 제작에 가까운 소량 생산. 우드 톱시트와 가죽 디테일로 "타는 명품"에 가깝지만 성능도 레이서 출신답게 탄탄합니다.',
    pick: '남다른 장비를 원하는 상급, 선물용 프리미엄', models: 'Alpin (올라운드 카빙), Alpin Carbon, Pure (카빙), Bois (우드), Toutes Neiges (올마운틴), Freeride' },
  { name: '라크로와 (Lacroix)', country: '프랑스', since: '1967', style: '럭셔리 · 카빙',
    history: '1967년 레오 라크로와가 만든 프랑스 럭셔리 스키의 원조. 스키복과 함께 고급 리조트 스타일을 대표합니다.',
    desc: '부드럽고 우아한 카빙 감각. 성능보다 디자인과 소재의 고급스러움을 앞세운 브랜드입니다.',
    pick: '의류와 세트로 고급 스타일을 맞추고 싶은 중상급', models: 'Mach Carbon (카빙), Mach Ti, Ultime (프리미엄 카빙), Pearl (여성), Classic, Evolution' },
  { name: '아르마다 (Armada)', country: '미국', since: '2002', style: '프리스타일 · 프리라이드',
    history: '2002년 프로 스키어 타너 홀 등이 직접 만든 라이더 소유 브랜드. 뉴스쿨(트윈팁) 스키 붐을 이끌었습니다.',
    desc: '파크·파우더용 트윈팁이 중심이고 디자인이 개성 있습니다. 정설 카빙 전용과는 결이 다릅니다.',
    pick: '파크·파우더·트릭을 즐기는 초중급', models: 'ARV 94/100/106 (프리스타일), ARW (여성), Declivity 92/102 (올마운틴), Stranger, Tracer (투어링), BDog, Edollo' },
  { name: '라인 (Line)', country: '미국', since: '1995', style: '프리스타일 · 파크',
    history: '1995년 제이슨 레빈탈이 뉴욕 차고에서 만든 브랜드. 트윈팁 스키를 대중화했고 지금은 K2와 같은 그룹입니다.',
    desc: '가볍고 부드러워 파크와 트릭에 좋고, 가격이 합리적입니다. 블렌드·채로닉이 대표작.',
    pick: '파크에 입문하는 초중급', models: 'Blend (파크), Chronic 94/101, Honey Badger (입문 파크), Sakana (파우더), Vision 98/108, Pandora (여성), Bacon, Tom Wallisch Pro' },
  { name: '팩션 (Faction)', country: '스위스', since: '2006', style: '프리스타일 · 프리라이드',
    history: '2006년 스위스 베르비에에서 시작. 캔디드 토벡스 등 톱 프리스타일 선수들과 함께 성장했습니다.',
    desc: '프리스타일·프리라이드·투어링까지 라인이 넓고 디자인이 깔끔합니다.',
    pick: '올마운틴 프리스타일을 타는 중급', models: 'Prodigy 1/2/3/4 (프리스타일), Mana 2/3 (프리라이드), Dancer 1/2/3 (올마운틴), Studio (파크), Agent (투어링), La Machine' },
  { name: '무브먼트 (Movement)', country: '스위스', since: '1999', style: '프리라이드 · 투어링',
    history: '1999년 스위스에서 시작한 프리라이드·투어링 전문 브랜드. 가벼운 코어 기술로 유명합니다.',
    desc: '가볍고 부드러운 프리라이드 스키. 백컨트리와 투어링에서 특히 평가가 좋습니다.',
    pick: '투어링·백컨트리를 시작하는 중상급', models: 'Go 90/98/106 (올마운틴), Fly 90/105 (프리라이드), Alp Tracks (투어링), Session, Axess' },
  { name: 'DPS', country: '미국', since: '2005', style: '프리라이드 · 카본',
    history: '2005년 유타에서 시작한 카본 스키 전문 브랜드. 와일러 시리즈로 파우더 스키의 기준을 바꿨습니다.',
    desc: '풀카본으로 가볍고 파우더에서 뜨는 느낌이 특별합니다. 가격은 높은 편.',
    pick: '파우더·해외 투어 위주의 상급', models: 'Wailer 100/112 (파우더), Pagoda Tour (투어링), Koala, Kaizen 100, Lotus 124' },
  { name: '자이 (Zai)', country: '스위스', since: '2003', style: '럭셔리 · 수제',
    history: '2003년 스위스 디센티스에서 시작한 초고가 수제 스키. 화강암·카본 등 특이 소재로 유명합니다.',
    desc: '소량 수제 생산으로 가격이 매우 높습니다. 정설 카빙에서 묵직하고 조용한 느낌.',
    pick: '최고급 수제 스키를 원하는 상급', models: 'Spada, Laisa, Nezza, Testa, Vial' },
  { name: '오페라 (Opera)', country: '이탈리아', since: '2016', style: '수제 · 카빙',
    history: '이탈리아 티롤 지역의 소규모 공방 브랜드. 나무 결을 살린 수제 스키로 유럽에서 주목받고 있습니다.',
    desc: '우드 톱시트의 고급 마감과 부드러운 카빙 감각. 소량 생산이라 국내 입고가 적습니다.',
    pick: '수제 스키의 감성을 원하는 중상급', models: 'Classic, Smart, Air, Alpine' },
  { name: '오그먼트 (Augment)', country: '오스트리아', since: '2012', style: '레이싱 · 수제',
    history: '오스트리아 공방에서 월드컵 레이싱 스키를 소량 수제로 만드는 브랜드. 선수 출신들이 운영합니다.',
    desc: 'FIS 규격 레이싱 스키와 레이스 카버가 중심. 단단하고 정확합니다.',
    pick: '레이싱·레이스 카빙 전문가', models: 'SL FIS, GS FIS, SL Pro, GS Pro, Race Carver, All Mountain' },
  { name: '밤버 (Bomber)', country: '미국', since: '1994', style: '프리미엄 · 카빙',
    history: '1994년 미국에서 알파인 스노보드 바인딩으로 시작해 지금은 이탈리아에서 만든 프리미엄 스키로 알려져 있습니다.',
    desc: '고급 소재와 디자인의 카빙·올마운틴 스키. 가격대가 높습니다.',
    pick: '프리미엄 카빙 스키를 찾는 상급', models: 'Bomber Classic, All Mountain 88/98, Freeride 108, Race' },
  { name: '케이스키 (Kei-Ski)', country: '일본', since: '2010년대', style: '기술 · 수제',
    history: '일본 기술 스키 데몬스트레이터들과 함께 소량 생산하는 기술 스키 전문 브랜드.',
    desc: '기선전 스타일의 숏턴·미들턴에 맞춘 세팅. 수량이 적어 예약 구매가 많습니다.',
    pick: '기술 스키 마니아 상급', models: 'SR (숏턴), MR (미들턴), LR (롱턴), FR (프리)' },
  { name: '스왈로 (Swallow)', country: '일본', since: '1960년대', style: '올라운드 · 입문',
    history: '일본의 오래된 스키 브랜드로, 합리적인 가격의 입문·올라운드 스키와 스노보드를 만듭니다.',
    desc: '가격 대비 무난한 성능. 렌탈·첫 장비용으로 일본과 국내에서 많이 쓰입니다.',
    pick: '첫 스키를 저렴하게 마련하려는 입문자', models: 'Wave, Fancy, SW, Ski Board 99 (숏스키)' },
  { name: '벡터글라이드 (Vector Glide)', country: '일본', since: '2000년대', style: '프리라이드 · 파우더',
    history: '일본 홋카이도 파우더 문화에서 자란 프리라이드 전문 브랜드. 일본 백컨트리 라이더들이 많이 탑니다.',
    desc: '일본 파우더에 맞춘 넓고 부드러운 스키. 올마운틴 라인도 있습니다.',
    pick: '일본 파우더 투어를 다니는 중상급', models: 'Cordova, Genius, Carver, Thunder Bolt, Ninja' },
  { name: '다이나핏 (Dynafit)', country: '오스트리아', since: '1950', style: '투어링',
    history: '1950년 부츠로 시작해 투어링(백컨트리) 바인딩의 기준을 만든 브랜드. 핀 바인딩의 원조입니다.',
    desc: '가벼운 투어링 스키·부츠·바인딩이 한 세트. 오르막 효율이 최고 수준입니다.',
    pick: '스키 투어링·백컨트리를 하는 상급', models: 'Blacklight 88/95, Radical 88/97, Free 97/107, Seven Summits, Youngstar (주니어)' },
  { name: '스캇 (Scott)', country: '스위스', since: '1958', style: '프리라이드 · 투어링',
    history: '1958년 미국에서 폴·고글로 시작해 지금은 스위스에 본사를 둔 종합 스포츠 브랜드. 스키는 프리라이드 중심입니다.',
    desc: '프리라이드·투어링 스키가 가볍고 튼튼합니다. 폴·고글·헬멧과 세트로 맞추기 좋습니다.',
    pick: '프리라이드·투어링을 타는 중상급', models: 'Scrapper 95/105/115 (프리라이드), Pure Free 100/110, Superguide 88/95 (투어링), Slight 93' },
  { name: '아이슬란틱 (Icelantic)', country: '미국', since: '2004', style: '프리라이드 · 디자인',
    history: '2004년 콜로라도 덴버에서 시작. 아티스트 그래픽과 미국 생산으로 알려진 브랜드입니다.',
    desc: '그래픽이 매년 화제가 되고, 올마운틴·파우더 스키가 부드럽고 재미있습니다.',
    pick: '디자인과 파우더를 함께 즐기는 중급', models: 'Nomad 95/105/115, Pioneer 86/96, Saba Pro, Maiden (여성), Shaman' },
  { name: '리버티 (Liberty)', country: '미국', since: '2003', style: '올마운틴 · 프리라이드',
    history: '2003년 콜로라도에서 시작. 대나무 코어를 처음 본격적으로 쓴 브랜드로 유명합니다.',
    desc: '대나무 코어의 탄성으로 부드럽고 반발이 좋습니다. 올마운틴 라인이 균형 잡혀 있습니다.',
    pick: '가볍고 탄력 있는 올마운틴을 찾는 중급', models: 'Origin 96/101/106, Evolv 84/90/100, Helix 87/98, Genesis (여성), V-Series' },
  { name: '마제스티 (Majesty)', country: '폴란드', since: '2008', style: '프리라이드 · 투어링',
    history: '2008년 폴란드 타트라 산맥 지역에서 시작한 유럽 프리라이드·투어링 브랜드.',
    desc: '가격 대비 성능이 좋은 프리라이드·투어링 스키. 유럽에서 인기가 높아지고 있습니다.',
    pick: '합리적인 가격의 프리라이드·투어링', models: 'Superwolf, Adventure, Vanguard, Dirty Bear, Supertour' },
  { name: '마하 (MACH)', country: '스위스', since: '2015', style: '수제 · 프리미엄',
    history: '2015년 스위스 졸로투른에서 시작한 수제 스키·썰매 브랜드. 북이탈리아 알프스 공방에서 프레스하고 스위스에서 마감합니다.',
    desc: '월드컵과 같은 우드코어·티타날 샌드위치 구조에 레이싱 베이스. 주문 제작(커스텀)도 받습니다.',
    pick: '스위스 수제 카빙 스키를 원하는 상급', models: 'Cross (정설 카빙), Spirit (올마운틴), Lightning (프리라이드), Custom Made (주문 제작)' },
  { name: '포일 (Foil)', country: '이탈리아', since: '2016', style: '수제 · 카빙',
    history: '북이탈리아 알프스 지역의 소규모 수제 공방. 장인이 한 장씩 만드는 고급 카빙 스키로 유럽에서 알려졌습니다.',
    desc: '우드 톱시트와 정갈한 마감, 묵직한 카빙 감각. 소량 생산이라 수입량이 적습니다.',
    pick: '이탈리아 수제 스키의 감성을 원하는 상급', models: 'Gran Turismo, Classic, Freeride, Custom' },
  { name: '인디고 (Indigo)', country: '독일', since: '2009', style: '럭셔리 · 수제',
    history: '2009년 독일 뮌헨 근교에서 시작한 럭셔리 스키 브랜드. 가죽·카본·우드를 조합한 고급 마감으로 유명합니다.',
    desc: '디자인 소품처럼 보이는 외관에 카빙·올마운틴 성능을 갖췄습니다. 가격은 수백만 원대.',
    pick: '남다른 디자인의 명품 스키를 원하는 분', models: 'Indigo Carbon, Indigo Wood, Snow Ski, Ride Ski, Freeride' },
  { name: '에델바이저 (Edelwiser)', country: '오스트리아', since: '2004', style: '수제 · 카빙',
    history: '2004년 오스트리아 잘츠부르크 근교에서 시작한 수제 스키 공방. 주문에 따라 한 장씩 만듭니다.',
    desc: '오스트리아 장인 생산의 카빙·올마운틴 스키. 숏턴 전용 쉐이프 등 선택 폭이 넓습니다.',
    pick: '주문 제작 카빙 스키를 원하는 중상급', models: 'Swing, Carving, Allround, Freeride, Custom' },
  { name: '블로섬 (Blossom)', country: '이탈리아', since: '1970년대', style: '수제 · 레이싱',
    history: '이탈리아 발텔리나에서 레이싱 스키를 만들어 온 공방. 선수용 수제 레이싱 스키로 이름이 알려졌습니다.',
    desc: '월드컵 수준의 레이싱 스키와 카빙 스키를 소량 수제로. 단단하고 정확합니다.',
    pick: '수제 레이싱 스키를 원하는 전문가', models: 'White Out, Numero Uno, Whiteout GS/SL, Allround, Freeride' },
  { name: '비스트 (Vist)', country: '이탈리아', since: '1991', style: '레이싱 · 프리미엄',
    history: '1991년 이탈리아에서 시작해 레이싱 플레이트·바인딩과 고급 스키복으로 유명한 브랜드. 스키도 레이싱·카빙 위주입니다.',
    desc: '레이스 플레이트와 세트로 구성된 고급 카빙 스키. 국내 명품 스키샵에서 의류와 함께 다룹니다.',
    pick: '레이싱 스타일의 고급 장비를 세트로 맞추고 싶은 상급', models: 'Scuderia (레이싱), Fiore (여성), Nice, Speed, Plate 시리즈' },
  { name: '엑손드 (Exonde)', country: '스위스', since: '2010년대', style: '럭셔리 · 수제',
    history: '스위스의 소규모 럭셔리 스키 공방. 카본과 우드, 금속 장식을 조합한 초고가 스키를 만듭니다.',
    desc: '보석에 가까운 마감과 소량 생산. 성능보다 소장 가치를 보는 브랜드입니다.',
    pick: '컬렉션·선물용 최고가 스키', models: 'XO 시리즈, Carbon, Gold Edition' },
  { name: '볼란트 (Volant)', country: '미국', since: '1989', style: '프리미엄 · 스틸',
    history: '1989년 콜로라도에서 시작한 스테인리스 스틸 캡 스키의 원조. 지금은 아토믹 그룹에서 소량 생산합니다.',
    desc: '은빛 스틸 외관이 상징. 묵직하고 안정적인 카빙 감각으로 마니아층이 있습니다.',
    pick: '클래식한 스틸 스키를 원하는 중상급', models: 'Pure Silver, Pure Gold, Pure Black, Pure Carbon' },
  { name: '르노운 (Renoun)', country: '미국', since: '2012', style: '혁신 · 프리미엄',
    history: '2012년 버몬트에서 시작. 충격을 받으면 단단해지는 특수 소재(HDT)를 넣어 진동 흡수로 유명합니다.',
    desc: '부드럽게 들어가 고속에서 조용해지는 독특한 느낌. 미국에서 수제로 소량 생산.',
    pick: '새로운 기술의 올마운틴을 원하는 상급', models: 'Endurance 88/98/104, Citadel 106, Atlas 80, Z-Line' },
  { name: '와그너 커스텀 (Wagner Custom)', country: '미국', since: '2006', style: '주문 제작',
    history: '2006년 콜로라도 텔루라이드에서 시작한 완전 주문 제작 스키. 체형·실력·지형에 맞춰 한 장씩 만듭니다.',
    desc: '길이·쉐이프·플렉스·그래픽까지 전부 주문. 가격은 높지만 "내 스키"를 가질 수 있습니다.',
    pick: '나만의 맞춤 스키를 원하는 상급', models: 'Custom (전 모델 주문 제작)' },
  { name: 'AK 스키 (AK Ski)', country: '스위스', since: '2007', style: '수제 · 올마운틴',
    history: '2007년 스위스에서 시작한 소량 수제 브랜드. 스위스 알프스 지형에 맞춘 올마운틴·프리라이드 스키를 만듭니다.',
    desc: '수제 마감과 묵직한 안정감. 카빙 라인(Piste)과 프리라이드 라인이 있습니다.',
    pick: '스위스 수제 올마운틴을 원하는 상급', models: 'Piste, Freeride, Allmountain, Touring, Custom' },
  { name: '피크 (Peak)', country: '미국', since: '2022', style: '프리미엄 · 혁신',
    history: '2022년 올림픽 챔피언 보디 밀러가 만든 신생 브랜드. 팁에 구멍을 낸 "키홀" 설계로 화제가 됐습니다.',
    desc: '올마운틴 중심에 레이싱 혈통. 역사는 짧지만 설계가 독특합니다.',
    pick: '새로운 설계의 올마운틴을 타 보고 싶은 상급', models: 'Peak 88, Peak 98, Peak 104, Peak 110, Peak 78' },
  { name: '보그너 (Bogner)', country: '독일', since: '1932', style: '럭셔리 · 의류',
    history: '1932년 독일 뮌헨에서 시작한 럭셔리 스키복의 대명사. 스키는 캐슬·헤드 등과 협업해 한정판으로 냅니다.',
    desc: '의류·헬멧·고글과 세트로 맞추는 한정판 스키. 성능보다 브랜드 통일감이 매력.',
    pick: '보그너 스키복과 세트로 맞추고 싶은 분', models: 'Bogner x Kästle 한정판, Bogner Ski (연도별 한정)' },
  { name: '스톡리 (Stöckli)', country: '스위스', since: '1935', style: '프리미엄 · 카빙',
    history: '1935년 스위스 농가 공방에서 시작해 지금도 스위스 볼후젠에서 전량 생산하는 핸드메이드 브랜드.',
    desc: '최고급 소재와 수작업으로 정밀한 카빙 성능. 가격은 높지만 상급자의 로망으로 불립니다.',
    pick: '최고급 카빙 스키를 원하는 상급', models: 'Laser SL (슬라럼), Laser GS, Laser WRT (레이싱 카빙), Laser SC (숏턴 카빙), Laser AX (올라운드), Laser MX (여성), Laser CX, Montero AR/AX (올마운틴), Stormrider 95/102 (프리라이드), Nela (여성)' },
];

// 국내 보드샵(풍류·원에잇·911스포츠·쇼군·베스트스노우보드)에서 취급하거나 국내 유통되는 브랜드 기준 (2026-10-06 조사)
const BOARD_BRANDS: BrandInfo[] = [
  { name: '버튼 (Burton)', country: '미국', since: '1977', style: '올라운드 · 스탠다드',
    history: '1977년 제이크 버튼 카펜터가 버몬트 헛간에서 시작해 스노보드를 하나의 스포츠로 만든 브랜드. 스텝온 바인딩도 버튼 작품입니다.',
    desc: '입문부터 프로까지 가장 넓은 라인업. 어떤 스타일에도 무난하게 맞고 부츠·바인딩 호환이 쉽습니다.',
    pick: '첫 보드를 고르는 입문자, 올라운드 한 장', models: 'Custom (올라운드), Custom X (상급), Process (프리스타일), Instigator (입문), Ripcord (입문), Kilroy (파크), Name Dropper, Flight Attendant (프리라이드), Deep Thinker, Hometown Hero (파우더), Feelgood (여성), Yeasayer (여성), Step On (바인딩)' },
  { name: '모스 (Moss)', country: '일본', since: '1971', style: '파우더 · 카빙',
    history: '1971년 일본에서 "스노스틱"을 만든, 세계에서 가장 오래된 스노보드 브랜드로 불립니다. 버튼보다 앞섭니다.',
    desc: '서핑 감각의 파우더 보드와 묵직한 카빙 보드가 양대 축. 장인 생산으로 수량이 적습니다.',
    pick: '파우더·서프 라이딩을 즐기는 중상급', models: 'Snowstick (파우더·서프), Twister (카빙), Toto (올라운드), Performance Quad, Wing Pin (파우더), 52, U4, Swallow' },
  { name: '그레이 (Gray)', country: '일본', since: '1997', style: '카빙',
    history: '1997년 일본에서 시작한 카빙 전문 브랜드. 데스페라도 한 모델로 한국 카버들 사이에서 가장 유명합니다.',
    desc: '단단한 플렉스와 강한 엣지 홀드로 깊은 카빙에 특화. 햄머헤드 노즈 모델이 대표적입니다.',
    pick: '카빙 한 길로 가는 중상급', models: 'Desperado Ti (카빙 상급), Desperado Type-R, Desperado II, Desperado C, Desperado X, Trance (올라운드 카빙), Mach, Mothership' },
  { name: 'BC스트림 (BC Stream)', country: '일본', since: '2001', style: '카빙 · 올라운드',
    history: '2001년 일본에서 시작해 카빙과 테크니컬 라이딩 보드로 성장. 한국 카빙 붐과 함께 국내 보드샵의 주력 브랜드가 됐습니다.',
    desc: '카빙용(RX·S)부터 올라운드까지 라인이 정리돼 있고, 반발력이 좋아 턴 마무리가 경쾌합니다.',
    pick: '카빙 중심으로 다양한 슬로프를 타는 중급 이상', models: 'RX (카빙), S (테크니컬 카빙), DR (올라운드), R-2, Brahma (프리라이드), ACT (파우더), Buddy (입문)' },
  { name: '요넥스 (Yonex)', country: '일본', since: '1946', style: '경량 · 카빙',
    history: '1946년 배드민턴 라켓으로 시작한 요넥스가 1995년 카본 기술로 스노보드에 진출했습니다.',
    desc: '풀 카본 보드로 매우 가볍고 반발력이 강합니다. 카빙·테크니컬 모두 상위권 평가.',
    pick: '가벼운 보드로 빠른 반응을 원하는 중상급', models: 'Thrust (카빙), Symarc (카빙 상급), Regna (테크니컬), Achse (올라운드), Stylahs (프리스타일), Nextage (올라운드), Smooth (입문), 4XP (파우더), Declic (여성)' },
  { name: '011 아티스틱 (011 Artistic)', country: '일본', since: '2000년대', style: '그라운드 트릭',
    history: '일본 그라운드 트릭(평지 기술) 문화를 대표하는 브랜드. 이름은 "공일일"로 읽습니다.',
    desc: '부드러운 플렉스와 가벼운 무게로 평지 스핀·프레스에 최적화. 국내 그라트 라이더에게 인기.',
    pick: '그라운드 트릭을 연습하는 초중급', models: 'Double Spin (그라트 기본), Double Spin Spin, Flat King (플랫 트릭), Flat King Spin, X-Fly (올라운드 트릭), X-Fly Spin, Flat Spin' },
  { name: '오가사카 (Ogasaka)', country: '일본', since: '1990년대', style: '카빙 · 올라운드',
    history: '스키 명가 오가사카가 1990년대 시작한 스노보드 라인. 스키와 같은 공장에서 만듭니다.',
    desc: '정직한 캠버와 안정적인 엣지 그립. 카빙 입문부터 테크니컬까지 폭넓게 쓰입니다.',
    pick: '카빙을 제대로 배우고 싶은 중급', models: 'CT (카빙 올라운드), CT-S (숏), CT-L (롱), FC (카빙), FC-S, FC-X (카빙 상급), Comfort (입문), AS (올마운틴)' },
  { name: '겐템스틱 (Gentemstick)', country: '일본', since: '1998', style: '파우더 · 서프',
    history: '1998년 홋카이도 니세코에서 서퍼이자 라이더인 타마이 타로가 만든 브랜드. "눈 위의 서핑" 철학으로 유명합니다.',
    desc: '피쉬테일과 넓은 노즈의 파우더 보드가 중심. 정설 슬로프보다 파우더와 자연설에서 빛납니다.',
    pick: '일본·해외 파우더 투어를 다니는 중상급', models: 'Rocket Fish (파우더), Mantaray (올라운드 서프), Giant Mantaray, Stingray, Floater, Magic Carpet, T.T., Big Fish, Chaser, Independent' },
  { name: '라이스28 (Rice28)', country: '일본', since: '2000년대', style: '그라운드 트릭',
    history: '일본 그라운드 트릭 전문 브랜드. 011과 함께 평지 기술 보드의 양대 산맥으로 꼽힙니다.',
    desc: '가볍고 반발력이 좋아 올리·프레스가 쉽습니다. 모델별 플렉스 차이가 명확합니다.',
    pick: '그라운드 트릭·지빙 위주의 초중급', models: 'RT7 (그라트 기본), RT9 (그라트 상급), RT9 TL, Divers (올라운드), RT5 (입문)' },
  { name: '노벰버 (November)', country: '일본', since: '1990년대', style: '올라운드 · 테크니컬',
    history: '1990년대 일본에서 시작한 "노벰버 아티스틱". 그라운드 트릭과 카빙을 모두 아우르는 라인업입니다.',
    desc: '부드러운 조작감과 안정감의 균형이 좋아 한 장으로 여러 스타일을 소화합니다.',
    pick: '트릭과 라이딩을 함께 즐기는 중급', models: 'Desire (올라운드), D4 (그라트), Artiste (테크니컬), Fierce (카빙)' },
  { name: 'FNTC', country: '일본', since: '2000년대', style: '그라운드 트릭 · 올라운드',
    history: '일본 그라운드 트릭 신에서 자란 브랜드. 더블 캠버 구조로 평지 기술을 쉽게 만들었습니다.',
    desc: 'TNT 시리즈가 대표. 가격이 합리적이라 그라트 입문용으로 많이 찾습니다.',
    pick: '그라운드 트릭을 시작하는 입문·초급', models: 'TNT (그라트 기본), TNT R (반발력), TNT C (카빙), TNT L, Cat (올라운드), SoT (입문)' },
  { name: '살로몬 (Salomon)', country: '프랑스', since: '1997', style: '올라운드 · 프리스타일',
    history: '스키 브랜드 살로몬이 1997년 스노보드에 진출. 보드·바인딩·부츠를 한 브랜드로 맞출 수 있습니다.',
    desc: '부드럽고 관대한 보드가 많아 초중급에게 편하고, 어쌔신 같은 올마운틴 프리스타일도 평가가 좋습니다.',
    pick: '편하게 배우는 입문자, 장비 세트를 한 번에 맞추고 싶은 분', models: 'Assassin (올마운틴 프리스타일), Assassin Pro, Huck Knife (파크), Huck Knife Pro, Dancehaul (파우더·올라운드), Sleepwalker, Super 8 (프리라이드), Sick Stick, Pulse (입문), Lotus (여성), Oh Yeah (여성)' },
  { name: '바탈레온 (Bataleon)', country: '노르웨이', since: '2002', style: '프리스타일 · 혁신',
    history: '2002년 네덜란드에서 시작해 노르웨이로 옮긴 브랜드. 베이스 양끝을 들어 올린 3BT 구조로 유명합니다.',
    desc: '엣지가 잘 안 걸려 역엣지가 적고 버터·프레스가 쉽습니다. 입문자도 두려움 없이 탈 수 있습니다.',
    pick: '역엣지가 무서운 입문자, 파크·버터 위주의 중급', models: 'Evil Twin (프리스타일), Evil Twin+, Goliath (올마운틴), Goliath+, Whatever (올라운드 입문), Disaster (지빙), Fun.Kink, Magic Carpet, Chaser (입문), Boss (프리라이드), Distortia (여성)' },
  { name: '암플리드 (Amplid)', country: '독일', since: '2005', style: '카빙 · 프리라이드',
    history: '2005년 전 월드컵 라이더 페터 바우어가 만든 독일 브랜드. 소량 생산과 독특한 설계로 마니아층이 있습니다.',
    desc: '펜타쿼크 등 카빙·프리라이드 보드가 유명. 반응이 빠르고 가볍습니다.',
    pick: '남들과 다른 카빙·프리라이드 보드를 찾는 상급', models: 'Pentaquark (카빙), Souly Grail (올마운틴), UNW8 (프리라이드), Singular, Surfari (파우더), Ticket (올라운드), Millisurf, Stereo (프리스타일)' },
  { name: '케슬러 (Kessler)', country: '스위스', since: '1990년대', style: '알파인 · 레이싱',
    history: '한스위르크 케슬러의 스위스 공방. 올림픽 알파인 스노보드 메달 대부분이 케슬러 보드에서 나왔습니다.',
    desc: '하드부츠 알파인 레이싱과 익스트림 카빙의 정점. 주문 제작 위주라 수량이 적습니다.',
    pick: '알파인(하드부츠) 레이싱 전문가', models: 'The Alpine (알파인 레이싱), The Cross (보더크로스), The Ride (카빙), Custom (주문 제작)' },
  { name: '라이드 (Ride)', country: '미국', since: '1992', style: '프리스타일 · 올마운틴',
    history: '1992년 시애틀에서 시작한 브랜드. 워피그 같은 짧고 넓은 보드로 새 유행을 만들었습니다.',
    desc: '튼튼하고 반응이 빠르며 가격이 합리적. 파크부터 올마운틴까지 다양한 모델.',
    pick: '튼튼한 올라운드 보드를 찾는 초중급', models: 'Warpig (올마운틴 숏와이드), Twinpig (프리스타일), Algorhythm (올마운틴), Berzerker (프리라이드), Shadowban, Benchwarmer (파크), Agenda (입문), Helix, Zero, Kink, Psychocandy (여성)' },
  { name: '존스 (Jones)', country: '미국', since: '2010', style: '프리라이드 · 백컨트리',
    history: '2010년 전설적 백컨트리 라이더 제레미 존스가 만든 브랜드. 니데커 그룹과 함께 생산합니다.',
    desc: '프리라이드와 백컨트리에 특화. 플래그십은 깊은 눈과 험한 지형에서 안정적입니다.',
    pick: '파우더·백컨트리를 타는 중상급', models: 'Flagship (프리라이드), Mountain Twin (올마운틴), Ultra Mountain Twin, Frontier (입문 올마운틴), Stratos, Hovercraft (파우더), Storm Chaser, Tweaker (프리스타일), Dream Weaver (여성), Solution (스플릿보드)' },
  { name: '리브텍 (Lib Tech)', country: '미국', since: '1989', style: '혁신 · 올라운드',
    history: '1989년 마이크 올슨이 GNU와 함께 세운 머빈 제조사의 브랜드. 미국 워싱턴 공장에서 직접 만듭니다.',
    desc: '물결 엣지(Magne-Traction)와 바나나 캠버로 유명. 아이스 슬로프에서도 엣지가 잘 걸립니다.',
    pick: '아이스 설면이 많은 국내 슬로프에서 엣지 그립을 원하는 중급', models: 'T.Rice Pro (올마운틴), T.Rice Orca (숏와이드), Golden Orca, Skate Banana (올라운드 입문), Box Knife (파크), Ejack Knife, Cold Brew (올마운틴), Dynamo, Terrain Wrecker, Glider (여성)' },
  { name: '카피타 (Capita)', country: '미국', since: '2000', style: '프리스타일 · 파크',
    history: '2000년 시애틀에서 시작해 오스트리아의 자체 공장 "마더십"에서 생산하는 프리스타일 명가.',
    desc: 'DOA는 파크 보드의 기준으로 불립니다. 팝이 좋고 가격 대비 성능이 뛰어납니다.',
    pick: '파크·킥커를 즐기는 중급', models: 'DOA (파크 올라운드), Super DOA, Mercury (올마운틴), Mega Mercury, Outerspace Living (프리스타일 입문), Indoor Survival, Pathfinder (입문), Navigator (프리라이드), Kazu Kokubo Pro, Spring Break (파우더), Birds of a Feather (여성)' },
  { name: 'GNU', country: '미국', since: '1977', style: '프리스타일 · 혁신',
    history: '1977년 마이크 올슨이 만든 미국에서 가장 오래된 스노보드 브랜드 중 하나. 리브텍과 같은 공장.',
    desc: '비대칭 설계와 바나나 캠버로 독특한 조작감. 가볍고 재미있는 보드가 많습니다.',
    pick: '개성 있는 프리스타일 보드를 찾는 초중급', models: 'Riders Choice (올라운드), Money (프리스타일 입문), Head Space (파크), Hyper (올마운틴), Antigravity (프리라이드), Zoid, Gloss (여성), Ladies Choice (여성), Ravish (여성)' },
  { name: '나이트로 (Nitro)', country: '독일', since: '1990', style: '올라운드 · 입문',
    history: '1990년 시애틀에서 시작해 독일에 본사를 둔 브랜드. 가성비 좋은 입문·중급 보드로 유럽과 한국에서 인기.',
    desc: '프라임 시리즈는 입문자에게 편하고, 팀 시리즈는 중상급 올라운드로 평가가 좋습니다.',
    pick: '합리적인 가격의 첫 보드', models: 'Prime (입문), Team (올라운드), Team Pro, Magnum (와이드), Beast (파크·파이프), Pantera (올마운틴), Cinema (올라운드), Squash (파우더), Alternator, Lectra (여성), Mystique (여성)' },
  { name: '롬 (Rome)', country: '미국', since: '2001', style: '프리스타일 · 올마운틴',
    history: '2001년 버몬트에서 버튼 출신들이 만든 라이더 중심 브랜드. 파크와 올마운틴 보드로 유명합니다.',
    desc: '팝이 좋고 튼튼하며 가격이 합리적. 에이전트·워든이 꾸준히 인기입니다.',
    pick: '파크·올마운틴을 함께 타는 초중급', models: 'Agent (프리스타일), Warden (올마운틴), Mechanic (입문), Ravine (프리라이드), Stale Crewzer, Heist (여성), Royal (여성), Party Mod' },
  { name: '네버서머 (Never Summer)', country: '미국', since: '1991', style: '올마운틴 · 내구성',
    history: '1991년 콜로라도 덴버에서 시작해 지금도 자체 공장에서 만듭니다. 튼튼하기로 유명합니다.',
    desc: '로커·캠버 혼합 구조와 3년 보증. 무겁지만 오래 탈 수 있는 보드입니다.',
    pick: '오래 쓸 튼튼한 올마운틴 한 장', models: 'Proto Synthesis (올마운틴), Harpoon (파우더), Swift, Shaper Twin, West Bound (프리라이드), Infinity (여성), Lady West (여성)' },
  { name: '니데커 (Nidecker)', country: '스위스', since: '1984', style: '올마운틴 · 프리라이드',
    history: '1887년 목공소에서 시작해 1984년 스노보드를 만든 스위스 브랜드. 존스·YES·플로우의 모회사입니다.',
    desc: '프리라이드·올마운틴 보드가 안정적이고, 수프라매틱 바인딩이 유명합니다.',
    pick: '안정적인 올마운틴·프리라이드 중급', models: 'Alpha, Beta, Thruster (파우더), Escape (프리라이드), Rave, Venus (여성), Supermatic (바인딩)' },
  { name: 'K2', country: '미국', since: '1987', style: '올라운드 · 입문',
    history: '스키 브랜드 K2가 1987년 스노보드를 시작. 미국 대형 브랜드답게 입문부터 프로까지 라인이 넓습니다.',
    desc: '부드럽고 관대한 입문 보드가 강점이고, 안티돗·맨체스터 같은 프리스타일 보드도 평가가 좋습니다.',
    pick: '첫 보드를 무난하게 고르는 입문자', models: 'Standard (입문), Raygun (올라운드), Manchester (올마운틴), Antidote (프리스타일), Excavator (파우더), Alchemist (프리라이드), Dreamsicle (여성), Passport' },
  { name: '헤드 (Head)', country: '오스트리아', since: '1990년대', style: '올라운드 · 입문',
    history: '스키 브랜드 헤드의 스노보드 라인. 유럽 렌탈과 입문 시장에서 비중이 큽니다.',
    desc: '가격 대비 무난하고 튼튼합니다. 카빙용 라인도 있습니다.',
    pick: '합리적인 가격의 입문·중급', models: 'Rush (입문), Anything (올라운드), Daymaker, Pride (여성), Instinct (카빙), Space' },
  { name: 'F2', country: '독일', since: '1976', style: '알파인 · 레이싱',
    history: '1976년 독일에서 시작한 알파인(하드부츠) 스노보드의 대표 브랜드. 레이싱과 익스트림 카빙에서 오랜 역사를 가집니다.',
    desc: '알파인 레이스보드·바인딩이 주력. 소프트부츠용 올라운드도 있습니다.',
    pick: '알파인 카빙·레이싱 상급', models: 'Speedster RS (레이싱), Speedster SL, Silberpfeil (카빙), Eliminator, Race Titanium (바인딩)' },
  { name: '포럼 (Forum)', country: '미국', since: '1996', style: '프리스타일',
    history: '1996년 피터 라인 등 전설적 라이더들이 만든 프리스타일 명가. 한때 단종됐다가 2020년대 부활했습니다.',
    desc: '파크·지빙 감성의 부드러운 보드. 2000년대 비디오 세대에게 상징적인 브랜드입니다.',
    pick: '파크·지빙 위주의 프리스타일 중급', models: 'Destroyer, Youngblood, Spinster, Honey Pot, Kitchen Sink' },
  { name: '퍼블릭 (Public)', country: '미국', since: '2019', style: '프리스타일 · 스트리트',
    history: '2019년 프로 라이더 조 섹스턴이 만든 신생 브랜드. 스트리트·파크 라이더들이 주도합니다.',
    desc: '지빙·스트리트에 맞춘 부드러운 보드와 거친 그래픽이 특징.',
    pick: '지빙·스트리트를 타는 중급', models: 'General, Mathes, Disorder, Darrell, Display' },
  { name: '노빌레 (Nobile)', country: '폴란드', since: '1996', style: '올라운드 · 가성비',
    history: '1996년 폴란드에서 시작해 카이트보드로도 유명한 브랜드. 유럽 공장에서 직접 만듭니다.',
    desc: '가격 대비 완성도가 좋은 올라운드·프리라이드 보드.',
    pick: '합리적인 가격의 올라운드', models: 'N4, N5, N6 (올라운드), N7 (프리라이드), N8, Niki (여성)' },
  { name: 'OES', country: '일본', since: '2000년대', style: '카빙 · 테크니컬',
    history: '일본 카빙·테크니컬 신에서 시작한 소량 생산 브랜드. 햄머헤드 카빙 보드로 알려져 있습니다.',
    desc: '단단한 플렉스와 긴 유효 엣지로 깊은 카빙에 특화. 수량이 적습니다.',
    pick: '카빙 상급·마니아', models: 'Ichiban, Dragon, Fleur, Arrow, Carving Model' },
  { name: 'GT 스노보드 (GT Snowboards)', country: '일본', since: '2000년대', style: '카빙 · 수제',
    history: '일본의 소량 수제 카빙 보드 브랜드. 카빙 테크니컬 라이더 사이에서 입소문이 났습니다.',
    desc: '주문 제작에 가까운 소량 생산. 엣지 홀드와 반발이 강합니다.',
    pick: '수제 카빙 보드를 원하는 상급', models: 'GT Carving, GT Hammer, GT Tech, Custom' },
  { name: '데스레이블 (Death Label)', country: '일본', since: '1990년대', style: '프리스타일 · 그라트',
    history: '1990년대 일본에서 시작한 프리스타일 브랜드. 그라운드 트릭과 파크에서 꾸준한 팬층이 있습니다.',
    desc: '부드럽고 가벼운 트릭 보드. 가격이 합리적입니다.',
    pick: '그라운드 트릭·파크 초중급', models: 'Black Flag, Death Machine, Dope, Blue Death, Dope Twin' },
  { name: '파나틱 (Fanatic)', country: '독일', since: '1981', style: '올라운드 · 카빙',
    history: '1981년 윈드서핑으로 시작한 독일 브랜드. 스노보드 라인은 일본에서 카빙·올라운드 보드로 이어지고 있습니다.',
    desc: '카빙 성향의 올라운드 보드가 중심. 일본 라이더 사이에서 평가가 좋습니다.',
    pick: '카빙 성향 올라운드 중급', models: 'TNT (올라운드), Cat, FTC, Snowboard Twin' },
  { name: '스쿠터 (Scooter)', country: '일본', since: '1990년대', style: '프리스타일 · 그라트',
    history: '일본 그라운드 트릭 신의 터줏대감 브랜드. 가벼운 트릭 보드로 알려져 있습니다.',
    desc: '부드러운 플렉스와 가벼운 무게로 평지 트릭에 적합. 오래된 만큼 중고도 많습니다.',
    pick: '그라운드 트릭 입문·초급', models: 'SCT, Daylife, Daylife Twin, Bee, Nine' },
  { name: '윈터스틱 (Winterstick)', country: '미국', since: '1972', style: '파우더 · 클래식',
    history: '1972년 유타에서 디미트리에 밀로비치가 만든 미국 최초 스노보드 브랜드 중 하나. 스왈로테일의 원조입니다.',
    desc: '수제 파우더·스왈로테일 보드. 역사적인 브랜드라 컬렉션 가치도 있습니다.',
    pick: '파우더·클래식 서프 라이딩을 즐기는 상급', models: 'Swallowtail, Roundtail, Tom Sims, Barnburner' },
  { name: '산타크루즈 (Santa Cruz)', country: '미국', since: '1990년대', style: '프리스타일 · 스케이트',
    history: '1973년 스케이트보드로 시작한 산타크루즈의 스노보드 라인. 스크리밍 핸드 그래픽으로 유명합니다.',
    desc: '스케이트 감성의 부드러운 프리스타일 보드. 디자인이 개성 있습니다.',
    pick: '스케이트 스타일을 좋아하는 초중급', models: 'Screaming Hand, Classic Dot, Wave Dot, Roskopp' },
  { name: '알리안 (Allian)', country: '일본', since: '2000년대', style: '프리스타일 · 올라운드',
    history: '일본 프리스타일 라이더들이 만든 브랜드. 파크와 그라트 모두를 겨냥한 올라운드 보드가 많습니다.',
    desc: '중간 플렉스의 균형 잡힌 보드. 가격이 합리적입니다.',
    pick: '파크와 라이딩을 함께 하는 중급', models: 'Prism, Prism Ltd, Damage, Code, Air Camber' },
  { name: '코루아 (Korua Shapes)', country: '스위스', since: '2014', style: '카빙 · 서프',
    history: '2014년 스위스 라이더들이 만든 브랜드. "Yearning for Turning" 영상으로 소프트부츠 카빙 붐을 일으켰습니다.',
    desc: '테이퍼드 쉐이프와 넓은 노즈로 편하게 깊은 카빙을 합니다. 국내 카빙 유행과 함께 인기.',
    pick: '편안한 카빙·서프 라이딩을 원하는 중급', models: 'Dart, Otto, Transition Finder, Pencil, Tranny Finder, Stealth, Cafe Racer, Pin Tonic' },
  { name: '아버 (Arbor)', country: '미국', since: '1995', style: '올라운드 · 친환경',
    history: '1995년 캘리포니아 베니스에서 시작. 나무 톱시트와 친환경 생산으로 알려진 브랜드입니다.',
    desc: '우드 톱시트 디자인과 부드러운 승차감. 시스템 로커로 입문자에게도 편합니다.',
    pick: '나무 디자인과 편안함을 원하는 초중급', models: 'Foundation (입문), Element (올마운틴), Westmark, Coda, Bryan Iguchi Pro, Ethos (여성), Swoon (여성)' },
  { name: '로시뇰 (Rossignol)', country: '프랑스', since: '1980년대', style: '올라운드 · 입문',
    history: '스키 브랜드 로시뇰의 스노보드 라인. 유럽 렌탈과 입문 시장 비중이 큽니다.',
    desc: '관대하고 편한 입문·중급 보드. 자비에르 드 르 뤼 시그니처 프리라이드 보드가 유명합니다.',
    pick: '편안한 입문용', models: 'Circuit (입문), District, One, XV (프리라이드), Sashimi, Jibsaw, Meraki (여성)' },
  { name: 'DC', country: '미국', since: '2000년대', style: '프리스타일 · 부츠',
    history: '스케이트 슈즈로 시작한 DC가 2000년대 스노보드와 부츠로 확장. 부츠가 특히 유명합니다.',
    desc: '프리스타일 보드와 편안한 부츠. 트래블러·컨트롤 부츠가 국내에서 인기.',
    pick: '편한 부츠와 프리스타일 세트', models: 'Ply, PBJ, Focus (입문), Space Echo, Judge (부츠), Travis Rice (부츠), Control (부츠)' },
  { name: '슬래시 (Slash)', country: '오스트리아', since: '2012', style: '프리라이드 · 프리스타일',
    history: '2012년 프로 라이더 기기 뤼프가 만든 브랜드. 오스트리아 공장에서 만듭니다.',
    desc: '프리라이드와 프리스타일을 오가는 올마운틴 보드가 강점.',
    pick: '백컨트리 프리스타일 중상급', models: 'ATV, Brainstorm, Happy Place, Vertical, Spectrum, Straight' },
  { name: 'YES.', country: '스위스', since: '2009', style: '올라운드 · 프리라이드',
    history: '2009년 프로 라이더 DCP·로맹 드 마르시·JP 솔버그가 함께 만든 라이더 중심 브랜드. 니데커 그룹 소속.',
    desc: '베이직은 가성비 올라운드의 대표. 스탠다드는 넓은 허리로 파우더와 카빙을 모두 소화합니다.',
    pick: '한 장으로 여러 지형을 타고 싶은 중급', models: 'Basic (올라운드 입문), Standard (올마운틴 와이드), Greats (프리스타일), Typo (올라운드), Hybrid (프리라이드), Pick Your Line (프리라이드), 420 (파우더), Jackpot (파크), Optimistic (카빙), Hel Yes (여성), Emoticon (여성)' },
];

export default function GearGuide() {
  const user = getUser();
  const [sport, setSport] = useState<Sport>('ski');

  const brands = sport === 'ski' ? SKI_BRANDS : BOARD_BRANDS;
  // 브랜드가 44개라 접어서 보여준다 — 위 이름 목록에서 누르면 그 카드만 펼치고 스크롤 (2026-10-06)
  const [openName, setOpenName] = useState<string | null>(null);
  const [seenSport, setSeenSport] = useState(sport);
  if (seenSport !== sport) { setSeenSport(sport); setOpenName(null); }

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

      {/* 브랜드 목록 — 접힌 카드. 제목을 누르면 펼침 */}
      <div className="space-y-2">
        {brands.map(brand => {
          const open = openName === brand.name;
          return (
            <div key={brand.name} className="card">
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
                  <p className="text-[10px] font-bold text-gray-500 mb-1">주요 모델</p>
                  <div className="flex flex-wrap gap-1">
                    {brand.models.split(', ').map(m => (
                      <span key={m} className="px-2 py-0.5 rounded-md bg-gray-100 text-[11px] text-gray-800">{m}</span>
                    ))}
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
