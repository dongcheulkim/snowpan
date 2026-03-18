import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 관리자 계정 생성
  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@snowpan.com' } });
  if (!adminExists) {
    const adminPassword = await bcrypt.hash('rlaehdcjf12!', 10);
    await prisma.user.create({
      data: {
        email: 'admin@snowpan.com',
        password: adminPassword,
        name: '관리자',
        phone: '01012345678',
        phoneVerified: true,
        role: 'admin',
      },
    });
    console.log('✅ 관리자 계정 생성 완료');
  } else {
    console.log('ℹ️ 관리자 계정 이미 존재');
  }

  // 스키장 데이터
  const resortData = [
    { name: '용평리조트', location: '강원도 평창군' },
    { name: '휘닉스평창', location: '강원도 평창군' },
    { name: '하이원', location: '강원도 정선군' },
    { name: '비발디파크', location: '강원도 홍천군' },
    { name: '엘리시안강촌', location: '강원도 춘천시' },
    { name: '웰리힐리파크', location: '강원도 횡성군' },
    { name: '오투리조트', location: '강원도 태백시' },
    { name: '알펜시아', location: '강원도 평창군' },
    { name: '곤지암리조트', location: '경기도 광주시' },
    { name: '지산리조트', location: '경기도 이천시' },
    { name: '무주덕유산', location: '전북 무주군' },
    { name: '오크밸리', location: '강원도 원주시' },
    { name: '에덴밸리', location: '경남 양산시' },
  ];

  for (const resort of resortData) {
    const exists = await prisma.skiResort.findFirst({ where: { name: resort.name } });
    if (!exists) {
      await prisma.skiResort.create({ data: { ...resort, image: '🏔️' } });
    }
  }

  console.log('✅ 스키장 데이터 생성 완료');
  console.log('🎉 시드 완료!');
}

main()
  .catch((e) => {
    console.error('❌ 시드 데이터 생성 중 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
