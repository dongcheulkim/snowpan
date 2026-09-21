// 관리자 설정 탭 — 운영 도구: 하루 요약(미리보기·지금 보내기) + 외부 연동 상태 (2026-09-17)
import { useEffect, useState } from 'react';
import { api } from '../api';
import { toastError, toastSuccess } from '../components/Toast';

interface Summary {
  date: string;
  pendingReports: number;
  pendingApprovals: { shops: number; lessons: number; accommodations: number; claims: number; competitions: number; agencies: number; total: number };
  unansweredSupport: number;
  last24h: { users: number; products: number; posts: number; chatRooms: number };
}
interface Integrations { appleRevoke: boolean; kakao: boolean; naver: boolean; fcm: boolean; bunny: boolean; adDeposit: boolean; smtp: boolean; discord: boolean; sms: boolean }
interface AlertLogItem { id: string; channel: 'sms' | 'email'; kind: string; to: string; text: string; status: string; detail: string | null; createdAt: string; user: { id: string; name: string } | null }
interface AlertLogs { items: AlertLogItem[]; counts30d: Record<string, number> }
const KIND_KR: Record<string, string> = { reservation_request: '예약 요청', reservation_result: '예약 결과', chat: '새 문의', approval: '승인 결과', daily_summary: '하루 요약' };
const STATUS_KR: Record<string, string> = { sent: '보냄', dry: '검사(미발송)', failed: '실패', skipped: '건너뜀' };

const INTEGRATION_LABELS: { key: keyof Integrations; label: string; hint: string }[] = [
  { key: 'fcm', label: '푸시 알림', hint: 'Firebase 서비스 계정' },
  { key: 'kakao', label: '카카오 로그인', hint: 'KAKAO_CLIENT_ID' },
  { key: 'appleRevoke', label: 'Apple 탈퇴 연결 해제', hint: 'APPLE_TEAM_ID / KEY_ID / PRIVATE_KEY' },
  { key: 'bunny', label: '이미지 저장소', hint: 'BUNNY_STORAGE_KEY' },
  { key: 'adDeposit', label: '광고 입금 계좌 안내', hint: 'AD_DEPOSIT_BANK / ACCOUNT / HOLDER' },
  { key: 'sms', label: '문자 알림 (사장님 예약·문의·승인)', hint: 'SOLAPI_API_KEY / SECRET / SMS_FROM' },
  { key: 'smtp', label: '메일 발송 (사장님 알림·하루 요약)', hint: 'SMTP_HOST / USER / PASS' },
  { key: 'discord', label: '디스코드 알림', hint: 'DISCORD_WEBHOOK_URL' },
];

export default function AdminOpsPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [logs, setLogs] = useState<AlertLogs | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<Summary>('/admin/daily-summary').then(setSummary).catch(() => setSummary(null));
    api<Integrations>('/admin/integrations').then(setIntegrations).catch(() => setIntegrations(null));
    api<AlertLogs>('/admin/alert-logs').then(setLogs).catch(() => setLogs(null));
  }, []);

  const sendNow = async () => {
    setSending(true);
    try {
      const r = await api<{ message: string; email: boolean }>('/admin/daily-summary', { method: 'POST' });
      toastSuccess(r.email ? r.message : `${r.message} 메일은 SMTP 설정 후 함께 가요.`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : '보내지 못했어요.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="card p-4 space-y-3">
        <div>
          <p className="text-sm font-bold text-gray-900">관리자 하루 요약</p>
          <p className="text-[11px] text-gray-500 mt-0.5">매일 아침 9시에 신고, 승인 대기, 답 없는 문의 건수를 관리자 알림과 푸시로 보내요. 메일 발송이 켜져 있으면 메일로도 가요.</p>
        </div>
        {summary ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['신고 대기', summary.pendingReports], ['승인 대기', summary.pendingApprovals.total], ['답 없는 문의', summary.unansweredSupport]].map(([l, v]) => (
              <div key={String(l)} className="bg-gray-50 rounded-xl py-2.5">
                <p className="text-lg font-black text-gray-900">{v}</p>
                <p className="text-[10px] text-gray-500">{l}</p>
              </div>
            ))}
            <p className="col-span-3 text-[11px] text-gray-500 text-left">지난 24시간: 가입 {summary.last24h.users} · 중고 매물 {summary.last24h.products} · 글 {summary.last24h.posts} · 새 채팅 {summary.last24h.chatRooms}</p>
          </div>
        ) : (
          <p className="text-xs text-gray-400">요약을 불러오는 중이에요.</p>
        )}
        <button onClick={sendNow} disabled={sending} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold disabled:opacity-50">
          {sending ? '보내는 중' : '지금 보내기'}
        </button>
      </div>

      <div className="card p-4 space-y-2">
        <p className="text-sm font-bold text-gray-900">외부 연동 상태</p>
        <p className="text-[11px] text-gray-500">Render 환경변수가 제대로 잡혔는지 확인하는 용도예요. 값은 보이지 않아요.</p>
        {integrations ? (
          <ul className="divide-y divide-gray-100">
            {INTEGRATION_LABELS.map(({ key, label, hint }) => (
              <li key={key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-xs font-medium text-gray-900">{label}</p>
                  <p className="text-[10px] text-gray-400">{hint}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${integrations[key] ? 'bg-mint/20 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{integrations[key] ? '켜짐' : '꺼짐'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">상태를 불러오는 중이에요.</p>
        )}
      </div>

      <div className="card p-4 space-y-2">
        <p className="text-sm font-bold text-gray-900">사장님 문자·메일 알림 발송 기록</p>
        <p className="text-[11px] text-gray-500">예약 요청, 새 문의(방당 3시간 1회), 승인 결과가 문자·메일로 나가요. 문자는 건당 요금이 있어 최근 30일 건수를 같이 보여요.</p>
        {logs ? (
          <>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {(['sms:sent', 'sms:failed', 'sms:skipped', 'email:sent', 'email:failed', 'email:skipped'] as const).map((k) => (
                <span key={k} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{k.startsWith('sms') ? '문자' : '메일'} {STATUS_KR[k.split(':')[1]]} <b>{logs.counts30d[k] || 0}</b></span>
              ))}
            </div>
            {logs.items.length === 0 ? <p className="text-xs text-gray-400">아직 보낸 기록이 없어요.</p> : (
              <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {logs.items.slice(0, 30).map((l) => (
                  <li key={l.id} className="py-2 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900">{l.channel === 'sms' ? '문자' : '메일'} · {KIND_KR[l.kind] || l.kind} · {l.user?.name || '(탈퇴)'}</span>
                      <span className={`px-1.5 py-0.5 rounded ${l.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : l.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{STATUS_KR[l.status] || l.status}{l.detail ? ` · ${l.detail}` : ''}</span>
                    </div>
                    <div className="text-gray-500 truncate">{l.to} · {l.text.split('\n')[0]} · {new Date(l.createdAt).toLocaleString('ko-KR')}</div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : <p className="text-xs text-gray-400">기록을 불러오는 중이에요.</p>}
      </div>
    </>
  );
}
