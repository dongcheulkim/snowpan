export interface Competition {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  location: string;
  sport: 'ski' | 'board' | 'both';
  level: string;
  organizer: string;
  description?: string;
  poster?: string;
  events?: string[];
  fee?: string;
  contact?: string;
  website?: string;
  schedule?: string[];
  eligibility?: string;
  prize?: string;
}

const competitions: Competition[] = [
  // 2026-27 시즌 대회 확정되면 여기에 추가 (실제 대회만).
];

export default competitions;
