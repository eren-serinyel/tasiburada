import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, MapPin, FileText, ChevronRight, ChevronLeft, Check, SkipForward, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import MultiSelect from '@/components/ui/multi-select';
import { TURKISH_CITIES } from '@/lib/constants';
import { getDistrictsForCity } from '@/lib/locations';
import { getSessionUser } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';

const WORK_SCOPE_OPTIONS = ['Şehir İçi', 'Şehirler Arası'];

type VehicleTypeOption = { id: string; name: string };
type OnboardingVehicle = {
  clientId: string;
  id?: string;
  vehicleTypeId: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  capacityM3: string;
  capacityKg: string;
};

const createEmptyVehicle = (): OnboardingVehicle => ({
  clientId: crypto.randomUUID(),
  vehicleTypeId: '',
  plate: '',
  brand: '',
  model: '',
  year: '',
  capacityM3: '',
  capacityKg: '',
});

const REQUIRED_DOC_KEYS = ['k_belgesi', 'src', 'ruhsat', 'vergi_levhasi'] as const;

const DOC_LIST = [
  { key: 'k_belgesi', label: 'K Belgesi', required: true },
  { key: 'src', label: 'SRC Belgesi', required: true },
  { key: 'ruhsat', label: 'Araç Ruhsatı', required: true },
  { key: 'vergi_levhasi', label: 'Vergi Levhası', required: true },
  { key: 'sigorta', label: 'Sigorta Poliçesi', required: false },
] as const;

type OnboardingStep = 1 | 2 | 3;

