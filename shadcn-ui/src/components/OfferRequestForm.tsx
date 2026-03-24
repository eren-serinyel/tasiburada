import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';
import { getDistrictsForCity, CITIES_TR } from '@/lib/locations';

type Step = 1 | 2 | 3;

const EK_HIZMETLER: Record<string, string[]> = {
  'Evden Eve': [
    'Asansörle taşıma',
    'Paketleyerek taşıma',
    'Sökme-takma (montaj)',
    'Koli/ambalaj malzemesi',
    'Ek sigorta',
    'Kat arası taşıma',
    'Ücretsiz ekspertiz',
    'Hafta sonu hizmet',
    'Gece taşıma'
  ],
  'Ofis Taşıma': [
    'Profesyonel paketleme',
    'Server/IT özel taşıma',
    'Kablo etiketleme',
    'Asansör kullanımı',
    'Kurumsal sigorta'
  ],
  'Parça Eşya': [
    'Hızlı teslimat',
    'Ek sigorta',
    'Hassas eşya koruma',
    'Kapıdan alım',
    'Teslimatta ödeme'
  ],
  Depolama: [
    'İklim kontrollü depo',
    'Nem önleyici paketleme',
    'Depo sigortası',
    'Kısa süreli depolama',
    'Uzun süreli depolama'
  ],
  'Ticari Yük': [
    'Forklift hizmeti',
    'Palet taşıma',
    'Soğuk zincir',
    'GPS takip',
    'Kurumsal sigorta'
  ],
  'Diğer': [
    'Ek sigorta',
    'Özel ambalaj',
    'Hızlı teslimat'
  ]
};

const LOAD_TYPE_OPTIONS = Object.keys(EK_HIZMETLER);
const TIME_PREFERENCE_OPTIONS = ['Sabah', 'Öğleden sonra', 'Akşam'] as const;
const PLACE_TYPE_OPTIONS = ['Daire', 'Villa', 'Ofis', 'Depo', 'Diğer'] as const;
const INSURANCE_OPTIONS = ['basic', 'full'] as const;

interface OfferRequestFormProps {
  showHeader?: boolean;
}

