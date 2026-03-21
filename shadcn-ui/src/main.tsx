import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ensureSessionValidity } from '@/lib/storage';

// Oturum süresi dolmuşsa temizle (5 gün TTL)
ensureSessionValidity();

createRoot(document.getElementById('root')!).render(<App />);
