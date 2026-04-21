import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { cacheGet, cacheSet, cacheDelPrefix, cacheDel } from '../utils/cache';
import { createNotification } from './notificationController';
import { sanitizeText } from '../utils/sanitize';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, subcategory, userId, status, search, limit, offset } = req.query;

    // Cache key based on query params
    const cacheKey = `products:${JSON.stringify({ category, subcategory, userId, status, search, limit, offset })}`;
    const cached = cacheGet<{ products: unknown[]; totalCount: number }>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const where: any = {};
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

    const take = limit ? parseInt(limit as string, 10) : 50;
    const skip = offset ? parseInt(offset as string, 10) : undefined;

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ isPremium: { sort: 'desc', nulls: 'last' } }, { bumpedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        take,
        ...(skip && { skip }),
        select: {
          id: true,
          name: true,
          price: true,
          image: true,
          brand: true,
          subcategory: true,
          status: true,
          isPremium: true,
          bumpedAt: true,
          createdAt: true,
          category: true,
          length: true,
          size: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

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

// 중고 장비 등록 (로그인 필요)
export const createUsedProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, brand, subcategory, price, image, images, description, condition, usageCount, length, radius, flex, size } = req.body;

    if (!name || !price || !image) {
      res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
      return;
    }

    const parsedPrice = parseInt(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      res.status(400).json({ error: '유효한 가격을 입력해주세요.' });
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
        price: parsedPrice,
        image,
        images: images || null,
        category: 'used',
        description: cleanDescription,
        condition: sanitizeText(condition, 20),
        length: sanitizeText(length, 30) || null,
        radius: sanitizeText(radius, 30) || null,
        flex: sanitizeText(flex, 30) || null,
        size: sanitizeText(size, 30) || null,
        usageCount: sanitizeText(usageCount, 30),
        userId,
      },
      include: { user: { select: { name: true, nickname: true, phone: true } } },
    });

    cacheDelPrefix('products:');
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

    const product = await prisma.product.create({
      data: {
        name, brand, price: Number(price) || 0, image, category: 'new', description,
        rating: rating ? parseFloat(rating) : undefined,
        reviewCount: reviewCount ? parseInt(reviewCount) : undefined,
      },
    });

    cacheDelPrefix('products:');
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
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as { userId: string };
        currentUserId = decoded.userId;
      } catch { /* ignore */ }
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, nickname: true, phone: true } } },
    });

    if (!product) {
      res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      return;
    }

    let wishlisted = false;
    if (currentUserId) {
      const existing = await prisma.wishlist.findUnique({
        where: { userId_productId: { userId: currentUserId, productId: id } },
      });
      wishlisted = !!existing;
    }

    res.json({ ...product, wishlisted });
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
    const oldPrice = product.price;
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name: sanitizeText(name, 100) }),
        ...(brand !== undefined && { brand: sanitizeText(brand, 60) || '' }),
        ...(subcategory !== undefined && { subcategory }),
        ...(price && !isNaN(parseInt(price)) && { price: parseInt(price) }),
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

    // 가격 인하 시 찜한 유저들에게 알림
    const newPrice = updated.price;
    if (newPrice < oldPrice) {
      const wishlists = await prisma.wishlist.findMany({ where: { productId: id }, select: { userId: true } });
      const discount = Math.round((1 - newPrice / oldPrice) * 100);
      for (const w of wishlists) {
        await createNotification(
          w.userId, 'system',
          '찜한 상품 가격 인하!',
          `"${updated.name}" ${discount}% 할인! ${oldPrice.toLocaleString()}원 → ${newPrice.toLocaleString()}원`,
          `/used/${id}`
        );
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

    cacheDelPrefix('products:');
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
    cacheDelPrefix('products:');
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

    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId: id } },
    });

    if (existing) {
      await prisma.wishlist.delete({ where: { id: existing.id } });
      res.json({ wishlisted: false });
    } else {
      await prisma.wishlist.create({ data: { userId, productId: id } });
      res.json({ wishlisted: true });
    }
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

    const updated = await prisma.product.update({
      where: { id },
      data: { bumpedAt: new Date() },
    });
    cacheDelPrefix('products:');
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
