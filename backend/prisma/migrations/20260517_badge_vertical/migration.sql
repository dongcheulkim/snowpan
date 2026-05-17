-- 뱃지 요청에 vertical 컬럼 추가 — 종목별 전문성 분리.
-- 기존 데이터는 모두 'snow' 로 처리 (SNOWPAN 단일 vertical 시기).
ALTER TABLE "badge_requests" ADD COLUMN IF NOT EXISTS "vertical" TEXT NOT NULL DEFAULT 'snow';

-- 특정 vertical 내 사용자 뱃지 조회 가속 (UserBadges 컴포넌트가 SNOWPAN 안에서는 snow 뱃지만 노출)
CREATE INDEX IF NOT EXISTS "badge_requests_userId_vertical_idx" ON "badge_requests"("userId", "vertical");