export default function CarrierOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getSessionUser();
  const carrierId = user?.id ?? '';

  const [step, setStep] = useState<OnboardingStep>(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Vehicle
  const [vehicles, setVehicles] = useState<OnboardingVehicle[]>([createEmptyVehicle()]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeOption[]>([]);
  const [workScopes, setWorkScopes] = useState<string[]>([]);

  // Step 2 — Activity
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);

  // Step 3 — Documents
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  useEffect(() => {
    if (!user) navigate('/giris');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    apiClient('/api/v1/vehicle-types')
      .then(response => response.json())
      .then(json => {
        if (json?.success && Array.isArray(json.data)) {
          setVehicleTypes(json.data);
        }
      })
      .catch(() => setVehicleTypes([]));
  }, []);

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
    { id: 1, label: 'Araç Bilgileri', icon: Truck },
    { id: 2, label: 'Faaliyet', icon: MapPin },
    { id: 3, label: 'Belgeler', icon: FileText },
  ];

  const handleSkip = () => {
    toast({ title: 'Atlandı', description: 'Bu adımı daha sonra profilinizden tamamlayabilirsiniz.' });
    if (step < 3) {
      setStep(s => (s + 1) as OnboardingStep);
    } else {
      navigate('/profil-tamamla');
    }
  };

  const handleStep1Next = async () => {
    if (workScopes.length === 0) {
      toast({ title: 'Eksik Alan', description: 'En az bir iş kapsamı seçmelisiniz.', variant: 'destructive' });
      return;
    }

    const vehiclesToSave = vehicles.filter(vehicle => (
      vehicle.vehicleTypeId || vehicle.plate.trim() || vehicle.brand.trim() || vehicle.model.trim()
      || vehicle.year || vehicle.capacityM3 || vehicle.capacityKg
    ));
    if (vehiclesToSave.some(vehicle => !vehicle.vehicleTypeId)) {
      toast({ title: 'Eksik Alan', description: 'Bilgi girdiğiniz her araç için araç tipi seçmelisiniz.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const scopeResponse = await apiClient('/api/v1/carriers/me/company-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeOfWorkNames: workScopes }),
      });
      const scopeJson = await scopeResponse.json().catch(() => ({}));
      if (!scopeResponse.ok || !(scopeJson as any)?.success) {
        toast({ title: 'Hata', description: (scopeJson as any).message ?? 'İş kapsamı kaydedilemedi.', variant: 'destructive' });
        return;
      }

      if (vehiclesToSave.length > 0) {
        const vehicleResponse = await apiClient('/api/v1/carriers/me/vehicles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicles: vehiclesToSave.map(vehicle => ({
              id: vehicle.id,
              vehicleTypeId: vehicle.vehicleTypeId,
              plate: vehicle.plate.trim() || null,
              brand: vehicle.brand.trim() || null,
              model: vehicle.model.trim() || null,
              year: vehicle.year ? Number(vehicle.year) : null,
              capacityM3: vehicle.capacityM3 ? Number(vehicle.capacityM3) : null,
              capacityKg: vehicle.capacityKg ? Number(vehicle.capacityKg) : null,
            })),
          }),
        });
        const vehicleJson = await vehicleResponse.json().catch(() => ({}));
        if (!vehicleResponse.ok || !(vehicleJson as any)?.success) {
          toast({ title: 'Hata', description: (vehicleJson as any).message ?? 'Araç bilgileri kaydedilemedi.', variant: 'destructive' });
          return;
        }

        if (Array.isArray((vehicleJson as any).data)) {
          setVehicles((vehicleJson as any).data.map((vehicle: any) => ({
            clientId: vehicle.id || crypto.randomUUID(),
            id: vehicle.id,
            vehicleTypeId: vehicle.vehicleTypeId || '',
            plate: vehicle.plate || vehicle.licensePlate || '',
            brand: vehicle.brand || '',
            model: vehicle.model || '',
            year: vehicle.year ? String(vehicle.year) : '',
            capacityM3: vehicle.capacityM3 != null ? String(vehicle.capacityM3) : '',
            capacityKg: vehicle.capacityKg != null ? String(vehicle.capacityKg) : '',
          })));
        }
      }
      setStep(2);
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Sunucuya bağlanılamadı.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const removeVehicle = async (vehicle: OnboardingVehicle) => {
    if (vehicles.length <= 1) return;
    if (!vehicle.id) {
      setVehicles(current => current.filter(item => item.clientId !== vehicle.clientId));
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient(`/api/v1/carriers/me/vehicles/${vehicle.id}`, { method: 'DELETE' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !(json as any)?.success) {
        toast({ title: 'Hata', description: (json as any).message ?? 'Araç silinemedi.', variant: 'destructive' });
        return;
      }
      setVehicles(current => current.filter(item => item.clientId !== vehicle.clientId));
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Araç silinemedi.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleStep2Next = async () => {
    if (!city) {
      toast({ title: 'Eksik Alan', description: 'Faaliyet şehri zorunludur.', variant: 'destructive' });
      return;
    }
    if (serviceAreas.length === 0) {
      toast({ title: 'Eksik Alan', description: 'En az bir hizmet verdiğiniz il seçmelisiniz.', variant: 'destructive' });
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
      toast({ title: 'Bağlantı Hatası', description: 'Sunucuya bağlanılamadı.', variant: 'destructive' });
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
        toast({ title: 'Yükleme Hatası', description: (json as any).message ?? 'Belge yüklenemedi.', variant: 'destructive' });
        return;
      }
      setUploadedDocs(prev => ({ ...prev, [docKey]: true }));
    } catch {
      toast({ title: 'Hata', description: 'Belge yüklenemedi.', variant: 'destructive' });
    } finally {
      setUploadingDoc(null);
    }
  };

  const requiredUploaded = REQUIRED_DOC_KEYS.every(k => uploadedDocs[k]);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await apiClient('/api/v1/carriers/me/profile-status', { method: 'PUT' });
    } catch { /* non-blocking — profil yüzdesi arka planda hesaplanır */ }
    toast({ title: 'Tebrikler!', description: 'Profil adımları tamamlandı.' });
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
          {/* Step 1 — Vehicle Info */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Truck className="h-6 w-6 text-blue-600" /> Araç Bilgileri
                </CardTitle>
                <CardDescription>Taşımacılıkta kullandığınız araç hakkında temel bilgileri girin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {vehicles.map((vehicle, index) => (
                  <div key={vehicle.clientId} className="rounded-xl border border-slate-200 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">Araç {index + 1}</p>
                      {vehicles.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={saving}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => void removeVehicle(vehicle)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Sil
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-1 block text-sm">Araç Tipi</Label>
                        <Select
                          value={vehicle.vehicleTypeId}
                          onValueChange={value => setVehicles(current => current.map(item => (
                            item.clientId === vehicle.clientId ? { ...item, vehicleTypeId: value } : item
                          )))}
                        >
                          <SelectTrigger><SelectValue placeholder="Araç tipi seçin..." /></SelectTrigger>
                          <SelectContent>
                            {vehicleTypes.map(type => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-1 block text-sm">Plaka</Label>
                        <Input
                          placeholder="ör: 34 ABC 123"
                          value={vehicle.plate}
                          onChange={event => setVehicles(current => current.map(item => (
                            item.clientId === vehicle.clientId ? { ...item, plate: event.target.value.toUpperCase() } : item
                          )))}
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-sm">Araç Markası</Label>
                        <Input
                          placeholder="ör: Ford"
                          value={vehicle.brand}
                          onChange={event => setVehicles(current => current.map(item => (
                            item.clientId === vehicle.clientId ? { ...item, brand: event.target.value } : item
                          )))}
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-sm">Araç Modeli</Label>
                        <Input
                          placeholder="ör: Transit"
                          value={vehicle.model}
                          onChange={event => setVehicles(current => current.map(item => (
                            item.clientId === vehicle.clientId ? { ...item, model: event.target.value } : item
                          )))}
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-sm">Model Yılı</Label>
                        <Input
                          type="number"
                          placeholder="ör: 2020"
                          min={1990}
                          max={new Date().getFullYear()}
                          value={vehicle.year}
                          onChange={event => setVehicles(current => current.map(item => (
                            item.clientId === vehicle.clientId ? { ...item, year: event.target.value } : item
                          )))}
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-sm">Kapasite (m³)</Label>
                        <Input
                          type="number"
                          placeholder="ör: 15"
                          min={0}
                          value={vehicle.capacityM3}
                          onChange={event => setVehicles(current => current.map(item => (
                            item.clientId === vehicle.clientId ? { ...item, capacityM3: event.target.value } : item
                          )))}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="mb-1 block text-sm">Tahmini Ağırlık Kapasitesi (kg)</Label>
                        <Input
                          type="number"
                          placeholder="ör: 3500"
                          min={0}
                          value={vehicle.capacityKg}
                          onChange={event => setVehicles(current => current.map(item => (
                            item.clientId === vehicle.clientId ? { ...item, capacityKg: event.target.value } : item
                          )))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setVehicles(current => [...current, createEmptyVehicle()])}
                >
                  <Plus className="h-4 w-4 mr-2" /> Başka Araç Ekle
                </Button>
                <MultiSelect
                  label="İş Kapsamı"
                  options={WORK_SCOPE_OPTIONS}
                  selectedValues={workScopes}
                  onSelectionChange={setWorkScopes}
                  placeholder="İş kapsamı seçin..."
                />
              </CardContent>
            </>
          )}

          {/* Step 2 — Activity Info */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MapPin className="h-6 w-6 text-blue-600" /> Faaliyet Bilgileri
                </CardTitle>
                <CardDescription>Faaliyet gösterdiğiniz şehri ve hizmet alanlarını belirtin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-1 block text-sm">
                    Faaliyet Şehri <span className="text-red-500">*</span>
                  </Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Şehir seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TURKISH_CITIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-sm">İlçe</Label>
                  <Select
                    value={district}
                    onValueChange={setDistrict}
                    disabled={loadingDistricts || districts.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingDistricts ? 'Yükleniyor...' : 'İlçe seçin...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <MultiSelect
                  label="Hizmet Verdiği İller"
                  options={TURKISH_CITIES}
                  selectedValues={serviceAreas}
                  onSelectionChange={setServiceAreas}
                  placeholder="İl seçin..."
                />
              </CardContent>
            </>
          )}

          {/* Step 3 — Documents */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-6 w-6 text-blue-600" /> Belge Yükleme
                </CardTitle>
                <CardDescription>
                  Zorunlu 4 belgeyi yükleyin. Sigorta poliçesi isteğe bağlıdır.
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
                          Dosya seç (pdf, jpg, png)
                        </label>
                      )}
                      {uploadingDoc === doc.key && (
                        <p className="text-xs text-blue-500 mt-0.5">Yükleniyor...</p>
                      )}
                      {uploadedDocs[doc.key] && (
                        <p className="text-xs text-green-600 mt-0.5">Yüklendi ✓</p>
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
                <SkipForward className="h-4 w-4" /> Şimdi Atla
              </Button>
              {step === 1 && (
                <Button onClick={handleStep1Next} disabled={saving} className="gap-1 bg-blue-600 hover:bg-blue-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>İleri <ChevronRight className="h-4 w-4" /></>}
                </Button>
              )}
              {step === 2 && (
                <Button onClick={handleStep2Next} disabled={saving || !city || serviceAreas.length === 0} className="gap-1 bg-blue-600 hover:bg-blue-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>İleri <ChevronRight className="h-4 w-4" /></>}
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
