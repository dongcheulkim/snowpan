import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 관리자 계정 생성
  const adminPassword = await bcrypt.hash('admin123!', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@snowprice.com',
      password: adminPassword,
      name: '관리자',
      phone: '01012345678',
      phoneVerified: true,
      role: 'admin',
    },
  });

  // 일반 사용자 계정 생성 (테스트용)
  const userPassword = await bcrypt.hash('user123!', 10);
  const user = await prisma.user.create({
    data: {
      email: 'user@test.com',
      password: userPassword,
      name: '김테스트',
      phone: '01087654321',
      phoneVerified: true,
      role: 'user',
    },
  });

  console.log('✅ 사용자 계정 생성 완료');

  // 스키장 데이터
  const resorts = await Promise.all([
    prisma.skiResort.create({
      data: {
        name: '용평리조트',
        location: '강원도 평창군',
        image: '🏔️',
      },
    }),
    prisma.skiResort.create({
      data: {
        name: '휘닉스평창',
        location: '강원도 평창군',
        image: '🏔️',
      },
    }),
    prisma.skiResort.create({
      data: {
        name: '하이원',
        location: '강원도 정선군',
        image: '🏔️',
      },
    }),
    prisma.skiResort.create({
      data: {
        name: '비발디파크',
        location: '강원도 홍천군',
        image: '🏔️',
      },
    }),
    prisma.skiResort.create({
      data: {
        name: '엘리시안강촌',
        location: '강원도 춘천시',
        image: '🏔️',
      },
    }),
  ]);

  console.log('✅ 스키장 데이터 생성 완료');

  // 새 장비 상품
  await Promise.all([
    prisma.product.create({
      data: {
        name: 'Rossignol Experience 88 Ti',
        brand: 'Rossignol',
        price: 890000,
        image: '🎿',
        category: 'new',
        description: '올마운틴 스키의 정석. 온슬로프와 오프피스테 모두 완벽한 퍼포먼스',
        rating: 4.8,
        reviewCount: 124,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Atomic Maverick 88',
        brand: 'Atomic',
        price: 850000,
        image: '🎿',
        category: 'new',
        description: '프리라이드와 카빙을 동시에 즐기는 올라운더',
        rating: 4.7,
        reviewCount: 98,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Salomon QST 92',
        brand: 'Salomon',
        price: 920000,
        image: '🎿',
        category: 'new',
        description: '파우더와 그루밍 슬로프를 자유자재로',
        rating: 4.9,
        reviewCount: 156,
      },
    }),
    prisma.product.create({
      data: {
        name: 'K2 Mindbender 99Ti',
        brand: 'K2',
        price: 950000,
        image: '🎿',
        category: 'new',
        description: '최고급 티타늄 소재의 프리라이드 스키',
        rating: 4.8,
        reviewCount: 89,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Burton Custom',
        brand: 'Burton',
        price: 720000,
        image: '🏂',
        category: 'new',
        description: '버튼의 베스트셀러 올마운틴 보드',
        rating: 4.9,
        reviewCount: 203,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Lib Tech T.Rice Pro',
        brand: 'Lib Tech',
        price: 780000,
        image: '🏂',
        category: 'new',
        description: '트래비스 라이스 시그니처 파우더 보드',
        rating: 4.8,
        reviewCount: 145,
      },
    }),
  ]);

  console.log('✅ 새 장비 상품 데이터 생성 완료');

  // 중고 장비 상품
  await Promise.all([
    prisma.product.create({
      data: {
        name: 'Rossignol Soul 7 (2022)',
        brand: 'Rossignol',
        price: 450000,
        image: '🎿',
        category: 'used',
        description: '2022년 모델, 깨끗한 상태',
        rating: 4.6,
        reviewCount: 32,
        condition: '상',
        usageCount: '5회',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Burton Custom (2021)',
        brand: 'Burton',
        price: 380000,
        image: '🏂',
        category: 'used',
        description: '2021년 모델, 약간의 사용감',
        rating: 4.4,
        reviewCount: 28,
        condition: '중',
        usageCount: '10회',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Atomic Vantage 90 (2023)',
        brand: 'Atomic',
        price: 520000,
        image: '🎿',
        category: 'used',
        description: '작년 모델, 거의 새것',
        rating: 4.7,
        reviewCount: 18,
        condition: '상',
        usageCount: '3회',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Salomon Assassin (2020)',
        brand: 'Salomon',
        price: 320000,
        image: '🏂',
        category: 'used',
        description: '2020년 모델, 사용감 있음',
        rating: 4.2,
        reviewCount: 24,
        condition: '중',
        usageCount: '15회',
      },
    }),
  ]);

  console.log('✅ 중고 장비 상품 데이터 생성 완료');

  // 렌탈 상품
  await Promise.all([
    prisma.rental.create({
      data: {
        name: '스키 풀세트',
        price: 45000,
        duration: '1일',
        equipment: '스키, 부츠, 폴',
        image: '⛷️',
        resortId: resorts[0].id, // 용평
        userId: user.id,
        approved: true, // 시드 데이터는 승인된 상태
      },
    }),
    prisma.rental.create({
      data: {
        name: '보드 풀세트',
        price: 40000,
        duration: '1일',
        equipment: '보드, 부츠',
        image: '🏂',
        resortId: resorts[0].id, // 용평
        userId: user.id,
        approved: true,
      },
    }),
    prisma.rental.create({
      data: {
        name: '스키 풀세트 (주말)',
        price: 55000,
        duration: '1일',
        equipment: '스키, 부츠, 폴',
        image: '⛷️',
        resortId: resorts[0].id, // 용평
        userId: user.id,
        approved: true,
      },
    }),
    prisma.rental.create({
      data: {
        name: '스키 풀세트',
        price: 42000,
        duration: '1일',
        equipment: '스키, 부츠, 폴',
        image: '⛷️',
        resortId: resorts[1].id, // 휘닉스
        userId: user.id,
        approved: true,
      },
    }),
    prisma.rental.create({
      data: {
        name: '보드 풀세트',
        price: 38000,
        duration: '1일',
        equipment: '보드, 부츠',
        image: '🏂',
        resortId: resorts[1].id, // 휘닉스
        userId: user.id,
        approved: true,
      },
    }),
    prisma.rental.create({
      data: {
        name: '스키 풀세트',
        price: 48000,
        duration: '1일',
        equipment: '스키, 부츠, 폴, 헬멧',
        image: '⛷️',
        resortId: resorts[2].id, // 하이원
        userId: user.id,
        approved: true,
      },
    }),
    prisma.rental.create({
      data: {
        name: '보드 풀세트',
        price: 43000,
        duration: '1일',
        equipment: '보드, 부츠, 헬멧',
        image: '🏂',
        resortId: resorts[2].id, // 하이원
        userId: user.id,
        approved: true,
      },
    }),
    prisma.rental.create({
      data: {
        name: '스키 풀세트',
        price: 40000,
        duration: '1일',
        equipment: '스키, 부츠, 폴',
        image: '⛷️',
        resortId: resorts[3].id, // 비발디
        userId: user.id,
        approved: true,
      },
    }),
    prisma.rental.create({
      data: {
        name: '보드 풀세트',
        price: 35000,
        duration: '1일',
        equipment: '보드, 부츠',
        image: '🏂',
        resortId: resorts[3].id, // 비발디
        userId: user.id,
        approved: true,
      },
    }),
  ]);

  console.log('✅ 렌탈 데이터 생성 완료');

  // 레슨 상품
  await Promise.all([
    prisma.lesson.create({
      data: {
        name: '스키 그룹레슨 (초급)',
        price: 80000,
        duration: '2시간',
        level: 'beginner',
        maxStudents: 8,
        image: '⛷️',
        resortId: resorts[0].id, // 용평
        userId: user.id,
        approved: true,
      },
    }),
    prisma.lesson.create({
      data: {
        name: '스키 개인레슨 (중급)',
        price: 150000,
        duration: '2시간',
        level: 'intermediate',
        maxStudents: 1,
        image: '⛷️',
        resortId: resorts[0].id, // 용평
        userId: user.id,
        approved: true,
      },
    }),
    prisma.lesson.create({
      data: {
        name: '보드 그룹레슨 (초급)',
        price: 75000,
        duration: '2시간',
        level: 'beginner',
        maxStudents: 6,
        image: '🏂',
        resortId: resorts[0].id, // 용평
        userId: user.id,
        approved: true,
      },
    }),
    prisma.lesson.create({
      data: {
        name: '스키 그룹레슨 (초급)',
        price: 75000,
        duration: '2시간',
        level: 'beginner',
        maxStudents: 8,
        image: '⛷️',
        resortId: resorts[1].id, // 휘닉스
        userId: user.id,
        approved: true,
      },
    }),
    prisma.lesson.create({
      data: {
        name: '스키 개인레슨 (상급)',
        price: 180000,
        duration: '2시간',
        level: 'advanced',
        maxStudents: 1,
        image: '⛷️',
        resortId: resorts[1].id, // 휘닉스
        userId: user.id,
        approved: true,
      },
    }),
    prisma.lesson.create({
      data: {
        name: '보드 그룹레슨 (중급)',
        price: 90000,
        duration: '2시간',
        level: 'intermediate',
        maxStudents: 6,
        image: '🏂',
        resortId: resorts[1].id, // 휘닉스
        userId: user.id,
        approved: true,
      },
    }),
    prisma.lesson.create({
      data: {
        name: '스키 그룹레슨 (초급)',
        price: 85000,
        duration: '2시간',
        level: 'beginner',
        maxStudents: 10,
        image: '⛷️',
        resortId: resorts[2].id, // 하이원
        userId: user.id,
        approved: true,
      },
    }),
    prisma.lesson.create({
      data: {
        name: '보드 개인레슨 (초급)',
        price: 140000,
        duration: '2시간',
        level: 'beginner',
        maxStudents: 1,
        image: '🏂',
        resortId: resorts[2].id, // 하이원
        userId: user.id,
        approved: true,
      },
    }),
    prisma.lesson.create({
      data: {
        name: '스키 그룹레슨 (초급)',
        price: 70000,
        duration: '2시간',
        level: 'beginner',
        maxStudents: 8,
        image: '⛷️',
        resortId: resorts[3].id, // 비발디
        userId: user.id,
        approved: true,
      },
    }),
    prisma.lesson.create({
      data: {
        name: '보드 그룹레슨 (초급)',
        price: 70000,
        duration: '2시간',
        level: 'beginner',
        maxStudents: 6,
        image: '🏂',
        resortId: resorts[3].id, // 비발디
        userId: user.id,
        approved: true,
      },
    }),
  ]);

  console.log('✅ 레슨 데이터 생성 완료');
  console.log('🎉 모든 시드 데이터 생성이 완료되었습니다!');
}

main()
  .catch((e) => {
    console.error('❌ 시드 데이터 생성 중 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
