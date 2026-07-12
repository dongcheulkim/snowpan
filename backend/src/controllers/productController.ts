import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { cacheGet, cacheSet, cacheDelPrefix, cacheDel } from '../utils/cache';
import { createNotification } from './notificationController';
import { sendPushToUser } from '../utils/push';
import { sanitizeText } from '../utils/sanitize';
import { parsePrice, isAllowedImageUrl } from '../utils/validate';
import { pickVertical } from '../utils/vertical';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, subcategory, userId, status, search, limit, offset, sort, vertical } = req.query;
    // ?vertical=X 없으면 'snow' default (역호환). 잘못된 값은 거절.
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    const keyParts: Record<string, string> = { vertical: verticalSlug };
    if (category) keyParts.category = String(category);
    if (subcategory) keyParts.subcategory = String(subcategory);
    if (userId) keyParts.userId = String(userId);
    if (status) keyParts.status = String(status);
    if (search) keyParts.search = String(search);
    if (limit) keyParts.limit = String(limit);
    if (offset) keyParts.offset = String(offset);
    if (sort) keyParts.sort = String(sort);
    const sortedKey = Object.keys(keyParts).sort().map(k => `${k}=${keyParts[k]}`).join('&');
    const cacheKey = `products:${sortedKey}`;

    const cached = cacheGet<{ products: unknown[]; totalCount: number }>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const where: Prisma.ProductWhereInput = { vertical: verticalSlug };
    if (category) where.category = category as string;
    if (subcategory) where.subcategory = subcategory as string;
    if (userId) where.userId = userId as string;
    if (status) where.status = status as string;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // limit/offset 검증 — 잘못된 값(예: ?limit=abc)이 parseInt→NaN→Prisma 예외→500 나는 것 방지.
    // 유효하지 않으면 400, 유효하면 take 는 1~100 으로 clamp (과도한 take 로 인한 DB 부하 차단).
    let take = 50;
    if (limit !== undefined) {
      const n = Number(limit);
      if (!Number.isInteger(n) || n < 1) {
        res.status(400).json({ error: 'limit 은 1 이상의 정수여야 합니다.' });
        return;
      }
      take = Math.min(n, 100);
    }
    let skip: number | undefined = undefined;
    if (offset !== undefined) {
      const n = Number(offset);
      if (!Number.isInteger(n) || n < 0) {
        res.status(400).json({ error: 'offset 은 0 이상의 정수여야 합니다.' });
        return;
      }
      skip = n;
    }

    const primary = [
      { isPremium: { sort: 'desc' as const, nulls: 'last' as const } },
      { bumpedAt: { sort: 'desc' as const, nulls: 'last' as const } },
    ];
    const tail =
      sort === 'price_asc' ? { price: 'asc' as const }
      : sort === 'price_desc' ? { price: 'desc' as const }
      : { createdAt: 'desc' as const };
    const orderBy = [...primary, tail];

    const productSelect = {
      id: true, name: true, price: true, image: true, brand: true,
      subcategory: true, status: true, isPremium: true, bumpedAt: true,
      createdAt: true, category: true, length: true, size: true,
    };

    const skipN = skip || 0;
    let products: unknown[];
    let totalCount: number;

    // status 를 명시 필터하면 그대로 (예: 판매완료만 보기). 아니면 판매완료를 맨 뒤로.
    if (status) {
      [products, totalCount] = await Promise.all([
        prisma.product.findMany({ where, orderBy, take, skip: skipN, select: productSelect }),
        prisma.product.count({ where }),
      ]);
    } else {
      // 활성(판매중·예약중) 먼저, 판매완료(sold) 나중 — 두 그룹으로 나눠 offset 페이징 안전하게.
      const activeWhere = { ...where, status: { not: 'sold' } };
      const soldWhere = { ...where, status: 'sold' };
      const [activeCount, soldCount] = await Promise.all([
        prisma.product.count({ where: activeWhere }),
        prisma.product.count({ where: soldWhere }),
      ]);
      totalCount = activeCount + soldCount;

      const rows: unknown[] = [];
      if (skipN < activeCount) {
        // 이 페이지가 활성 구간에서 시작. 활성에서 채우고 모자라면 판매완료로 이어붙임.
        const activeRows = await prisma.product.findMany({ where: activeWhere, orderBy, take, skip: skipN, select: productSelect });
        rows.push(...activeRows);
        if (rows.length < take) {
          const soldRows = await prisma.product.findMany({ where: soldWhere, orderBy, take: take - rows.length, skip: 0, select: productSelect });
          rows.push(...soldRows);
        }
      } else {
        // 활성 구간을 이미 지남 → 판매완료 구간에서 조회.
        const soldRows = await prisma.product.findMany({ where: soldWhere, orderBy, take, skip: skipN - activeCount, select: productSelect });
        rows.push(...soldRows);
      }
      products = rows;
    }

    const result = { products, totalCount };
    cacheSet(cacheKey, result, 10); // Cache for 10 seconds
    res.json(result);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: '상품 조회 중 오류가 발생했습니다.' });
  }
};

