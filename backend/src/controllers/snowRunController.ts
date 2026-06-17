// 스노우런 트래킹 — 클라이언트가 GPS 로 측정한 런 1회를 받아 검증/포인트 지급.
// Phase 0 검증: 합리적 범위 + 일일 캡. Phase 1: 슬로프 폴리곤 매칭.

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { awardPoints } from '../utils/points';

// Phase 0 검증 한계치 — 너무 빡빡하면 정상 유저가 막힘, 너무 헐겁면 부정 사용 통과.
const LIMITS = {
  minDurationSec: 30,        // 30초 미만은 런으로 보지 않음
  maxDurationSec: 30 * 60,   // 30분 초과는 한 런이 아닌 묶음 — 거부
  minVerticalDropM: 20,      // 낙차 20m 미만은 무효 (평지 이동)
  maxVerticalDropM: 1500,    // 세계 최장 슬로프도 약 1300m — 그 이상은 GPS 오류/부정
  minDistanceM: 100,         // 100m 미만은 무효
  maxDistanceM: 15000,       // 15km 초과 한 런은 비현실적
  maxAvgSpeedKmh: 120,       // 슬로프 평균 속도 한계 (월드컵 다운힐 평균 ~120km/h)
  maxMaxSpeedKmh: 200,       // 최고 속도 한계 (월드 레코드 보호)
};

const POINTS_PER_RUN = 100;
const DAILY_RUN_REWARD_CAP = 10; // 하루 10회까지만 포인트 지급 (이후 기록만)

interface SubmitRunBody {
  startedAt: string;
  endedAt: string;
  distanceM: number;
  verticalDropM: number;
  maxSpeedKmh?: number;
  avgSpeedKmh?: number;
  source?: 'web_gps' | 'app_gps' | 'manual';
}

export const submitRun = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const body = req.body as Partial<SubmitRunBody>;

    if (
      typeof body.startedAt !== 'string' ||
      typeof body.endedAt !== 'string' ||
      typeof body.distanceM !== 'number' ||
      typeof body.verticalDropM !== 'number'
    ) {
      res.status(400).json({ error: '입력 형식이 올바르지 않습니다.' });
      return;
    }

    const startedAt = new Date(body.startedAt);
    const endedAt = new Date(body.endedAt);
    if (isNaN(startedAt.getTime()) || isNaN(endedAt.getTime()) || endedAt <= startedAt) {
      res.status(400).json({ error: '시작/종료 시각이 올바르지 않습니다.' });
      return;
    }

    const durationSec = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
    const distanceM = Math.round(body.distanceM);
    const verticalDropM = Math.round(body.verticalDropM);
    const maxSpeedKmh = typeof body.maxSpeedKmh === 'number' ? body.maxSpeedKmh : null;
    const avgSpeedKmh = typeof body.avgSpeedKmh === 'number' ? body.avgSpeedKmh : null;
    const source = body.source && ['web_gps', 'app_gps', 'manual'].includes(body.source) ? body.source : 'web_gps';

    // === 검증 ===
    const reasons: string[] = [];
    if (durationSec < LIMITS.minDurationSec) reasons.push(`지속시간 ${LIMITS.minDurationSec}초 미만`);
    if (durationSec > LIMITS.maxDurationSec) reasons.push(`지속시간 ${LIMITS.maxDurationSec}초 초과`);
    if (verticalDropM < LIMITS.minVerticalDropM) reasons.push(`낙차 ${LIMITS.minVerticalDropM}m 미만`);
    if (verticalDropM > LIMITS.maxVerticalDropM) reasons.push(`낙차 ${LIMITS.maxVerticalDropM}m 초과`);
    if (distanceM < LIMITS.minDistanceM) reasons.push(`거리 ${LIMITS.minDistanceM}m 미만`);
    if (distanceM > LIMITS.maxDistanceM) reasons.push(`거리 ${LIMITS.maxDistanceM}m 초과`);
    if (avgSpeedKmh !== null && avgSpeedKmh > LIMITS.maxAvgSpeedKmh) reasons.push('평균 속도 비현실적');
    if (maxSpeedKmh !== null && maxSpeedKmh > LIMITS.maxMaxSpeedKmh) reasons.push('최고 속도 비현실적');

    // 같은 시간대 중복 제출 차단 (같은 런을 두 번 보내는 경우).
    const overlapping = await prisma.snowRun.findFirst({
      where: {
        userId,
        OR: [
          { startedAt: { lte: endedAt }, endedAt: { gte: startedAt } },
        ],
      },
      select: { id: true },
    });
    if (overlapping) reasons.push('동일 시간대 런 기록 존재');

    const validated = reasons.length === 0;

    // 일일 캡 — 자정 기준 user 의 validated 런 수.
    let pointsToAward = 0;
    if (validated) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todayCount = await prisma.snowRun.count({
        where: { userId, validated: true, createdAt: { gte: startOfDay } },
      });
      if (todayCount < DAILY_RUN_REWARD_CAP) {
        pointsToAward = POINTS_PER_RUN;
      }
    }

    // SnowRun 기록 + 포인트 지급을 한 트랜잭션으로.
    const result = await prisma.$transaction(async (tx) => {
      const run = await tx.snowRun.create({
        data: {
          userId,
          startedAt,
          endedAt,
          durationSec,
          distanceM,
          verticalDropM,
          maxSpeedKmh,
          avgSpeedKmh,
          source,
          validated,
          pointsAwarded: pointsToAward,
        },
      });

      let newBalance: number | null = null;
      if (pointsToAward > 0) {
        const r = await awardPoints(tx, {
          userId,
          amount: pointsToAward,
          source: 'snow_run',
          refId: run.id,
          description: `스노우런 1회 (${(distanceM / 1000).toFixed(1)}km, 낙차 ${verticalDropM}m)`,
        });
        newBalance = r.balance;
      }

      return { run, newBalance };
    });

    res.status(201).json({
      run: result.run,
      pointsAwarded: pointsToAward,
      balance: result.newBalance,
      validated,
      rejectionReasons: validated ? undefined : reasons,
      message: validated
        ? pointsToAward > 0
          ? `런 검증 완료 — ${pointsToAward}P 적립`
          : '런 기록됨 (오늘 적립 한도 초과)'
        : '런 기록됨 (검증 미통과 — 포인트 미지급)',
    });
  } catch (err) {
    console.error('Submit run error:', err);
    res.status(500).json({ error: '런 기록 중 오류가 발생했습니다.' });
  }
};

