import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, MapPin, FileText, ChevronRight, ChevronLeft, Check, SkipForward, CheckCircle2, Loader2 } from 'lucide-react';
import MultiSelect from '@/components/ui/multi-select';
import { TURKISH_CITIES } from '@/lib/constants';
import { getDistrictsForCity } from '@/lib/locations';
import { getSessionUser } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';

const SERVICE_AREA_OPTIONS: Record<string, string> = {
  sehirici: 'ÅehiriÃ§i TaÅŸÄ±ma',
  sehirlerarasi: 'ÅehirlerarasÄ± TaÅŸÄ±ma',
  uluslararasi: 'UluslararasÄ± TaÅŸÄ±ma',
};

const REQUIRED_DOC_KEYS = ['k_belgesi', 'src', 'ruhsat', 'vergi_levhasi'] as const;

const DOC_LIST = [
  { key: 'k_belgesi', label: 'K Belgesi', required: true },
  { key: 'src', label: 'SRC Belgesi', required: true },
  { key: 'ruhsat', label: 'AraÃ§ RuhsatÄ±', required: true },
  { key: 'vergi_levhasi', label: 'Vergi LevhasÄ±', required: true },
  { key: 'sigorta', label: 'Sigorta PoliÃ§esi', required: false },
] as const;

type OnboardingStep = 1 | 2 | 3;