// 홈 인기중고매물 (경량 API - count 쿼리 없음, 캐시 60초)
export const getHotDeals = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'home:hotdeals';
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const products = await prisma.product.findMany({
      where: { category: 'used' },
      orderBy: [{ isPremium: { sort: 'desc', nulls: 'last' } }, { bumpedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 3,
      select: {
        id: true,
        name: true,
        price: true,
        image: true,
        status: true,
        createdAt: true,
      },
    });

    cacheSet(cacheKey, products, 60);
    res.json(products);
  } catch (error) {
    console.error('Get hot deals error:', error);
    res.status(500).json({ error: '인기매물 조회 중 오류가 발생했습니다.' });
  }
};

// 시세 통계 — 같은 subcategory + brand (선택) 기준 최근 6개월간 등록된 중고 매물의 가격 분포.
// 등록자가 가격 정할 때, 구매자가 비싼지 싼지 판단할 때 사용.
export const getMarketStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subcategory, brand } = req.query;
    if (!subcategory || typeof subcategory !== 'string') {
      res.status(400).json({ error: 'subcategory는 필수입니다.' });
      return;
    }

    const cacheKey = `market:${subcategory}:${brand || ''}`;
    const cached = cacheGet<any>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const where: any = {
      category: 'used',
      subcategory,
      createdAt: { gte: sixMonthsAgo },
    };
    if (brand && typeof brand === 'string' && brand.trim()) {
      where.brand = { equals: brand.trim(), mode: 'insensitive' };
    }

    const items = await prisma.product.findMany({
      where,
      select: { price: true },
    });

    if (items.length < 3) {
      const result = { count: items.length, available: false };
      cacheSet(cacheKey, result, 300);
      res.json(result);
      return;
    }

    const prices = items.map((p) => p.price).sort((a, b) => a - b);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / prices.length);
    const median = prices[Math.floor(prices.length / 2)];
    const min = prices[0];
    const max = prices[prices.length - 1];
    const p25 = prices[Math.floor(prices.length * 0.25)];
    const p75 = prices[Math.floor(prices.length * 0.75)];

    const result = {
      available: true,
      count: prices.length,
      avg,
      median,
      min,
      max,
      p25,
      p75,
      windowDays: 180,
    };
    cacheSet(cacheKey, result, 600);
    res.json(result);
  } catch (error) {
    console.error('Get market stats error:', error);
    res.status(500).json({ error: '시세 조회 중 오류가 발생했습니다.' });
  }
};

