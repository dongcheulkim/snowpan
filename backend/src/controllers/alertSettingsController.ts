// 사장님 알림 채널 설정 — 문자·메일 받을지, 어느 번호로 받을지 (2026-09-21). GET/PUT /auth/alert-settings
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { normalizePhone } from '../utils/sms';

export const getAlertSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const u = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { alertPhone: true, smsAlerts: true, emailAlerts: true, phone: true, email: true } });
    if (!u) { res.status(404).json({ error: '사용자를 찾을 수 없습니다.' }); return; }
    const realEmail = !!u.email && !/@social\.local$/i.test(u.email);
    res.json({ alertPhone: u.alertPhone || '', smsAlerts: u.smsAlerts, emailAlerts: u.emailAlerts, accountPhone: u.phone || '', email: realEmail ? u.email : '', emailUsable: realEmail });
  } catch (e) { console.error('alert settings get error:', e); res.status(500).json({ error: '알림 설정을 불러오지 못했어요.' }); }
};

export const updateAlertSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body || {};
    const data: { alertPhone?: string | null; smsAlerts?: boolean; emailAlerts?: boolean } = {};
    if (b.alertPhone !== undefined) {
      const raw = typeof b.alertPhone === 'string' ? b.alertPhone.trim() : '';
      if (raw === '') data.alertPhone = null;
      else { const n = normalizePhone(raw); if (!n) { res.status(400).json({ error: '휴대폰 번호 형식이 아니에요. 예: 010-1234-5678' }); return; } data.alertPhone = n; }
    }
    if (b.smsAlerts !== undefined) data.smsAlerts = Boolean(b.smsAlerts);
    if (b.emailAlerts !== undefined) data.emailAlerts = Boolean(b.emailAlerts);
    const u = await prisma.user.update({ where: { id: req.user!.id }, data, select: { alertPhone: true, smsAlerts: true, emailAlerts: true } });
    res.json({ alertPhone: u.alertPhone || '', smsAlerts: u.smsAlerts, emailAlerts: u.emailAlerts, message: '알림 설정을 저장했어요.' });
  } catch (e) { console.error('alert settings update error:', e); res.status(500).json({ error: '알림 설정을 저장하지 못했어요.' }); }
};
