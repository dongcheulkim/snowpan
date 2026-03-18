import { Request, Response } from 'express';
import prisma from '../config/database';
import { createNotification } from './notificationController';

export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sport, category } = req.query;
    const where: any = {};
    if (sport) where.sport = sport as string;
    if (category && category !== 'all') where.category = category as string;

    const posts = await prisma.post.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
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

    // 조회수 증가
    await prisma.post.update({ where: { id }, data: { views: { increment: 1 } } });

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!post) {
      res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      return;
    }

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: '게시글 조회 중 오류가 발생했습니다.' });
  }
};

export const createPost = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { title, content, category, sport } = req.body;

    const post = await prisma.post.create({
      data: { title, content, category, sport, userId },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: '게시글 등록 중 오류가 발생했습니다.' });
  }
};

export const likePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const post = await prisma.post.update({
      where: { id },
      data: { likes: { increment: 1 } },
    });
    res.json({ likes: post.likes });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: '좋아요 처리 중 오류가 발생했습니다.' });
  }
};

export const createComment = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { id: postId } = req.params;
    const { content } = req.body;

    const comment = await prisma.comment.create({
      data: { content, postId, userId },
      include: { user: { select: { id: true, name: true } } },
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

export const updatePost = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) { res.status(404).json({ error: '게시글을 찾을 수 없습니다.' }); return; }
    if (post.userId !== req.user.id && req.user.role !== 'admin') { res.status(403).json({ error: '수정 권한이 없습니다.' }); return; }

    const { title, content, category } = req.body;
    const updated = await prisma.post.update({
      where: { id },
      data: { ...(title && { title }), ...(content && { content }), ...(category && { category }) },
    });
    res.json(updated);
  } catch (error) { res.status(500).json({ error: '수정 중 오류가 발생했습니다.' }); }
};

export const deletePost = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) { res.status(404).json({ error: '게시글을 찾을 수 없습니다.' }); return; }
    if (post.userId !== req.user.id && req.user.role !== 'admin') { res.status(403).json({ error: '삭제 권한이 없습니다.' }); return; }

    await prisma.post.delete({ where: { id } });
    res.json({ message: '게시글이 삭제되었습니다.' });
  } catch (error) { res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' }); }
};