// 중고 장비 등록 (로그인 필요)
export const createUsedProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, brand, subcategory, price, image, images, description, condition, usageCount, length, radius, flex, size, vertical } = req.body;
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }

    if (!name || !image) {
      res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
      return;
    }
    if (!isAllowedImageUrl(image)) {
      res.status(400).json({ error: '이미지는 사이트 업로드 또는 Cloudinary 만 허용됩니다.' });
      return;
    }
    // images 콤마 구분 문자열 각 URL 도 검증 — 저장형 XSS 방지.
    if (images) {
      if (typeof images !== 'string') {
        res.status(400).json({ error: '이미지 형식이 올바르지 않습니다.' });
        return;
      }
      const urls = images.split(',').map(s => s.trim()).filter(Boolean);
      if (urls.length > 10) {
        res.status(400).json({ error: '이미지는 최대 10장까지 업로드할 수 있습니다.' });
        return;
      }
      for (const u of urls) {
        if (!isAllowedImageUrl(u)) {
          res.status(400).json({ error: '허용되지 않은 이미지 URL 이 포함되어 있습니다.' });
          return;
        }
      }
    }
    const priceResult = parsePrice(price);
    if (!priceResult.ok) {
      res.status(400).json({ error: priceResult.error });
      return;
    }

    const cleanName = sanitizeText(name, 100);
    const cleanDescription = sanitizeText(description, 5000);
    if (!cleanName) { res.status(400).json({ error: '상품명을 입력해주세요.' }); return; }

    const product = await prisma.product.create({
      data: {
        name: cleanName,
        brand: sanitizeText(brand, 60) || '',
        subcategory: subcategory || null,
        price: priceResult.value,
        image,
        images: images || null,
        category: 'used',
        vertical: verticalSlug,
        description: cleanDescription,
        condition: sanitizeText(condition, 20),
        length: sanitizeText(length, 30) || null,
        radius: sanitizeText(radius, 30) || null,
        flex: sanitizeText(flex, 30) || null,
        size: sanitizeText(size, 30) || null,
        usageCount: sanitizeText(usageCount, 30),
        userId,
      },
      include: { user: { select: { id: true, name: true, nickname: true } } },
    });

    cacheDelPrefix('products:');    cacheDelPrefix('market:');
    cacheDel('home:hotdeals');
    res.status(201).json(product);
  } catch (error) {
    console.error('Create used product error:', error);
    res.status(500).json({ error: '중고 장비 등록 중 오류가 발생했습니다.' });
  }
};

