-- 부하 테스트용 벌크 시드 — 테스트 DB 전용 (run.sh 의 snowpan_test 에만 사용).
-- 유저 300, 중고매물 2000, 커뮤니티 글 500, 채팅 100방 x 60메시지, 알림 2000.
-- 실서비스 초기~성장기 규모를 흉내내 목록·검색·카운트 쿼리의 실제 비용을 드러냄.

-- 유저 300 (loaduser_1..300)
INSERT INTO users (id, email, name, nickname, phone, password, "updatedAt")
SELECT
  'loaduser-'||i,
  'loaduser_'||i||'@load.test',
  '부하유저'||i,
  '부하닉'||i,
  'load'||lpad(i::text, 8, '0'),
  '$2a$12$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUV1234567890ab',
  now()
FROM generate_series(1, 300) i
ON CONFLICT (id) DO NOTHING;

-- 중고매물 2000 (판매중, 브랜드·길이 분포)
INSERT INTO products (id, name, brand, price, image, category, subcategory, description, status, length, "userId", vertical, "createdAt", "updatedAt")
SELECT
  'loadprod-'||i,
  '부하매물 '||(ARRAY['살로몬','아토믹','로시뇰','헤드','피셔'])[1 + i % 5]||' 스키 '||(150 + i % 40),
  (ARRAY['Salomon','Atomic','Rossignol','Head','Fischer'])[1 + i % 5],
  50000 + (i % 100) * 10000,
  '/uploads/load.jpg',
  'used',
  (ARRAY['ski','board','boots','wear','etc'])[1 + i % 5],
  '부하 테스트 매물 설명 '||i,
  'selling',
  (150 + i % 40)||'cm',
  'loaduser-'||(1 + i % 300),
  'snow',
  now() - (i || ' minutes')::interval,
  now() - (i || ' minutes')::interval
FROM generate_series(1, 2000) i
ON CONFLICT (id) DO NOTHING;

-- 커뮤니티 글 500
INSERT INTO posts (id, title, content, category, sport, "userId", "createdAt", "updatedAt")
SELECT
  'loadpost-'||i,
  '부하 글 제목 '||i,
  '부하 테스트 본문 내용입니다 '||repeat('내용 ', 20)||i,
  (ARRAY['free','review','tip','job','gear'])[1 + i % 5],
  'ski',
  'loaduser-'||(1 + i % 300),
  now() - (i || ' minutes')::interval,
  now() - (i || ' minutes')::interval
FROM generate_series(1, 500) i
ON CONFLICT (id) DO NOTHING;

-- 채팅 100방 (user1 = loaduser-1 고정 — 한 유저의 목록 조회가 무겁도록) x 60메시지
INSERT INTO chat_rooms (id, "user1Id", "user2Id", "user1LastReadAt", "updatedAt", "createdAt")
SELECT
  'loadroom-'||i,
  'loaduser-1',
  'loaduser-'||(i + 1),
  CASE WHEN i % 2 = 0 THEN now() - interval '30 minutes' ELSE NULL END,
  now() - (i || ' seconds')::interval,
  now() - (i || ' hours')::interval
FROM generate_series(1, 100) i
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, content, "roomId", "senderId", "createdAt")
SELECT
  'loadmsg-'||r||'-'||m,
  '부하 메시지 '||m,
  'loadroom-'||r,
  CASE WHEN m % 2 = 0 THEN 'loaduser-1' ELSE 'loaduser-'||(r + 1) END,
  now() - ((6000 - r * 60 - m) || ' minutes')::interval
FROM generate_series(1, 100) r, generate_series(1, 60) m
ON CONFLICT (id) DO NOTHING;

-- 알림 2000 (loaduser-1 에 몰림)
INSERT INTO notifications (id, type, title, message, "userId", "createdAt")
SELECT
  'loadnotif-'||i,
  'system',
  '부하 알림 '||i,
  '부하 테스트 알림 본문 '||i,
  'loaduser-'||(1 + i % 10),
  now() - (i || ' minutes')::interval
FROM generate_series(1, 2000) i
ON CONFLICT (id) DO NOTHING;

SELECT 'users' t, count(*) FROM users WHERE id LIKE 'loaduser-%'
UNION ALL SELECT 'products', count(*) FROM products WHERE id LIKE 'loadprod-%'
UNION ALL SELECT 'posts', count(*) FROM posts WHERE id LIKE 'loadpost-%'
UNION ALL SELECT 'rooms', count(*) FROM chat_rooms WHERE id LIKE 'loadroom-%'
UNION ALL SELECT 'messages', count(*) FROM messages WHERE id LIKE 'loadmsg-%';