export default function OfferRequestForm({ showHeader = false }: OfferRequestFormProps) {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [isPublishing, setIsPublishing] = useState(false);

  const [originCity, setOriginCity] = useState('');
  const [originDistrict, setOriginDistrict] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationDistrict, setDestinationDistrict] = useState('');
  const [shipmentDate, setShipmentDate] = useState('');

  const [loadType, setLoadType] = useState('');
  const [weight, setWeight] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [hasElevator, setHasElevator] = useState(false);
  const [floor, setFloor] = useState<number | null>(null);
  const [wantsInsurance, setWantsInsurance] = useState(false);

  const [placeType, setPlaceType] = useState('');
  const [insuranceType, setInsuranceType] = useState('basic');
  const [timePreference, setTimePreference] = useState('');
  const [selectedExtraServices, setSelectedExtraServices] = useState<string[]>([]);

  const [originDistricts, setOriginDistricts] = useState<string[]>([]);
  const [destinationDistricts, setDestinationDistricts] = useState<string[]>([]);

  const progress = useMemo(() => {
    if (step === 1) return 33;
    if (step === 2) return 66;
    return 100;
  }, [step]);

  const isShipmentDateValid = useMemo(() => {
    if (!shipmentDate) return false;
    const selectedDate = new Date(shipmentDate);
    if (Number.isNaN(selectedDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate > today;
  }, [shipmentDate]);

  const canContinueStep1 =
    Boolean(originCity) &&
    Boolean(originDistrict) &&
    Boolean(destinationCity) &&
    Boolean(destinationDistrict) &&
    isShipmentDateValid;

  const canContinueStep2 = Boolean(loadType);
  const availableExtraServices = useMemo(() => EK_HIZMETLER[loadType] || [], [loadType]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!originCity) {
        setOriginDistricts([]);
        setOriginDistrict('');
        return;
      }
      const list = await getDistrictsForCity(originCity);
      if (cancelled) return;
      setOriginDistricts(list);
      if (originDistrict && !list.includes(originDistrict)) {
        setOriginDistrict('');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [originCity, originDistrict]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!destinationCity) {
        setDestinationDistricts([]);
        setDestinationDistrict('');
        return;
      }
      const list = await getDistrictsForCity(destinationCity);
      if (cancelled) return;
      setDestinationDistricts(list);
      if (destinationDistrict && !list.includes(destinationDistrict)) {
        setDestinationDistrict('');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [destinationCity, destinationDistrict]);

  useEffect(() => {
    setSelectedExtraServices([]);
  }, [loadType]);

  const toggleExtraService = (serviceName: string, checked: boolean) => {
    setSelectedExtraServices((prev) => {
      if (checked) {
        if (prev.includes(serviceName)) return prev;
        return [...prev, serviceName];
      }
      return prev.filter((item) => item !== serviceName);
    });
  };

  const decodeTokenPayload = (token: string) => {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  };

  const publishRequest = async () => {
    if (isPublishing) return;

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      toast.error('Oturum bulunamadı, lütfen giriş yapın.');
      navigate('/giris');
      return;
    }

    let tokenPayload: any;
    try {
      tokenPayload = decodeTokenPayload(authToken);
    } catch {
      toast.error('Oturum bilgisi okunamadı, lütfen tekrar giriş yapın.');
      navigate('/giris');
      return;
    }

    const userType = tokenPayload?.type ?? tokenPayload?.userType;
    if (userType !== 'customer') {
      toast.error('Taşıma talebi oluşturmak için müşteri hesabı gereklidir.');
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch('/api/v1/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          origin: `${originCity}, ${originDistrict}`,
          destination: `${destinationCity}, ${destinationDistrict}`,
          loadDetails: loadType + (description ? ` - ${description}` : ''),
          weight: weight || null,
          shipmentDate,
          price: null,
          transportType: loadType,
          placeType: placeType || null,
          hasElevator: hasElevator || false,
          floor: floor || null,
          insuranceType: wantsInsurance ? insuranceType : 'none',
          timePreference: timePreference || null,
          extraServices: selectedExtraServices || []
        })
      });

      let json: any = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }

      if (response.ok) {
        toast.success('Taşıma talebiniz yayınlandı! Nakliyecilerden teklifler gelecek.');
        setTimeout(() => {
          navigate('/ilanlarim');
        }, 1500);
        return;
      }

      if (response.status === 401) {
        toast.error('Oturumunuz sona erdi, tekrar giriş yapın');
        navigate('/giris');
        return;
      }

      if (response.status === 403) {
        toast.error('Bu işlem için müşteri hesabı gereklidir');
        return;
      }

      if (response.status === 400) {
        toast.error(json?.message || 'Gönderilen bilgiler geçersiz.');
        return;
      }

      if (response.status >= 500) {
        toast.error('Sunucu hatası, lütfen tekrar deneyin');
        return;
      }

      toast.error(json?.message || 'İşlem başarısız oldu.');
    } catch {
      toast.error('İnternet bağlantınızı kontrol edin');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {showHeader && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Taşıma Talebi Oluştur</h1>
          <p className="text-gray-600 mt-2">3 adımda ilanınızı oluşturup yayınlayın.</p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Adım {step} / 3</span>
          <span>%{progress}</span>
        </div>
        <Progress value={progress} />
      </div>

      {step === 1 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Adım 1 - Rota Bilgisi</CardTitle>
            <CardDescription>Çıkış ve varış bölgelerini seçin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Çıkış Şehri</Label>
                <Select value={originCity} onValueChange={setOriginCity} disabled={isPublishing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Şehir seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES_TR.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Çıkış İlçesi</Label>
                <Select value={originDistrict} onValueChange={setOriginDistrict} disabled={isPublishing || !originCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="İlçe seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {originDistricts.map((district) => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Varış Şehri</Label>
                <Select value={destinationCity} onValueChange={setDestinationCity} disabled={isPublishing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Şehir seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES_TR.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Varış İlçesi</Label>
                <Select value={destinationDistrict} onValueChange={setDestinationDistrict} disabled={isPublishing || !destinationCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="İlçe seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationDistricts.map((district) => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Taşıma Tarihi</Label>
              <Input type="date" value={shipmentDate} onChange={(e) => setShipmentDate(e.target.value)} disabled={isPublishing} />
              {!isShipmentDateValid && shipmentDate && (
                <p className="text-sm text-red-600 mt-1">Taşıma tarihi bugünden sonra olmalıdır.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!canContinueStep1 || isPublishing}>Devam</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Adım 2 - Yük Detayı</CardTitle>
            <CardDescription>Yük bilgilerini ve tercihlerinizi girin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Yük Türü</Label>
              <Select value={loadType} onValueChange={setLoadType} disabled={isPublishing}>
                <SelectTrigger>
                  <SelectValue placeholder="Yük türü seçin" />
                </SelectTrigger>
                <SelectContent>
                  {LOAD_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Ağırlık (kg) - Opsiyonel</Label>
                <Input
                  type="number"
                  min={0}
                  value={weight ?? ''}
                  onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : null)}
                  disabled={isPublishing}
                />
              </div>
              <div>
                <Label>Kat - Opsiyonel</Label>
                <Input
                  type="number"
                  min={0}
                  value={floor ?? ''}
                  onChange={(e) => setFloor(e.target.value ? Number(e.target.value) : null)}
                  disabled={isPublishing}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Yükleme Yeri Tipi - Opsiyonel</Label>
                <Select value={placeType} onValueChange={setPlaceType} disabled={isPublishing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Zaman Tercihi - Opsiyonel</Label>
                <Select value={timePreference} onValueChange={setTimePreference} disabled={isPublishing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_PREFERENCE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Açıklama - Opsiyonel (max 500)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                rows={4}
                disabled={isPublishing}
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/500</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox checked={hasElevator} onCheckedChange={(v) => setHasElevator(Boolean(v))} disabled={isPublishing} />
                <Label>Bina Asansörü Var</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox checked={wantsInsurance} onCheckedChange={(v) => setWantsInsurance(Boolean(v))} disabled={isPublishing} />
                <Label>Sigorta İstiyorum</Label>
              </div>

              {wantsInsurance && (
                <div className="max-w-xs">
                  <Label>Sigorta Tipi</Label>
                  <Select value={insuranceType} onValueChange={setInsuranceType} disabled={isPublishing}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSURANCE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {loadType && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div>
                  <Label className="text-sm font-semibold text-slate-800">Ek Hizmetler - Opsiyonel</Label>
                  <p className="text-xs text-slate-500 mt-1">Seçtiğiniz yük türüne göre uygun hizmetler listelenir.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableExtraServices.map((service) => {
                    const checked = selectedExtraServices.includes(service);
                    return (
                      <label
                        key={service}
                        className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 transition-colors hover:border-slate-300"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggleExtraService(service, Boolean(v))}
                          disabled={isPublishing}
                        />
                        <span className="text-sm text-slate-700">{service}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={isPublishing}>Geri</Button>
              <Button onClick={() => setStep(3)} disabled={!canContinueStep2 || isPublishing}>Özeti Gör</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Adım 3 - Özet ve Yayınla</CardTitle>
            <CardDescription>Bilgileri kontrol edip talebinizi yayınlayın.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border p-4 space-y-3 text-sm">
              <div><span className="font-semibold">Rota:</span> {originCity}, {originDistrict} - {destinationCity}, {destinationDistrict}</div>
              <div><span className="font-semibold">Tarih:</span> {shipmentDate}</div>
              <div><span className="font-semibold">Yük Türü:</span> {loadType}</div>
              <div><span className="font-semibold">Ağırlık:</span> {weight ?? '-'} </div>
              <div><span className="font-semibold">Açıklama:</span> {description || '-'}</div>
              <div><span className="font-semibold">Asansör:</span> {hasElevator ? 'Var' : 'Yok'}</div>
              <div><span className="font-semibold">Kat:</span> {floor ?? '-'}</div>
              <div><span className="font-semibold">Sigorta:</span> {wantsInsurance ? insuranceType : 'none'}</div>
              <div><span className="font-semibold">Yer Tipi:</span> {placeType || '-'}</div>
              <div><span className="font-semibold">Zaman Tercihi:</span> {timePreference || '-'}</div>
              <div><span className="font-semibold">Ek Hizmetler:</span> {selectedExtraServices.length ? selectedExtraServices.join(', ') : '-'}</div>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <Button variant="link" className="px-0" onClick={() => setStep(1)} disabled={isPublishing}>Adım 1'i Düzenle</Button>
              <Button variant="link" className="px-0" onClick={() => setStep(2)} disabled={isPublishing}>Adım 2'yi Düzenle</Button>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(2)} disabled={isPublishing}>Geri</Button>
              <Button onClick={publishRequest} disabled={isPublishing} className="min-w-40">
                {isPublishing ? 'Yayınlanıyor...' : 'Talebi Yayınla'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
