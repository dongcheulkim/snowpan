import { Link } from 'react-router-dom';
import { MountainIcon } from '../components/Icons';

const Webcam = () => {
  const webcams = [
    { id: 'yongpyong', name: '용평리조트', region: '강원', slopes: 28, elevation: '1,458m', cams: 20, hasStream: true, url: '' },
    { id: 'wellihilli', name: '웰리힐리파크', region: '강원', slopes: 20, elevation: '1,069m', cams: 6, hasStream: true, url: '' },
    { id: 'konjiam', name: '곤지암리조트', region: '경기', slopes: 9, elevation: '420m', cams: 5, hasStream: true, url: '' },
    { id: 'phoenix', name: '휘닉스평창', region: '강원', slopes: 21, elevation: '1,050m', cams: 0, hasStream: false, url: 'https://phoenixhnr.co.kr/page/pyeongchang/guide/operation/sketchMovie' },
    { id: 'high1', name: '하이원리조트', region: '강원', slopes: 18, elevation: '1,340m', cams: 18, hasStream: true, url: '' },
    { id: 'vivaldi', name: '비발디파크', region: '강원', slopes: 13, elevation: '531m', cams: 0, hasStream: false, url: 'https://mice.sonohotelsresorts.com/daemyung.vp.utill.09_02_02_01.ds/dmparse.dm?areaType=S' },
    { id: 'elysian', name: '엘리시안강촌', region: '강원', slopes: 10, elevation: '580m', cams: 0, hasStream: false, url: 'https://www.elysian.co.kr/about-gangchon/ski#guide-to-using-slopes' },
    { id: 'jisan', name: '지산리조트', region: '경기', slopes: 7, elevation: '267m', cams: 5, hasStream: true, url: '' },
    { id: 'muju', name: '무주덕유산', region: '전북', slopes: 28, elevation: '1,520m', cams: 0, hasStream: false, url: 'https://www.mdysresort.com/guide/webcam.asp' },
    { id: 'oak', name: '오크밸리', region: '강원', slopes: 9, elevation: '730m', cams: 5, hasStream: true, url: '' },
    { id: 'o2', name: '오투리조트', region: '강원', slopes: 12, elevation: '1,130m', cams: 8, hasStream: true, url: '' },
    { id: 'alpensia', name: '알펜시아', region: '강원', slopes: 6, elevation: '700m', cams: 0, hasStream: false, url: 'https://www.alpensia.com/guide/web-cam.do' },
    { id: 'eden', name: '에덴밸리', region: '경남', slopes: 12, elevation: '1,070m', cams: 0, hasStream: false, url: 'https://www.edenvalley.co.kr/CS/cam_pop1.asp' },
  ];

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
      </div>

      <p className="text-xs text-gray-500">스키장을 선택하면 실시간 웹캠을 볼 수 있습니다.</p>

      {/* Resort cards */}
      <div className="grid grid-cols-1 gap-3">
        {webcams.map((cam) => {
          const cardContent = (
            <>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700">
                  <MountainIcon size={22} />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{cam.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{cam.region}</span>
                    <span className="text-[10px] text-gray-500">{cam.slopes}면 · {cam.elevation}</span>
                    {cam.hasStream ? (
                      <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium">{cam.cams}캠</span>
                    ) : (
                      <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">외부 링크</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cam.hasStream ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    <span className="text-xs text-gray-500">LIVE</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">공식사이트</span>
                )}
                <span className="text-gray-500">›</span>
              </div>
            </>
          );

          const className = "card rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all active:scale-[0.99]";

          return cam.hasStream ? (
            <Link key={cam.id} to={`/webcam/${cam.id}`} className={className}>
              {cardContent}
            </Link>
          ) : (
            <a key={cam.id} href={cam.url} target="_blank" rel="noopener noreferrer" className={className}>
              {cardContent}
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default Webcam;
