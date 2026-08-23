import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuth, markLastLogin } from '../api';
import { initPush } from '../push';

// 소셜 로그인 콜백 — 백엔드가 #token=...&user=<base64url>&provider=kakao 형태로 리다이렉트.
// 해시에서 토큰/유저를 꺼내 세션에 저장하고 홈으로 이동.
const OAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
      const params = new URLSearchParams(hash);
      const token = params.get('token');
      const userRaw = params.get('user');
      const provider = params.get('provider');
      const isNew = params.get('isNew') === '1';

      if (!token || !userRaw) {
        setError('로그인 정보를 받지 못했어요. 다시 시도해주세요.');
        return;
      }

      // base64url → JSON
      const json = decodeURIComponent(escape(atob(userRaw.replace(/-/g, '+').replace(/_/g, '/'))));
      const user = JSON.parse(json);

      // 소셜 로그인은 지속 로그인(자동 로그인) 처리.
      setAuth(token, user, true);
      if (provider === 'kakao' || provider === 'naver') markLastLogin(provider);
      initPush().catch(() => {}); // 앱: 로그인 직후 FCM 토큰 등록 (웹 no-op)

      // 신규 가입자 or 닉네임 미설정 → 온보딩(/welcome)으로. (oauthNext 는 Welcome 이 소비)
      if (isNew || !user?.nickname) {
        navigate('/welcome', { replace: true });
        return;
      }

      // 로그인 전 가려던 경로 복원 (Login 에서 저장), 없으면 홈.
      let dest = '/';
      try {
        const saved = sessionStorage.getItem('snowpan.oauthNext');
        if (saved && saved.startsWith('/') && !saved.startsWith('//')) dest = saved;
        sessionStorage.removeItem('snowpan.oauthNext');
      } catch { /* ignore */ }

      // 해시 제거 후 이동 (뒤로가기 시 토큰 노출 방지).
      navigate(dest, { replace: true });
    } catch {
      setError('로그인 처리 중 문제가 발생했어요. 다시 시도해주세요.');
    }
  }, [navigate]);

  if (error) {
    return (
      <div className="max-w-md mx-auto animate-fade-in">
        <div className="card p-8 text-center">
          <p className="text-sm text-coral mb-6">{error}</p>
          <button onClick={() => navigate('/login', { replace: true })} className="w-full py-3 bg-accent text-white rounded-lg font-bold text-sm">
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="card p-8 text-center">
        <p className="text-sm text-gray-500">로그인 중입니다...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
