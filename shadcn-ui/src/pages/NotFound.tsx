import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6 text-center">
      <div className="space-y-6 max-w-md">
        <div className="space-y-3">
          <h1 className="text-8xl font-bold text-blue-600">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800">Sayfa bulunamadı</h2>
          <p className="text-muted-foreground">Aradığınız sayfa taşınmış veya artık yayında olmayabilir.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/">Ana sayfa</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/nakliyeciler">Nakliyecileri incele</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/fiyatlandirma">Fiyatlandırma</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
