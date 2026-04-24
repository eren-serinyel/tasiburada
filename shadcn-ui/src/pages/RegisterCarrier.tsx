import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Users,
  Shield,
  Star,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { setSessionUser } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';

const API_BASE_URL = '/api/v1';

const validateEmail = (email: string): string => {
  if (!email) return 'E-posta adresi gerekli';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Geçerli bir e-posta adresi giriniz';
  return '';
};

const validatePassword = (password: string): string => {
  if (!password) return 'Şifre gerekli';
  if (password.length < 8) return 'Şifre en az 8 karakter olmalı';
  if (!/(?=.*[A-Z])/.test(password)) return 'Şifre en az bir büyük harf içermeli';
  if (!/(?=.*[a-z])/.test(password)) return 'Şifre en az bir küçük harf içermeli';
  if (!/(?=.*[0-9])/.test(password)) return 'Şifre en az bir rakam içermeli';
  return '';
};

export default function RegisterCarrier() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    taxOrRegistry: "",
    authorizedFullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((p) => ({ ...p, [field]: value }));
    if (typeof value === 'string') {
      let error = '';
      switch (field) {
        case 'companyName':
          error = value.trim().length < 2 ? 'Şirket adı en az 2 karakter olmalı' : '';
          break;
        case 'taxOrRegistry':
          error = !/^\d{10,16}$/.test(value) ? '10-16 hane arası rakam girmelisiniz' : '';
          break;
        case 'authorizedFullName':
          error = value.trim().length < 2 ? 'Ad Soyad en az 2 karakter olmalı' : '';
          break;
        case 'phone':
          error = !/^(?:\+90|0)?(5\d{9})$/.test(value.replace(/\s|-/g, '')) ? 'Geçerli bir telefon giriniz' : '';
          break;
        case 'email':
          error = validateEmail(value);
          break;
        case 'password':
          error = validatePassword(value);
          break;
        case 'confirmPassword':
          error = value !== formData.password ? 'Şifreler eşleşmiyor' : '';
          break;
      }
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {
      companyName: formData.companyName.trim().length < 2 ? 'Şirket adı en az 2 karakter olmalı' : '',
      taxOrRegistry: !/^\d{10,16}$/.test(formData.taxOrRegistry) ? 'Geçerli bir Vergi/TCKN giriniz' : '',
      authorizedFullName: formData.authorizedFullName.trim().length < 2 ? 'Yetkili adı en az 2 karakter olmalı' : '',
      phone: !/^(?:\+90|0)?(5\d{9})$/.test(formData.phone.replace(/\s|-/g, '')) ? 'Geçerli bir telefon giriniz' : '',
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      confirmPassword: formData.password !== formData.confirmPassword ? 'Şifreler eşleşmiyor' : '',
      acceptTerms: !formData.acceptTerms ? 'Kullanım koşullarını kabul etmelisiniz' : '',
    };

    setErrors(newErrors);
    if (Object.values(newErrors).some((err) => err !== '')) return;

    setIsLoading(true);
    try {
      const startYearNum = new Date().getFullYear();
      const normalizePhone = (p: string) => p.replace(/\s|-/g, '');

      const registerRes = await apiClient(`${API_BASE_URL}/carriers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          taxNumber: formData.taxOrRegistry,
          email: formData.email,
          phone: normalizePhone(formData.phone),
          contactName: formData.authorizedFullName,
          password: formData.password,
          foundedYear: startYearNum
        }),
      });

      const regJson = await registerRes.json().catch(() => ({}));
      if (!registerRes.ok || !regJson?.success) {
        throw new Error(regJson?.message || `Kayıt başarısız. (HTTP ${registerRes.status})`);
      }

      const c = regJson?.data?.carrier;
      const token = regJson?.data?.token;

      if (token) {
        localStorage.setItem('authToken', token);
      }

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

      // Profil taslaklarını doldur (prefill)
      try {
        localStorage.setItem(`carrier_company_${sessionCarrier.id}`, JSON.stringify({
          name: formData.companyName,
          taxNumber: formData.taxOrRegistry,
          year: String(startYearNum),
          services: [],
          vehicleTypes: []
        }));
      } catch { }

      window.dispatchEvent(new Event('userLogin'));
      toast({ title: 'Kayıt başarılı!', description: 'Hesabınız oluşturuldu, onboarding sayfasına yönlendiriliyorsunuz.' });
      navigate('/nakliyeci-onboarding');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kayıt sırasında bir hata oluştu.';
      toast({ title: 'Hata', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

    const canSubmit =
      formData.companyName &&
      formData.taxOrRegistry &&
      formData.authorizedFullName &&
      formData.phone &&
      formData.email &&
      formData.password &&
      formData.confirmPassword &&
      formData.acceptTerms &&
      !Object.values(errors).some((err) => err !== '');

  return (
    <section className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-start justify-center px-4 sm:px-12">
      <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-16">
        {/* SOL TARAF */}
        <div className="hidden lg:block space-y-12 pt-12">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
              Gelir Elde Etmenin{" "}
              <span className="block text-orange-600">En Kolay Yolu</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-lg">
              Boş araç kapasitelerinizi değerlendirin, yeni müşteriler kazanın,
              gelir artırın
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Gelir Artırın</h3>
                <p className="text-base text-gray-600">
                  Boş kapasitelerinizi değerlendirerek ek gelir elde edin
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Geniş Müşteri Ağı</h3>
                <p className="text-base text-gray-600">
                  Binlerce müşteriye ulaşın, iş fırsatlarınızı artırın
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Güvenli Ödeme</h3>
                <p className="text-base text-gray-600">
                  Ödemeniz garanti altında, iş bitiminde hesabınıza aktarılır
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ FORM */}
        <Card className="w-full max-w-lg mx-auto shadow-xl border-0 mt-10 sm:mt-20">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">Hızlı Nakliyeci Kaydı</CardTitle>
            <CardDescription className="text-lg">Sadece temel bilgilerle hemen başlayın</CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <Label>Şirket Adı *</Label>
                <Input 
                  value={formData.companyName} 
                  onChange={(e) => handleChange('companyName', e.target.value)} 
                  placeholder="Örn. ABC Lojistik A.Ş." 
                  className={`h-12 mt-1 ${errors.companyName ? 'border-red-500' : ''}`} 
                />
                {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>}
              </div>

              <div>
                <Label>Vergi Numarası / TCKN *</Label>
                <Input
                  inputMode="numeric"
                  value={formData.taxOrRegistry}
                  onChange={(e) => handleChange('taxOrRegistry', e.target.value.replace(/\D/g, ''))}
                  placeholder="10-11 haneli numara"
                  className={`h-12 mt-1 ${errors.taxOrRegistry ? 'border-red-500' : ''}`}
                  maxLength={16}
                />
                {errors.taxOrRegistry && <p className="text-red-500 text-sm mt-1">{errors.taxOrRegistry}</p>}
              </div>

              <div>
                <Label>Yetkili Kişi Ad Soyad *</Label>
                <Input 
                  value={formData.authorizedFullName} 
                  onChange={(e) => handleChange('authorizedFullName', e.target.value)} 
                  placeholder="Ad Soyad" 
                  className={`h-12 mt-1 ${errors.authorizedFullName ? 'border-red-500' : ''}`} 
                />
                {errors.authorizedFullName && <p className="text-red-500 text-sm mt-1">{errors.authorizedFullName}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Telefon *</Label>
                  <Input 
                    type="tel" 
                    value={formData.phone} 
                    onChange={(e) => handleChange('phone', e.target.value)} 
                    placeholder="05xx xxx xx xx" 
                    className={`h-12 mt-1 ${errors.phone ? 'border-red-500' : ''}`} 
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <Label>E-posta *</Label>
                  <Input 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => handleChange('email', e.target.value)} 
                    placeholder="ornek@firma.com" 
                    className={`h-12 mt-1 ${errors.email ? 'border-red-500' : ''}`} 
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
              </div>

              <div>
                <Label>Şifre *</Label>
                <div className="relative mt-1">
                  <Input 
                    type={showPassword ? 'text' : 'password'} 
                    value={formData.password} 
                    onChange={(e) => handleChange('password', e.target.value)} 
                    placeholder="En az 8 karakter, 1 büyük harf, 1 rakam" 
                    className={`h-12 pr-10 ${errors.password ? 'border-red-500' : ''}`} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <Label>Şifre Tekrar *</Label>
                <div className="relative mt-1">
                  <Input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    value={formData.confirmPassword} 
                    onChange={(e) => handleChange('confirmPassword', e.target.value)} 
                    placeholder="Şifrenizi tekrar girin" 
                    className={`h-12 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>

              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={(e) => handleChange('acceptTerms', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="acceptTerms" className="text-sm text-gray-700">
                  <Link to="/kullanim-sartlari" className="text-orange-600 hover:underline font-medium">Kullanım Koşulları</Link>
                  {' '}ve{' '}
                  <Link to="/gizlilik-politikasi" className="text-orange-600 hover:underline font-medium">Gizlilik Politikası</Link>'nı
                  okudum ve kabul ediyorum.
                </label>
              </div>
              {errors.acceptTerms && <p className="text-red-500 text-sm">{errors.acceptTerms}</p>}

              <div className="pt-2">
                                <Button 
                                  type="submit" 
                                  disabled={isLoading || !canSubmit} 
                                  className="w-full h-12 bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-700 hover:to-blue-700 shadow-lg"
                                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Oluşturuluyor...</>
                  ) : (
                    'Hesabı Oluştur ve Devam Et'
                  )}
                </Button>
                <div className="text-center pt-4 border-t mt-4">
                  <p className="text-sm text-gray-600">
                    Zaten hesabınız var mı?{' '}
                    <Link to="/giris" className="text-orange-600 hover:underline font-medium font-bold italic tracking-wider">Giriş yapın</Link>
                  </p>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
        </section>
  );
}

