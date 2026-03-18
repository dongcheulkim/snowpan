import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: '알림 조회 중 오류가 발생했습니다.' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    res.json({ message: '읽음 처리되었습니다.' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: '읽음 처리 중 오류가 발생했습니다.' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.json({ message: '모든 알림을 읽음 처리했습니다.' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: '읽음 처리 중 오류가 발생했습니다.' });
  }
};

// 알림 생성 헬퍼 (다른 컨트롤러에서 호출)
export const createNotification = async (userId: string, type: string, title: string, message: string, link?: string) => {
  try {
    await prisma.notification.create({
      data: { userId, type, title, message, link },
    });
  } catch (error) {
    console.error('Create notification error:', error);
  }
};