// 새 장비 등록 (관리자만)
export const createNewProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: '관리자만 새 장비를 등록할 수 있습니다.' });
      return;
    }

    const { name, brand, price, image, description, rating, reviewCount } = req.body;
    const priceResult = parsePrice(price);
    if (!priceResult.ok) {
      res.status(400).json({ error: priceResult.error });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name, brand, price: priceResult.value, image, category: 'new', description,
        rating: rating ? parseFloat(rating) : undefined,
        reviewCount: reviewCount ? parseInt(reviewCount) : undefined,
      },
    });

    cacheDelPrefix('products:');    cacheDelPrefix('market:');
    cacheDel('home:hotdeals');
    res.status(201).json(product);
  } catch (error) {
    console.error('Create new product error:', error);
    res.status(500).json({ error: '새 장비 등록 중 오류가 발생했습니다.' });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 토큰에서 userId 추출 (선택적 - 찜 여부 확인)
    let currentUserId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!, {
          algorithms: ['HS256'],
          ignoreExpiration: false,
        }) as { userId: string; type?: string };
        if (!decoded.type || decoded.type === 'access') currentUserId = decoded.userId;
      } catch { /* 만료/위조 토큰은 비로그인 처리 */ }
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, nickname: true } },
        _count: { select: { wishlists: true } }, // 찜 개수
      },
    });

    if (!product) {
      res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      return;
    }

    // 조회수 증가 — 본인 매물 조회는 제외 (자기 조회로 카운트 부풀리지 않게).
    // 응답엔 증가 후 값을 반영해서 보여줌.
    let viewCount = product.viewCount;
    if (currentUserId !== product.userId) {
      viewCount = product.viewCount + 1;
      prisma.product.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    }

    let wishlisted = false;
    if (currentUserId) {
      const existing = await prisma.wishlist.findUnique({
        where: { userId_productId: { userId: currentUserId, productId: id } },
      });
      wishlisted = !!existing;
    }

    const { _count, ...rest } = product;
    res.json({ ...rest, viewCount, wishlistCount: _count.wishlists, wishlisted });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: '상품 조회 중 오류가 발생했습니다.' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) { res.status(404).json({ error: '상품을 찾을 수 없습니다.' }); return; }
    if (product.userId !== userId && req.user!.role !== 'admin') { res.status(403).json({ error: '수정 권한이 없습니다.' }); return; }

    const { name, brand, subcategory, price, image, images, description, condition, usageCount, status, length, radius, flex, size } = req.body;
    let priceUpdate: number | undefined;
    if (price !== undefined && price !== null && price !== '') {
      const priceResult = parsePrice(price);
      if (!priceResult.ok) {
        res.status(400).json({ error: priceResult.error });
        return;
      }
      priceUpdate = priceResult.value;
    }
    // 업데이트 시에도 이미지 URL 검증 (저장형 XSS 방지)
    if (image && !isAllowedImageUrl(image)) {
      res.status(400).json({ error: '이미지는 사이트 업로드 또는 Cloudinary 만 허용됩니다.' });
      return;
    }
    if (images !== undefined && images !== null && images !== '') {
      if (typeof images !== 'string') {
        res.status(400).json({ error: '이미지 형식이 올바르지 않습니다.' });
        return;
      }
      const urls = images.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (urls.length > 10) {
        res.status(400).json({ error: '이미지는 최대 10장까지 업로드할 수 있습니다.' });
        return;
      }
      for (const u of urls) {
        if (!isAllowedImageUrl(u)) {
          res.status(400).json({ error: '허용되지 않은 이미지 URL 이 포함되어 있습니다.' });
          return;
        }
      }
    }
    const oldPrice = product.price;
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name: sanitizeText(name, 100) }),
        ...(brand !== undefined && { brand: sanitizeText(brand, 60) || '' }),
        ...(subcategory !== undefined && { subcategory }),
        ...(priceUpdate !== undefined && { price: priceUpdate }),
        ...(image && { image }),
        ...(images !== undefined && { images }),
        ...(description !== undefined && { description: sanitizeText(description, 5000) }),
        ...(condition && { condition: sanitizeText(condition, 20) }),
        ...(usageCount !== undefined && { usageCount: sanitizeText(usageCount, 30) }),
        ...(status && ['selling', 'reserved', 'sold'].includes(status) && { status }),
        ...(length !== undefined && { length: sanitizeText(length, 30) || null }),
        ...(radius !== undefined && { radius: sanitizeText(radius, 30) || null }),
        ...(flex !== undefined && { flex: sanitizeText(flex, 30) || null }),
        ...(size !== undefined && { size: sanitizeText(size, 30) || null }),
      },
    });

    // 가격 인하 시 찜한 유저들에게 알림 — 5% 이상 인하만 (사소한 변경 스팸 방지).
    // DB 알림 + Socket.IO 실시간 푸시 + 모바일 푸시 전부 발송.
    const newPrice = updated.price;
    if (newPrice < oldPrice && (oldPrice - newPrice) / oldPrice >= 0.05) {
      const wishlists = await prisma.wishlist.findMany({ where: { productId: id }, select: { userId: true } });
      const discount = Math.round((1 - newPrice / oldPrice) * 100);
      const title = '찜한 상품 가격 인하';
      const body = `${discount}%↓ ${updated.name} (${oldPrice.toLocaleString()}원 → ${newPrice.toLocaleString()}원)`;
      const link = `/used/${id}`;
      const io = req.app.get('io');
      for (const w of wishlists) {
        if (w.userId === userId) continue; // 본인이 가격 내린 거면 본인에게 알림 X
        await createNotification(w.userId, 'system', title, body, link);
        if (io) io.to(`user:${w.userId}`).emit('new_notification', { type: 'price_drop', title, message: body, link });
        sendPushToUser(w.userId, title, body, link);
      }
    }

    // 판매완료 시 프리미엄 자동 해제 (잔여 기간 소멸, 환불 없음)
    if (updated.status === 'sold' && updated.isPremium) {
      await prisma.product.update({
        where: { id },
        data: { isPremium: false, premiumUntil: null },
      });
    }
    // 판매완료 시 상품과 연결된 프리미엄 광고 예약 종료 + 배너 제거
    if (updated.status === 'sold') {
      const relatedBookings = await prisma.adBooking.findMany({
        where: {
          slotType: 'premium',
          status: { in: ['active', 'paid', 'pending_payment'] },
          url: { contains: id },
        },
      });
      for (const b of relatedBookings) {
        await prisma.adBooking.update({
          where: { id: b.id },
          data: { status: 'completed', adminNote: '상품 판매 완료로 자동 종료' },
        });
        await prisma.banner.deleteMany({ where: { tag: `ad:${b.id}` } });
      }
      if (relatedBookings.length > 0) cacheDel('banners:public');
    }

    // 판매완료로 전환 시: 해당 상품에 대해 product_inquiry 메시지를 보낸 구매자들에게 리뷰 요청 알림
    if (updated.status === 'sold' && product.status !== 'sold') {
      try {
        const inquiryMessages = await prisma.message.findMany({
          where: {
            type: 'product_inquiry',
            content: { contains: id },
          },
          select: { senderId: true, roomId: true },
        });
        const buyerIds = new Set<string>();
        for (const m of inquiryMessages) {
          if (m.senderId !== updated.userId) buyerIds.add(m.senderId);
        }
        for (const buyerId of buyerIds) {
          await createNotification(
            buyerId,
            'system',
            '거래 완료 — 판매자 평가해주세요',
            `"${updated.name}" 상품이 판매완료되었습니다. 판매자에게 리뷰를 남겨보세요.`,
            `/seller/${updated.userId}`
          );
        }
      } catch (e) {
        console.error('Sold notification error:', e);
      }
    }

    cacheDelPrefix('products:');    cacheDelPrefix('market:');
    cacheDel('home:hotdeals');
    res.json(updated);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: '상품 수정 중 오류가 발생했습니다.' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) { res.status(404).json({ error: '상품을 찾을 수 없습니다.' }); return; }
    if (product.userId !== userId && req.user!.role !== 'admin') { res.status(403).json({ error: '삭제 권한이 없습니다.' }); return; }

    await prisma.product.delete({ where: { id } });
    cacheDelPrefix('products:');    cacheDelPrefix('market:');
    cacheDel('home:hotdeals');
    res.json({ message: '상품이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: '상품 삭제 중 오류가 발생했습니다.' });
  }
};

