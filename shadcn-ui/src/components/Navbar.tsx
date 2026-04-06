import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Truck, User, LogOut, Menu, X, ChevronDown, Home, Users, HelpCircle, Package, History, CreditCard, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from './NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const { user, userType: userRole, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const userDisplayName = (() => {
    if (!user) return 'Kullanıcı';
    if (user.type === 'carrier') {
      return user.companyName ?? user.name ?? user.email?.split('@')[0] ?? 'Kullanıcı';
    }
    return user.firstName ?? user.name ?? user.email?.split('@')[0] ?? 'Kullanıcı';
  })();
  const userDisplayEmail = user?.email || (user?.type === 'customer' ? 'Müşteri' : 'Nakliyeci');

  const renderAvatar = (variant: 'desktop' | 'mobile' = 'desktop') => {
    if (!user) return null;
    const sizeClass = variant === 'desktop' ? 'w-8 h-8' : 'w-10 h-10';

    if (user.pictureUrl) {
      return (
        <img
          src={user.pictureUrl}
          alt={userDisplayName}
          className={`${sizeClass} rounded-full object-cover border border-blue-100 shadow-sm`}
        />
      );
    }

    const firstChar =
      (user.type === 'carrier'
        ? (user.companyName ?? user.name)
        : (user.firstName ?? user.name)
      )?.charAt(0).toUpperCase() ?? 'U';

    return (
      <div className={`${sizeClass} rounded-full flex items-center justify-center bg-[#2563EB] text-white font-bold ${variant === 'desktop' ? 'text-xs' : 'text-sm'}`}>
        {firstChar}
      </div>
    );
  };

  return (
    <nav className="bg-white sticky top-0 z-50 border-b border-[#E2E8F0]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
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
            <nav className="flex items-center space-x-1">
              {[
                { to: user ? '/home' : '/', label: 'Ana Sayfa', match: ['/home', '/'] },
                { to: '/nakliyeciler', label: 'Nakliyeciler', match: ['/nakliyeciler'] },
                ...(userRole === 'customer' ? [{ to: '/teklif-talebi', label: 'Teklif Talebi', match: ['/teklif-talebi'] }] : []),
              ].map(link => {
                const isActive = link.match.some(m => location.pathname === m || (m !== '/' && location.pathname.startsWith(m)));
                return (
                  <Link key={link.to} to={link.to}
                    className={`relative px-3 py-2 text-[14px] font-medium transition-colors ${
                      isActive ? 'text-[#2563EB]' : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {link.label}
                    {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB] rounded-full" />}
                  </Link>
                );
              })}

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
                    <Link to="/nasil-calisir-musteri" className="w-full cursor-pointer group">
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
                    <Link to="/nasil-calisir-nakliyeci" className="w-full cursor-pointer group">
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

            {user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-full cursor-pointer hover:bg-[#F1F5F9] transition-colors">
                      {renderAvatar()}
                      <span className="text-sm font-medium text-[#0F172A] max-w-40 truncate">{userDisplayName}</span>
                      <ChevronDown className="h-3 w-3 text-[#94A3B8]" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[220px] p-2 bg-white border border-gray-200 rounded-xl shadow-2xl">
                    {/* Kullanıcı Bilgisi */}
                    <div className="flex items-center gap-3 px-3 py-3 mb-1">
                      <div className="flex-shrink-0">
                        {user.pictureUrl ? (
                          <img src={user.pictureUrl} alt={userDisplayName} className="w-10 h-10 rounded-full object-cover border border-blue-100" />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${user.type === 'customer' ? 'bg-gradient-to-br from-blue-500 to-sky-500' : 'bg-gradient-to-br from-sky-500 to-cyan-500'}`}>
                            {(userDisplayName || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{userDisplayName}</p>
                        <p className="text-xs text-gray-500 truncate">{userDisplayEmail}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="my-1" />

                    {/* Müşteri menüsü */}
                    {userRole === 'customer' && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/profilim" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer w-full text-sm text-gray-700">
                            <User className="h-4 w-4 text-gray-500" /> Profilim
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/ilanlarim" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer w-full text-sm text-gray-700">
                            <Package className="h-4 w-4 text-gray-500" /> İlanlarım
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/tekliflerim" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer w-full text-sm text-gray-700">
                            <TrendingUp className="h-4 w-4 text-gray-500" /> Tekliflerim
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/gecmis" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer w-full text-sm text-gray-700">
                            <History className="h-4 w-4 text-gray-500" /> Geçmişim
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Nakliyeci menüsü */}
                    {userRole === 'carrier' && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/profilim" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer w-full text-sm text-gray-700">
                            <User className="h-4 w-4 text-gray-500" /> Profilim
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/tekliflerim" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer w-full text-sm text-gray-700">
                            <TrendingUp className="h-4 w-4 text-gray-500" /> Tekliflerim
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/nakliyeci/kazanc" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer w-full text-sm text-gray-700">
                            <CreditCard className="h-4 w-4 text-gray-500" /> Kazançlarım
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/takvim" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer w-full text-sm text-gray-700">
                            <Calendar className="h-4 w-4 text-gray-500" /> Takvim
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 cursor-pointer text-sm text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Çıkış Yap
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/giris">
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
                      <Link to="/musteri-kayit" className="w-full cursor-pointer group">
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
                      <Link to="/nakliyeci-bilgi" className="w-full cursor-pointer group">
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
                      <div className="text-sm text-gray-500">{userDisplayEmail}</div>
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
                    to="/nakliyeciler" 
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Users className="h-4 w-4" />
                    <span>Nakliyeciler</span>
                  </Link>

                  <Link
                    to={userRole === 'carrier' ? '/nasil-calisir-nakliyeci' : '/nasil-calisir-musteri'}
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>Nasıl Çalışır</span>
                  </Link>
                  
                  {userRole === 'customer' ? (
                    <>
                      <Link 
                        to="/teklif-talebi" 
                        className="flex items-center space-x-3 text-gray-700 hover:text-green-600 transition-colors py-2 px-3 rounded-lg hover:bg-green-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Truck className="h-4 w-4" />
                        <span>Teklif Talebi</span>
                      </Link>
                      <Link 
                        to="/ilanlarim" 
                        className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Truck className="h-4 w-4" />
                        <span>İlanlarım</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link 
                        to="/tekliflerim" 
                        className="flex items-center space-x-3 text-gray-700 hover:text-orange-600 transition-colors py-2 px-3 rounded-lg hover:bg-orange-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Truck className="h-4 w-4" />
                        <span>Tekliflerim</span>
                      </Link>
                      <Link
                        to="/nakliyeci/kazanc"
                        className="flex items-center space-x-3 text-gray-700 hover:text-orange-600 transition-colors py-2 px-3 rounded-lg hover:bg-orange-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Truck className="h-4 w-4" />
                        <span>Kazançlarım</span>
                      </Link>
                      <Link 
                        to="/takvim" 
                        className="flex items-center space-x-3 text-gray-700 hover:text-orange-600 transition-colors py-2 px-3 rounded-lg hover:bg-orange-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Truck className="h-4 w-4" />
                        <span>Takvim</span>
                      </Link>
                    </>
                  )}

                  <Link 
                    to="/profilim" 
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>Profilim</span>
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
                  <Link
                    to="/"
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Home className="h-4 w-4" />
                    <span>Ana Sayfa</span>
                  </Link>
                  <Link
                    to="/nakliyeciler"
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Users className="h-4 w-4" />
                    <span>Nakliyeciler</span>
                  </Link>
                  <Link
                    to="/nasil-calisir-musteri"
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 transition-colors py-2 px-3 rounded-lg hover:bg-blue-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>Nasıl Çalışır</span>
                  </Link>

                  {/* Auth Section */}
                  <div className="space-y-3">
                    <Link to="/giris" onClick={() => setIsMenuOpen(false)}>
                      <div className="flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Giriş Yap</span>
                      </div>
                    </Link>
                    
                    {/* Mobile Kayıt Seçenekleri */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500 px-2">Kayıt Ol</div>
                      <Link to="/musteri-kayit" onClick={() => setIsMenuOpen(false)}>
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
                      <Link to="/nakliyeci-bilgi" onClick={() => setIsMenuOpen(false)}>
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