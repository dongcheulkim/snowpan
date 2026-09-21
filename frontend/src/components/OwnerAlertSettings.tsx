// 사장님 대시보드 "알림 받기" — 예약 요청·새 문의·승인 결과를 문자·메일로 받을지, 어느 번호로 받을지 (2026-09-21)
import { useEffect, useState } from 'react';
import { api } from '../api';
import { toastError, toastSuccess } from './Toast';

interface Settings { alertPhone: string; smsAlerts: boolean; emailAlerts: boolean; accountPhone: string; email: string; emailUsable: boolean }

export default function OwnerAlertSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api<Settings>('/auth/alert-settings').then((d) => { setS(d); setPhone(d.alertPhone || ''); }).catch(() => setS(null));
  }, []);

  const save = async (patch: Partial<Pick<Settings, 'alertPhone' | 'smsAlerts' | 'emailAlerts'>>) => {
    setSaving(true);
    try {
      const r = await api<Settings & { message: string }>('/auth/alert-settings', { method: 'PUT', body: patch });
      setS((prev) => prev ? { ...prev, alertPhone: r.alertPhone, smsAlerts: r.smsAlerts, emailAlerts: r.emailAlerts } : prev);
      setPhone(r.alertPhone || '');
      toastSuccess(r.message || '저장했어요.');
    } catch (e) {
      toastError(e instanceof Error ? e.message : '저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  if (!s) return null;
  const effectivePhone = s.alertPhone || s.accountPhone;
  const summary = s.smsAlerts && effectivePhone ? `문자 ${effectivePhone}` : s.smsAlerts ? '문자 번호 없음' : '문자 끔';

  return (
    <div className="card p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
        <div className="min-w-0">
          <div className="text-sm font-bold text-gray-900">알림 받기 <span className="text-[11px] font-medium text-gray-500 ml-1">{summary}{s.emailAlerts && s.emailUsable ? ' · 메일' : ''}</span></div>
          <div className="text-[11px] text-gray-500 mt-0.5">예약 요청, 새 문의, 승인 결과를 앱 알림 외에 문자·메일로도 받아요.</div>
        </div>
        <span className="text-gray-500 text-xs flex-shrink-0">{open ? '접기' : '설정'}</span>
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">알림 받을 휴대폰</label>
            <div className="flex gap-2">
              <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.slice(0, 20))} placeholder={s.accountPhone ? `비우면 ${s.accountPhone}` : '예: 010-1234-5678'} className="flex-1 min-w-0 px-3 py-2 bg-snow border border-gray-200 rounded-lg text-sm" />
              <button type="button" disabled={saving} onClick={() => save({ alertPhone: phone })} className="min-h-11 px-4 bg-gray-900 text-white rounded-lg text-xs font-bold disabled:opacity-50">저장</button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">비워 두면 {s.accountPhone ? '계정에 등록된 번호로' : '매장에 적힌 전화번호로'} 보내요.</p>
          </div>
          <label className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-800">문자로 받기</span>
            <input type="checkbox" checked={s.smsAlerts} disabled={saving} onChange={(e) => save({ smsAlerts: e.target.checked })} className="w-5 h-5" />
          </label>
          <label className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-800">메일로 받기 <span className="text-[11px] text-gray-500">{s.emailUsable ? s.email : '(카카오 계정은 메일 주소가 없어 문자만 가요)'}</span></span>
            <input type="checkbox" checked={s.emailAlerts} disabled={saving || !s.emailUsable} onChange={(e) => save({ emailAlerts: e.target.checked })} className="w-5 h-5" />
          </label>
        </div>
      )}
    </div>
  );
}
