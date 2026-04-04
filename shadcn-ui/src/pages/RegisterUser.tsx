import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, ArrowRight, ArrowLeft, Shield, Clock, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
// import { addNewCustomer } from '@/lib/mockData';
import { setSessionUser } from '@/lib/storage';
import { CITIES_TR, getDistrictsForCity } from '@/lib/locations';
import { useToast } from '@/hooks/use-toast';

// API Base URL - using Vite proxy
const API_BASE_URL = '/api/v1';

// Validasyon fonksiyonları
const validateEmail = (email: string): string => {
  if (!email) return 'E-posta adresi gerekli';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Geçerli bir e-posta adresi giriniz';
  return '';
};

const validatePhone = (phone: string): string => {
  if (!phone) return 'Telefon numarası gerekli';
  // Türk telefon numarası formatları: +90 5XX XXX XX XX veya 05XX XXX XX XX
  const phoneRegex = /^(\+90|0)?5[0-9]{2}[0-9]{3}[0-9]{2}[0-9]{2}$/;
  const cleanPhone = phone.replace(/[\s-()]/g, ''); // Boşluk, tire ve parantez temizle
  if (!phoneRegex.test(cleanPhone)) return 'Geçerli bir cep telefonu numarası giriniz (5XX XXX XX XX)';
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

const validateName = (name: string, field: string): string => {
  if (!name) return `${field} gerekli`;
  if (name.length < 2) return `${field} en az 2 karakter olmalı`;
  if (name.length > 50) return `${field} en fazla 50 karakter olabilir`;
  if (!/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/.test(name)) return `${field} sadece harf içerebilir`;
  return '';
};

export default function RegisterUser() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [districts, setDistricts] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    district: '',
    cityText: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const { toast } = useToast();
  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  // İl değiştiğinde ilçeleri yükle
  useEffect(() => {
    (async () => {
      if (formData.cityText) {
        const districtsList = await getDistrictsForCity(formData.cityText);
        setDistricts(districtsList);
      } else {
        setDistricts([]);
      }
      // İl değiştiğinde ilçeyi temizle
      setFormData(prev => ({ ...prev, district: '' }));
    })();
  }, [formData.cityText]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((p) => ({ ...p, [field]: value }));
    
    // Anlık validasyon (sadece string alanlar için)
    if (typeof value === 'string') {
      let error = '';
      switch (field) {
        case 'name':
          error = validateName(value, 'Ad');
          break;
        case 'surname':
          error = validateName(value, 'Soyad');
          break;
        case 'email':
          error = validateEmail(value);
          break;
        case 'phone':
          error = validatePhone(value);
          break;
        case 'password':
          error = validatePassword(value);
          break;
        case 'confirmPassword':
          error = value !== formData.password ? 'Şifreler eşleşmiyor' : '';
          break;
        case 'addressLine1':
          error = !value ? 'Adres bilgisi gerekli' : '';
          break;
      }
      
      setErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validasyon
    if (!validateCurrentStep(3)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Gerçek API'ye POST isteği gönder
      const response = await fetch(`${API_BASE_URL}/customers/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.name,
          lastName: formData.surname,
          email: formData.email,
          phone: formData.phone,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          city: formData.cityText,
          district: formData.district,
          password: formData.password,
        }),
      });

      // Response'un content type'ını kontrol et
      const contentType = response.headers.get('content-type');
      
      let result;
      try {
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          // JSON değilse text olarak al
          const textResponse = await response.text();
          throw new Error(`Server returned non-JSON response: ${textResponse.substring(0, 200)}...`);
        }
      } catch {
        throw new Error('Server response could not be parsed as JSON. Backend might be down or returning HTML error page.');
      }
      
      if (response.ok && result && result.success) {
        // Başarılı kayıt
        toast({ title: 'Başarılı', description: 'Kayıt başarıyla tamamlandı! E-posta adresinizi doğrulayın.' });
        navigate(`/eposta-dogrula?email=${encodeURIComponent(formData.email)}&userType=customer`);
      } else {
        // Hata durumu
        const errorMessage = result?.message || `HTTP ${response.status}: ${response.statusText}`;
        toast({ title: 'Hata', description: errorMessage, variant: 'destructive' });
      }
    } catch (error) {
      // Daha detaylı hata mesajı
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        toast({ title: 'Bağlantı Hatası', description: 'Backend sunucusuna erişim sorunu! Sunucu çalışıyor mu kontrol edin.', variant: 'destructive' });
      } else {
        toast({ title: 'Bağlantı Hatası', description: (error as Error).message || 'Bilinmeyen hata oluştu.', variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step validasyonları
  const validateCurrentStep = (step: number): boolean => {
    let stepErrors: Record<string, string> = {};
    
    if (step === 1) {
      stepErrors.name = validateName(formData.name, 'Ad');
      stepErrors.surname = validateName(formData.surname, 'Soyad');
      stepErrors.email = validateEmail(formData.email);
    } else if (step === 2) {
      stepErrors.phone = validatePhone(formData.phone);
      stepErrors.addressLine1 = !formData.addressLine1 ? 'Adres bilgisi gerekli' : '';
      stepErrors.cityText = !formData.cityText ? 'Şehir seçimi gerekli' : '';
      stepErrors.district = !formData.district ? 'İlçe seçimi gerekli' : '';
    } else if (step === 3) {
      stepErrors.password = validatePassword(formData.password);
      stepErrors.confirmPassword = formData.password !== formData.confirmPassword ? 'Şifreler eşleşmiyor' : '';
      if (!formData.acceptTerms) stepErrors.acceptTerms = 'Kullanım koşullarını kabul etmelisiniz';
    }
    
    // Hataları güncelle
    setErrors(prev => ({ ...prev, ...stepErrors }));
    
    // Hiç hata yoksa true döndür
    return !Object.values(stepErrors).some(error => error !== '');
  };

  const nextStep = () => {
    if (validateCurrentStep(currentStep)) {
      setCurrentStep((s) => Math.min(totalSteps, s + 1));
    }
  };
  
  const prevStep = () => setCurrentStep((s) => Math.max(1, s - 1));

  const canProceedStep1 = formData.name && formData.surname && formData.email && 
    !errors.name && !errors.surname && !errors.email;
  const canProceedStep2 = formData.phone && formData.addressLine1 && formData.cityText && formData.district &&
    !errors.phone && !errors.addressLine1;
  const canSubmit = formData.password && formData.confirmPassword && formData.acceptTerms &&
    !errors.password && !errors.confirmPassword;

  return (
    <section className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-start justify-center px-12">
      <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-16">
        {/* SOL TARAF (tanıtım) */}
        <div className="space-y-12 pt-12">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
              Taşıma İhtiyacınız İçin <span className="block text-green-600">En İyi Çözüm</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-lg">Güvenilir nakliyecilerle tanışın, fiyatları karşılaştırın.</p>
          </div>
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg"><Shield className="h-6 w-6 text-blue-600"/></div>
              <div>
                <h3 className="text-lg font-semibold">Güvenli Ödeme</h3>
                <p className="text-base text-gray-600">Ödemeniz güvende, teslimat sonrası nakliyeciye aktarılır.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg"><Clock className="h-6 w-6 text-purple-600"/></div>
              <div>
                <h3 className="text-lg font-semibold">Hızlı Eşleşme</h3>
                <p className="text-base text-gray-600">Dakikalar içinde size uygun nakliyeciler.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-yellow-100 rounded-lg"><Star className="h-6 w-6 text-yellow-600"/></div>
              <div>
                <h3 className="text-lg font-semibold">Puanlama Sistemi</h3>
                <p className="text-base text-gray-600">Gerçek müşteri değerlendirmeleri.</p>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ FORM */}
        <Card className="w-full max-w-lg mx-auto shadow-xl border-0 mt-20">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">Müşteri Kaydı</CardTitle>
            <CardDescription className="text-lg">Adım {currentStep} / {totalSteps} - Hesabınızı oluşturun</CardDescription>
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1 */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Ad</Label>
                      <Input 
                        value={formData.name} 
                        onChange={(e)=>handleChange('name', e.target.value)} 
                        className={`h-12 mt-1 ${errors.name ? 'border-red-500' : ''}`}
                        required 
                      />
                      {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <Label>Soyad</Label>
                      <Input 
                        value={formData.surname} 
                        onChange={(e)=>handleChange('surname', e.target.value)} 
                        className={`h-12 mt-1 ${errors.surname ? 'border-red-500' : ''}`}
                        required 
                      />
                      {errors.surname && <p className="text-red-500 text-sm mt-1">{errors.surname}</p>}
                    </div>
                  </div>
                  <div>
                    <Label>E-posta</Label>
                    <Input 
                      type="email" 
                      value={formData.email} 
                      onChange={(e)=>handleChange('email', e.target.value)} 
                      className={`h-12 mt-1 ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="ornek@email.com"
                      required 
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                </div>
              )}

              {/* Step 2: Manuel adres */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <Label>Telefon</Label>
                    <Input 
                      type="tel" 
                      value={formData.phone} 
                      onChange={(e)=>handleChange('phone', e.target.value)} 
                      className={`h-12 mt-1 ${errors.phone ? 'border-red-500' : ''}`}
                      placeholder="5XX XXX XX XX" 
                      required 
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <Label>Adres Satırı 1</Label>
                    <Input 
                      value={formData.addressLine1} 
                      onChange={(e)=>handleChange('addressLine1', e.target.value)} 
                      className={`h-12 mt-1 ${errors.addressLine1 ? 'border-red-500' : ''}`}
                      placeholder="Mahalle" 
                      required 
                    />
                    {errors.addressLine1 && <p className="text-red-500 text-sm mt-1">{errors.addressLine1}</p>}
                  </div>
                  <div>
                    <Label>Adres Satırı 2</Label>
                    <Input 
                      value={formData.addressLine2} 
                      onChange={(e)=>handleChange('addressLine2', e.target.value)} 
                      className="h-12 mt-1" 
                      placeholder="Cadde / Sokak + No (opsiyonel)" 
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Şehir</Label>
                      <Select value={formData.cityText} onValueChange={(v) => handleChange('cityText', v)}>
                        <SelectTrigger className={`h-12 mt-1 ${errors.cityText ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="Şehir seçin" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {CITIES_TR.map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.cityText && <p className="text-red-500 text-sm mt-1">{errors.cityText}</p>}
                    </div>
                    <div>
                      <Label>İlçe</Label>
                      <Select value={formData.district} onValueChange={(v) => handleChange('district', v)}>
                        <SelectTrigger className={`h-12 mt-1 ${errors.district ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="İlçe seçin" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {districts.map((district) => (
                            <SelectItem key={district} value={district}>{district}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.district && <p className="text-red-500 text-sm mt-1">{errors.district}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <Label>Şifre</Label>
                    <Input 
                      type="password" 
                      value={formData.password} 
                      onChange={(e)=>handleChange('password', e.target.value)} 
                      className={`h-12 mt-1 ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="En az 6 karakter, harf ve rakam içermeli"
                      required 
                    />
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                  </div>
                  <div>
                    <Label>Şifre Tekrar</Label>
                    <Input 
                      type="password" 
                      value={formData.confirmPassword} 
                      onChange={(e)=>handleChange('confirmPassword', e.target.value)} 
                      className={`h-12 mt-1 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      placeholder="Şifrenizi tekrar giriniz"
                      required 
                    />
                    {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                  </div>
                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <input 
                      type="checkbox" 
                      id="acceptTerms" 
                      checked={formData.acceptTerms} 
                      onChange={(e)=>handleChange('acceptTerms', e.target.checked)} 
                      className="mt-1" 
                    />
                    <label htmlFor="acceptTerms" className="text-sm text-gray-700">
                      <Link to="/kullanim-sartlari" className="text-blue-600 hover:underline">Kullanım Koşulları</Link> ve{' '}
                      <Link to="/gizlilik-politikasi" className="text-blue-600 hover:underline">Gizlilik Politikası</Link>'nı okudum ve kabul ediyorum.
                    </label>
                  </div>
                  {errors.acceptTerms && <p className="text-red-500 text-sm mt-1">{errors.acceptTerms}</p>}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                {currentStep > 1 ? (
                  <Button type="button" variant="outline" onClick={prevStep} className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4"/> Geri
                  </Button>
                ) : <span />}

                {currentStep < totalSteps ? (
                  <Button type="button" onClick={nextStep} disabled={(currentStep===1 && !canProceedStep1) || (currentStep===2 && !canProceedStep2)} className="bg-gradient-to-r from-green-600 to-blue-600">İleri <ArrowRight className="h-4 w-4 ml-2"/></Button>
                ) : (
                  <Button type="submit" disabled={!canSubmit || isLoading} className="bg-gradient-to-r from-green-600 to-blue-600">
                    {isLoading ? 'Kaydediliyor…' : (<><span>Kayıt Ol</span> <CheckCircle className="h-4 w-4 ml-2"/></>)}
                  </Button>
                )}
              </div>
            </form>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600">Zaten hesabınız var mı? <Link to="/giris" className="text-blue-600 hover:underline font-medium">Giriş yapın</Link></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