// 찜 토글
export const toggleWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const target = await prisma.product.findUnique({ where: { id }, select: { userId: true } });
    if (!target) { res.status(404).json({ error: '상품을 찾을 수 없습니다.' }); return; }
    if (target.userId === userId) {
      res.status(400).json({ error: '본인 상품은 찜할 수 없습니다.' });
      return;
    }

    // 원자 토글 — deleteMany 로 삭제 시도, 지운 게 없으면 create.
    // 더블클릭 동시 요청 시 create 충돌 (P2002) 을 잡아 idempotent 처리.
    const deleted = await prisma.wishlist.deleteMany({
      where: { userId, productId: id },
    });
    if (deleted.count > 0) {
      res.json({ wishlisted: false });
      return;
    }
    try {
      await prisma.wishlist.create({ data: { userId, productId: id } });
    } catch (e) {
      // 동시 요청이 이미 만들었으면 (P2002) 찜 상태로 간주.
      if ((e as { code?: string })?.code !== 'P2002') throw e;
    }
    res.json({ wishlisted: true });
  } catch (error) {
    console.error('Toggle wishlist error:', error);
    res.status(500).json({ error: '찜 처리 중 오류가 발생했습니다.' });
  }
};

// 끌어올리기
export const bumpProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) { res.status(404).json({ error: '상품을 찾을 수 없습니다.' }); return; }
    if (product.userId !== userId) { res.status(403).json({ error: '본인의 상품만 끌어올릴 수 있습니다.' }); return; }

    if (product.bumpedAt) {
      const hoursSinceBump = (Date.now() - new Date(product.bumpedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceBump < 24) {
        const remaining = Math.ceil(24 - hoursSinceBump);
        res.status(429).json({ error: `끌어올리기는 24시간에 한 번만 가능합니다. ${remaining}시간 후 다시 시도해주세요.` });
        return;
      }
    }

    // 조건부 원자 업데이트 — 동시 요청이 둘 다 쿨다운 통과하는 race 차단.
    // 24시간 전 bumpedAt (또는 null) 일 때만 갱신. count=0 이면 방금 다른 요청이 처리한 것.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const bumped = await prisma.product.updateMany({
      where: { id, userId, OR: [{ bumpedAt: null }, { bumpedAt: { lt: cutoff } }] },
      data: { bumpedAt: new Date() },
    });
    if (bumped.count === 0) {
      res.status(429).json({ error: '끌어올리기는 24시간에 한 번만 가능합니다.' });
      return;
    }
    const updated = await prisma.product.findUnique({ where: { id } });
    cacheDelPrefix('products:');
    cacheDelPrefix('market:');
    cacheDel('home:hotdeals');
    res.json(updated);
  } catch (error) {
    console.error('Bump product error:', error);
    res.status(500).json({ error: '끌어올리기 중 오류가 발생했습니다.' });
  }
};

// 내 찜 목록
export const getMyWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const wishlists = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          select: { id: true, name: true, price: true, image: true, status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(wishlists.map(w => w.product));
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: '찜 목록 조회 중 오류가 발생했습니다.' });
  }
};
