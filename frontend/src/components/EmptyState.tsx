import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { InboxIcon } from './Icons';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
  onCtaClick?: () => void;
}

export default function EmptyState({ icon, title, description, ctaLabel, ctaTo, onCtaClick }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6 card animate-fade-in">
      <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center text-gray-500">
        {icon || <InboxIcon size={48} strokeWidth={1.4} />}
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1.5">{title}</h3>
      {description && <p className="text-xs text-gray-500 mb-5 whitespace-pre-line">{description}</p>}
      {ctaLabel && ctaTo && (
        <Link to={ctaTo} className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCtaClick && !ctaTo && (
        <button onClick={onCtaClick} className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
