import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated } from '@/lib/adminAuth';

interface Props {
  children: ReactNode;
}

export default function AdminProtectedRoute({ children }: Props) {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/giris" replace />;
  }
  return <>{children}</>;
}
