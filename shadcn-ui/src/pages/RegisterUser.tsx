import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Clock, Star, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

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
  if (password.length > 50) return 'Şifre en fazla 50 karakter olabilir';
  if (!/(?=.*[A-Z])/.test(password)) return 'Şifre en az bir büyük harf içermeli';
  if (!/(?=.*[0-9])/.test(password)) return 'Şifre en az bir rakam içermeli';
  return '';
};

export default function RegisterUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((p) => ({ ...p, [field]: value }));
    if (typeof value === 'string') {
      let error = '';
      switch (field) {
        case 'firstName':
          error = value.length < 2 ? 'Ad en az 2 karakter olmalı' : '';
          break;
        case 'lastName':
          error = value.length < 2 ? 'Soyad en az 2 karakter olmalı' : '';
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
      firstName: formData.firstName.length < 2 ? 'Ad en az 2 karakter olmalı' : '',
      lastName: formData.lastName.length < 2 ? 'Soyad en az 2 karakter olmalı' : '',
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      confirmPassword: formData.password !== formData.confirmPassword ? 'Şifreler eşleşmiyor' : '',
      acceptTerms: !formData.acceptTerms ? 'Kullanım koşullarını kabul etmelisiniz' : '',
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e !== '')) return;

    setIsLoading(true);
    try {
      const response = await apiClient(`${API_BASE_URL}/customers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const customer = result.data?.customer;
        const token = result.data?.token;
        login(token, {
          id: customer.id,
          name: customer.firstName,
          surname: customer.lastName,
          email: customer.email,
          phone: '',
          city: '',
          type: 'customer',
          createdAt: new Date(),
          pictureUrl: null,
        });
        toast({
          title: 'Kayıt başarılı!',
          description: 'E-posta adresinize doğrulama linki gönderdik.',
        });
        navigate('/');
      } else {
        toast({
          title: 'Hata',
          description: result?.message || 'Kayıt sırasında bir hata oluştu.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Bağlantı Hatası',
        description: (error as Error).message || 'Sunucuya ulaşılamadı.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit =
    formData.firstName &&
    formData.lastName &&
    formData.email &&
    formData.password &&
    formData.confirmPassword &&
    formData.acceptTerms &&
    !Object.values(errors).some((e) => e !== '');

  return (
    <section className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-start justify-center px-12">
      <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-16">
        {/* Sol — tanıtım */}
        <div className="space-y-12 pt-12">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
              Taşıma İhtiyacınız İçin <span className="block text-green-600">En İyi Çözüm</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-lg">
              Güvenilir nakliyecilerle tanışın, fiyatları karşılaştırın.
            </p>
          </div>
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg"><Shield className="h-6 w-6 text-blue-600" /></div>
              <div>
                <h3 className="text-lg font-semibold">Güvenli Ödeme</h3>
                <p className="text-base text-gray-600">Ödemeniz güvende, teslimat sonrası nakliyeciye aktarılır.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg"><Clock className="h-6 w-6 text-purple-600" /></div>
              <div>
                <h3 className="text-lg font-semibold">Hızlı Eşleşme</h3>
                <p className="text-base text-gray-600">Dakikalar içinde size uygun nakliyeciler.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-yellow-100 rounded-lg"><Star className="h-6 w-6 text-yellow-600" /></div>
              <div>
                <h3 className="text-lg font-semibold">Puanlama Sistemi</h3>
                <p className="text-base text-gray-600">Gerçek müşteri değerlendirmeleri.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ — form */}
        <Card className="w-full max-w-lg mx-auto shadow-xl border-0 mt-20">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">Müşteri Kaydı</CardTitle>
            <CardDescription className="text-lg">Hesabınızı birkaç saniyede oluşturun</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Ad / Soyad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Ad *</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    className={`h-12 mt-1 ${errors.firstName ? 'border-red-500' : ''}`}
                    placeholder="Adınız"
                    required
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <Label>Soyad *</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className={`h-12 mt-1 ${errors.lastName ? 'border-red-500' : ''}`}
                    placeholder="Soyadınız"
                    required
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>
              </div>

              {/* E-posta */}
              <div>
                <Label>E-posta *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`h-12 mt-1 ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="ornek@email.com"
                  required
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Şifre */}
              <div>
                <Label>Şifre *</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className={`h-12 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="En az 8 karakter, 1 büyük harf, 1 rakam"
                    required
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
                <p className="text-xs text-gray-500 mt-1">En az 8 karakter, 1 büyük harf, 1 rakam</p>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              {/* Şifre Tekrar */}
              <div>
                <Label>Şifre Tekrar *</Label>
                <div className="relative mt-1">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className={`h-12 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="Şifrenizi tekrar girin"
                    required
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

              {/* Şartlar */}
              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={(e) => handleChange('acceptTerms', e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="acceptTerms" className="text-sm text-gray-700">
                  <Link to="/kullanim-sartlari" className="text-blue-600 hover:underline">Kullanım Koşulları</Link>
                  {' '}ve{' '}
                  <Link to="/gizlilik-politikasi" className="text-blue-600 hover:underline">Gizlilik Politikası</Link>'nı
                  okudum ve kabul ediyorum.
                </label>
              </div>
              {errors.acceptTerms && <p className="text-red-500 text-sm">{errors.acceptTerms}</p>}

              {/* Gönder */}
              <Button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Kaydediliyor...</>
                ) : (
                  'Kayıt Ol'
                )}
              </Button>
            </form>

            <div className="text-center pt-4 border-t mt-4">
              <p className="text-sm text-gray-600">
                Zaten hesabınız var mı?{' '}
                <Link to="/giris" className="text-blue-600 hover:underline font-medium">Giriş yapın</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
