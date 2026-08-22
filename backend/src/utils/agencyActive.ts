// 여행사 활성(공개 노출·딜 등록 가능) 판정.
// 베타 기간엔 무료 — 승인만 되면 활성. 베타 종료(AGENCY_BETA_FREE=false) 후엔 유료 구독(paidUntil) 필요.
export const AGENCY_BETA_FREE = process.env.AGENCY_BETA_FREE !== 'false';

export function isAgencyActive(a: { approved: boolean; paidUntil: Date | null }): boolean {
  return a.approved && (AGENCY_BETA_FREE || (!!a.paidUntil && a.paidUntil.getTime() > Date.now()));
}

// Prisma where 절 — 베타면 승인만, 아니면 승인+구독중.
export function agencyActiveWhere(): { approved: true; paidUntil?: { gt: Date } } {
  return AGENCY_BETA_FREE ? { approved: true } : { approved: true, paidUntil: { gt: new Date() } };
}
