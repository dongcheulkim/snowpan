import { Request, Response } from 'express';
import prisma from '../config/database';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;

    const products = await prisma.product.findMany({
      where: category ? { category: category as string } : undefined,
      orderBy: { createdAt: 'desc' },
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
export const createUsedProduct = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id; // auth middleware에서 설정
    const { name, brand, price, image, description, condition, usageCount } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        brand,
        price: parseInt(price),
        image,
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
export const createNewProduct = async (req: any, res: Response): Promise<void> => {
  try {
    // 관리자 권한 확인
    if (req.user.role !== 'admin') {
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
