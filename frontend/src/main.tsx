import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Sentry (VITE_SENTRY_DSN 설정 시 활성화)
try {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    // @ts-ignore
    import('@sentry/react').then(S => S.init({ dsn, environment: import.meta.env.MODE, tracesSampleRate: 0.1 }));
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
