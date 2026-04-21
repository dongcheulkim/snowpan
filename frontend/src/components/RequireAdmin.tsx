import { Navigate } from 'react-router-dom';
import { getUser } from '../api';

const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default RequireAdmin;