export const myRuns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(String(req.query.limit || '30'), 10) || 30, 100);
    const cursor = req.query.cursor as string | undefined;

    const runs = await prisma.snowRun.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = runs.length > limit;
    const items = hasMore ? runs.slice(0, limit) : runs;
    res.json({
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    console.error('My runs error:', err);
    res.status(500).json({ error: '런 이력 조회 중 오류가 발생했습니다.' });
  }
};

export const myStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // 시즌 시작 — 매년 11/1 기준 (다음 해 4월까지).
    const now = new Date();
    const seasonYear = now.getMonth() >= 10 ? now.getFullYear() : now.getFullYear() - 1;
    const seasonStart = new Date(seasonYear, 10, 1); // 11월 = month 10

    const [allTime, season, today] = await Promise.all([
      prisma.snowRun.aggregate({
        where: { userId, validated: true },
        _count: { _all: true },
        _sum: { distanceM: true, verticalDropM: true, durationSec: true, pointsAwarded: true },
        _max: { maxSpeedKmh: true },
      }),
      prisma.snowRun.aggregate({
        where: { userId, validated: true, createdAt: { gte: seasonStart } },
        _count: { _all: true },
        _sum: { distanceM: true, verticalDropM: true, pointsAwarded: true },
      }),
      prisma.snowRun.count({
        where: { userId, validated: true, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);

    res.json({
      allTime: {
        runCount: allTime._count._all,
        totalDistanceKm: ((allTime._sum.distanceM || 0) / 1000).toFixed(1),
        totalVerticalDropM: allTime._sum.verticalDropM || 0,
        totalDurationSec: allTime._sum.durationSec || 0,
        totalPoints: allTime._sum.pointsAwarded || 0,
        maxSpeedKmh: allTime._max.maxSpeedKmh,
      },
      season: {
        year: `${seasonYear}-${seasonYear + 1}`,
        runCount: season._count._all,
        totalDistanceKm: ((season._sum.distanceM || 0) / 1000).toFixed(1),
        totalVerticalDropM: season._sum.verticalDropM || 0,
        totalPoints: season._sum.pointsAwarded || 0,
      },
      today: {
        runCount: today,
        remainingRewardable: Math.max(0, DAILY_RUN_REWARD_CAP - today),
      },
    });
  } catch (err) {
    console.error('My stats error:', err);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.' });
  }
};
