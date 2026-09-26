// 사장님 대시보드 "앱으로 알림 받기" (2026-09-22, 사용자 "앱 다 쓰게끔 해야지") — 예약 요청·새 문의·승인 결과는 앱 푸시로 바로 온다.
// 웹에서 보면 앱 설치 안내, 앱에서 보면 알림 허용 상태와 켜기 버튼. 문자·메일은 관리자가 채널을 켠 경우에만 보조로 노출.
import { useEffect, useState } from 'react';
import { api, isNativeApp } from '../api';
import { toastError, toastSuccess } from '../utils/toast';
import { APP_STORE_URL, PLAY_STORE_URL } from '../utils/appLinks';

interface Settings { alertPhone: string; smsAlerts: boolean; emailAlerts: boolean; accountPhone: string; email: string; emailUsable: boolean; channels?: { sms: boolean; email: boolean } }
type PushState = 'checking' | 'granted' | 'denied' | 'prompt' | 'unavailable';

export default function OwnerAlertSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [push, setPush] = useState<PushState>('checking');
  const native = isNativeApp();

  const checkPush = async () => {
    if (!native) { setPush('unavailable'); return; }
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const p = await PushNotifications.checkPermissions();
      setPush(p.receive === 'granted' ? 'granted' : p.receive === 'denied' ? 'denied' : 'prompt');
    } catch { setPush('unavailable'); }
  };

  useEffect(() => {
    api<Settings>('/auth/alert-settings').then((d) => { setS(d); setPhone(d.alertPhone || ''); }).catch(() => setS(null));
    checkPush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enablePush = async () => {
    try {
      const { initPush } = await import('../push');
      await initPush();
      await checkPush();
      toastSuccess('알림을 켰어요. 예약·문의가 오면 바로 알려 드려요.');
    } catch { toastError('알림을 켜지 못했어요. 폰 설정 → 스노우판 → 알림에서 허용해 주세요.'); }
  };

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

  const extraChannels = !!(s?.channels?.sms || s?.channels?.email);

  return (
    <div className="card p-4 space-y-3">
      <div>
        <div className="text-sm font-bold text-gray-900">앱으로 알림 받기</div>
        <div className="text-[11px] text-gray-500 mt-0.5">예약 요청, 새 문의, 승인 결과가 앱 알림으로 바로 와요.</div>
      </div>
      {native ? (
        <div className="flex items-center justify-between gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded ${push === 'granted' ? 'bg-emerald-50 text-emerald-700' : push === 'checking' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-700'}`}>
            {push === 'granted' ? '앱 알림 켜짐' : push === 'checking' ? '확인 중' : push === 'denied' ? '앱 알림 꺼짐' : '알림 허용 필요'}
          </span>
          {push === 'prompt' && <button type="button" onClick={enablePush} className="min-h-11 px-4 bg-gray-900 text-white rounded-lg text-xs font-bold">알림 켜기</button>}
          {push === 'denied' && <span className="text-[11px] text-gray-500 text-right">폰 설정 → 스노우판 → 알림에서 허용해 주세요.</span>}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-700">앱을 설치하고 같은 계정으로 로그인해 두면 손님이 예약이나 문의를 보낼 때 폰으로 바로 알려 드려요.</p>
          <div className="flex flex-wrap gap-2">
            {APP_STORE_URL && <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="min-h-11 px-4 inline-flex items-center bg-gray-900 text-white rounded-lg text-xs font-bold">App Store 에서 받기</a>}
            {PLAY_STORE_URL && <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="min-h-11 px-4 inline-flex items-center bg-white text-gray-900 border border-gray-900 rounded-lg text-xs font-bold">Google Play 에서 받기</a>}
          </div>
          {!PLAY_STORE_URL && <p className="text-[11px] text-gray-500">안드로이드는 브라우저에서 snowpan.kr 로 이용할 수 있어요.</p>}
        </div>
      )}

      {s && extraChannels && (
        <div className="pt-3 border-t border-gray-100">
          <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
            <span className="text-xs font-bold text-gray-800">문자·메일로도 받기</span>
            <span className="text-gray-500 text-xs">{open ? '접기' : '설정'}</span>
          </button>
          {open && (
            <div className="mt-3 space-y-3">
              {s.channels?.sms && (
                <>
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
                </>
              )}
              {s.channels?.email && (
                <label className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-800">메일로 받기 <span className="text-[11px] text-gray-500">{s.emailUsable ? s.email : '(카카오 계정은 메일 주소가 없어요)'}</span></span>
                  <input type="checkbox" checked={s.emailAlerts} disabled={saving || !s.emailUsable} onChange={(e) => save({ emailAlerts: e.target.checked })} className="w-5 h-5" />
                </label>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
