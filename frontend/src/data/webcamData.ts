export interface CamInfo {
  label: string;
  stream: string;
}

export interface ResortData {
  name: string;
  region: string;
  url: string;
  cameras?: CamInfo[];
}

// 시즌 시작 시 각 스키장 공식 사이트에서 스트림 URL 확인 후 cameras 배열 추가
// 비시즌에는 공식 사이트 링크로 대체됨

const webcamData: Record<string, ResortData> = {
  yongpyong: {
    name: '용평리조트', region: '강원',
    url: 'https://www.yongpyong.co.kr/kor/guide/realTimeNews/ypResortWebcam.do',
  },
  wellihilli: {
    name: '웰리힐리파크', region: '강원',
    url: 'https://www.wellihillipark.com/home/customer/webcam',
  },
  konjiam: {
    name: '곤지암리조트', region: '경기',
    url: 'https://www.konjiamresort.co.kr/ski/liveCam.dev',
  },
  phoenix: {
    name: '휘닉스평창', region: '강원',
    url: 'https://phoenixhnr.co.kr/page/pyeongchang/guide/operation/sketchMovie',
  },
  high1: {
    name: '하이원리조트', region: '강원',
    url: 'https://www.high1.com/ski/slopeView.do?key=748&mode=p',
  },
  vivaldi: {
    name: '비발디파크', region: '강원',
    url: 'https://mice.sonohotelsresorts.com/daemyung.vp.utill.09_02_02_01.ds/dmparse.dm?areaType=S',
  },
  elysian: {
    name: '엘리시안강촌', region: '강원',
    url: 'https://www.elysian.co.kr/about-gangchon/ski#guide-to-using-slopes',
  },
  jisan: {
    name: '지산리조트', region: '경기',
    url: 'https://www.jisanresort.co.kr/w/ski/slopes/webcam_init.asp',
  },
  muju: {
    name: '무주덕유산', region: '전북',
    url: 'https://www.mdysresort.com/guide/webcam.asp',
  },
  oak: {
    name: '오크밸리', region: '강원',
    url: 'https://oakvalley.co.kr/ski/introduction/realtime',
  },
  o2: {
    name: '오투리조트', region: '강원',
    url: 'https://www.o2resort.com/GDE/webcam.jsp',
  },
  alpensia: {
    name: '알펜시아', region: '강원',
    url: 'https://www.alpensia.com/guide/web-cam.do',
  },
  eden: {
    name: '에덴밸리', region: '경남',
    url: 'https://www.edenvalley.co.kr/CS/cam_pop1.asp',
  },
};

export default webcamData;
