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

const webcamData: Record<string, ResortData> = {
  yongpyong: {
    name: '용평리조트', region: '강원',
    url: 'https://www.yongpyong.co.kr/kor/guide/realTimeNews/ypResortWebcam.do',
    cameras: [
      { label: '발왕산 氣 스카이워크', stream: 'https://live.yongpyong.co.kr/Ycam1/cam01.stream/playlist.m3u8' },
      { label: '발왕산 천년주목숲길', stream: 'https://live.yongpyong.co.kr/Ycam1/cam02.stream/playlist.m3u8' },
      { label: '옐로우 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam03.stream/playlist.m3u8' },
      { label: '메가그린 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam04.stream/playlist.m3u8' },
      { label: '베이스전경 / 레드 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam05.stream/playlist.m3u8' },
      { label: '레인보우 전경', stream: 'https://live.yongpyong.co.kr/Ycam1/cam06.stream/playlist.m3u8' },
      { label: '레인보우 정상', stream: 'https://live.yongpyong.co.kr/Ycam1/cam07.stream/playlist.m3u8' },
      { label: '모나 용평 진입로', stream: 'https://live.yongpyong.co.kr/Ycam1/cam08.stream/playlist.m3u8' },
      { label: '골드 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam09.stream/playlist.m3u8' },
      { label: '실버 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam10.stream/playlist.m3u8' },
      { label: '���크 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam11.stream/playlist.m3u8' },
      { label: '뉴레드 슬��프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam12.stream/playlist.m3u8' },
      { label: '뉴골드 슬로프', stream: 'https://live.yongpyong.co.kr/Ycam1/cam13.stream/playlist.m3u8' },
      { label: '드래곤파크 전경', stream: 'https://live.yongpyong.co.kr/Ycam1/cam14.stream/playlist.m3u8' },
      { label: '레인보우 파라다이스', stream: 'https://live.yongpyong.co.kr/Ycam1/cam15.stream/playlist.m3u8' },
      { label: 'CAM 16', stream: 'https://live.yongpyong.co.kr/Ycam1/cam16.stream/playlist.m3u8' },
      { label: 'CAM 17', stream: 'https://live.yongpyong.co.kr/Ycam1/cam17.stream/playlist.m3u8' },
      { label: 'CAM 18', stream: 'https://live.yongpyong.co.kr/Ycam1/cam18.stream/playlist.m3u8' },
      { label: 'CAM 19', stream: 'https://live.yongpyong.co.kr/Ycam1/cam19.stream/playlist.m3u8' },
      { label: 'CAM 20', stream: 'https://live.yongpyong.co.kr/Ycam1/cam20.stream/playlist.m3u8' },
    ],
  },
  wellihilli: {
    name: '웰리힐리파크', region: '강원',
    url: 'https://www.wellihillipark.com/home/customer/webcam',
    cameras: [
      { label: '알파 슬로프', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam02.stream/playlist.m3u8' },
      { label: '베이스 광장', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam03.stream/playlist.m3u8' },
      { label: '스키장 전경', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam04.stream/playlist.m3u8' },
      { label: '정상 광장', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam05.stream/playlist.m3u8' },
      { label: 'D+ 슬��프', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam06.stream/playlist.m3u8' },
      { label: '워터플래닛', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam07.stream/playlist.m3u8' },
    ],
  },
  konjiam: {
    name: '곤지암리조트', region: '경기',
    url: 'https://www.konjiamresort.co.kr/ski/liveCam.dev',
    cameras: [
      { label: '정상 휴게소', stream: 'http://konjiam.live.cdn.cloudn.co.kr/konjiam/cam01.stream/playlist.m3u8' },
      { label: '정상부 ���로프', stream: 'http://konjiam.live.cdn.cloudn.co.kr/konjiam/cam02.stream/playlist.m3u8' },
      { label: '초중급 베이스', stream: 'http://konjiam.live.cdn.cloudn.co.kr/konjiam/cam03.stream/playlist.m3u8' },
      { label: '중상급 베이스', stream: 'http://konjiam.live.cdn.cloudn.co.kr/konjiam/cam04.stream/playlist.m3u8' },
      { label: '중간 슬로프', stream: 'http://konjiam.live.cdn.cloudn.co.kr/konjiam/cam05.stream/playlist.m3u8' },
    ],
  },
  phoenix: { name: '휘닉스평창', region: '강원', url: 'https://phoenixhnr.co.kr/page/pyeongchang/guide/operation/sketchMovie' },
  high1: {
    name: '하이원리조���', region: '강원',
    url: 'https://www.high1.com/ski/slopeView.do?key=748&mode=p',
    cameras: [
      { label: 'CH 1', stream: 'http://59.30.12.195:1935/live/ch1.stream/playlist.m3u8' },
      { label: 'CH 2', stream: 'http://59.30.12.195:1935/live/ch2.stream/playlist.m3u8' },
      { label: 'CH 3', stream: 'http://59.30.12.195:1935/live/ch3.stream/playlist.m3u8' },
      { label: '아테나 슬로프 1', stream: 'http://59.30.12.195:1935/live/ch4.stream/playlist.m3u8' },
      { label: '마운틴허브 베이스', stream: 'http://59.30.12.195:1935/live/ch5.stream/playlist.m3u8' },
      { label: '아테나 슬로프 2', stream: 'http://59.30.12.195:1935/live/ch6.stream/playlist.m3u8' },
      { label: '마운틴 베��스', stream: 'http://59.30.12.195:1935/live/ch7.stream/playlist.m3u8' },
      { label: '아테나 슬로프 2 하부', stream: 'http://59.30.12.195:1935/live/ch8.stream/playlist.m3u8' },
      { label: '빅토리아 상부', stream: 'http://59.30.12.195:1935/live/ch9.stream/playlist.m3u8' },
      { label: '제우스 슬로프 2 중간', stream: 'http://59.30.12.195:1935/live/ch10.stream/playlist.m3u8' },
      { label: '밸리허브 베이스', stream: 'http://59.30.12.195:1935/live/ch11.stream/playlist.m3u8' },
      { label: '빅토리아 슬로프 1', stream: 'http://59.30.12.195:1935/live/ch12.stream/playlist.m3u8' },
      { label: 'CH 13', stream: 'http://59.30.12.195:1935/live/ch13.stream/playlist.m3u8' },
      { label: 'CH 14', stream: 'http://59.30.12.195:1935/live/ch14.stream/playlist.m3u8' },
      { label: 'CH 15', stream: 'http://59.30.12.195:1935/live/ch15.stream/playlist.m3u8' },
      { label: 'CH 16', stream: 'http://59.30.12.195:1935/live/ch16.stream/playlist.m3u8' },
      { label: 'CH 17', stream: 'http://59.30.12.195:1935/live/ch17.stream/playlist.m3u8' },
      { label: 'CH 18', stream: 'http://59.30.12.195:1935/live/ch18.stream/playlist.m3u8' },
    ],
  },
  vivaldi: { name: '비발디파크', region: '강원', url: 'https://mice.sonohotelsresorts.com/daemyung.vp.utill.09_02_02_01.ds/dmparse.dm?areaType=S' },
  elysian: { name: '엘리시안강촌', region: '강원', url: 'https://www.elysian.co.kr/about-gangchon/ski#guide-to-using-slopes' },
  jisan: {
    name: '지산리조트', region: '경기',
    url: 'https://www.jisanresort.co.kr/w/ski/slopes/webcam_init.asp',
    cameras: [
      { label: '캠 1', stream: 'https://ant.livecity.co.kr:5443/jisancam/streams/jisan1.m3u8' },
      { label: '캠 2', stream: 'https://ant.livecity.co.kr:5443/jisancam/streams/jisan2.m3u8' },
      { label: '캠 3', stream: 'https://ant.livecity.co.kr:5443/jisancam/streams/jisan3.m3u8' },
      { label: '캠 4', stream: 'https://ant.livecity.co.kr:5443/jisancam/streams/jisan4.m3u8' },
      { label: '캠 5', stream: 'https://ant.livecity.co.kr:5443/jisancam/streams/jisan5.m3u8' },
    ],
  },
  muju: { name: '무주덕유산', region: '전북', url: 'https://www.mdysresort.com/guide/webcam.asp' },
  oak: {
    name: '오크밸리', region: '강원',
    url: 'https://oakvalley.co.kr/ski/introduction/realtime',
    cameras: [
      { label: '스노우파크 옥탑', stream: 'https://cctv-oak9.ktcdn.co.kr/cctv/ch2.stream/chunklist.m3u8' },
      { label: 'I 슬로프', stream: 'https://cctv-oak9.ktcdn.co.kr/cctv/ch9.stream/chunklist.m3u8' },
      { label: 'G 슬로프', stream: 'https://cctv-oak9.ktcdn.co.kr/cctv/ch7.stream/chunklist.m3u8' },
      { label: 'F 슬로프', stream: 'https://cctv-oak9.ktcdn.co.kr/cctv/ch6.stream/chunklist.m3u8' },
      { label: '플라워리프트 하차장', stream: 'https://cctv-oak9.ktcdn.co.kr/cctv/ch5.stream/chunklist.m3u8' },
    ],
  },
  o2: {
    name: '오투리���트', region: '강원',
    url: 'https://www.o2resort.com/GDE/webcam.jsp',
    cameras: [
      { label: '스키하우스', stream: 'http://118.46.149.144:8080/streaming/streamhls2.jsp?ch=0' },
      { label: '드림 1', stream: 'http://118.46.149.144:8080/streaming/streamhls2.jsp?ch=1' },
      { label: '버금마루', stream: 'http://118.46.149.144:8080/streaming/streamhls2.jsp?ch=2' },
      { label: '으뜸마루', stream: 'http://118.46.149.144:8080/streaming/streamhls2.jsp?ch=3' },
      { label: '글로리 1', stream: 'http://118.46.149.144:8080/streaming/streamhls2.jsp?ch=4' },
      { label: '해피', stream: 'http://118.46.149.144:8080/streaming/streamhls2.jsp?ch=5' },
      { label: '드림 2', stream: 'http://118.46.149.144:8080/streaming/streamhls2.jsp?ch=6' },
      { label: '글로리 3', stream: 'http://118.46.149.144:8080/streaming/streamhls2.jsp?ch=7' },
    ],
  },
  alpensia: { name: '알펜시아', region: '강원', url: 'https://www.alpensia.com/guide/web-cam.do' },
  eden: { name: '에덴밸리', region: '경남', url: 'https://www.edenvalley.co.kr/CS/cam_pop1.asp' },
};

export default webcamData;
