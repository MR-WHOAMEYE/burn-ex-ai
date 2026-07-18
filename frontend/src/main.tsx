import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register PWA service worker (only on /mobile route)
if ('serviceWorker' in navigator) {
  if (window.location.pathname.startsWith('/mobile')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  } else {
    // Unregister any stale SW on non-mobile pages
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
}
