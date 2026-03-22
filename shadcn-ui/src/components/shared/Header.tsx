import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getCurrentUser, clearSessionUser, setCurrentUser as setPersistentCurrentUser } from '@/lib/storage';
import { getDashboardTitleForRole } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, Truck, Package } from 'lucide-react';

export default function Header() {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const navigate = useNavigate();

  const handleLogout = () => {
    // Oturumu ve kalıcı kullanıcıyı temizle
    clearSessionUser();
    setPersistentCurrentUser(null);
    setCurrentUser(null);
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!currentUser) return '/';
    return '/panel';
  };

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Truck className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">Taşıburada</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-gray-600 hover:text-gray-900">
            Ana Sayfa
          </Link>
          <Link to="/how-it-works" className="text-gray-600 hover:text-gray-900">
            Nasıl Çalışır
          </Link>
          <Link to="/pricing" className="text-gray-600 hover:text-gray-900">
            Fiyatlar
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          {currentUser ? (
            <>
              <Link to={getDashboardLink()}>
                <Button variant="outline" size="sm">
                  <Package className="h-4 w-4 mr-2" />
                  {getDashboardTitleForRole(currentUser?.type)}
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    {currentUser.name}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(getDashboardLink())}>
                    <Settings className="h-4 w-4 mr-2" />
                    {getDashboardTitleForRole(currentUser?.type)}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/giris">
                <Button variant="outline" size="sm">
                  Giriş Yap
                </Button>
              </Link>
              <Link to="/auth/register">
                <Button size="sm">
                  Kayıt Ol
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}