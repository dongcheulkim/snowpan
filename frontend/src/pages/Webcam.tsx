import { useState } from 'react';
import { Link } from 'react-router-dom';

const Webcam = () => {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [failedIframes, setFailedIframes] = useState<Set<string>>(new Set());
  const [selectedCam, setSelectedCam] = useState<string | null>(null);

  const webcams = [
    { id: 'yongpyong', name: '용평리조트', url: 'https://www.yongpyong.co.kr/kor/guide/realTimeNews/ypResortWebcam.do', region: '강원' },
    { id: 'phoenix', name: '휘닉스평창', url: 'https://phoenixhnr.co.kr/page/pyeongchang/guide/operation/sketchMovie', region: '강원' },
    { id: 'high1', name: '하이원리조트', url: 'https://www.high1.com/ski/slopeView.do?key=748&mode=p', region: '강원' },
    { id: 'vivaldi', name: '비발디파크', url: 'https://www.sonohotelsresorts.com/daemyung.vp.skiworld.04_02_04.ds/dmparse.dm', region: '강원' },
    { id: 'elysian', name: '엘리시안강촌', url: 'https://www.elysian.co.kr/gangchon/ski/ski_slope03.asp', region: '강원' },
    { id: 'jisan', name: '지산리조트', url: 'https://www.jisanresort.co.kr/w/ski/slopes/webcam_init.asp', region: '경기' },
    { id: 'muju', name: '무주덕유산', url: 'https://www.mdysresort.com/guide/webcam.asp', region: '전북' },
    { id: 'oak', name: '오크밸리', url: 'https://oakvalley.co.kr/ski/introduction/realtime', region: '강원' },
    { id: 'wellihilli', name: '웰리힐리파크', url: 'https://www.wellihillipark.com/home/customer/webcam', region: '강원' },
    { id: 'o2', name: '오투리조트', url: 'https://www.o2resort.com/GDE/webcam.jsp', region: '강원' },
    { id: 'alpensia', name: '알펜시아', url: 'https://www.alpensia.com/guide/web-cam.do', region: '강원' },
    { id: 'konjiam', name: '곤지암리조트', url: 'https://www.konjiamresort.co.kr/ski/liveCam.dev', region: '경기' },
    { id: 'eden', name: '에덴밸리', url: 'https://www.edenvalley.co.kr/CS/cam_pop1.asp', region: '경남' },
  ];

  const regions = ['all', '강원', '경기', '전북', '경남'];
  const regionLabels: Record<string, string> = { all: '전체', '강원': '강원', '경기': '경기', '전북': '전북', '경남': '경남' };

  const filtered = selectedRegion === 'all' ? webcams : webcams.filter((c) => c.region === selectedRegion);

  const handleIframeError = (id: string) => {
    setFailedIframes((prev) => new Set(prev).add(id));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">실시간 웹캠</h1>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
        </div>
        <Link to="/" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">← 홈</Link>
      </div>

      <p className="text-xs text-gray-400">
        일부 스키장은 보안 정책으로 인해 직접 임베딩이 제한될 수 있습니다. 이 경우 "새 탭에서 보기"를 이용해주세요.
      </p>

      {/* Region filter */}
      <div className="flex gap-2">
        {regions.map((r) => (
          <button
            key={r}
            onClick={() => setSelectedRegion(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedRegion === r
                ? 'bg-accent text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {regionLabels[r]}
          </button>
        ))}
      </div>

      {/* Selected cam - full view */}
      {selectedCam && (() => {
        const cam = webcams.find((c) => c.id === selectedCam);
        if (!cam) return null;
        const isFailed = failedIframes.has(cam.id);
        return (
          <div className="card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{cam.name}</span>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{cam.region}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={cam.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent font-medium"
                >
                  새 탭 →
                </a>
                <button
                  onClick={() => setSelectedCam(null)}
                  className="text-gray-400 hover:text-gray-600 text-lg"
                >
                  ×
                </button>
              </div>
            </div>
            {isFailed ? (
              <div className="h-[400px] bg-gray-50 flex flex-col items-center justify-center gap-3">
                <div className="text-4xl">🚫</div>
                <p className="text-sm text-gray-500">이 스키장은 외부 임베딩을 차단하고 있습니다</p>
                <a
                  href={cam.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-light transition-colors"
                >
                  새 탭에서 보기
                </a>
              </div>
            ) : (
              <iframe
                src={cam.url}
                className="w-full h-[400px] border-0"
                title={cam.name}
                sandbox="allow-scripts allow-same-origin"
                onError={() => handleIframeError(cam.id)}
                onLoad={(e) => {
                  try {
                    const frame = e.target as HTMLIFrameElement;
                    // If we can't access contentDocument, it loaded fine
                    // If it's blocked, the iframe will show an error or blank
                    if (frame.contentDocument?.title === '') {
                      handleIframeError(cam.id);
                    }
                  } catch {
                    // Cross-origin - means it loaded (which is good)
                  }
                }}
              />
            )}
          </div>
        );
      })()}

      {/* Webcam grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map((cam) => {
          const isFailed = failedIframes.has(cam.id);
          const isSelected = selectedCam === cam.id;
          return (
            <div
              key={cam.id}
              className={`card rounded-xl overflow-hidden cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-accent' : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedCam(cam.id)}
            >
              {/* Mini preview */}
              <div className="h-28 bg-gray-100 relative overflow-hidden">
                {isFailed ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl">📷</span>
                    <span className="text-[10px] text-gray-400">클릭하여 보기</span>
                  </div>
                ) : (
                  <iframe
                    src={cam.url}
                    className="w-[200%] h-[200%] border-0 pointer-events-none origin-top-left scale-50"
                    title={cam.name}
                    sandbox="allow-scripts allow-same-origin"
                    onError={() => handleIframeError(cam.id)}
                    loading="lazy"
                  />
                )}
                <div className="absolute top-1.5 right-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-gray-900">{cam.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{cam.region}</div>
                </div>
                <a
                  href={cam.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-accent font-medium px-2 py-1 bg-accent/10 rounded-md"
                >
                  새 탭 →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Webcam;
