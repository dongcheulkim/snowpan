import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, subcategory, userId, limit, offset } = req.query;

    const where: Record<string, unknown> = {};
    if (category) where.category = category as string;
    if (subcategory) where.subcategory = subcategory as string;
    if (userId) where.userId = userId as string;

    const take = limit ? parseInt(limit as string, 10) : undefined;
    const skip = offset ? parseInt(offset as string, 10) : undefined;

    const products = await prisma.product.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
      ...(take && { take }),
      ...(skip && { skip }),
      include: {
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: '상품 조회 중 오류가 발생했습니다.' });
  }
};

// 중고 장비 등록 (로그인 필요)
export const createUsedProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id; // auth middleware에서 설정
    const { name, brand, subcategory, price, image, images, description, condition, usageCount } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        brand: brand || '',
        subcategory: subcategory || null,
        price: parseInt(price),
        image,
        images: images || null,
        category: 'used',
        description,
        condition,
        usageCount,
        userId,
      },
      include: {
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create used product error:', error);
    res.status(500).json({ error: '중고 장비 등록 중 오류가 발생했습니다.' });
  }
};

// 새 장비 등록 (관리자만)
export const createNewProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 관리자 권한 확인
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: '관리자만 새 장비를 등록할 수 있습니다.' });
      return;
    }

    const { name, brand, price, image, description, rating, reviewCount } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        brand,
        price: parseInt(price),
        image,
        category: 'new',
        description,
        rating: rating ? parseFloat(rating) : undefined,
        reviewCount: reviewCount ? parseInt(reviewCount) : undefined,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create new product error:', error);
    res.status(500).json({ error: '새 장비 등록 중 오류가 발생했습니다.' });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      return;
    }

    res.json(product);
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

    const { name, brand, subcategory, price, image, images, description, condition, usageCount } = req.body;
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(brand !== undefined && { brand }),
        ...(subcategory !== undefined && { subcategory }),
        ...(price && { price: parseInt(price) }),
        ...(image && { image }),
        ...(images !== undefined && { images }),
        ...(description !== undefined && { description }),
        ...(condition && { condition }),
        ...(usageCount !== undefined && { usageCount }),
      },
    });
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
    res.json({ message: '상품이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: '상품 삭제 중 오류가 발생했습니다.' });
  }
};
