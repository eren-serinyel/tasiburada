import { useState, useEffect } from 'react';
import { getSessionUser, clearSessionUser } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, User, LogOut, Menu, X } from 'lucide-react';
import { User as UserType } from '@/lib/types';
import NotificationBell from './NotificationBell';
import { getDashboardTitleForRole } from '@/lib/utils';

export default function Navbar() {
  const [user, setUser] = useState<UserType | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
    if (u) setUser(u);
  }, []);

  const handleLogout = () => {
    clearSessionUser();
    setUser(null);
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Truck className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Taşıburada</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 transition-colors">
                  {getDashboardTitleForRole(user.type)}
                </Link>
                
                {user.type === 'customer' ? (
                  <>
                    <Link to="/create-shipment" className="text-gray-700 hover:text-blue-600 transition-colors">
                      Yeni Talep
                    </Link>
                    <Link to="/shipments" className="text-gray-700 hover:text-blue-600 transition-colors">
                      Taleplerim
                    </Link>
                    <Link to="/carriers" className="text-gray-700 hover:text-blue-600 transition-colors">
                      Nakliyeciler
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/shipments" className="text-gray-700 hover:text-blue-600 transition-colors">
                      Mevcut İşler
                    </Link>
                    <Link to="/carriers" className="text-gray-700 hover:text-blue-600 transition-colors">
                      Nakliyeciler
                    </Link>
                    <Link to="/calendar" className="text-gray-700 hover:text-blue-600 transition-colors">
                      Takvim
                    </Link>
                  </>
                )}
                
                <NotificationBell />
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{user.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/carriers" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Nakliyeciler
                </Link>
                <Link to="/login">
                  <Button variant="outline">Giriş Yap</Button>
                </Link>
                <Link to="/register-user">
                  <Button>Kayıt Ol</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              {user ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className="text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {getDashboardTitleForRole(user.type)}
                  </Link>
                  
                  {user.type === 'customer' ? (
                    <>
                      <Link 
                        to="/create-shipment" 
                        className="text-gray-700 hover:text-blue-600 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Yeni Talep
                      </Link>
                      <Link 
                        to="/shipments" 
                        className="text-gray-700 hover:text-blue-600 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Taleplerim
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link 
                        to="/shipments" 
                        className="text-gray-700 hover:text-blue-600 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Mevcut İşler
                      </Link>
                      <Link 
                        to="/calendar" 
                        className="text-gray-700 hover:text-blue-600 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Takvim
                      </Link>
                    </>
                  )}
                  
                  <Link 
                    to="/carriers" 
                    className="text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Nakliyeciler
                  </Link>
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{user.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <NotificationBell />
                      <Button variant="ghost" size="sm" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    to="/carriers" 
                    className="text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Nakliyeciler
                  </Link>
                  <div className="flex flex-col space-y-2 pt-4 border-t">
                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full">Giriş Yap</Button>
                    </Link>
                    <Link to="/register-user" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full">Kayıt Ol</Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}