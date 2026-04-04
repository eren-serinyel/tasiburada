import { useEffect, useMemo, useState } from "react";
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

} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { setSessionUser } from '@/lib/storage';
import { TURKISH_CITIES } from '@/lib/constants';
import MultiSelect from '@/components/ui/multi-select';
import { useToast } from '@/hooks/use-toast';
// import { cities as sharedCities, VEHICLE_TYPES as VEHICLE_TYPES_MAP, SPECIAL_SERVICES, ADDITIONAL_SERVICE_OPTIONS } from '@/lib/carrierFormConstants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import MultiSelect from "@/components/ui/multi-select";
// import FileUpload from "@/components/ui/file-upload";
// import { Checkbox } from "@/components/ui/checkbox";

// Paylaşılan sabitler
// const cities = sharedCities;
// const VEHICLE_TYPES: Record<string, { name: string; maxCapacity: number }> = VEHICLE_TYPES_MAP as any;

const API_BASE_URL = '/api/v1';

export default function RegisterCarrier() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [formData, setFormData] = useState({
    // 1. Şirket Bilgileri
    companyName: "",
    taxOrRegistry: "", // Vergi Numarası veya Ticaret Sicil No (10–15 hane)
    taxNumber: "", // eski alanlar mock uyumu için tutuluyor
    tradeRegistryNo: "",
    mersisNo: "",
    // 2. İletişim Bilgileri
    authorizedFullName: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    district: "",
    cityText: "", // Faaliyet İli (opsiyonel)
    addressLat: null as number | null,
    addressLng: null as number | null,
    useGps: false,
    gpsLat: null as number | null,
    gpsLng: null as number | null,
    // 3. Operasyonel Bilgiler
    vehicleTypes: [] as string[], // backend isimleri ile (örn. "Kamyon", "Kamyonet")
    // Seçilen her araç türü için kapasite (kg). key: araç türü adı (örn. "Kamyon")
    vehicleCapacities: {} as Record<string, { value: string; unit: 'kg' | 'ton' }>,
    licensePlate: "",
    serviceAreas: [] as string[],
    specialServices: [] as string[],
    additionalServices: {} as Record<string, string[]>,
    // 4. Belgeler
    kBelgesiFiles: [] as File[],
    insuranceFiles: [] as File[],
    driverFiles: [] as File[],
    // 5. Platform Kullanımı
    username: "",
    password: "",
    confirmPassword: "",
    iban: "",
    // Ek: mevcut mock ile uyum için
    baseFee: "",
    startYear: '' as string | number, // Kuruluş yılı (opsiyonel)
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const handleVehicleCapacityChange = (typeKey: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      vehicleCapacities: {
        ...prev.vehicleCapacities,
        [typeKey]: { value, unit: 'kg' },
      },
    }));
  };

  // Araç türleri (backend'den dinamik)
  type VehicleType = { id: number; name: string; defaultCapacityKg: number; defaultCapacityM3: number };
  const [vehicleTypesList, setVehicleTypesList] = useState<VehicleType[]>([]);
  const nameToId = useMemo(() => Object.fromEntries(vehicleTypesList.map(v => [v.name, v.id])), [vehicleTypesList]);
  const defaultsByName = useMemo(() => Object.fromEntries(vehicleTypesList.map(v => [v.name, v.defaultCapacityKg])), [vehicleTypesList]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/vehicle-types`);
        const json = await res.json();
        if (res.ok && json?.success && Array.isArray(json.data)) {
          setVehicleTypesList(json.data);
        }
      } catch { }
    })();
  }, []);
  const isValidEmail = (email: string) => /.+@.+\..+/.test(email);
  // +90xxxxxxxxxx veya 05xxxxxxxxx biçimleri
  const isValidPhone = (phone: string) => /^(?:\+90|05)\d{9}$/.test(phone.replace(/\s|-/g, ''));
  // 10–15 haneli sadece rakam
  const isValidTaxOrRegistry = (val: string) => /^\d{10,15}$/.test(val);
  // En az 8 karakter, 1 büyük harf ve 1 sayı
  const isValidPassword = (pw: string) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);

  // Ek hizmet (checkbox) toggle helper
  // Ek hizmetler hızlı kayıtta toplanmıyor.



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basit doğrulamalar (tek adım)
    const showValidationError = (msg: string) => { toast({ title: 'Doğrulama Hatası', description: msg, variant: 'destructive' }); };
    // 1) Zorunlu alanlar
    if (!formData.companyName) return showValidationError('Firma Adı zorunludur.');
    if (!isValidTaxOrRegistry(formData.taxOrRegistry)) return showValidationError('Vergi Numarası veya Ticaret Sicil No 10–15 haneli olmalıdır.');
    if (!formData.authorizedFullName) return showValidationError('Yetkili Ad Soyad zorunludur.');
    if (!isValidPhone(formData.phone)) return showValidationError('Telefon +90 veya 05 ile başlamalıdır.');
    if (!isValidEmail(formData.email)) return showValidationError('Geçerli bir e-posta giriniz.');
    if (!isValidPassword(formData.password)) return showValidationError('Şifre en az 8 karakter, 1 büyük harf ve 1 sayı içermelidir.');
    if (formData.password !== formData.confirmPassword) return showValidationError('Şifre Tekrar, şifreyle birebir aynı olmalıdır.');
    if (!termsAccepted) return showValidationError('KVKK ve Kullanım Koşullarını kabul etmelisiniz.');

    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));
    try {
      const startYearNum = Number(formData.startYear) || new Date().getFullYear();

      // 1) Backend'e kayıt
      // Araç seçimi kaldırıldı, boş gönderiyoruz
      const selectedVehicles: any[] = [];
      const vehicleTypeIds: any[] = [];

      const normalizePhone = (phone: string) => phone.replace(/\s|-/g, '');

      const registerRes = await fetch(`${API_BASE_URL}/carriers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          taxNumber: formData.taxOrRegistry || formData.taxNumber,
          email: formData.email,
          phone: normalizePhone(formData.phone),
          contactName: formData.authorizedFullName,
          password: formData.password,
          foundedYear: startYearNum,
          vehicleTypeIds,
          activityCity: formData.cityText || undefined,

          // Frontend local usage (backend currently ignores these; safe to send)
          vehicleTypeNames: formData.vehicleTypes,
          selectedVehicles
        }),
      });
      const regJson = await registerRes.json().catch(() => ({}));
      if (!registerRes.ok || !regJson?.success) {
        throw new Error(regJson?.message || `Kayıt başarısız. (HTTP ${registerRes.status})`);
      }

      // 2) Token + session (register response preferred; fallback to login)
      const tokenFromRegister = regJson?.data?.token;
      const carrierFromRegister = regJson?.data?.carrier;

      let token = tokenFromRegister as string | undefined;
      let c = carrierFromRegister as any;

      if (!token || !c?.id) {
        const loginRes = await fetch(`${API_BASE_URL}/carriers/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password })
        });
        const loginJson = await loginRes.json().catch(() => ({}));
        if (!loginRes.ok || !loginJson?.success) {
          throw new Error(loginJson?.message || `Giriş başarısız. (HTTP ${loginRes.status})`);
        }
        token = loginJson?.data?.token;
        c = loginJson?.data?.carrier;
      }

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

      // 3) Profil taslaklarını doldur (prefill)
      try {
        const companyDraft = {
          name: formData.companyName,
          type: '',
          taxNumber: formData.taxOrRegistry || formData.taxNumber || '',
          year: String(startYearNum),
          services: [] as string[],
          vehicleType: (formData.vehicleTypes && formData.vehicleTypes[0]) || '',
          vehicleTypes: formData.vehicleTypes || [],
          // Yeni: her tür için kapasite (kg) haritası, anahtarlar gösterim adıyla eşleşir
          vehicleCapacities: (() => {
            const out: Record<string, string> = {};
            for (const name of formData.vehicleTypes || []) {
              const v = formData.vehicleCapacities?.[name]?.value || '';
              if (v) out[name] = String(v);
            }
            return out;
          })()
        };
        const opsDraft = {
          address1: formData.addressLine1 || '',
          address2: formData.addressLine2 || '',
          district: formData.district || '',
          city: formData.cityText || '',
          serviceAreas: formData.serviceAreas || [],
          mapLat: '',
          mapLng: ''
        };
        localStorage.setItem(`carrier_company_${sessionCarrier.id}`, JSON.stringify(companyDraft));
        localStorage.setItem(`carrier_ops_${sessionCarrier.id}`, JSON.stringify(opsDraft));
      } catch { }

      localStorage.setItem(`fastRegPending_${sessionCarrier.id}`, '1');
      localStorage.setItem('profileCompletion', '20');
      localStorage.setItem('companyTaxOrRegistry', formData.taxOrRegistry);
      window.dispatchEvent(new Event('userLogin'));
      setIsLoading(false);
      navigate(`/eposta-dogrula?email=${encodeURIComponent(formData.email)}&userType=carrier`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kayıt sırasında bir hata oluştu.';
      setIsLoading(false);
      toast({ title: 'Hata', description: message, variant: 'destructive' });
    }
  };


  return (
    <section className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-start justify-center px-12">
      <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-16">
        {/* SOL TARAF */}
        <div className="space-y-12 pt-12">
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

          {/* Avantajlar */}
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

            <div className="flex items-start space-x-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">İtibar Kazanın</h3>
                <p className="text-base text-gray-600">
                  Müşteri değerlendirmeleriyle itibarınızı artırın
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ FORM */}
        <Card className="w-full max-w-lg mx-auto shadow-xl border-0 mt-20">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">Hızlı Nakliyeci Kaydı</CardTitle>
            <CardDescription className="text-lg">Sadece temel bilgiler, detayları profilde tamamlarsınız</CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <Label>Şirket Adı</Label>
                <Input value={formData.companyName} onChange={(e) => handleChange('companyName', e.target.value)} placeholder="Örn. ABC Lojistik A.Ş." className="h-12 mt-1" />
              </div>
              <div>
                <Label>Vergi Numarası veya Ticaret Sicil Numarası</Label>
                <Input
                  inputMode="numeric"
                  value={formData.taxOrRegistry}
                  onChange={(e) => handleChange('taxOrRegistry', e.target.value.replace(/\D/g, ''))}
                  placeholder="Sadece rakam, 10–15 hane"
                  className="h-12 mt-1"
                  maxLength={15}
                />
              </div>

              <div>
                <Label>Yetkili Kişi Ad Soyad (opsiyonel)</Label>
                <Input value={formData.authorizedFullName} onChange={(e) => handleChange('authorizedFullName', e.target.value)} placeholder="Ad Soyad" className="h-12 mt-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Telefon</Label>
                  <Input type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+90 5xx xxx xx xx" className="h-12 mt-1" />
                </div>
                <div>
                  <Label>E-posta</Label>
                  <Input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="ornek@firma.com" className="h-12 mt-1" />
                </div>
              </div>
              <div>
                <Label>Faaliyet İli (opsiyonel)</Label>
                <Select value={formData.cityText} onValueChange={(v) => handleChange('cityText', v)}>
                  <SelectTrigger className="h-12 mt-1"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                  <SelectContent>
                    {TURKISH_CITIES.map((c: string) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kuruluş Yılı (opsiyonel)</Label>
                <Select value={String(formData.startYear || '')} onValueChange={(v) => handleChange('startYear', v)}>
                  <SelectTrigger className="h-12 mt-1"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: (2025 - 1990 + 1) }, (_, i) => 1990 + i).map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Profilde deneyim göstergesi olarak kullanılabilir.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Şifre</Label>
                  <Input type="password" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} placeholder="Güçlü bir şifre" className="h-12 mt-1" />
                </div>
                <div>
                  <Label>Şifre Tekrar</Label>
                  <Input type="password" value={formData.confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)} placeholder="Tekrar şifre" className="h-12 mt-1" />
                </div>
              </div>
              <div className="flex items-start gap-2 pt-2">
                <input
                  id="termsAccepted"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="termsAccepted" className="text-sm text-gray-600">
                  <a href="/kullanim-sartlari" target="_blank" className="text-orange-600 underline hover:text-orange-800">Kullanım Koşulları</a>{' '}ve{' '}
                  <a href="/gizlilik-politikasi" target="_blank" className="text-orange-600 underline hover:text-orange-800">KVKK Aydınlatma Metni</a>'ni okudum, kabul ediyorum.
                </label>
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={isLoading || !termsAccepted} className="w-full h-12 bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-700 hover:to-blue-700">
                  {isLoading ? 'Oluşturuluyor...' : 'Hesabı Oluştur ve Devam Et'}
                </Button>
                <p className="text-xs text-gray-500 mt-2">Detayları profilden tamamlayabilirsiniz.</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