export default function CarrierOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getSessionUser();
  const carrierId = user?.id ?? '';

  const [step, setStep] = useState<OnboardingStep>(1);
  const [saving, setSaving] = useState(false);

  // Step 1 â€” Vehicle
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleCapacityM3, setVehicleCapacityM3] = useState('');

  // Step 2 â€” Activity
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);

  // Step 3 â€” Documents
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  useEffect(() => {
    if (!user) navigate('/giris');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDistrict('');
    if (!city) { setDistricts([]); return; }
    setLoadingDistricts(true);
    getDistrictsForCity(city)
      .then(d => setDistricts(d))
      .catch(() => setDistricts([]))
      .finally(() => setLoadingDistricts(false));
  }, [city]);

  const stepLabels = [
    { id: 1, label: 'AraÃ§ Bilgileri', icon: Truck },
    { id: 2, label: 'Faaliyet', icon: MapPin },
    { id: 3, label: 'Belgeler', icon: FileText },
  ];

  const handleSkip = () => {
    toast({ title: 'AtlandÄ±', description: 'Bu adÄ±mÄ± daha sonra profilinizden tamamlayabilirsiniz.' });
    if (step < 3) {
      setStep(s => (s + 1) as OnboardingStep);
    } else {
      navigate('/profil-tamamla');
    }
  };

  const handleStep1Next = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (vehicleBrand.trim()) body.vehicleBrand = vehicleBrand.trim();
      if (vehicleModel.trim()) body.vehicleModel = vehicleModel.trim();
      if (vehicleYear) body.vehicleYear = Number(vehicleYear);
      if (vehicleCapacityM3) body.vehicleCapacityM3 = Number(vehicleCapacityM3);

      const res = await apiClient(`/api/v1/carriers/profile/${carrierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({ title: 'Hata', description: (json as any).message ?? 'AraÃ§ bilgileri kaydedilemedi.', variant: 'destructive' });
        return;
      }
      setStep(2);
    } catch {
      toast({ title: 'BaÄŸlantÄ± HatasÄ±', description: 'Sunucuya baÄŸlanÄ±lamadÄ±.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleStep2Next = async () => {
    if (!city) {
      toast({ title: 'Eksik Alan', description: 'Faaliyet ÅŸehri zorunludur.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient(`/api/v1/carriers/${carrierId}/activity`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, district: district || undefined, serviceAreas }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({ title: 'Hata', description: (json as any).message ?? 'Faaliyet bilgileri kaydedilemedi.', variant: 'destructive' });
        return;
      }
      setStep(3);
    } catch {
      toast({ title: 'BaÄŸlantÄ± HatasÄ±', description: 'Sunucuya baÄŸlanÄ±lamadÄ±.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = async (docKey: string, file: File) => {
    setUploadingDoc(docKey);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', docKey);
      const res = await apiClient('/api/v1/carriers/me/documents', {
        method: 'PUT',
        body: formData,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({ title: 'YÃ¼kleme HatasÄ±', description: (json as any).message ?? 'Belge yÃ¼klenemedi.', variant: 'destructive' });
        return;
      }
      setUploadedDocs(prev => ({ ...prev, [docKey]: true }));
    } catch {
      toast({ title: 'Hata', description: 'Belge yÃ¼klenemedi.', variant: 'destructive' });
    } finally {
      setUploadingDoc(null);
    }
  };

  const requiredUploaded = REQUIRED_DOC_KEYS.every(k => uploadedDocs[k]);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await apiClient('/api/v1/carriers/me/profile-status', { method: 'PUT' });
    } catch { /* non-blocking â€” profil yÃ¼zdesi arka planda hesaplanÄ±r */ }
    toast({ title: 'Tebrikler!', description: 'Profil adÄ±mlarÄ± tamamlandÄ±.' });
    setSaving(false);
    navigate('/profil-tamamla');
  };

  if (!user) return null;

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
                    step >= s.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200 text-gray-500'
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
          {/* Step 1 â€” Vehicle Info */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Truck className="h-6 w-6 text-blue-600" /> AraÃ§ Bilgileri
                </CardTitle>
                <CardDescription>TaÅŸÄ±macÄ±lÄ±kta kullandÄ±ÄŸÄ±nÄ±z araÃ§ hakkÄ±nda temel bilgileri girin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block text-sm">AraÃ§ MarkasÄ±</Label>
                    <Input placeholder="Ã¶r: Ford" value={vehicleBrand} onChange={e => setVehicleBrand(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1 block text-sm">AraÃ§ Modeli</Label>
                    <Input placeholder="Ã¶r: Transit" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block text-sm">Model YÄ±lÄ±</Label>
                    <Input
                      type="number"
                      placeholder="Ã¶r: 2020"
                      min={1990}
                      max={2026}
                      value={vehicleYear}
                      onChange={e => setVehicleYear(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-sm">Kapasite (mÂ³)</Label>
                    <Input
                      type="number"
                      placeholder="Ã¶r: 15"
                      min={0}
                      value={vehicleCapacityM3}
                      onChange={e => setVehicleCapacityM3(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2 â€” Activity Info */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MapPin className="h-6 w-6 text-blue-600" /> Faaliyet Bilgileri
                </CardTitle>
                <CardDescription>Faaliyet gÃ¶sterdiÄŸiniz ÅŸehri ve hizmet alanlarÄ±nÄ± belirtin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-1 block text-sm">
                    Faaliyet Åehri <span className="text-red-500">*</span>
                  </Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Åehir seÃ§in..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TURKISH_CITIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-sm">Ä°lÃ§e</Label>
                  <Select
                    value={district}
                    onValueChange={setDistrict}
                    disabled={loadingDistricts || districts.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingDistricts ? 'YÃ¼kleniyor...' : 'Ä°lÃ§e seÃ§in...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <MultiSelect
                  label="Hizmet AlanlarÄ±"
                  options={SERVICE_AREA_OPTIONS}
                  selectedValues={serviceAreas}
                  onSelectionChange={setServiceAreas}
                  placeholder="Hizmet alanÄ± seÃ§in..."
                />
              </CardContent>
            </>
          )}

          {/* Step 3 â€” Documents */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-6 w-6 text-blue-600" /> Belge YÃ¼kleme
                </CardTitle>
                <CardDescription>
                  Zorunlu 4 belgeyi yÃ¼kleyin. Sigorta poliÃ§esi isteÄŸe baÄŸlÄ±dÄ±r.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DOC_LIST.map(doc => (
                  <div
                    key={doc.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      uploadedDocs[doc.key] ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {doc.label}
                        {doc.required && <span className="text-red-500 ml-1">*</span>}
                      </p>
                      {!uploadedDocs[doc.key] && uploadingDoc !== doc.key && (
                        <label
                          htmlFor={`doc-${doc.key}`}
                          className="text-xs text-blue-600 cursor-pointer hover:underline mt-0.5 block"
                        >
                          Dosya seÃ§ (pdf, jpg, png)
                        </label>
                      )}
                      {uploadingDoc === doc.key && (
                        <p className="text-xs text-blue-500 mt-0.5">YÃ¼kleniyor...</p>
                      )}
                      {uploadedDocs[doc.key] && (
                        <p className="text-xs text-green-600 mt-0.5">YÃ¼klendi âœ“</p>
                      )}
                    </div>
                    {uploadedDocs[doc.key] ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : uploadingDoc === doc.key ? (
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
                    ) : (
                      <input
                        id={`doc-${doc.key}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        disabled={uploadingDoc !== null}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleDocUpload(doc.key, file);
                          e.target.value = '';
                        }}
                      />
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
                <Button
                  variant="ghost"
                  onClick={() => setStep(s => (s - 1) as OnboardingStep)}
                  disabled={saving}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Geri
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSkip} disabled={saving} className="gap-1 text-gray-500">
                <SkipForward className="h-4 w-4" /> Åimdi Atla
              </Button>
              {step === 1 && (
                <Button onClick={handleStep1Next} disabled={saving} className="gap-1 bg-blue-600 hover:bg-blue-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Ä°leri <ChevronRight className="h-4 w-4" /></>}
                </Button>
              )}
              {step === 2 && (
                <Button onClick={handleStep2Next} disabled={saving || !city} className="gap-1 bg-blue-600 hover:bg-blue-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Ä°leri <ChevronRight className="h-4 w-4" /></>}
                </Button>
              )}
              {step === 3 && (
                <Button
                  onClick={handleFinish}
                  disabled={!requiredUploaded || saving}
                  className="gap-1 bg-green-600 hover:bg-green-700"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><Check className="h-4 w-4" /> Tamamla</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
