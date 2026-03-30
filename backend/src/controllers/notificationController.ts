import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { limit, offset } = req.query;
    const take = limit ? parseInt(limit as string, 10) : 50;
    const skip = offset ? parseInt(offset as string, 10) : undefined;

    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        ...(skip !== undefined && { skip }),
      }),
      prisma.notification.count({ where: { userId } }),
    ]);
    res.json({ notifications, totalCount });
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

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await prisma.notification.deleteMany({ where: { id, userId } });
    res.json({ message: '알림이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: '알림 삭제 중 오류가 발생했습니다.' });
  }
};

export const deleteAllNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await prisma.notification.deleteMany({ where: { userId } });
    res.json({ message: '모든 알림이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ error: '알림 삭제 중 오류가 발생했습니다.' });
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
