import { Navigate } from 'react-router-dom';
import { getUser } from '../api';

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default RequireAuth;
