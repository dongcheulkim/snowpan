import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, getUser, setUser } from '../api';

type AuthState = 'verifying' | 'allow' | 'deny-login' | 'deny-home';

const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
  const localUser = getUser();
  const [state, setState] = useState<AuthState>(() => {
    if (!localUser) return 'deny-login';
    // optimistic allow if local role=admin, but still verify with server below
    return 'verifying';
  });

  useEffect(() => {
    let cancelled = false;
    api<{ id: string; role: string }>('/auth/profile')
      .then(u => {
        if (cancelled) return;
        if (u.role === 'admin') {
          const stored = getUser();
          if (stored) setUser({ ...stored, role: 'admin' });
          setState('allow');
        } else {
          const stored = getUser();
          if (stored) setUser({ ...stored, role: u.role });
          setState('deny-home');
        }
      })
      .catch(() => { if (!cancelled) setState('deny-login'); });
    return () => { cancelled = true; };
  }, []);

  if (state === 'deny-login') return <Navigate to="/login" replace />;
  if (state === 'deny-home') return <Navigate to="/" replace />;
  if (state === 'verifying') {
    return <div className="text-center py-20 text-sm text-gray-500">권한 확인 중...</div>;
  }
  return <>{children}</>;
};

export default RequireAdmin;
