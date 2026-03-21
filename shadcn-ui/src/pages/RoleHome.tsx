import { useEffect, useMemo, useState } from 'react';
import { getSessionUser } from '@/lib/storage';
import { Navigate } from 'react-router-dom';
import CustomerHome from './home/CustomerHome';
import CarrierHome from './home/CarrierHome';
import { User } from '@/lib/types';

export default function RoleHome() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  const content = useMemo(() => {
    if (!user) return null;
    if (user.type === 'customer') return <CustomerHome />;
    return <CarrierHome />;
  }, [user]);

  if (!loaded) return null;
  if (!user) return <Navigate to="/" replace />;

  return content;
}
