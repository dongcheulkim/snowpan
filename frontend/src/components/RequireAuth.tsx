import { Navigate, useLocation } from 'react-router-dom';
import { getUser } from '../api';

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const user = getUser();
  const location = useLocation();
  if (!user) {
    // 원래 가려던 경로를 next 로 넘겨 로그인 후 복귀 (딥링크·북마크에서 홈으로 튕기던 문제 해결).
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
};

export default RequireAuth;
