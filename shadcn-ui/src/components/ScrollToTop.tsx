import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Sayfa rotası değiştiğinde otomatik olarak en üste kaydırır.
export default function ScrollToTop() {
  const { pathname, state } = useLocation() as { pathname: string; state?: any };
  const scrollTarget = (state as any)?.scrollTo;
  const previousResetLocationRef = useRef<{ pathname: string; scrollTarget: unknown } | null>(null);

  // Tarayıcının otomatik scroll geri yüklemesini kapat
  useEffect(() => {
    const hist = window.history as any;
    const prev = hist?.scrollRestoration;
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    return () => {
      if (prev) {
        try { window.history.scrollRestoration = prev; } catch {}
      }
    };
  }, []);

  useEffect(() => {
    const previousResetLocation = previousResetLocationRef.current;
    const isSameResetLocation =
      previousResetLocation?.pathname === pathname
      && previousResetLocation?.scrollTarget === scrollTarget;
    previousResetLocationRef.current = { pathname, scrollTarget };

    if (isSameResetLocation) return;

    // Odağı temizle (bazı input'lar odak alınca sayfayı aşağı kaydırabilir)
    try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch {}

    // Eğer belirli bir elemana kaydırma isteği varsa (örn. Footer Yardım -> anasayfa SSS),
    // otomatik olarak en üste sıfırlamayı atla. Hedefe kaydırmayı ilgili sayfa (Index) yönetecek.
    const hasScrollTarget = Boolean(scrollTarget);
    if (hasScrollTarget) {
      return;
    }

    const reset = () => {
      try {
        // Hızlı ve kesin sıfırlama
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      } catch {
        window.scrollTo(0, 0);
      }
      try {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch {}
    };

    // Anında uygula, ardından birkaç tekrar ile pekiştir
    reset();
    const raf = requestAnimationFrame(reset);
    const t1 = setTimeout(reset, 50);
    const t2 = setTimeout(reset, 150);
    const t3 = setTimeout(reset, 300);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname, scrollTarget]);

  return null;
}
