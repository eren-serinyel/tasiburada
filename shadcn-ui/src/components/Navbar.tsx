import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, User, LogOut, Menu, X, ChevronDown, Home, Users, HelpCircle } from 'lucide-react';
import { User as UserType } from '@/lib/types';
import { getSessionUser, clearSessionUser } from '@/lib/storage';
import NotificationBell from './NotificationBell';
import { getDashboardTitleForRole } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const [user, setUser] = useState<UserType | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (sessionUser) setUser(sessionUser);
    if (sessionUser && sessionUser.type === 'carrier') {
      try {
        const c = localStorage.getItem(`carrier_company_${sessionUser.id}`);
        if (c) setCompanyName(JSON.parse(c).name || '');
      } catch {}
    } else {
      setCompanyName('');
    }

    // localStorage değişikliklerini dinle
    const handleStorageChange = () => {
      const u = getSessionUser();
      setUser(u);
      if (u && u.type === 'carrier') {
        try {
          const c = localStorage.getItem(`carrier_company_${u.id}`);
          if (c) setCompanyName(JSON.parse(c).name || '');
        } catch {}
      } else {
        setCompanyName('');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Manual localStorage değişiklikleri için custom event
    window.addEventListener('userLogin', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLogin', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    clearSessionUser();
    setUser(null);
    navigate('/');
  };

  const userDisplayName = user?.type === 'carrier' && companyName ? companyName : user?.name;

  const renderAvatar = (variant: 'desktop' | 'mobile' = 'desktop') => {
    if (!user) return null;
    const sizeClass = variant === 'desktop' ? 'w-8 h-8' : 'w-10 h-10';
    const iconSizeClass = variant === 'desktop' ? 'h-4 w-4' : 'h-5 w-5';

    if (user.type === 'carrier' && user.pictureUrl) {
      return (
        <img
          src={user.pictureUrl}
          alt={userDisplayName || 'Nakliyeci avatarı'}
          className={`${sizeClass} rounded-full object-cover border border-blue-100 shadow-sm`}
        />
      );
    }

    const gradientClass = user.type === 'customer'
      ? 'bg-gradient-to-r from-blue-500 to-sky-500'
      : 'bg-gradient-to-r from-sky-500 to-cyan-500';
    const IconComponent = user.type === 'customer' ? User : Truck;

    return (
      <div className={`${sizeClass} ${gradientClass} rounded-full flex items-center justify-center`}>
        <IconComponent className={`${iconSizeClass} text-white`} />
      </div>
    );
  };

  return (
    <nav className="bg-white/95 backdrop-blur-lg shadow-lg border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Sol Alt - Logo */}
          <div className="flex items-center">
            <Link to={user ? '/home' : '/'} className="flex items-center space-x-2">
              <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
                Taşıburada
              </span>
            </Link>
          </div>

          {/* Desktop Navigation - Hide on smaller screens */}
          <div className="hidden lg:flex items-center space-x-6">
            {user ? (
              <>
                {/* Navigation Menu */}
                <nav className="flex items-center space-x-1">
                  <Link to={user ? '/home' : '/'} className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors group">
                    <Home className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Ana Sayfa</span>
                  </Link>
                  
                  <Link to="/carriers" className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors group">
                    <Users className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Nakliyeciler</span>
                  </Link>
                  {user?.type === 'customer' && (
                    <Link to="/offer-request" className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors group">
                      <Truck className="h-4 w-4 text-green-600 group-hover:text-green-700" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-green-700">Teklif Talebi</span>
                    </Link>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors group">
                        <HelpCircle className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Nasıl Çalışır</span>
                        <ChevronDown className="h-3 w-3 text-gray-500 group-hover:text-blue-600" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64 p-2 bg-white/95 backdrop-blur-lg border border-gray-200 rounded-xl shadow-xl">
                      <DropdownMenuItem asChild className="p-0">
                        <Link to="/how-it-works-customer" className="w-full cursor-pointer group">
                          <div className="flex items-center p-3 rounded-lg hover:bg-blue-50 transition-all">
                            <User className="h-4 w-4 text-blue-600 mr-3" />
                            <div>
                              <div className="font-medium text-gray-900">Müşteri İçin</div>
                              <div className="text-xs text-gray-500">Nasıl taşıma talebi oluştururum?</div>
                            </div>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="p-0">
                        <Link to="/how-it-works-carrier" className="w-full cursor-pointer group">
                          <div className="flex items-center p-3 rounded-lg hover:bg-blue-50 transition-all">
                            <Truck className="h-4 w-4 text-sky-600 mr-3" />
                            <div>
                              <div className="font-medium text-gray-900">Nakliyeci İçin</div>
                              <div className="text-xs text-gray-500">Nasıl teklif veririm?</div>
                            </div>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </nav>

                <div className="h-6 w-px bg-gray-200"></div>

                <NotificationBell />
                
                {/* Compact User Profile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-sky-50 px-3 py-2 rounded-full cursor-pointer hover:from-blue-100 hover:to-sky-100 transition-all">
                      {renderAvatar()}
                      <span className="text-sm font-medium text-gray-900 max-w-40 truncate">{userDisplayName}</span>
                      <ChevronDown className="h-3 w-3 text-gray-500" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2 bg-white/95 backdrop-blur-lg border border-gray-200 rounded-2xl shadow-2xl">
                    <DropdownMenuItem asChild className="p-0">
                      <Link to="/dashboard" className="w-full cursor-pointer group">
                        <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-sky-50 transition-all duration-300">
                          <div className="p-2 bg-gradient-to-r from-blue-100 to-sky-100 rounded-lg group-hover:from-blue-200 group-hover:to-sky-200">
                            <Home className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{getDashboardTitleForRole(user.type)}</div>
                            <div className="text-sm text-gray-500">{user.type === 'customer' ? 'Taşıma talepleriniz' : 'İş fırsatlarınız'}</div>
                          </div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    {user.type === 'customer' && (
                      <>
                        <DropdownMenuItem asChild className="p-0">
                          <Link to="/history" className="w-full cursor-pointer group">
                            <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-50 transition-all duration-300">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Home className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">Talep Geçmişi</div>
                                <div className="text-sm text-gray-500">Aktif / tamamlanan / iptal</div>
                              </div>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="p-0">
                          <Link to="/campaigns" className="w-full cursor-pointer group">
                            <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-50 transition-all duration-300">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Home className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">Kampanyalar</div>
                                <div className="text-sm text-gray-500">İndirim kodları ve promosyonlar</div>
                              </div>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="p-0">
                          <Link to="/loyalty" className="w-full cursor-pointer group">
                            <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-50 transition-all duration-300">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Home className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">Sadakat & Premium</div>
                                <div className="text-sm text-gray-500">Avantajlar</div>
                              </div>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="p-0">
                          <Link to="/support" className="w-full cursor-pointer group">
                            <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-50 transition-all duration-300">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Home className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">Destek Merkezi</div>
                                <div className="text-sm text-gray-500">SSS ve canlı chat</div>
                              </div>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem asChild className="p-0">
                      <Link to="/profile" className="w-full cursor-pointer group">
                        <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-sky-50 transition-all duration-300">
                          <div className="p-2 bg-gradient-to-r from-blue-100 to-sky-100 rounded-lg group-hover:from-blue-200 group-hover:to-sky-200">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">Profil Bilgileri</div>
                            <div className="text-sm text-gray-500">Hesap ayarlarınızı yönetin</div>
                          </div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="p-0">
                      <div className="w-full cursor-pointer group" onClick={handleLogout}>
                        <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-red-50 transition-all duration-300">
                          <div className="p-2 bg-gradient-to-r from-red-100 to-red-100 rounded-lg group-hover:from-red-200 group-hover:to-red-200">
                            <LogOut className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">Çıkış Yap</div>
                            <div className="text-sm text-gray-500">Hesabınızdan çıkış yapın</div>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                {/* Compact Auth Buttons */}
                <Link to="/login">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 font-medium px-3 py-2 rounded-full text-sm"
                  >
                    Giriş
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-medium px-3 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-1 text-sm"
                    >
                      <span>Kayıt</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2 bg-white/95 backdrop-blur-lg border border-gray-200 rounded-2xl shadow-2xl">
                    <DropdownMenuItem asChild className="p-0">
                      <Link to="/register-user" className="w-full cursor-pointer group">
                        <div className="flex items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-sky-50 transition-all duration-300">
                          <div className="p-2 bg-gradient-to-r from-blue-500 to-sky-500 rounded-lg mr-3 group-hover:shadow-lg transition-shadow">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 group-hover:text-blue-700">Müşteri</div>
                            <div className="text-xs text-gray-500">Taşıma talebi oluştur</div>
                          </div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="p-0">
                      <Link to="/carrier-info" className="w-full cursor-pointer group">
                        <div className="flex items-center p-3 rounded-xl hover:bg-gradient-to-r hover:from-sky-50 hover:to-cyan-50 transition-all duration-300">
                          <div className="p-2 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-lg mr-3 group-hover:shadow-lg transition-shadow">
                            <Truck className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 group-hover:text-sky-700">Nakliyeci</div>
                            <div className="text-xs text-gray-500">Para kazan, iş bul</div>
                          </div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Mobile menu button - Show on smaller screens */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full hover:bg-gradient-to-r hover:from-blue-50 hover:to-sky-50 transition-all duration-300"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5 text-gray-600" />
              ) : (
                <Menu className="h-5 w-5 text-gray-600" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-100 bg-white/95 backdrop-blur-lg">
            <div className="flex flex-col space-y-3 px-4">
              {user ? (
                <>
                  {/* User Info */}
                  <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
                    <div className="flex-shrink-0">
                      {renderAvatar('mobile')}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{userDisplayName}</div>
                      <div className="text-sm text-gray-500">{user.type === 'customer' ? 'Müşteri' : 'Nakliyeci'}</div>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <Link 
                    to={user ? '/home' : '/'} 
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Home className="h-4 w-4" />
                    <span>Ana Sayfa</span>
                  </Link>
                  
                  <Link 
                    to="/carriers" 
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Users className="h-4 w-4" />
                    <span>Nakliyeciler</span>
                  </Link>
                  
                  <Link 
                    to="/dashboard" 
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>{getDashboardTitleForRole(user.type)}</span>
                  </Link>
                  
                  <Link 
                    to="/debug" 
                    className="flex items-center space-x-3 text-gray-700 hover:text-red-600 transition-colors py-2 px-3 rounded-lg hover:bg-red-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="text-xs">🐛</span>
                    <span>Debug</span>
                  </Link>
                  
                  {user.type === 'customer' ? (
                    <>
                      <Link 
                        to="/offer-request" 
                        className="flex items-center space-x-3 text-gray-700 hover:text-green-600 transition-colors py-2 px-3 rounded-lg hover:bg-green-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Truck className="h-4 w-4" />
                        <span>Teklif Talebi</span>
                      </Link>
                      <Link 
                        to="/shipments" 
                        className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Truck className="h-4 w-4" />
                        <span>Taleplerim</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link 
                        to="/shipments" 
                        className="flex items-center space-x-3 text-gray-700 hover:text-orange-600 transition-colors py-2 px-3 rounded-lg hover:bg-orange-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Truck className="h-4 w-4" />
                        <span>Mevcut İşler</span>
                      </Link>
                      <Link 
                        to="/calendar" 
                        className="flex items-center space-x-3 text-gray-700 hover:text-orange-600 transition-colors py-2 px-3 rounded-lg hover:bg-orange-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Truck className="h-4 w-4" />
                        <span>Takvim</span>
                      </Link>
                    </>
                  )}
                  
                  <Link 
                    to="/carriers" 
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Truck className="h-4 w-4" />
                    <span>Nakliyeciler</span>
                  </Link>

                  <Link 
                    to="/profile" 
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <div 
                      className="flex items-center space-x-3 text-gray-700 hover:text-red-600 transition-colors py-3 px-3 rounded-lg hover:bg-red-50 cursor-pointer group"
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                    >
                      <div className="p-1 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                        <LogOut className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <div className="font-medium">Çıkış Yap</div>
                        <div className="text-xs text-gray-500">Hesabınızdan çıkış yapın</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Auth Section */}
                  <div className="space-y-3">
                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                      <div className="flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Giriş Yap</span>
                      </div>
                    </Link>
                    
                    {/* Mobile Kayıt Seçenekleri */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500 px-2">Kayıt Ol</div>
                      <Link to="/register-user" onClick={() => setIsMenuOpen(false)}>
                        <div className="flex items-center p-3 rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100 transition-all">
                          <div className="p-2 bg-gradient-to-r from-blue-500 to-sky-500 rounded-lg mr-3">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-blue-700">Müşteri</div>
                            <div className="text-xs text-blue-600">Taşıma talebi oluştur</div>
                          </div>
                        </div>
                      </Link>
                      <Link to="/carrier-info" onClick={() => setIsMenuOpen(false)}>
                        <div className="flex items-center p-3 rounded-xl bg-gradient-to-r from-sky-50 to-cyan-50 hover:from-sky-100 hover:to-cyan-100 transition-all">
                          <div className="p-2 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-lg mr-3">
                            <Truck className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-sky-700">Nakliyeci</div>
                            <div className="text-xs text-sky-600">Para kazan, iş bul</div>
                          </div>
                        </div>
                      </Link>
                    </div>
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