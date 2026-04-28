import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { getUser } from '../api';
import { toastError } from './Toast';

interface Props {
  to: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}

// 등록 페이지 CTA — 비로그인 시 로그인 페이지로 안내 (returnTo 포함).
// 라우팅된 페이지에 RequireAuth 가 있어도 사용자에게 명확히 안내하기 위함.
export default function RegisterCTA({ to, className, children, ariaLabel }: Props) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!getUser()) {
      toastError('로그인 후 이용할 수 있습니다.');
      navigate(`/login?next=${encodeURIComponent(to)}`);
      return;
    }
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
