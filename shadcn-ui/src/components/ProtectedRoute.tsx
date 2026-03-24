import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getUserType, isAuthenticated, type UserType } from '@/lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserType;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/giris" replace />;
  }

  const userType = getUserType();
  if (requiredRole && userType !== requiredRole) {
    return <Navigate to="/panel" replace />;
  }

  return <>{children}</>;
}
