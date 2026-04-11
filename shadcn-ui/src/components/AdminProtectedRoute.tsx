import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated, adminApiClient, clearAdminAuth } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

export default function AdminProtectedRoute({ children }: Props) {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      setIsValid(false);
      setIsVerifying(false);
      return;
    }

    let isMounted = true;
    const verifyToken = async () => {
      try {
        const res = await adminApiClient('/admin/me');
        if (!isMounted) return;
        
        if (res.ok) {
          setIsValid(true);
        } else {
          setIsValid(false);
          clearAdminAuth();
        }
      } catch (error) {
        if (!isMounted) return;
        setIsValid(false);
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    };

    verifyToken();
    return () => { isMounted = false; }
  }, []);

  if (isVerifying) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm font-medium text-gray-600">Yetkiler kontrol ediliyor...</span>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return <Navigate to="/admin/giris" replace />;
  }

  return <>{children}</>;
}
