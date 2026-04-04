import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ensureSessionValidity } from '@/lib/storage';
import { AuthProvider } from '@/context/AuthContext';

// Oturum süresi dolmuşsa temizle (5 gün TTL)
ensureSessionValidity();

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
