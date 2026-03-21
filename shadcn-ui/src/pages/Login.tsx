import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Truck, User, Eye, EyeOff, ArrowRight, ShieldCheck, IdCard, Rocket, Brain, Award, AlertCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
// import { mockCarriers, mockCustomers } from '@/lib/mockData';
import { setSessionUser, getLastEmail, setLastEmail } from '@/lib/storage';

// API Base URL - using Vite proxy
const API_BASE_URL = '/api/v1';

export default function Login() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<'customer' | 'carrier'>('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberEmail, setRememberEmail] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'customer' || typeParam === 'carrier') {
      setUserType(typeParam);
    }
    // Prefill last email if available
    const last = getLastEmail();
    if (last) setEmail(last);
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Gerçek API'ye POST isteği gönder
      const endpoint = userType === 'customer' ? '/customers/login' : '/carriers/login';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // Başarılı giriş
        console.log('✅ Login successful:', result.data);
        
        // Token'ı localStorage'a kaydet
        if (result.data.token) {
          localStorage.setItem('authToken', result.data.token);
        }
        
        // Kullanıcı bilgilerini session'a kaydet
        if (userType === 'customer') {
          setSessionUser({ ...result.data.customer, type: 'customer' }, 5 * 24 * 60 * 60 * 1000);
        } else {
          const c = result.data.carrier;
          // Frontend User tipine uyum için: name=companyName, surname='' olarak set edilir
          const sessionCarrier = {
            id: c.id,
            name: c.companyName,
            surname: '',
            email: c.email,
            phone: c.phone || '',
            city: c.activityCity || '',
            type: 'carrier' as const,
            createdAt: c.createdAt || new Date().toISOString(),
          } as any;
          setSessionUser(sessionCarrier, 5 * 24 * 60 * 60 * 1000);
        }
        
        // Remember email preference
        if (rememberEmail) {
          setLastEmail(email);
        } else {
          setLastEmail(null);
        }
        
        // Navbar'ı güncelle
        window.dispatchEvent(new Event('userLogin'));
        
        // Giriş yapıldı mesajı göster
        setError('✅ Giriş yapıldı! Yönlendiriliyor...');
        
        // Kısa bir gecikme sonrası yönlendir
        setTimeout(() => {
          const redirect = searchParams.get('redirect');
          navigate(redirect || '/home');
        }, 1000);
      } else {
        // Hata durumu
        const errorMessage = result.message || 'Giriş sırasında bir hata oluştu.';
        setError(`❌ ${errorMessage}`);
        console.error('Login error:', result);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      setError('🔴 Bağlantı hatası! Lütfen internet bağlantınızı kontrol edin.');
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
                <Tabs value={userType} onValueChange={(value) => setUserType(value as 'customer' | 'carrier')} className="w-full">
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
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                      E-posta Adresi
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@email.com"
                      className="h-12 bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300"
                      required
                    />
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
                      to="/register-user" 
                      className="group p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-200/50 text-green-700 rounded-xl hover:from-green-500/20 hover:to-emerald-500/20 transition-all duration-300 text-center font-medium hover:scale-105"
                    >
                      Müşteri Kaydı
                    </Link>
                    <Link 
                      to="/register-carrier" 
                      className="group p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 backdrop-blur-sm border border-orange-200/50 text-orange-700 rounded-xl hover:from-orange-500/20 hover:to-red-500/20 transition-all duration-300 text-center font-medium hover:scale-105"
                    >
                      Nakliyeci Kaydı
                    </Link>
                  </div>
                </div>
                
                {/* Demo Hesapları - Tek tıkla doldur */}
                <div className="p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-2xl border border-blue-200/30">
                  <div className="flex items-center space-x-2 mb-3">
                    <Award className="h-5 w-5 text-blue-600" />
                    <p className="font-bold text-blue-900">Demo Hesapları</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-blue-800 font-medium">👤 Müşteri: eren@gmail.com (ues2141)</p>
                      <Button size="sm" variant="secondary" className="bg-white/70"
                        onClick={() => { setUserType('customer'); setEmail('eren@gmail.com'); setPassword('ues2141'); }}>
                        Doldur
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-blue-800 font-medium">👤 Müşteri: customer1@example.com (customer123)</p>
                      <Button size="sm" variant="secondary" className="bg-white/70"
                        onClick={() => { setUserType('customer'); setEmail('customer1@example.com'); setPassword('customer123'); }}>
                        Doldur
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-blue-800 font-medium">🚛 Nakliyeci: demo@tasiburada.com (demo123)</p>
                      <Button size="sm" variant="secondary" className="bg-white/70"
                        onClick={() => { setUserType('carrier'); setEmail('demo@tasiburada.com'); setPassword('demo123'); }}>
                        Doldur
                      </Button>
                    </div>
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