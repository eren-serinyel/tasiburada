import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import FileUpload from '@/components/ui/file-upload';
import { ArrowRight, Calendar as CalendarIcon } from 'lucide-react';
import { CITIES_TR, formatDateYYYYMMDD, getDistrictsForCity } from '@/lib/locations';
import type { LoadType, Location, Offer, Shipment } from '@/lib/types';
import { Link } from 'react-router-dom';

const calculateDistance = (origin: Location, destination: Location): number => {
  const o = origin.city || origin.address || '';
  const d = destination.city || destination.address || '';
  if (!o || !d) return 0;
  return o === d ? 15 : 120;
};

const fadeSlide = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

export default function HeroQuickForm() {
  // Tarih TR format (gg.MM.yyyy)
  const formatDateTR = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };
  const [step, setStep] = useState<number>(1);

  // Step 1: Rota
  const [originCity, setOriginCity] = useState('');
  const [originDistrict, setOriginDistrict] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationDistrict, setDestinationDistrict] = useState('');
  const [originDistricts, setOriginDistricts] = useState<string[]>([]);
  const [destinationDistricts, setDestinationDistricts] = useState<string[]>([]);
  const [date, setDate] = useState<Date | undefined>();

  // Step 2: Yük & Tercihler
  const [loadType, setLoadType] = useState<LoadType>('ev-esyasi');
  const [placeType, setPlaceType] = useState('daire');
  const [vehicleType, setVehicleType] = useState('');
  const [floor, setFloor] = useState<number>(0);
  const [hasElevator, setHasElevator] = useState<boolean>(true);
  const [timePref, setTimePref] = useState('Sabah');
  const [insurance, setInsurance] = useState('İstiyorum');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Step 3: Sonuçlar
  const [offers, setOffers] = useState<Offer[]>([]);
  const [onlyApproved, setOnlyApproved] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortPrice, setSortPrice] = useState<'asc' | 'desc' | ''>('');

  // Login gating
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const scope = useMemo(() => {
    if (!originCity || !destinationCity) return '';
    return originCity === destinationCity ? 'Şehir İçi' : 'Şehirlerarası';
  }, [originCity, destinationCity]);

  // District loaders
  useEffect(() => {
    (async () => {
      if (originCity) setOriginDistricts(await getDistrictsForCity(originCity));
      else setOriginDistricts([]);
      setOriginDistrict('');
    })();
  }, [originCity]);

  useEffect(() => {
    (async () => {
      if (destinationCity) setDestinationDistricts(await getDistrictsForCity(destinationCity));
      else setDestinationDistricts([]);
      setDestinationDistrict('');
    })();
  }, [destinationCity]);

  // Load persisted state (simple)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tb_quick_form');
      if (saved) {
        const parsed = JSON.parse(saved);
        setOriginCity(parsed.originCity || '');
        setOriginDistrict(parsed.originDistrict || '');
        setDestinationCity(parsed.destinationCity || '');
        setDestinationDistrict(parsed.destinationDistrict || '');
        setDate(parsed.date ? new Date(parsed.date) : undefined);
        setLoadType(parsed.loadType || 'ev-esyasi');
        setPlaceType(parsed.placeType || 'daire');
        setVehicleType(parsed.vehicleType || '');
        setFloor(parsed.floor || 0);
        setHasElevator(parsed.hasElevator ?? true);
        setTimePref(parsed.timePref || 'Sabah');
        setInsurance(parsed.insurance || 'İstiyorum');
      }
      setIsLoggedIn(localStorage.getItem('tb_isLoggedIn') === 'true');
    } catch {}
  }, []);

  useEffect(() => {
    const payload = {
      originCity,
      originDistrict,
      destinationCity,
      destinationDistrict,
      date: date ? date.toISOString() : undefined,
      loadType,
      placeType,
      vehicleType,
      floor,
      hasElevator,
      timePref,
      insurance,
    };
    try { localStorage.setItem('tb_quick_form', JSON.stringify(payload)); } catch {}
  }, [originCity, originDistrict, destinationCity, destinationDistrict, date, loadType, placeType, vehicleType, floor, hasElevator, timePref, insurance]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  const canStep1Continue = originCity && originDistrict && destinationCity && destinationDistrict && date;

  const handleGenerateOffers = () => {
    if (!canStep1Continue) return;
    const originLoc: Location = {
      address: `${originDistrict}, ${originCity}`,
      city: originCity,
      lat: 0,
      lng: 0,
    };
    const destinationLoc: Location = {
      address: `${destinationDistrict}, ${destinationCity}`,
      city: destinationCity,
      lat: 0,
      lng: 0,
    };
    const distance = calculateDistance(originLoc, destinationLoc);
    const shipment: Shipment = {
      id: 'tmp',
      customerId: 'guest',
      origin: originLoc,
      destination: destinationLoc,
      loadType,
      weight: 1000,
      distance,
      date: date!,
      requestedDate: date!,
      status: 'pending',
      createdAt: new Date(),
    };
    void shipment;
    setOffers([]);
  };

  const filteredSortedOffers = useMemo(() => {
    let list = offers.slice();
    if (onlyApproved) list = list.filter(o => o.carrier?.isApproved);
    if (minRating) list = list.filter(o => (o.carrier?.rating || 0) >= minRating);
    if (sortPrice === 'asc') list = list.sort((a, b) => a.price - b.price);
    if (sortPrice === 'desc') list = list.sort((a, b) => b.price - a.price);
    return list;
  }, [offers, onlyApproved, minRating, sortPrice]);

  return (
    <div ref={containerRef} className="w-full">
      <Card className="bg-white shadow-lg rounded-2xl p-6 md:p-10 max-w-6xl mx-auto mt-10">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl md:text-3xl font-bold">Taksici çağırır gibi nakliyeci çağırmak için 🚚</CardTitle>
          <CardDescription className="text-base md:text-lg">Nereden nereye taşıyacağınızı seçin, anında teklif alın.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={fadeSlide.initial} animate={fadeSlide.animate} exit={fadeSlide.exit} transition={fadeSlide.transition}>
              {step === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Çıkış Şehri */}
                    <div>
                      <Label>Çıkış Şehri</Label>
                      <Select value={originCity} onValueChange={setOriginCity}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Şehir seçin" /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          {CITIES_TR.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Çıkış İlçesi */}
                    <div>
                      <Label>Çıkış İlçesi</Label>
                      <Select value={originDistrict} onValueChange={setOriginDistrict}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="İlçe seçin" /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          {originDistricts.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Varış Şehri */}
                    <div>
                      <Label>Varış Şehri</Label>
                      <Select value={destinationCity} onValueChange={setDestinationCity}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Şehir seçin" /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          {CITIES_TR.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Varış İlçesi */}
                    <div>
                      <Label>Varış İlçesi</Label>
                      <Select value={destinationDistrict} onValueChange={setDestinationDistrict}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="İlçe seçin" /></SelectTrigger>
                        <SelectContent className="max-h-64">
                          {destinationDistricts.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Tarih */}
                    <div className="md:col-span-2 lg:col-span-2">
                      <Label>Taşıma Tarihi</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start mt-1">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? formatDateTR(date) : 'gg.aa.yyyy'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {/* Kapsam */}
                    <div className="md:col-span-2 lg:col-span-2 flex items-end">
                      <div className="text-sm text-gray-600">Taşıma Kapsamı: <span className="font-medium">{scope || '-'}</span></div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button className="bg-gradient-to-r from-blue-500 to-blue-700 text-white" disabled={!canStep1Continue} onClick={() => setStep(2)}>
                      Devam Et
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label>Taşıma Tipi</Label>
                      <Select value={loadType} onValueChange={(v) => setLoadType(v as LoadType)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Seçin" /></SelectTrigger>
                        <SelectContent>
                          {['ev-esyasi','ofis','parca-esya','sehirici','sehirlerarasi'].map(v => (<SelectItem key={v} value={v}>{v.replace('-', ' ')}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Taşınacak Yer Türü</Label>
                      <Select value={placeType} onValueChange={setPlaceType}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Seçin" /></SelectTrigger>
                        <SelectContent>
                          {['daire','ofis','depo','müstakil'].map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Kat</Label>
                      <Input className="mt-1" type="number" value={floor} onChange={(e) => setFloor(Number(e.target.value))} />
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <Checkbox id="elevator" checked={hasElevator} onCheckedChange={(v) => setHasElevator(Boolean(v))} />
                      <Label htmlFor="elevator">Bina Asansörü Var</Label>
                    </div>
                    <div>
                      <Label>Araç Seçimi</Label>
                      <Select value={vehicleType} onValueChange={setVehicleType}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Seçin" /></SelectTrigger>
                        <SelectContent>
                          {['kamyonet','panelvan','kamyon','tir'].map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sigorta</Label>
                      <Select value={insurance} onValueChange={setInsurance}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['İstiyorum','İstemiyorum'].map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Zaman Tercihi</Label>
                      <Select value={timePref} onValueChange={setTimePref}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Sabah','Öğle','Akşam'].map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 lg:col-span-4">
                      <FileUpload label="Fotoğraflar" description="Opsiyonel - yükünüzü daha iyi anlatalım" multiple onUpload={setUploadedFiles} uploadedFiles={uploadedFiles} />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>Geri</Button>
                    <Button className="bg-gradient-to-r from-blue-500 to-blue-700 text-white" onClick={() => { setStep(3); handleGenerateOffers(); }}>Uygun Nakliyecileri Gör</Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  {/* Filtreler */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox id="approved" checked={onlyApproved} onCheckedChange={(v) => setOnlyApproved(Boolean(v))} />
                      <Label htmlFor="approved">Sadece onaylı</Label>
                    </div>
                    <div>
                      <Label>Minimum puan</Label>
                      <Input type="number" min={0} max={5} step={0.1} className="mt-1" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Fiyat sıralama</Label>
                      <Select value={sortPrice} onValueChange={(v) => setSortPrice(v as 'asc'|'desc'|'')}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Seçin" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">—</SelectItem>
                          <SelectItem value="asc">Artan</SelectItem>
                          <SelectItem value="desc">Azalan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Liste */}
                  {filteredSortedOffers.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-10 text-center text-gray-600">Sonuç bulunamadı 😔</CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {filteredSortedOffers.map((o) => (
                        <motion.div key={o.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                          <Card className="hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                            <CardHeader>
                              <CardTitle className="text-lg">{o.carrier?.name} {o.carrier?.surname}</CardTitle>
                              <CardDescription>{o.carrier?.vehicle?.type} • {o.carrier?.rating} / 5</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                              <div>Başlangıç fiyatı: <span className="font-semibold">{o.price} ₺</span></div>
                              <div className="flex flex-wrap gap-2">
                                {(o.carrier?.serviceAreas || []).slice(0, 4).map(tag => (
                                  <span key={tag} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">{tag}</span>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-2">
                                <Button variant="outline" asChild>
                                  <Link to={`/nakliyeci/${o.carrierId}`}>Profil Gör</Link>
                                </Button>
                                <Button className="bg-gradient-to-r from-blue-500 to-blue-700 text-white" onClick={() => { if (!isLoggedIn) { setStep(4); } else { /* proceed to request offer */ } }}>Teklif İste</Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>Geri</Button>
                    <Button className="bg-gradient-to-r from-blue-500 to-blue-700 text-white">Talebi Tamamla</Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <Card className="border-blue-100">
                    <CardHeader>
                      <CardTitle>Teklif alabilmek için giriş yap veya kayıt ol</CardTitle>
                      <CardDescription>Devam etmek için hesabınla giriş yapmalısın.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button variant="outline" asChild><Link to="/giris">Giriş Yap</Link></Button>
                      <Button className="bg-gradient-to-r from-blue-500 to-blue-700 text-white" asChild><Link to="/musteri-kayit">Üye Ol</Link></Button>
                      <Button variant="ghost" onClick={() => setStep(3)}>İptal</Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
