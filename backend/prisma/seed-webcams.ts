// 웹캠 시드 — 기존 frontend/src/data/webcamData.ts 와 Webcam.tsx 의 하드코딩 데이터를 DB 로 옮김.
// 시즌 시작 시 각 스키장 공식 사이트에서 cameras stream URL 받아 update.
// idempotent — 같은 slug 있으면 update.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Seed {
  slug: string;
  name: string;
  region: string;
  slopes: number;
  elevation?: string;
  externalUrl?: string;
  cameras?: { label: string; stream: string }[];
}

const SEEDS: Seed[] = [
  { slug: 'yongpyong', name: '용평리조트', region: '강원', slopes: 28, elevation: '1,458m', externalUrl: 'https://www.yongpyong.co.kr/kor/guide/realTimeNews/ypResortWebcam.do' },
  { slug: 'wellihilli', name: '웰리힐리파크', region: '강원', slopes: 20, elevation: '1,069m', externalUrl: 'https://www.wellihillipark.com/home/customer/webcam' },
  { slug: 'konjiam', name: '곤지암리조트', region: '경기', slopes: 9, elevation: '420m', externalUrl: 'https://www.konjiamresort.co.kr/ski/liveCam.dev' },
  { slug: 'phoenix', name: '휘닉스평창', region: '강원', slopes: 21, elevation: '1,050m', externalUrl: 'https://phoenixhnr.co.kr/page/pyeongchang/guide/operation/sketchMovie' },
  { slug: 'high1', name: '하이원리조트', region: '강원', slopes: 18, elevation: '1,340m', externalUrl: 'https://www.high1.com/ski/slopeView.do?key=748&mode=p' },
  { slug: 'vivaldi', name: '비발디파크', region: '강원', slopes: 13, elevation: '531m', externalUrl: 'https://mice.sonohotelsresorts.com/daemyung.vp.utill.09_02_02_01.ds/dmparse.dm?areaType=S' },
  { slug: 'elysian', name: '엘리시안강촌', region: '강원', slopes: 10, elevation: '580m', externalUrl: 'https://www.elysian.co.kr/about-gangchon/ski#guide-to-using-slopes' },
  { slug: 'jisan', name: '지산리조트', region: '경기', slopes: 7, elevation: '267m', externalUrl: 'https://www.jisanresort.co.kr/w/ski/slopes/webcam_init.asp' },
  { slug: 'muju', name: '무주덕유산', region: '전북', slopes: 28, elevation: '1,520m', externalUrl: 'https://www.mdysresort.com/guide/webcam.asp' },
  { slug: 'oak', name: '오크밸리', region: '강원', slopes: 9, elevation: '730m', externalUrl: 'https://oakvalley.co.kr/ski/introduction/realtime' },
  { slug: 'o2', name: '오투리조트', region: '강원', slopes: 12, elevation: '1,130m', externalUrl: 'https://www.o2resort.com/GDE/webcam.jsp' },
  { slug: 'alpensia', name: '알펜시아', region: '강원', slopes: 6, elevation: '700m', externalUrl: 'https://www.alpensia.com/guide/web-cam.do' },
  { slug: 'eden', name: '에덴밸리', region: '경남', slopes: 12, elevation: '1,070m', externalUrl: 'https://www.edenvalley.co.kr/CS/cam_pop1.asp' },
];

async function main() {
  console.log(`🌱 Seeding ${SEEDS.length} webcams...`);
  let created = 0, updated = 0;
  for (let i = 0; i < SEEDS.length; i++) {
    const s = SEEDS[i];
    const existing = await prisma.webcam.findUnique({ where: { slug: s.slug } });
    if (existing) {
      await prisma.webcam.update({
        where: { slug: s.slug },
        data: { ...s, order: i, camCount: s.cameras?.length || 0, cameras: s.cameras || undefined },
      });
      updated++;
    } else {
      await prisma.webcam.create({
        data: { ...s, order: i, camCount: s.cameras?.length || 0, cameras: s.cameras || undefined },
      });
      created++;
    }
  }
  console.log(`✅ Done. created=${created} updated=${updated}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
