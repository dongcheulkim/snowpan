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
interface Integrations { appleRevoke: boolean; kakao: boolean; naver: boolean; fcm: boolean; bunny: boolean; adDeposit: boolean; smtp: boolean; discord: boolean }

const INTEGRATION_LABELS: { key: keyof Integrations; label: string; hint: string }[] = [
  { key: 'fcm', label: '푸시 알림', hint: 'Firebase 서비스 계정' },
  { key: 'kakao', label: '카카오 로그인', hint: 'KAKAO_CLIENT_ID' },
  { key: 'appleRevoke', label: 'Apple 탈퇴 연결 해제', hint: 'APPLE_TEAM_ID / KEY_ID / PRIVATE_KEY' },
  { key: 'bunny', label: '이미지 저장소', hint: 'BUNNY_STORAGE_KEY' },
  { key: 'adDeposit', label: '광고 입금 계좌 안내', hint: 'AD_DEPOSIT_BANK / ACCOUNT / HOLDER' },
  { key: 'smtp', label: '메일 발송 (하루 요약·인증)', hint: 'SMTP_HOST / USER / PASS' },
  { key: 'discord', label: '디스코드 알림', hint: 'DISCORD_WEBHOOK_URL' },
];

export default function AdminOpsPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<Summary>('/admin/daily-summary').then(setSummary).catch(() => setSummary(null));
    api<Integrations>('/admin/integrations').then(setIntegrations).catch(() => setIntegrations(null));
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
    </>
  );
}
