import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Package, Truck, Shield, Award, MessageSquare, Star, CheckCircle2, XCircle, Info, Images, Lock, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Carrier, LOAD_TYPES, VEHICLE_TYPES } from '@/lib/types';
import { mockCarriers } from '@/lib/mockData';
import { mockDb } from '@/utils/mockDb';
import { getSessionUser } from '@/lib/storage';
import { CITIES_TR, getDistrictsForCity, formatDateYYYYMMDD } from '@/lib/locations';
import FileUpload from '@/components/ui/file-upload';
import { ADDITIONAL_SERVICE_OPTIONS, SPECIAL_SERVICES } from '@/lib/carrierFormConstants';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

type Step = 1 | 2 | 3;

export default function OfferRequestForm({ showHeader = false }: { showHeader?: boolean }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [form, setForm] = useState({
    originCity: '',
    originDistrict: '',
    destinationCity: '',
    destinationDistrict: '',
    date: '',
    scope: (localStorage.getItem('auto_scope') as 'sehirici' | 'sehirlerarasi' | null) || '' as '' | 'sehirici' | 'sehirlerarasi',
    transportType: '',
    placeType: '',
    loadType: '',
    vehicleType: '',
    weightKg: '',
    floor: '',
    hasElevator: false,
    timeWindow: '',
    insurance: 'none' as 'none' | 'basic' | 'premium',
    extras: { asansor: false, sigorta: false, ambalaj: false },
    serviceOptions: {} as Record<string, string[]>,
    extraServices: [] as string[],
    photos: [] as File[],
    note: '',
  });

  const ALT_OPTIONS_BY_TRANSPORT: Record<string, string[]> = {
    'evden-eve': ['1+1 ev','2+1 ev','3+1 ev','4+1 ev'],
    'ofis-tasima': ['Küçük ofis','Orta ofis','Büyük ofis'],
    'parca': ['sadece beyaz eşya','sadece mobilya','tek parça eşya'],
    'depolama': ['Küçük depo','Orta depo','Büyük depo'],
  };
  const altOptions = useMemo(() => ALT_OPTIONS_BY_TRANSPORT[form.transportType] || [], [form.transportType]);

  const SERVICE_GROUP_BY_TRANSPORT_TYPE: Record<string, string> = {
    'evden-eve': 'evden-eve',
    'parca': 'parca',
    'ofis-tasima': 'ofis',
    'depolama': 'depolama',
  };
  const currentServiceGroup = useMemo(() => SERVICE_GROUP_BY_TRANSPORT_TYPE[form.transportType] || '', [form.transportType]);

  useEffect(() => {
    setForm(prev => {
      if (!currentServiceGroup) return { ...prev, serviceOptions: {} };
      const keep = prev.serviceOptions?.[currentServiceGroup] || [];
      return { ...prev, serviceOptions: { [currentServiceGroup]: keep } };
    });
  }, [currentServiceGroup]);

  const [originDistricts, setOriginDistricts] = useState<string[]>([]);
  const [destinationDistricts, setDestinationDistricts] = useState<string[]>([]);

  const progress = useMemo(() => {
    const per = 100 / 3;
    return Math.min(100, Math.max(0, Math.round(per * step)));
  }, [step]);

  const handleChange = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const todayStr = useMemo(() => formatDateYYYYMMDD(new Date()), []);
  const maxDateStr = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 30); return formatDateYYYYMMDD(d); }, []);
  const isDateTooFar = useMemo(() => {
    if (!form.date) return false;
    try { return new Date(form.date) > new Date(maxDateStr); } catch { return false; }
  }, [form.date, maxDateStr]);

  const canNextFrom1 = form.originCity && form.originDistrict && form.destinationCity && form.destinationDistrict && form.date && !isDateTooFar;
  const isCityFlow = form.scope === 'sehirici' || form.scope === 'sehirlerarasi';
  const canNextFrom2 = !!form.scope && !!form.transportType && (isCityFlow ? true : !!form.placeType);

  const TEMPLATE_WEIGHTS: Record<string, number> = {
    '1+1 ev': 800,
    '2+1 ev': 1500,
    '3+1 ev': 2500,
    '4+1 ev': 3500,
    'sadece beyaz eşya': 400,
    'sadece mobilya': 800,
    'tek parça eşya': 100,
    'Küçük ofis': 1000,
    'Orta ofis': 2000,
    'Büyük ofis': 3500,
    'Küçük depo': 1200,
    'Orta depo': 2200,
    'Büyük depo': 4000,
  };

  const suitableCarriersBase = useMemo(() => {
    if (!(canNextFrom1 && canNextFrom2)) return [] as Carrier[];
    const selectedOptionKeys = Object.values(form.serviceOptions || {}).flat();
    return mockCarriers.filter((c) => {
      const servesBoth = c.serviceAreas.includes(form.originCity) && c.serviceAreas.includes(form.destinationCity);
      const scopeMatch = !form.scope || !(c.scopes && c.scopes.length) || (c.scopes || []).includes(form.scope);
      const vehicleOk = !form.vehicleType || c.vehicle.type === (form.vehicleType as any);
      const wantsInsurance = form.insurance !== 'none' || form.extras.sigorta || selectedOptionKeys.some(k => k.includes('sigorta'));
      const hasInsurance = (c.badges || []).some(b => ['Sigorta', 'Soğuk Zincir'].includes(b));
      const insuranceOk = !wantsInsurance || hasInsurance;
      const wantsPackaging = form.extras.ambalaj || selectedOptionKeys.some(k => k.includes('paket') || k.includes('ambalaj'));
      const hasPackaging = (c.badges || []).some(b => ['Profesyonel', 'Altın Taşıyıcı'].includes(b));
      const extrasOk = (!wantsPackaging || hasPackaging);
      const estWeight = (form.placeType && TEMPLATE_WEIGHTS[form.placeType])
        ? TEMPLATE_WEIGHTS[form.placeType]
        : Number(form.weightKg || 0);
      const weightOk = !estWeight || c.vehicle.capacity >= estWeight;
      return servesBoth && scopeMatch && vehicleOk && extrasOk && weightOk && insuranceOk;
    });
  }, [form, canNextFrom1, canNextFrom2]);

  const [onlyApproved, setOnlyApproved] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'capacity' | 'price'>('rating');

  const suitableCarriers = useMemo(() => {
    let list = suitableCarriersBase;
    if (onlyApproved) list = list.filter(c => c.isApproved);
    if (minRating > 0) list = list.filter(c => c.rating >= minRating);
    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'reviews') return b.reviewCount - a.reviewCount;
      if (sortBy === 'capacity') return b.vehicle.capacity - a.vehicle.capacity;
      return a.baseFee - b.baseFee;
    });
    return sorted;
  }, [suitableCarriersBase, onlyApproved, minRating, sortBy]);

  const goNext = () => setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  const goPrev = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  const isLoggedIn = useMemo(() => {
    try {
      return Boolean(localStorage.getItem('userToken')) || Boolean(getSessionUser());
    } catch {
      return Boolean(getSessionUser());
    }
  }, []);

  const handleGoToStep3 = () => {
    if (!canNextFrom2) return;
    if (!isLoggedIn) {
      toast({ title: 'Giriş gerekli', description: 'Devam edebilmek için giriş yapmalısınız!' });
      setStep(3);
      setShowLoginModal(true);
      return;
    }
    setStep(3);
  };

  useEffect(() => {
    if (!altOptions.length && form.placeType) handleChange('placeType', '');
  }, [altOptions.length]);

  useEffect(() => {
    if (!form.originCity || !form.destinationCity) return;
    const autoScope: 'sehirici' | 'sehirlerarasi' = form.originCity === form.destinationCity ? 'sehirici' : 'sehirlerarasi';
    if (form.scope !== autoScope) setForm(f => ({ ...f, scope: autoScope }));
    try { localStorage.setItem('auto_scope', autoScope); } catch {}
  }, [form.originCity, form.destinationCity]);

  useEffect(() => {
    (async () => {
      if (form.originCity) {
        const list = await getDistrictsForCity(form.originCity);
        setOriginDistricts(list);
        if (!list.includes(form.originDistrict)) handleChange('originDistrict', '');
      } else {
        setOriginDistricts([]);
        handleChange('originDistrict', '');
      }
    })();
  }, [form.originCity]);

  useEffect(() => {
    (async () => {
      if (form.destinationCity) {
        const list = await getDistrictsForCity(form.destinationCity);
        setDestinationDistricts(list);
        if (!list.includes(form.destinationDistrict)) handleChange('destinationDistrict', '');
      } else {
        setDestinationDistricts([]);
        handleChange('destinationDistrict', '');
      }
    })();
  }, [form.destinationCity]);

  const requestOffer = (carrier: Carrier) => {
    const user = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
    const reqId = `req_${Date.now()}`;
    mockDb.addOfferRequest({ id: reqId, carrierId: carrier.id, customerId: user?.id || 'c1', createdAt: new Date().toISOString(), form });
    mockDb.addNotification({
      id: `n_${Date.now()}`,
      userId: carrier.id,
      title: 'Yeni Teklif Talebi',
      message: `${user?.name || 'Müşteri'} ${form.originCity}${form.originDistrict ? ' ' + form.originDistrict : ''} → ${form.destinationCity}${form.destinationDistrict ? ' ' + form.destinationDistrict : ''} için teklif istedi.`,
      isRead: false,
      createdAt: new Date().toISOString(),
  actionUrl: `/carrier/respond/${reqId}`,
      relatedId: reqId,
      kind: 'request'
    });
    alert(`${carrier.name} ${carrier.surname} adlı nakliyeciye teklif isteği gönderildi.`);
  };

  const submitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canNextFrom1) return;
    const autoScope: 'sehirici' | 'sehirlerarasi' = form.originCity === form.destinationCity ? 'sehirici' : 'sehirlerarasi';
    setForm(f => ({ ...f, scope: autoScope }));
    try { localStorage.setItem('auto_scope', autoScope); } catch {}
    goNext();
  };
  const submitStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canNextFrom2) return;
    if (!isLoggedIn) {
      toast({ title: 'Giriş gerekli', description: 'Devam edebilmek için giriş yapmalısınız!' });
      setShowLoginModal(true);
      setStep(3);
      return;
    }
    goNext();
  };

  useEffect(() => {
    if (step === 3) {
      setLoadingResults(true);
      const t = setTimeout(() => setLoadingResults(false), 400);
      return () => clearTimeout(t);
    }
  }, [step]);
  useEffect(() => {
    if (step === 3) {
      setLoadingResults(true);
      const t = setTimeout(() => setLoadingResults(false), 300);
      return () => clearTimeout(t);
    }
  }, [onlyApproved, minRating, sortBy, suitableCarriersBase, step]);

  useEffect(() => {
    if (step === 3 && !isLoggedIn) {
      setShowLoginModal(true);
    }
  }, [step, isLoggedIn]);

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setStep(2);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-visible relative">
      {showHeader && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 inline-block overflow-visible pb-2 leading-[1.15] md:leading-[1.1]">Müşteri Teklif Talebi</h1>
          <p className="text-gray-600 mt-1">İhtiyacınızı tarif edin, uygun nakliyecilerden teklif isteyin.</p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between">
          {[
            { id: 1, label: 'Rota' },
            { id: 2, label: 'Yük & Tercihler' },
            { id: 3, label: 'Uygun Nakliyeciler' },
          ].map((st) => (
            <div key={st.id} className="flex-1 flex items-center">
              <div className={`flex items-center gap-2 ${step >= (st.id as Step) ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border ${step >= (st.id as Step) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>{st.id}</div>
                <span className="text-sm font-medium">{st.label}</span>
              </div>
              {st.id !== 3 && <div className={`mx-2 h-px flex-1 ${step > st.id ? 'bg-blue-200' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Progress value={progress} />
          <div className="text-xs text-gray-500 mt-1">%{progress} tamamlandı</div>
        </div>
      </div>

      {step === 1 && (
        <form onSubmit={submitStep1} className="space-y-6">
          <Card className="shadow-sm hover:shadow transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Taşımayı saniyeler içinde planla 🚀</CardTitle>
              <CardDescription>Çıkış/Varış noktalarını ve tarihi belirtin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Çıkış Şehri</Label>
                  <Select value={form.originCity} onValueChange={(v) => handleChange('originCity', v)}>
                    <SelectTrigger><SelectValue placeholder="Şehir seçin" /></SelectTrigger>
                    <SelectContent>
                      {CITIES_TR.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Çıkış İlçesi</Label>
                  <Select value={form.originDistrict} onValueChange={(v) => handleChange('originDistrict', v)}>
                    <SelectTrigger><SelectValue placeholder="İlçe seçin" /></SelectTrigger>
                    <SelectContent>
                      {originDistricts.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Varış Şehri</Label>
                  <Select value={form.destinationCity} onValueChange={(v) => handleChange('destinationCity', v)}>
                    <SelectTrigger><SelectValue placeholder="Şehir seçin" /></SelectTrigger>
                    <SelectContent>
                      {CITIES_TR.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Varış İlçesi</Label>
                  <Select value={form.destinationDistrict} onValueChange={(v) => handleChange('destinationDistrict', v)}>
                    <SelectTrigger><SelectValue placeholder="İlçe seçin" /></SelectTrigger>
                    <SelectContent>
                      {destinationDistricts.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Taşıma Tarihi</Label>
                <Input
                  type="date"
                  value={form.date}
                  min={todayStr}
                  max={maxDateStr}
                  onChange={(e) => handleChange('date', e.target.value)}
                  aria-invalid={isDateTooFar}
                  required
                />
                {isDateTooFar && (
                  <div className="text-sm text-red-600 mt-1">30 günden ileri bir tarihte gün seçemezsiniz.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={!canNextFrom1}>Devam</Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submitStep2} className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card className="shadow-sm hover:shadow transition">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Yük ve Tercihler</CardTitle>
                  <CardDescription>Kolay şablonlar ve opsiyonlarla talebinizi netleştirin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">Temel Bilgiler</div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Taşıma Kapsamı (Otomatik Belirlenir)</Label>
                        <div className="h-10 px-3 flex items-center rounded-md border bg-gray-50 text-gray-800">
                          {form.scope === 'sehirici' ? 'Şehir İçi' : form.scope === 'sehirlerarasi' ? 'Şehirlerarası' : '-'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Rota adımındaki seçimlerinize göre otomatik hesaplanır.</div>
                      </div>
                      <div>
                        <Label>Taşıma Tipi</Label>
                        <Select value={form.transportType} onValueChange={(v) => handleChange('transportType', v)}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Seçin" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="evden-eve">Evden Eve</SelectItem>
                            <SelectItem value="ofis-tasima">Ofis Taşıma</SelectItem>
                            <SelectItem value="parca">Parça Eşya</SelectItem>
                            <SelectItem value="depolama">Depolama</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-gray-500 mt-1">Bu seçim diğer alanları otomatik şekillendirir.</div>
                      </div>
                      <div>
                        <Label>Taşınacak Yer Türü</Label>
                        <Select disabled={!altOptions.length} value={form.placeType} onValueChange={(v) => handleChange('placeType', v)}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder={altOptions.length ? 'Seçin' : 'Bu taşıma tipinde geçerli değil'} />
                          </SelectTrigger>
                          <SelectContent>
                            {altOptions.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-gray-500 mt-1">Opsiyonel — teklif hesabını iyileştirir.</div>
                      </div>
                    </div>
                  </div>

                  {form.transportType === 'parca' && (
                    <div>
                      <Label>Yük Türü (opsiyonel)</Label>
                      <Select value={form.loadType} onValueChange={(v) => handleChange('loadType', v)}>
                        <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(LOAD_TYPES).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">Araç & Bina</div>
                    <div className="rounded-lg border bg-gray-50 p-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label>Araç Tercihi (opsiyonel)</Label>
                          <Select value={form.vehicleType} onValueChange={(v) => handleChange('vehicleType', v)}>
                            <SelectTrigger className="h-10"><SelectValue placeholder="Araç seçin" /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(VEHICLE_TYPES).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Kat</Label>
                          <Input className="h-10" type="number" min={0} value={form.floor} onChange={(e) => handleChange('floor', e.target.value)} placeholder="Örn. 3" />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={form.hasElevator} onChange={(e) => handleChange('hasElevator', e.target.checked)} />
                            Bina Asansörü Var
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">Zaman & Sigorta</div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Zaman Tercihi</Label>
                        <Select value={form.timeWindow} onValueChange={(v) => handleChange('timeWindow', v)}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Seçin" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sabah">Sabah (08:00-12:00)</SelectItem>
                            <SelectItem value="ogle">Öğlen (12:00-17:00)</SelectItem>
                            <SelectItem value="aksam">Akşam (17:00-22:00)</SelectItem>
                            <SelectItem value="farketmez">Farketmez</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Sigorta</Label>
                        <Select value={form.insurance} onValueChange={(v) => handleChange('insurance', v)}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Seçin" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">İstemiyorum</SelectItem>
                            <SelectItem value="basic">Temel Sigorta</SelectItem>
                            <SelectItem value="premium">Tam Sigorta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {currentServiceGroup && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Ek Hizmet Seçenekleri</Label>
                        <div className="text-xs text-gray-500">{(form.serviceOptions?.[currentServiceGroup] || []).length} seçili</div>
                      </div>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="font-medium mb-2">{SPECIAL_SERVICES[currentServiceGroup] || currentServiceGroup}</div>
                        <div className="grid md:grid-cols-2 gap-2">
                          {Object.entries(ADDITIONAL_SERVICE_OPTIONS[currentServiceGroup] || {}).map(([key, label]) => (
                            <label key={key} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={(form.serviceOptions?.[currentServiceGroup] || []).includes(key)}
                                onChange={() => setForm(prev => {
                                  const current = new Set(prev.serviceOptions?.[currentServiceGroup] || []);
                                  if (current.has(key)) current.delete(key); else current.add(key);
                                  return { ...prev, serviceOptions: { [currentServiceGroup]: Array.from(current) } };
                                })}
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div>
                    <Label className="flex items-center gap-2"><Images className="h-4 w-4" /> Opsiyonel Fotoğraf Yükleme</Label>
                    <FileUpload
                      label="Eşyaların Fotoğrafları"
                      description="Daha doğru teklif için fotoğraf ekleyin. (JPG/PNG, max 5MB)"
                      multiple
                      accept=".jpg,.jpeg,.png"
                      maxSize={5}
                      uploadedFiles={form.photos as any}
                      onUpload={(files) => handleChange('photos', files as any)}
                      className="mt-2"
                    />
                  </div>
                  <Separator className="my-2" />
                  <div>
                    <Label>Not (opsiyonel)</Label>
                    <Textarea rows={3} value={form.note} onChange={(e) => handleChange('note', e.target.value)} placeholder="Örn. hassas eşyalar var, 3. kat, vs." />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="md:col-span-1">
              <div className="sticky top-4">
                <SummaryCard step={step} form={form} onEditStep={(s: Step) => setStep(s)} />
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" onClick={goPrev}>Geri</Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={handleGoToStep3} disabled={!canNextFrom2}>Uygunları Gör</Button>
              <Button type="submit" disabled={!canNextFrom2} className="bg-gradient-to-r from-blue-600 to-sky-600">Devam</Button>
            </div>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className={`space-y-6 ${showLoginModal ? 'pointer-events-none blur-sm' : ''}`} aria-hidden={showLoginModal}>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Uygun Nakliyeciler</CardTitle>
                  <CardDescription>Seçtiğiniz kriterlere göre listelenen nakliyeciler</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex items-center gap-2">
                      <input id="onlyApproved" type="checkbox" checked={onlyApproved} onChange={(e) => setOnlyApproved(e.target.checked)} />
                      <Label htmlFor="onlyApproved" className="text-sm">Sadece Onaylı</Label>
                    </div>
                    <div className="w-40">
                      <Label>Minimum Puan</Label>
                      <Select value={String(minRating)} onValueChange={(v) => setMinRating(Number(v))}>
                        <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Farketmez</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                          <SelectItem value="4.5">4.5+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-48">
                      <Label>Sırala</Label>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                        <SelectTrigger><SelectValue placeholder="Kriter" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rating">Puan (yüksek → düşük)</SelectItem>
                          <SelectItem value="reviews">Yorum sayısı</SelectItem>
                          <SelectItem value="capacity">Kapasite</SelectItem>
                          <SelectItem value="price">Fiyat (taban ücret)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="ghost" className="ml-auto" onClick={() => { setOnlyApproved(false); setMinRating(0); setSortBy('rating'); }}>Filtreleri sıfırla</Button>
                  </div>

                  {loadingResults ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-2/3" />
                                <Skeleton className="h-24 w-full" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : suitableCarriers.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-sm text-gray-600 flex items-center gap-2">
                        <Info className="h-4 w-4" /> Kriterlerinize uygun nakliyeci bulunamadı. Tercihleri değiştirerek tekrar deneyin.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {suitableCarriers.map((c) => (
                        <CarrierCard key={c.id} carrier={c} form={form} onRequest={() => requestOffer(c)} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="md:col-span-1">
              <div className="sticky top-4">
                <SummaryCard step={step} form={form} onEditStep={(s: Step) => setStep(s)} />
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={goPrev}>Geri</Button>
            <Button>Bitti</Button>
          </div>
        </div>
      )}

      {/* Login Required Modal */}
      <AnimatePresence>
        {showLoginModal && step === 3 && !isLoggedIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/70 px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white shadow-2xl rounded-xl p-8 text-center max-w-md w-full"
            >
              <button onClick={closeLoginModal} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Devam edebilmek için giriş yapmalısınız</h3>
              <p className="text-sm text-gray-600 mt-2">Teklif isteyebilmek ve nakliyecilerle iletişime geçebilmek için giriş yapın veya ücretsiz kayıt olun.</p>
              <div className="mt-6 flex justify-center gap-4">
                <Button onClick={() => navigate('/login')}>Giriş Yap</Button>
                <Button variant="outline" onClick={() => navigate('/register')}>Üye Ol</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ step, form, onEditStep }: { step: Step; form: any; onEditStep: (s: Step) => void }) {
  const routeReady = form.originCity && form.destinationCity && form.date;
  const isCityFlow = form.scope === 'sehirici' || form.scope === 'sehirlerarasi';
  const prefsReady = (!!form.scope) && (isCityFlow ? true : (form.placeType || form.loadType)) && form.transportType;
  const summaryGroupKey = (() => {
    const map: Record<string, string> = {
      'evden-eve': 'evden-eve',
      'parca': 'parca',
      'sehirlerarasi': 'sehirlerarasi',
      'sehirici': 'sehirici',
      'ofis-tasima': 'ofis',
      'depolama': 'depolama',
    };
    return map[form.transportType] || '';
  })();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Seçimler Özeti</CardTitle>
        <CardDescription>Adımlar arası hızlı kontrol</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <div className="flex items-center justify-between">
            <div className="font-medium">Rota</div>
            <Button size="sm" variant="ghost" onClick={() => onEditStep(1)}>Düzenle</Button>
          </div>
          <div className="text-gray-700">
            {routeReady ? (
              <div>
                <div>{form.originCity}{form.originDistrict ? `, ${form.originDistrict}` : ''} → {form.destinationCity}{form.destinationDistrict ? `, ${form.destinationDistrict}` : ''}</div>
                <div className="text-xs text-gray-500">Tarih: {form.date || '-'}</div>
              </div>
            ) : (
              <div className="text-gray-400">Henüz doldurulmadı</div>
            )}
          </div>
        </div>
        <Separator />
        <div>
          <div className="flex items-center justify-between">
            <div className="font-medium">Yük & Tercihler</div>
            <Button size="sm" variant="ghost" onClick={() => onEditStep(2)}>Düzenle</Button>
          </div>
          <div className="text-gray-700 space-y-1">
            {prefsReady ? (
              <>
                <div>Taşıma Kapsamı: {form.scope === 'sehirici' ? 'Şehir İçi' : form.scope === 'sehirlerarasi' ? 'Şehirlerarası' : '-'}</div>
                <div>Taşıma Tipi: {form.transportType || '-'}</div>
                {form.placeType && <div>Yer Türü: {form.placeType}</div>}
                {form.loadType && <div>Yük Türü: {LOAD_TYPES[form.loadType as keyof typeof LOAD_TYPES]}</div>}
                {form.vehicleType && <div>Araç: {VEHICLE_TYPES[form.vehicleType as keyof typeof VEHICLE_TYPES]?.name}</div>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.hasElevator && <Badge variant="secondary">Bina asansörü</Badge>}
                  {form.insurance !== 'none' && <Badge variant="secondary">Sigorta: {form.insurance}</Badge>}
                  {form.timeWindow && <Badge variant="secondary">Zaman: {form.timeWindow}</Badge>}
                  {summaryGroupKey && (
                    <Badge variant="secondary">
                      {SPECIAL_SERVICES[summaryGroupKey] || summaryGroupKey}
                      {Array.isArray(form.serviceOptions?.[summaryGroupKey]) ? ` (${form.serviceOptions[summaryGroupKey].length})` : ''}
                    </Badge>
                  )}
                </div>
              </>
            ) : (
              <div className="text-gray-400">Henüz doldurulmadı</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CarrierCard({ carrier, form, onRequest }: { carrier: Carrier; form: any; onRequest: () => void; }) {
  const weight = Number(form.weightKg || 0);
  const capacityOk = !weight || carrier.vehicle.capacity >= weight;
  const insuranceNeeded = form.insurance !== 'none' || form.extras?.sigorta || (form.extraServices || []).includes('sigorta');
  const hasInsurance = (carrier.badges || []).some((b) => ['Sigorta', 'Soğuk Zincir'].includes(b));
  const insuranceOk = !insuranceNeeded || hasInsurance;
  const vehicleOk = !form.vehicleType || carrier.vehicle.type === form.vehicleType;
  const routeOk = (!form.originCity || carrier.serviceAreas.includes(form.originCity)) && (!form.destinationCity || carrier.serviceAreas.includes(form.destinationCity));
  const scopeOk = !form.scope || !(carrier.scopes && carrier.scopes.length) || (carrier.scopes || []).includes(form.scope);
  const wantsPackaging = form.extras?.ambalaj || (form.extraServices || []).includes('paketleme') || (form.extraServices || []).includes('ambalaj');
  const hasPackaging = (carrier.badges || []).some((b) => ['Profesyonel', 'Altın Taşıyıcı'].includes(b));
  const extrasOk = (!wantsPackaging || hasPackaging) && (!form.extras?.sigorta || hasInsurance);

  const okTag = (ok: boolean, label: string) => (
    <Badge key={label} className={`${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'} flex items-center gap-1`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {label}
    </Badge>
  );

  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10"><AvatarFallback className="bg-blue-100 text-blue-600">{carrier.name[0]}</AvatarFallback></Avatar>
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>{carrier.name} {carrier.surname}</span>
                {carrier.isApproved && (
                  <Badge className="bg-emerald-100 text-emerald-800 flex items-center gap-1"><Shield className="h-3 w-3" /> Onaylı Nakliyeci</Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-yellow-500" /> {carrier.rating}
                </div>
                <span>·</span>
                <div>{carrier.reviewCount} değerlendirme</div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900 uppercase">{carrier.vehicle.type}</div>
            <div className="text-xs text-gray-500">Kapasite: {carrier.vehicle.capacity} kg</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-gray-600">Hizmet Bölgeleri</div>
            <div className="text-gray-900">{carrier.serviceAreas.join(', ')}</div>
          </div>
          <div className="space-y-1">
            <div className="text-gray-600">Yük Tipleri</div>
            <div className="text-gray-900">{carrier.loadTypes.join(', ')}</div>
          </div>
          <div className="space-y-1">
            <div className="text-gray-600">Rozetler</div>
            <div className="flex flex-wrap gap-2">
              {(carrier.badges || []).map((b) => (<Badge key={b} variant="secondary" className="bg-gray-100">{b}</Badge>))}
            </div>
          </div>
        </div>
        <Separator className="my-3" />
        <div className="flex flex-wrap gap-2 text-xs">
          {okTag(routeOk, 'Rota uygun')}
          {okTag(scopeOk, 'Kapsam uygun')}
          {okTag(vehicleOk, 'Araç uygun')}
          {okTag(capacityOk, 'Kapasite yeterli')}
          {okTag(insuranceOk, 'Sigorta uygun')}
          {okTag(extrasOk, 'Ekler uyumlu')}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Award className="h-4 w-4 text-yellow-500" />
            <span>Güven Puanı: {carrier.rating} ({carrier.reviewCount} değerlendirme)</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={onRequest}>
              <MessageSquare className="h-4 w-4 mr-2" /> Teklif İste
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
