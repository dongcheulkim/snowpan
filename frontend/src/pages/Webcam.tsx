import { useState } from 'react';
import { Link } from 'react-router-dom';

const Webcam = () => {
  const [selectedRegion, setSelectedRegion] = useState('all');

  const webcams = [
    { id: 'yongpyong', name: '용평리조트', region: '강원', slopes: 28, elevation: '1,458m' },
    { id: 'phoenix', name: '휘닉스평창', region: '강원', slopes: 21, elevation: '1,050m' },
    { id: 'high1', name: '하이원리조트', region: '강원', slopes: 18, elevation: '1,340m' },
    { id: 'vivaldi', name: '비발디파크', region: '강원', slopes: 13, elevation: '531m' },
    { id: 'elysian', name: '엘리시안강촌', region: '강원', slopes: 10, elevation: '580m' },
    { id: 'jisan', name: '지산리조트', region: '경기', slopes: 7, elevation: '267m' },
    { id: 'muju', name: '무주덕유산', region: '전북', slopes: 28, elevation: '1,520m' },
    { id: 'oak', name: '오크밸리', region: '강원', slopes: 9, elevation: '730m' },
    { id: 'wellihilli', name: '웰리힐리파크', region: '강원', slopes: 20, elevation: '1,069m' },
    { id: 'o2', name: '오투리조트', region: '강원', slopes: 12, elevation: '1,130m' },
    { id: 'alpensia', name: '알펜시아', region: '강원', slopes: 6, elevation: '700m' },
    { id: 'konjiam', name: '곤지암리조트', region: '경기', slopes: 9, elevation: '420m' },
    { id: 'eden', name: '에덴밸리', region: '경남', slopes: 12, elevation: '1,070m' },
  ];

  const regions = ['all', '강원', '경기', '전북', '경남'];
  const regionLabels: Record<string, string> = { all: '전체', '강원': '강원', '경기': '경기', '전북': '전북', '경남': '경남' };

  const filtered = selectedRegion === 'all' ? webcams : webcams.filter((c) => c.region === selectedRegion);

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

      <p className="text-xs text-gray-400">스키장을 선택하면 실시간 웹캠을 볼 수 있습니다.</p>

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

      {/* Resort list */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map((cam) => (
          <Link
            key={cam.id}
            to={`/webcam/${cam.id}`}
            className="card rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                🏔️
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{cam.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{cam.region}</span>
                  <span className="text-[10px] text-gray-400">{cam.slopes}면 · {cam.elevation}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs text-gray-400">LIVE</span>
              <span className="text-gray-300">›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Webcam;
