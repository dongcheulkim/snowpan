import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
  onCtaClick?: () => void;
}

export default function EmptyState({ icon = '📭', title, description, ctaLabel, ctaTo, onCtaClick }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6 card animate-fade-in">
      <div className="text-5xl mb-4 opacity-70">{icon}</div>
      <h3 className="text-base font-bold text-gray-900 mb-1.5">{title}</h3>
      {description && <p className="text-xs text-gray-400 mb-5 whitespace-pre-line">{description}</p>}
      {ctaLabel && ctaTo && (
        <Link to={ctaTo} className="inline-block px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-xs">
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCtaClick && !ctaTo && (
        <button onClick={onCtaClick} className="inline-block px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-xs">
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
