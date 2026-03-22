import { memo } from 'react';

const badgeConfig: Record<string, { label: string; color: string }> = {
  lv2: { label: 'LV2', color: 'bg-sky-400 text-white' },
  lv3: { label: 'LV3', color: 'bg-purple-500 text-white' },
  demo: { label: '데몬', color: 'bg-yellow-400 text-black' },
  teaching: { label: '티칭', color: 'bg-blue-500 text-white' },
  teaching1: { label: '티칭1', color: 'bg-blue-400 text-white' },
  teaching2: { label: '티칭2', color: 'bg-blue-500 text-white' },
  teaching3: { label: '티칭3', color: 'bg-blue-700 text-white' },
  pro: { label: '프로', color: 'bg-rose-500 text-white' },
};

const UserBadges = memo(({ badges }: { badges?: string[] }) => {
  if (!badges || badges.length === 0) return null;
  return (
    <>
      {badges.map((b) => {
        const cfg = badgeConfig[b];
        if (!cfg) return null;
        return (
          <span key={b} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.color}`}>
            {cfg.label}
          </span>
        );
      })}
    </>
  );
});

UserBadges.displayName = 'UserBadges';

export default UserBadges;
