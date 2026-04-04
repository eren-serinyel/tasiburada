import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { type UserType } from '@/lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserType;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, userType } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/giris" replace />;
  }

  if (requiredRole && userType !== requiredRole) {
    return <Navigate to="/panel" replace />;
  }

  return <>{children}</>;
}
