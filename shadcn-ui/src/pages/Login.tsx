import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Truck, User, Eye, EyeOff, ArrowRight, ShieldCheck, IdCard, Rocket, Brain, AlertCircle, XCircle, WifiOff } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
// import { mockCarriers, mockCustomers } from '@/lib/mockData';
import { getLastEmail, setLastEmail } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

// API Base URL - using Vite proxy
const API_BASE_URL = '/api/v1';

export default function Login() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<'customer' | 'carrier'>('customer');
  const [userTypeManuallySelected, setUserTypeManuallySelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState<number | undefined>();
  const [rememberEmail, setRememberEmail] = useState(true);
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'customer' || typeParam === 'carrier') {
      setUserType(typeParam);
    }
    // Prefill last email if available
    const last = getLastEmail();
    if (last) setEmail(last);
  }, [searchParams]);

  const handleEmailBlur = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;
    setIsCheckingEmail(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/auth/check-email?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (json?.success && (json.userType === 'customer' || json.userType === 'carrier')) {
        setUserType(json.userType);
      }
    } catch { /* ignore — sessiz hata */ } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setErrorStatus(undefined);

    try {
      const endpoint = userType === 'customer' ? '/customers/login' : '/carriers/login';
      const body = JSON.stringify({ email, password });
      const headers = { 'Content-Type': 'application/json' };

      const response = await apiClient(`${API_BASE_URL}${endpoint}`, { method: 'POST', headers, body });
      const result = await response.json();

      if (response.ok && result.success) {
        let sessionUser;
        if (userType === 'customer') {
          sessionUser = { ...result.data.customer, type: 'customer' as const };
        } else {
          const c = result.data.carrier;
          sessionUser = {
            id: c.id,
            name: c.companyName,
            surname: '',
            email: c.email,
            phone: c.phone || '',
            city: c.activityCity || '',
            type: 'carrier' as const,
            createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
            pictureUrl: c.pictureUrl ?? null,
          };
        }

        authLogin(result.data.token, sessionUser);

        if (rememberEmail) {
          setLastEmail(email);
        } else {
          setLastEmail(null);
        }

        toast({ title: 'Giriş başarılı', description: 'Yönlendiriliyor...' });
        setTimeout(() => {
          const redirect = searchParams.get('redirect');
          navigate(redirect || '/home');
        }, 1000);
      } else {
        const status = response.status;
        setErrorStatus(status);
        let errorMessage = result.message || 'Giriş sırasında bir hata oluştu.';
        if (status === 403) {
          errorMessage = userType === 'carrier'
            ? 'Bu hesap bir müşteri hesabıdır. Lütfen "Müşteri" sekmesinden giriş yapın.'
            : 'Bu hesap bir nakliyeci hesabıdır. Lütfen "Nakliyeci" sekmesinden giriş yapın.';
        } else if (status === 404) {
          errorMessage = 'Bu e-posta adresiyle kayıtlı hesap bulunamadı.';
        } else if (status === 429) {
          errorMessage = 'Çok fazla başarısız deneme. Lütfen birkaç dakika bekleyin.';
        }
        setError(errorMessage);
      }
    } catch {
      setErrorStatus(undefined);
      setError('Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding & Features */}
          <div className="hidden lg:block space-y-8 animate-in fade-in slide-in-from-left duration-1000">
            <div className="space-y-6">
              {/* Branding link removed per request */}
              
              <div className="space-y-4">
                <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                  Türkiye'nin
                  <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    En Güvenilir
                  </span>
                  <span className="block text-gray-700">Nakliye Platformu</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                  Nakliyeci ile müşteri arasındaki iletişimi dijitalleştiren, 
                  güvenli ve şeffaf taşıma hizmeti
                </p>
              </div>
            </div>

            {/* Features with Glassmorphism */}
            <div className="space-y-4">
              <div className="group p-6 bg-white/40 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl hover:bg-white/50 transition-all duration-300 hover:scale-105">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg group-hover:shadow-green-500/25 transition-shadow">
                    <ShieldCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">Güvenli İşlem Altyapısı</h3>
                    <p className="text-gray-600 font-normal">SSL şifreleme ve doğrulanmış ödeme sistemiyle koruma altında</p>
                  </div>
                </div>
              </div>
              
              <div className="group p-6 bg-white/40 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl hover:bg-white/50 transition-all duration-300 hover:scale-105">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-lg group-hover:shadow-amber-500/25 transition-shadow">
                    <IdCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">Kimliği Doğrulanmış Nakliyeciler</h3>
                    <p className="text-gray-600 font-normal">Tüm nakliyeciler resmi belgelerle kayıtlı ve onaylı</p>
                  </div>
                </div>
              </div>
              
              <div className="group p-6 bg-white/40 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl hover:bg-white/50 transition-all duration-300 hover:scale-105">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg group-hover:shadow-blue-500/25 transition-shadow">
                    <Rocket className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">Yükselen Dijital Nakliye Platformu</h3>
                    <p className="text-gray-600 font-normal">Modern altyapı ve kullanıcı odaklı tasarımla geliştirildi</p>
                  </div>
                </div>
              </div>

              <div className="group p-6 bg-white/40 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl hover:bg-white/50 transition-all duration-300 hover:scale-105">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl shadow-lg group-hover:shadow-purple-500/25 transition-shadow">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">Akıllı Eşleştirme Teknolojisi</h3>
                    <p className="text-gray-600 font-normal">Yapay zeka destekli sistem en uygun nakliyeciyi saniyeler içinde bulur</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Stats section removed: the space-y keeps consistent spacing above */}
          </div>

          {/* Right Side - Login Form with Glassmorphism */}
          <div className="w-full max-w-md mx-auto lg:mx-0 animate-in fade-in slide-in-from-right duration-1000">
            <Card className="backdrop-blur-xl bg-white/30 border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:bg-white/40">
              <CardHeader className="text-center pt-6 pb-8 space-y-4">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Hoş Geldiniz
                </CardTitle>
                <CardDescription className="text-gray-600 text-lg">
                  Hesabınıza giriş yaparak taşıma işlemlerinizi yönetin
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <Tabs value={userType} onValueChange={(value) => { setUserType(value as 'customer' | 'carrier'); setUserTypeManuallySelected(true); setError(''); setErrorStatus(undefined); }} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/50 backdrop-blur-sm">
                    <TabsTrigger value="customer" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
                      <User className="h-4 w-4" />
                      <span>Müşteri</span>
                    </TabsTrigger>
                    <TabsTrigger value="carrier" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
                      <Truck className="h-4 w-4" />
                      <span>Nakliyeci</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {error && (() => {
                  const errorType = !errorStatus ? 'network' : errorStatus === 403 ? 'wrong-type' : errorStatus === 401 ? 'wrong-credentials' : errorStatus === 429 ? 'rate-limit' : 'generic';
                  return (
                    <div className={[
                      'flex items-start gap-3 p-3 rounded-lg border text-sm',
                      errorType === 'wrong-type'        ? 'bg-blue-50 border-blue-200 text-blue-800'   : '',
                      errorType === 'wrong-credentials' ? 'bg-red-50 border-red-200 text-red-800'     : '',
                      errorType === 'network'           ? 'bg-orange-50 border-orange-200 text-orange-800' : '',
                      errorType === 'rate-limit'        ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : '',
                      errorType === 'generic'           ? 'bg-red-50 border-red-200 text-red-800'     : '',
                    ].join(' ').trim()}>
                      {errorType === 'wrong-type' ? (
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : errorType === 'network' ? (
                        <WifiOff className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">{error}</p>
                        {errorType === 'wrong-type' && (
                          <button
                            type="button"
                            className="mt-1 underline text-xs font-semibold"
                            onClick={() => {
                              setUserType(userType === 'carrier' ? 'customer' : 'carrier');
                              setError('');
                              setErrorStatus(undefined);
                            }}
                          >
                            {userType === 'carrier' ? 'Müşteri sekmesine geç →' : 'Nakliyeci sekmesine geç →'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
                
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                      E-posta Adresi
                    </Label>
                    <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={handleEmailBlur}
                      placeholder="ornek@email.com"
                      className="h-12 bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300"
                      required
                    />
                    {isCheckingEmail && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                      Şifre
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Şifrenizi girin"
                        className="h-12 pr-12 bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  {/* Remember me */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        id="rememberEmail"
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(e) => setRememberEmail(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="rememberEmail" className="text-sm text-gray-600">E-postayı hatırla</label>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/sifremi-unuttum')}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                    >
                      Şifremi Unuttum?
                    </button>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Giriş yapılıyor...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <span>Giriş Yap</span>
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    )}
                  </Button>
                </form>
                
                <div className="text-center space-y-4">
                  <p className="text-gray-600 font-medium">
                    Hesabınız yok mu?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Link 
                      to="/musteri-kayit" 
                      className="group p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-200/50 text-green-700 rounded-xl hover:from-green-500/20 hover:to-emerald-500/20 transition-all duration-300 text-center font-medium hover:scale-105"
                    >
                      Müşteri Kaydı
                    </Link>
                    <Link 
                      to="/nakliyeci-kayit" 
                      className="group p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 backdrop-blur-sm border border-orange-200/50 text-orange-700 rounded-xl hover:from-orange-500/20 hover:to-red-500/20 transition-all duration-300 text-center font-medium hover:scale-105"
                    >
                      Nakliyeci Kaydı
                    </Link>
                  </div>
                </div>
                

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}