import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, MapPin, FileText, ChevronRight, ChevronLeft, Check, SkipForward } from 'lucide-react';
import MultiSelect from '@/components/ui/multi-select';
import { TURKISH_CITIES } from '@/lib/constants';
import { getSessionUser } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

const VEHICLE_OPTIONS = [
  { value: 'kamyonet', label: 'Kamyonet' },
  { value: 'kamyon', label: 'Kamyon' },
  { value: 'tir', label: 'TIR' },
  { value: 'minivan', label: 'Minivan' },
  { value: 'panelvan', label: 'Panelvan' },
  { value: 'pikap', label: 'Pikap' },
];

const SERVICE_OPTIONS = [
  { value: 'evden-eve', label: 'Evden Eve Nakliyat' },
  { value: 'ofis-tasima', label: 'Ofis Taşıma' },
  { value: 'parca', label: 'Parça Eşya' },
  { value: 'depolama', label: 'Depolama' },
  { value: 'ambalajlama', label: 'Ambalajlama' },
  { value: 'asansor', label: 'Asansörlü Taşıma' },
  { value: 'sigorta', label: 'Sigortalı Taşıma' },
];

const CITY_OPTIONS = TURKISH_CITIES.map(c => ({ value: c, label: c }));

const VEHICLE_OPTIONS_MAP: Record<string, string> = Object.fromEntries(
  VEHICLE_OPTIONS.map(option => [option.value, option.label])
);

const SERVICE_OPTIONS_MAP: Record<string, string> = Object.fromEntries(
  SERVICE_OPTIONS.map(option => [option.value, option.label])
);

const CITY_OPTIONS_MAP: Record<string, string> = Object.fromEntries(
  CITY_OPTIONS.map(option => [option.value, option.label])
);

type OnboardingStep = 1 | 2 | 3;

