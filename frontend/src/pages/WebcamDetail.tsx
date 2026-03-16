import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';

const webcamData: Record<string, {
  name: string;
  region: string;
  url: string;
}> = {
  yongpyong: { name: '용평리조트', region: '강원', url: 'https://www.yongpyong.co.kr/kor/guide/realTimeNews/ypResortWebcam.do' },
  phoenix: { name: '휘닉스평창', region: '강원', url: 'https://phoenixhnr.co.kr/page/pyeongchang/guide/operation/sketchMovie' },
  high1: { name: '하이원리조트', region: '강원', url: 'https://www.high1.com/ski/slopeView.do?key=748&mode=p' },
  vivaldi: { name: '비발디파크', region: '강원', url: 'https://www.sonohotelsresorts.com/daemyung.vp.skiworld.04_02_04.ds/dmparse.dm' },
  elysian: { name: '엘리시안강촌', region: '강원', url: 'https://www.elysian.co.kr/gangchon/ski/ski_slope03.asp' },
  jisan: { name: '지산리조트', region: '경기', url: 'https://www.jisanresort.co.kr/w/ski/slopes/webcam_init.asp' },
  muju: { name: '무주덕유산', region: '전북', url: 'https://www.mdysresort.com/guide/webcam.asp' },
  oak: { name: '오크밸리', region: '강원', url: 'https://oakvalley.co.kr/ski/introduction/realtime' },
  wellihilli: { name: '웰리힐리파크', region: '강원', url: 'https://www.wellihillipark.com/home/customer/webcam' },
  o2: { name: '오투리조트', region: '강원', url: 'https://www.o2resort.com/GDE/webcam.jsp' },
  alpensia: { name: '알펜시아', region: '강원', url: 'https://www.alpensia.com/guide/web-cam.do' },
  konjiam: { name: '곤지암리조트', region: '경기', url: 'https://www.konjiamresort.co.kr/ski/liveCam.dev' },
  eden: { name: '에덴밸리', region: '경남', url: 'https://www.edenvalley.co.kr/CS/cam_pop1.asp' },
};

const WebcamDetail = () => {
  const { id } = useParams();
  const [iframeFailed, setIframeFailed] = useState(false);
  const cam = id ? webcamData[id] : null;

  if (!cam) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <h2 className="text-xl font-bold text-gray-900 mb-2">스키장을 찾을 수 없습니다</h2>
        <Link to="/webcam" className="text-gray-500 hover:text-gray-900 text-sm">← 목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/webcam" className="text-gray-400 hover:text-gray-900 text-lg transition-colors">←</Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cam.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{cam.region}</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[10px] text-red-500 font-medium">LIVE</span>
            </div>
          </div>
        </div>
        <a
          href={cam.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-light transition-colors"
        >
          새 탭에서 보기
        </a>
      </div>

      {/* Webcam iframe */}
      <div className="card rounded-2xl overflow-hidden">
        {iframeFailed ? (
          <div className="h-[500px] bg-gray-50 flex flex-col items-center justify-center gap-4">
            <div className="text-5xl">🚫</div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-1">{cam.name}은(는) 외부 임베딩을 차단하고 있습니다</p>
              <p className="text-xs text-gray-400">스키장 공식 사이트에서 직접 확인해주세요</p>
            </div>
            <a
              href={cam.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-light transition-colors"
            >
              {cam.name} 웹캠 보러가기
            </a>
          </div>
        ) : (
          <iframe
            src={cam.url}
            className="w-full h-[500px] md:h-[600px] border-0"
            title={`${cam.name} 실시간 웹캠`}
            sandbox="allow-scripts allow-same-origin allow-popups"
            onError={() => setIframeFailed(true)}
            onLoad={(e) => {
              try {
                const frame = e.target as HTMLIFrameElement;
                if (frame.contentDocument?.title === '') {
                  setIframeFailed(true);
                }
              } catch {
                // Cross-origin = loaded successfully
              }
            }}
          />
        )}
      </div>

      <p className="text-[11px] text-gray-400 text-center">
        일부 스키장은 보안 정책으로 인해 임베딩이 제한될 수 있습니다. "새 탭에서 보기"를 이용해주세요.
      </p>
    </div>
  );
};

export default WebcamDetail;
