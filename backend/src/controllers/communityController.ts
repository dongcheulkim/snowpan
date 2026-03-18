import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { createNotification } from './notificationController';

export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sport, category, userId, limit, offset } = req.query;
    const where: Record<string, unknown> = {};
    if (sport) where.sport = sport as string;
    if (category && category !== 'all') where.category = category as string;
    if (userId) where.userId = userId as string;

    const take = limit ? parseInt(limit as string, 10) : undefined;
    const skip = offset ? parseInt(offset as string, 10) : undefined;

    const posts = await prisma.post.findMany({
      where,
      ...(take && { take }),
      ...(skip && { skip }),
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(posts.map(p => ({
      ...p,
      commentCount: p._count.comments,
      _count: undefined,
    })));
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: '게시글 조회 중 오류가 발생했습니다.' });
  }
};

export const getPostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 토큰에서 userId 추출 (선택적)
    let currentUserId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET || 'secret') as { userId: string };
        currentUserId = decoded.userId;
      } catch {}
    }

    // 조회수 증가
    await prisma.post.update({ where: { id }, data: { views: { increment: 1 } } });

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        comments: {
          include: { user: { select: { id: true, name: true, profileImage: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!post) {
      res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      return;
    }

    let liked = false;
    if (currentUserId) {
      const existing = await prisma.postLike.findUnique({
        where: { postId_userId: { postId: id, userId: currentUserId } },
      });
      liked = !!existing;
    }

    res.json({ ...post, liked });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: '게시글 조회 중 오류가 발생했습니다.' });
  }
};

export const createPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title, content, category, sport } = req.body;

    const post = await prisma.post.create({
      data: { title, content, category, sport, userId },
      include: { user: { select: { id: true, name: true, profileImage: true } } },
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: '게시글 등록 중 오류가 발생했습니다.' });
  }
};

export const likePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId: id, userId } },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });
      const post = await prisma.post.update({
        where: { id },
        data: { likes: { decrement: 1 } },
      });
      res.json({ likes: post.likes, liked: false });
    } else {
      await prisma.postLike.create({ data: { postId: id, userId } });
      const post = await prisma.post.update({
        where: { id },
        data: { likes: { increment: 1 } },
      });
      res.json({ likes: post.likes, liked: true });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: '좋아요 처리 중 오류가 발생했습니다.' });
  }
};

export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: postId } = req.params;
    const { content } = req.body;

    const comment = await prisma.comment.create({
      data: { content, postId, userId },
      include: { user: { select: { id: true, name: true, profileImage: true } } },
    });

    // 글 작성자에게 알림 (본인 댓글은 제외)
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (post && post.userId !== userId) {
      await createNotification(
        post.userId,
        'chat',
        '새 댓글',
        `'${post.title}' 글에 댓글이 달렸습니다: "${content.slice(0, 30)}"`,
        `/community/post/${postId}`
      );
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: '댓글 등록 중 오류가 발생했습니다.' });
  }
};

export const updatePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) { res.status(404).json({ error: '게시글을 찾을 수 없습니다.' }); return; }
    if (post.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '수정 권한이 없습니다.' }); return; }

    const { title, content, category } = req.body;
    const updated = await prisma.post.update({
      where: { id },
      data: { ...(title && { title }), ...(content && { content }), ...(category && { category }) },
    });
    res.json(updated);
  } catch (error) { res.status(500).json({ error: '수정 중 오류가 발생했습니다.' }); }
};

export const deletePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) { res.status(404).json({ error: '게시글을 찾을 수 없습니다.' }); return; }
    if (post.userId !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '삭제 권한이 없습니다.' }); return; }

    await prisma.post.delete({ where: { id } });
    res.json({ message: '게시글이 삭제되었습니다.' });
  } catch (error) { res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' }); }
};