export default function CarrierOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [saving, setSaving] = useState(false);

  const [vehicles, setVehicles] = useState<string[]>([]);
  const [plateNumbers, setPlateNumbers] = useState<Record<string, string>>({});

  const [services, setServices] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);

  const [documents, setDocuments] = useState({
    kBelgesi: null as File | null,
    ruhsat: null as File | null,
    vergiLevhasi: null as File | null,
  });

  const user = getSessionUser();

  const stepLabels = [
    { id: 1, label: 'Araçlar', icon: Truck },
    { id: 2, label: 'Hizmetler & Bölge', icon: MapPin },
    { id: 3, label: 'Belgeler', icon: FileText },
  ];

  const goNext = () => setStep(s => Math.min(3, s + 1) as OnboardingStep);
  const goPrev = () => setStep(s => Math.max(1, s - 1) as OnboardingStep);

  const handleSkip = () => {
    toast({ title: 'Atlandı', description: 'Bu adımı daha sonra profilinizden tamamlayabilirsiniz.' });
    if (step < 3) {
      goNext();
    } else {
      navigate('/home');
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token || !user) {
        toast({ title: 'Hata', description: 'Oturum bulunamadı.', variant: 'destructive' });
        navigate('/giris');
        return;
      }

      // Save vehicles
      if (vehicles.length > 0) {
        const carrierId = user.id;
        const companyKey = `carrier_company_${carrierId}`;
        const existing = JSON.parse(localStorage.getItem(companyKey) || '{}');
        existing.vehicleTypes = vehicles;
        existing.vehicles = vehicles.map(v => ({ type: v, plate: plateNumbers[v] || '' }));
        localStorage.setItem(companyKey, JSON.stringify(existing));
      }

      // Save services & areas
      if (services.length > 0 || serviceAreas.length > 0) {
        const carrierId = user.id;
        const opsKey = `carrier_ops_${carrierId}`;
        const existing = JSON.parse(localStorage.getItem(opsKey) || '{}');
        existing.services = services;
        existing.serviceAreas = serviceAreas;
        localStorage.setItem(opsKey, JSON.stringify(existing));
      }

      // Upload documents if available
      if (documents.kBelgesi || documents.ruhsat || documents.vergiLevhasi) {
        const formData = new FormData();
        if (documents.kBelgesi) formData.append('kBelgesi', documents.kBelgesi);
        if (documents.ruhsat) formData.append('ruhsat', documents.ruhsat);
        if (documents.vergiLevhasi) formData.append('vergiLevhasi', documents.vergiLevhasi);

        try {
          await fetch('/api/v1/carriers/documents', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
        } catch { /* silently handle — docs can be uploaded later */ }
      }

      localStorage.setItem('profileCompletion', '60');
      toast({ title: 'Tebrikler!', description: 'Onboarding tamamlandı. Artık teklif almaya başlayabilirsiniz.' });
      navigate('/home');
    } catch {
      toast({ title: 'Hata', description: 'Kayıt sırasında bir sorun oluştu.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          {stepLabels.map((s, idx) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step >= s.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step > s.id ? <Check className="h-5 w-5" /> : s.id}
                </div>
                <span className={`text-xs mt-1 font-medium ${step >= s.id ? 'text-blue-700' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {idx < stepLabels.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 mb-5 ${step > s.id ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-xl border-0">
          {/* Step 1 — Vehicles */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Truck className="h-6 w-6 text-blue-600" />
                  Araç Bilgileri
                </CardTitle>
                <CardDescription>Filosundaki araç türlerini ve plaka bilgilerini giriniz.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MultiSelect
                  label="Araç Türleri"
                  options={VEHICLE_OPTIONS_MAP}
                  selectedValues={vehicles}
                  onSelectionChange={setVehicles}
                  placeholder="Araç türü seçin..."
                />
                {vehicles.map(v => (
                  <div key={v} className="flex items-center gap-3">
                    <Label className="w-28 text-sm font-medium">{VEHICLE_OPTIONS.find(o => o.value === v)?.label}</Label>
                    <Input
                      placeholder="Plaka (ör: 34 ABC 123)"
                      value={plateNumbers[v] || ''}
                      onChange={e => setPlateNumbers(prev => ({ ...prev, [v]: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                ))}
              </CardContent>
            </>
          )}

          {/* Step 2 — Services & Areas */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MapPin className="h-6 w-6 text-blue-600" />
                  Hizmetler & Bölge
                </CardTitle>
                <CardDescription>Sunduğunuz hizmetleri ve çalıştığınız bölgeleri seçiniz.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MultiSelect
                  label="Hizmet Türleri"
                  options={SERVICE_OPTIONS_MAP}
                  selectedValues={services}
                  onSelectionChange={setServices}
                  placeholder="Hizmet türü seçin..."
                />
                <MultiSelect
                  label="Hizmet Bölgeleri (Şehirler)"
                  options={CITY_OPTIONS_MAP}
                  selectedValues={serviceAreas}
                  onSelectionChange={setServiceAreas}
                  placeholder="Şehir seçin..."
                />
              </CardContent>
            </>
          )}

          {/* Step 3 — Documents */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-6 w-6 text-blue-600" />
                  Belgeler
                </CardTitle>
                <CardDescription>Yasal belge yükleme (isteğe bağlı — sonra da yükleyebilirsiniz).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'kBelgesi' as const, label: 'K1 / K2 Yetki Belgesi' },
                  { key: 'ruhsat' as const, label: 'Araç Ruhsatı' },
                  { key: 'vergiLevhasi' as const, label: 'Vergi Levhası' },
                ].map(doc => (
                  <div key={doc.key}>
                    <Label className="mb-1 block text-sm">{doc.label}</Label>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => {
                        const file = e.target.files?.[0] || null;
                        setDocuments(prev => ({ ...prev, [doc.key]: file }));
                      }}
                      className="cursor-pointer"
                    />
                    {documents[doc.key] && (
                      <p className="text-xs text-green-600 mt-1">✓ {documents[doc.key]!.name}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between px-6 pb-6 pt-2">
            <div>
              {step > 1 && (
                <Button variant="ghost" onClick={goPrev} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Geri
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSkip} className="gap-1 text-gray-500">
                <SkipForward className="h-4 w-4" /> Atla
              </Button>
              {step < 3 ? (
                <Button onClick={goNext} className="gap-1 bg-blue-600 hover:bg-blue-700">
                  İleri <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={saving} className="gap-1 bg-green-600 hover:bg-green-700">
                  {saving ? 'Kaydediliyor...' : 'Tamamla'}
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
