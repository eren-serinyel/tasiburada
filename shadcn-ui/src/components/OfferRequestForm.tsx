import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin, Package, Truck, Shield, Award, MessageSquare, Star,
  CheckCircle2, XCircle, Info, Images, Lock, X, ArrowRight,
  Calendar, LayoutGrid, CheckCircle, Phone, Plus, Check, Loader2, UserCheck,
} from 'lucide-react';
import { Carrier, LOAD_TYPES, VEHICLE_TYPES } from '@/lib/types';
import { getSessionUser } from '@/lib/storage';
import { CITIES_TR, getDistrictsForCity, formatDateYYYYMMDD } from '@/lib/locations';
import FileUpload from '@/components/ui/file-upload';
import { ADDITIONAL_SERVICE_OPTIONS, SPECIAL_SERVICES } from '@/lib/carrierFormConstants';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';

type Step = 1 | 2 | 3;

interface CustomerAddress {
  id: number;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  isDefault: boolean;
}

export default function OfferRequestForm({ showHeader = false }: { showHeader?: boolean }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [inviteCarrierId, setInviteCarrierId] = useState<string | null>(null);
  const [inviteCarrierName, setInviteCarrierName] = useState<string | null>(null);
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

  const [availabilitySummary, setAvailabilitySummary] = useState<{ total: number; available: number } | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const availabilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!form.date) {
      setAvailabilitySummary(null);
      return;
    }
    if (availabilityTimerRef.current) clearTimeout(availabilityTimerRef.current);
    setIsCheckingAvailability(true);
    setAvailabilitySummary(null);
    availabilityTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/carriers/availability-summary?date=${encodeURIComponent(form.date)}`);
        const json = await res.json();
        if (res.ok && json?.success) {
          setAvailabilitySummary(json.data);
        }
      } catch {
        // silently ignore
      } finally {
        setIsCheckingAvailability(false);
      }
    }, 400);
    return () => {
      if (availabilityTimerRef.current) clearTimeout(availabilityTimerRef.current);
    };
  }, [form.date]);

  // Load saved addresses for authenticated customers
  useEffect(() => {
    if (isAuthenticated && user?.type === 'customer') {
      apiClient('/api/v1/customers/me/addresses')
        .then((r) => r.json())
        .then((d) => { if (d.success) setSavedAddresses(d.data ?? []); })
        .catch(() => {});
    }
  }, [isAuthenticated, user?.type]);

  // Load profile phone for pre-fill
  useEffect(() => {
    if (isAuthenticated && user?.type === 'customer') {
      apiClient('/api/v1/customers/profile')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            if (!d.data?.phone) {
              setNeedsPhone(true);
            } else {
              setPhone(d.data.phone);
            }
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, user?.type]);

  // Handle URL "type" parameter mappings
  useEffect(() => {
    if (typeParam) {
      setForm((prev) => {
        let mapped = prev.transportType;
        if (typeParam === 'residential') mapped = 'evden-eve';
        else if (typeParam === 'office') mapped = 'ofis-tasima';
        else if (typeParam === 'partial') mapped = 'parca';
        else if (typeParam === 'storage') mapped = 'depolama';
        return mapped !== prev.transportType ? { ...prev, transportType: mapped } : prev;
      });
    }
  }, [typeParam]);

  // Repeat shipment: prefill from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('repeatShipment');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      sessionStorage.removeItem('repeatShipment');

      setForm(prev => {
        const next = { ...prev };
        if (data.origin) {
          const parts = data.origin.split(', ');
          next.originCity = parts[0] ?? '';
          next.originDistrict = parts[1] ?? '';
        }
        if (data.destination) {
          const parts = data.destination.split(', ');
          next.destinationCity = parts[0] ?? '';
          next.destinationDistrict = parts[1] ?? '';
        }
        if (data.transportType) next.transportType = data.transportType;
        if (data.weight) next.weightKg = String(data.weight);
        if (data.placeType) next.placeType = data.placeType;
        if (data.floor) next.floor = String(data.floor);
        if (data.hasElevator !== undefined) next.hasElevator = data.hasElevator;
        if (data.insuranceType && data.insuranceType !== 'none') next.insurance = data.insuranceType;
        if (data.extraServices) next.extraServices = data.extraServices;
        return next;
      });

      if (data.inviteCarrierId) {
        setInviteCarrierId(data.inviteCarrierId);
        setInviteCarrierName(data.inviteCarrierName ?? null);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

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
    // Backend zaten tarih filtresi uyguladı.
    // ServiceAreas verisi tutarsız (bölge adları vs şehir adları karışık) olduğundan
    // rota eşleşmesini zorunlu tutmuyoruz; CarrierCard'daki badge zaten gösteriyor.
    return carriers;
  }, [canNextFrom1, canNextFrom2, carriers]);

  const isLoggedIn = useMemo(() => {
    try {
      return Boolean(localStorage.getItem('userToken')) || Boolean(getSessionUser());
    } catch {
      return Boolean(getSessionUser());
    }
  }, []);

  // Step 3 açıldığında backend'den filtrelenmiş nakliyecileri çek
  useEffect(() => {
    if (step !== 3 || !isLoggedIn) return;
    if (!form.originCity || !form.destinationCity || !form.date) return;

    setLoadingResults(true);
    setCarriers([]);

    // Sadece tarih filtresi — serviceAreas verisi tutarsız olduğundan backend'e gönderilmiyor
    const params = new URLSearchParams({ availableDate: form.date, limit: '50' });

    const token = localStorage.getItem('authToken');
    fetch(`/api/v1/carriers/search?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.items)) {
          setCarriers(json.data.items.map(mapSearchResultToCarrier));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingResults(false));
  }, [step, form.originCity, form.destinationCity, form.date, isLoggedIn]);

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

  // Tüm form verilerinden shipment payload'u üretir
  const buildShipmentPayload = () => {
    // serviceOptions içindeki seçimleri düz array'e çevir
    const extraServicesFromOptions = Object.values(form.serviceOptions || {}).flat();
    const contactPhone = phone.trim() || undefined;

    return {
      origin: [form.originCity, form.originDistrict].filter(Boolean).join(', '),
      destination: [form.destinationCity, form.destinationDistrict].filter(Boolean).join(', '),
      loadDetails: [form.transportType, form.placeType].filter(Boolean).join(' / ') || 'Belirtilmedi',
      transportType: form.transportType || undefined,
      placeType: form.placeType || undefined,
      hasElevator: form.hasElevator || undefined,
      floor: form.floor ? Number(form.floor) : undefined,
      insuranceType: form.insurance !== 'none' ? form.insurance : undefined,
      timePreference: form.timeWindow || undefined,
      extraServices: extraServicesFromOptions.length ? extraServicesFromOptions : undefined,
      weight: form.weightKg ? Number(form.weightKg) : (form.placeType && TEMPLATE_WEIGHTS[form.placeType]) ? TEMPLATE_WEIGHTS[form.placeType] : undefined,
      vehiclePreference: form.vehicleType || undefined,
      note: form.note || undefined,
      shipmentDate: form.date || new Date().toISOString().split('T')[0],
      contactPhone,
    };
  };

  // Profil telefonunu güncelle (opsiyonel, sadece numara yoksa)
  const savePhoneIfNeeded = async () => {
    if (needsPhone && phone.trim()) {
      await apiClient('/api/v1/customers/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      }).catch(() => {});
      setNeedsPhone(false);
    }
  };

  // Talebi yayınla — nakliyeci seçmeden marketplace'e gönderir
  const publishRequest = async () => {
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    if (needsPhone && !phone.trim()) {
      toast({ title: 'Telefon gerekli', description: 'Nakliyecilerin sizi arayabilmesi için telefon numarası gereklidir.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await savePhoneIfNeeded();
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/v1/shipments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(buildShipmentPayload()),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        const newShipmentId = json.data?.id;
        // Davet gönder (başarısız olsa bile talep oluşturuldu sayılır)
        if (inviteCarrierId && newShipmentId) {
          try {
            await apiClient(`/api/v1/shipments/${newShipmentId}/invite/${inviteCarrierId}`, { method: 'POST' });
            toast({ title: `${inviteCarrierName || 'Nakliyeci'} davet edildi`, description: 'Firma talebinizi görüp teklif verebilir.' });
          } catch {
            // davet başarısız — devam et
          }
        } else {
          toast({ title: 'Talep yayınlandı!', description: 'Nakliyecilerden teklifler gelmeye başlayacak.' });
        }
        navigate('/ilanlarim');
      } else {
        toast({ title: 'Hata', description: json?.message || 'Talep oluşturulamadı.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Sunucuya bağlanılamadı.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const requestOffer = async (carrier: Carrier) => {
    const sessionUser = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
    if (!sessionUser) {
      toast({ title: 'Giriş gerekli', description: 'Teklif göndermek için giriş yapmalısınız.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await savePhoneIfNeeded();
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/v1/shipments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(buildShipmentPayload()),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        toast({ title: 'Başarılı', description: `${carrier.name} ${carrier.surname} adlı nakliyeciye teklif isteği gönderildi.` });
        navigate('/ilanlarim');
      } else {
        toast({ title: 'Hata', description: json?.message || 'İlan oluşturulamadı.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Sunucuya bağlanılamadı.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
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

  /* ── step labels ── */
  const STEPS = [
    { id: 1, label: 'Rota Bilgisi' },
    { id: 2, label: 'Yük Bilgisi' },
    { id: 3, label: 'Özet & Yayınla' },
  ];

  /* ── transport types for step 2 grid ── */
  const TRANSPORT_CARDS: { value: string; emoji: string; label: string }[] = [
    { value: 'evden-eve', emoji: '🏠', label: 'Ev Eşyası' },
    { value: 'ofis-tasima', emoji: '🏢', label: 'Ofis' },
    { value: 'parca', emoji: '📦', label: 'Parça Eşya' },
    { value: 'depolama', emoji: '🚚', label: 'Depolama' },
  ];

  /* ── shared input style ── */
  const inputStyle: React.CSSProperties = {
    height: '44px', border: '1px solid #E2E8F0', borderRadius: '10px',
    padding: '0 14px', fontSize: '14px', color: '#0F172A', background: 'white',
    transition: 'border-color 150ms, box-shadow 150ms', outline: 'none', width: '100%',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' };

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 20px' }}>

        {/* ═══ PAGE HEADER ═══ */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '13px', marginBottom: '12px' }}>
            <Link to="/home" style={{ color: '#94A3B8', textDecoration: 'none' }}>Ana Sayfa</Link>
            <span style={{ color: '#CBD5E1', margin: '0 6px' }}>/</span>
            <span style={{ color: '#0F172A', fontWeight: 500 }}>Taşıma Talebi Oluştur</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Taşıma Talebi Oluştur
          </h1>
          <p style={{ fontSize: '15px', color: '#64748B', marginTop: '6px' }}>
            3 adımda ilanınızı oluşturup yayınlayın
          </p>
        </div>

        {/* ═══ STEP INDICATOR ═══ */}
        <div style={{ marginBottom: '32px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px 32px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '20px', right: '32px', fontSize: '13px', fontWeight: 600, color: '#2563EB' }}>
            %{progress}
          </div>
          <div className="flex items-center justify-between">
            {STEPS.map((st, i) => {
              const done = step > st.id;
              const active = step === st.id;
              return (
                <div key={st.id} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : undefined }}>
                  <div className="flex flex-col items-center" style={{ gap: '8px' }}>
                    {/* circle */}
                    {done ? (
                      <div className="flex items-center justify-center" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2563EB' }}>
                        <Check style={{ width: '16px', height: '16px', color: 'white' }} />
                      </div>
                    ) : active ? (
                      <div className="flex items-center justify-center" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'white', border: '2px solid #2563EB', boxShadow: '0 0 0 4px #EFF6FF' }}>
                        <span style={{ color: '#2563EB', fontWeight: 700, fontSize: '15px' }}>{st.id}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F1F5F9' }}>
                        <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: '15px' }}>{st.id}</span>
                      </div>
                    )}
                    {/* label */}
                    <span style={{ fontSize: '13px', fontWeight: done || active ? 500 : 400, color: done || active ? '#0F172A' : '#94A3B8', whiteSpace: 'nowrap' }}>
                      {st.label}
                    </span>
                  </div>
                  {/* connector line */}
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, height: '2px', margin: '0 8px', marginBottom: '20px', background: step > st.id ? '#2563EB' : '#E2E8F0' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ FORM CARD ═══ */}
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>

          {/* ── STEP 1: ROTA ── */}
          {step === 1 && (
            <form onSubmit={submitStep1}>
              {/* Card header */}
              <div className="flex items-center" style={{ gap: '12px', paddingBottom: '20px', borderBottom: '1px solid #F1F5F9', marginBottom: '24px' }}>
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>1</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: '#0F172A' }}>Rota Bilgisi</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>Çıkış ve varış noktalarını belirleyin</div>
                </div>
              </div>

              {/* Saved addresses quick-fill */}
              {savedAddresses.length > 0 && (
                <div style={{ marginBottom: '20px', padding: '14px 16px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                  <label style={{ ...labelStyle, color: '#1D4ED8', marginBottom: '8px' }}>
                    📌 Kayıtlı adreslerden çıkış noktası seç
                  </label>
                  <Select
                    value=""
                    onValueChange={(val) => {
                      const addr = savedAddresses.find((a) => String(a.id) === val);
                      if (addr) {
                        handleChange('originCity', addr.city);
                        handleChange('originDistrict', addr.district);
                      }
                    }}
                  >
                    <SelectTrigger style={{ ...inputStyle, background: 'white' }}>
                      <SelectValue placeholder="Kayıtlı adres seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedAddresses.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.label ? `${a.label} — ` : ''}{a.city}, {a.district}
                          {a.isDefault ? ' (Varsayılan)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Route grid: origin → arrow → destination */}
              <div className="grid items-end" style={{ gridTemplateColumns: '1fr auto 1fr', gap: '12px' }}>
                {/* Origin */}
                <div>
                  <div className="flex items-center" style={{ background: '#F8FAFC', borderRadius: '8px', padding: '12px', marginBottom: '12px', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>📍</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Çıkış Noktası</span>
                  </div>
                  <div className="flex flex-col" style={{ gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Şehir <span style={{ color: '#EF4444' }}>*</span></label>
                      <Select value={form.originCity} onValueChange={(v) => handleChange('originCity', v)}>
                        <SelectTrigger style={inputStyle}><SelectValue placeholder="Şehir seçin" /></SelectTrigger>
                        <SelectContent>{CITIES_TR.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label style={labelStyle}>İlçe <span style={{ color: '#EF4444' }}>*</span></label>
                      <Select value={form.originDistrict} onValueChange={(v) => handleChange('originDistrict', v)}>
                        <SelectTrigger style={inputStyle}><SelectValue placeholder="İlçe seçin" /></SelectTrigger>
                        <SelectContent>{originDistricts.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#EFF6FF', marginBottom: '4px' }}>
                  <ArrowRight style={{ width: '20px', height: '20px', color: '#2563EB' }} />
                </div>

                {/* Destination */}
                <div>
                  <div className="flex items-center" style={{ background: '#F8FAFC', borderRadius: '8px', padding: '12px', marginBottom: '12px', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>📍</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Varış Noktası</span>
                  </div>
                  <div className="flex flex-col" style={{ gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Şehir <span style={{ color: '#EF4444' }}>*</span></label>
                      <Select value={form.destinationCity} onValueChange={(v) => handleChange('destinationCity', v)}>
                        <SelectTrigger style={inputStyle}><SelectValue placeholder="Şehir seçin" /></SelectTrigger>
                        <SelectContent>{CITIES_TR.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label style={labelStyle}>İlçe <span style={{ color: '#EF4444' }}>*</span></label>
                      <Select value={form.destinationDistrict} onValueChange={(v) => handleChange('destinationDistrict', v)}>
                        <SelectTrigger style={inputStyle}><SelectValue placeholder="İlçe seçin" /></SelectTrigger>
                        <SelectContent>{destinationDistricts.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div style={{ marginTop: '20px' }}>
                <label style={labelStyle}>Taşıma Tarihi <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Input
                    type="date"
                    value={form.date}
                    min={todayStr}
                    max={maxDateStr}
                    onChange={(e) => handleChange('date', e.target.value)}
                    aria-invalid={isDateTooFar}
                    required
                    style={inputStyle}
                  />
                </div>
                {isDateTooFar && (
                  <div style={{ fontSize: '13px', color: '#DC2626', marginTop: '6px' }}>30 günden ileri bir tarihte gün seçemezsiniz.</div>
                )}
                {!isDateTooFar && (isCheckingAvailability || availabilitySummary) && (
                  <div style={{ fontSize: '13px', marginTop: '6px' }}>
                    {isCheckingAvailability ? (
                      <span style={{ color: '#64748B' }}>Müsaitlik kontrol ediliyor...</span>
                    ) : availabilitySummary ? (
                      <span style={{ color: availabilitySummary.available > 0 ? '#16A34A' : '#DC2626' }}>
                        Bu tarihte aktif {availabilitySummary.available} nakliyeci görünüyor
                        {availabilitySummary.available === 0 && ' — başka bir tarih seçmeyi deneyin'}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Action bar */}
              <div className="flex justify-end" style={{ paddingTop: '24px', borderTop: '1px solid #F1F5F9', marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={!canNextFrom1}
                  className="hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                  style={{ background: canNextFrom1 ? '#2563EB' : '#94A3B8', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 32px', fontSize: '15px', fontWeight: 600, cursor: canNextFrom1 ? 'pointer' : 'not-allowed', transition: 'all 150ms' }}
                >
                  Devam →
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: YÜK BİLGİSİ ── */}
          {step === 2 && (
            <form onSubmit={submitStep2}>
              {/* Card header */}
              <div className="flex items-center" style={{ gap: '12px', paddingBottom: '20px', borderBottom: '1px solid #F1F5F9', marginBottom: '24px' }}>
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>2</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: '#0F172A' }}>Yük Bilgisi</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>Taşınacak yük tipini ve detaylarını belirtin</div>
                </div>
              </div>

              {/* Transport type cards */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Yük Türü <span style={{ color: '#EF4444' }}>*</span></label>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {TRANSPORT_CARDS.map(tc => {
                    const sel = form.transportType === tc.value;
                    return (
                      <div
                        key={tc.value}
                        onClick={() => handleChange('transportType', tc.value)}
                        className="cursor-pointer text-center transition-all duration-150"
                        style={{
                          border: sel ? '2px solid #2563EB' : '1px solid #E2E8F0',
                          borderRadius: '12px', padding: '16px',
                          background: sel ? '#EFF6FF' : 'white',
                          boxShadow: sel ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
                        }}
                      >
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>{tc.emoji}</div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: sel ? '#2563EB' : '#374151' }}>{tc.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scope (auto) */}
              {form.scope && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Taşıma Kapsamı</label>
                  <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', background: '#F8FAFC', color: '#64748B', cursor: 'default' }}>
                    {form.scope === 'sehirici' ? 'Şehir İçi' : form.scope === 'sehirlerarasi' ? 'Şehirlerarası' : '-'}
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: '#94A3B8' }}>(otomatik)</span>
                  </div>
                </div>
              )}

              {/* Detail fields – 2col grid */}
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {altOptions.length > 0 && (
                  <div>
                    <label style={labelStyle}>Yer Tipi</label>
                    <Select value={form.placeType} onValueChange={(v) => handleChange('placeType', v)}>
                      <SelectTrigger style={inputStyle}><SelectValue placeholder="Seçin" /></SelectTrigger>
                      <SelectContent>{altOptions.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                )}
                {form.transportType === 'parca' && (
                  <div>
                    <label style={labelStyle}>Yük Türü (opsiyonel)</label>
                    <Select value={form.loadType} onValueChange={(v) => handleChange('loadType', v)}>
                      <SelectTrigger style={inputStyle}><SelectValue placeholder="Seçin" /></SelectTrigger>
                      <SelectContent>{Object.entries(LOAD_TYPES).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Araç Tercihi (opsiyonel)</label>
                  <Select value={form.vehicleType} onValueChange={(v) => handleChange('vehicleType', v)}>
                    <SelectTrigger style={inputStyle}><SelectValue placeholder="Araç seçin" /></SelectTrigger>
                    <SelectContent>{Object.entries(VEHICLE_TYPES).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={labelStyle}>Kat</label>
                  <Input type="number" min={0} value={form.floor} onChange={(e) => handleChange('floor', e.target.value)} placeholder="Örn. 3" style={inputStyle} />
                </div>
                {form.floor && (
                  <div className="flex items-end" style={{ paddingBottom: '8px' }}>
                    <label className="flex items-center cursor-pointer" style={{ gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={form.hasElevator}
                        onChange={(e) => handleChange('hasElevator', e.target.checked)}
                        style={{ accentColor: '#2563EB', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '13px', color: '#374151' }}>Bina Asansörü Var</span>
                    </label>
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Sigorta Türü</label>
                  <Select value={form.insurance} onValueChange={(v) => handleChange('insurance', v)}>
                    <SelectTrigger style={inputStyle}><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">İstemiyorum</SelectItem>
                      <SelectItem value="basic">Temel Sigorta</SelectItem>
                      <SelectItem value="premium">Tam Sigorta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={labelStyle}>Zaman Tercihi</label>
                  <Select value={form.timeWindow} onValueChange={(v) => handleChange('timeWindow', v)}>
                    <SelectTrigger style={inputStyle}><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sabah">Sabah (08:00-12:00)</SelectItem>
                      <SelectItem value="ogle">Öğlen (12:00-17:00)</SelectItem>
                      <SelectItem value="aksam">Akşam (17:00-22:00)</SelectItem>
                      <SelectItem value="farketmez">Farketmez</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Extra services */}
              {currentServiceGroup && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Ek Hizmetler</label>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {Object.entries(ADDITIONAL_SERVICE_OPTIONS[currentServiceGroup] || {}).map(([key, lbl]) => {
                      const checked = (form.serviceOptions?.[currentServiceGroup] || []).includes(key);
                      return (
                        <label
                          key={key}
                          className="flex items-center cursor-pointer transition-colors"
                          style={{
                            gap: '8px', padding: '10px 14px',
                            border: checked ? '1px solid #2563EB' : '1px solid #E2E8F0',
                            borderRadius: '8px',
                            background: checked ? '#EFF6FF' : 'white',
                          }}
                          onClick={() => setForm(prev => {
                            const current = new Set(prev.serviceOptions?.[currentServiceGroup] || []);
                            if (current.has(key)) current.delete(key); else current.add(key);
                            return { ...prev, serviceOptions: { [currentServiceGroup]: Array.from(current) } };
                          })}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            style={{ accentColor: '#2563EB', width: '16px', height: '16px' }}
                          />
                          <span style={{ fontSize: '13px', color: '#374151' }}>{lbl}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Photos */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Fotoğraf (opsiyonel)</label>
                <FileUpload
                  label="Eşyaların Fotoğrafları"
                  description="Daha doğru teklif için fotoğraf ekleyin. (JPG/PNG, max 5MB)"
                  multiple
                  accept=".jpg,.jpeg,.png"
                  maxSize={5}
                  uploadedFiles={form.photos as any}
                  onUpload={(files) => handleChange('photos', files as any)}
                />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Açıklama (opsiyonel)</label>
                <Textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) => handleChange('note', e.target.value)}
                  placeholder="Örn. hassas eşyalar var, 3. kat, vs."
                  style={{ minHeight: '80px', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 14px', resize: 'vertical', fontSize: '14px' }}
                  className="focus:border-[#2563EB] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.1)]"
                />
              </div>

              {/* Action bar */}
              <div className="flex justify-between items-center" style={{ paddingTop: '24px', borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={goPrev}
                  className="hover:!bg-[#F8FAFC] transition-colors"
                  style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '11px 24px', fontSize: '14px', color: '#374151', background: 'white', cursor: 'pointer' }}
                >
                  ← Geri
                </button>
                <button
                  type="submit"
                  disabled={!canNextFrom2}
                  className="hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                  style={{ background: canNextFrom2 ? '#2563EB' : '#94A3B8', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 32px', fontSize: '15px', fontWeight: 600, cursor: canNextFrom2 ? 'pointer' : 'not-allowed', transition: 'all 150ms' }}
                >
                  Devam →
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: ÖZET & YAYINLA ── */}
          {step === 3 && (
            <div className={showLoginModal ? 'pointer-events-none blur-sm' : ''} aria-hidden={showLoginModal}>
              {/* Card header */}
              <div className="flex items-center" style={{ gap: '12px', paddingBottom: '20px', borderBottom: '1px solid #F1F5F9', marginBottom: '24px' }}>
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>3</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: '#0F172A' }}>Özet & Yayınla</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>Bilgileri kontrol edin</div>
                </div>
              </div>

              {/* Summary cards – 2 col */}
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Rota Bilgileri */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', marginBottom: '16px' }}>Rota Bilgileri</div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>NEREDEN</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                      {form.originCity}{form.originDistrict ? `, ${form.originDistrict}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center justify-center" style={{ margin: '12px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
                    <div className="flex items-center justify-center" style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EFF6FF', margin: '0 8px' }}>
                      <ArrowRight style={{ width: '14px', height: '14px', color: '#2563EB' }} />
                    </div>
                    <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>NEREYE</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                      {form.destinationCity}{form.destinationDistrict ? `, ${form.destinationDistrict}` : ''}
                    </div>
                  </div>

                  {form.date && (
                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px', marginTop: '14px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
                        📅 {new Date(form.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Yük Detayları */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', marginBottom: '16px' }}>Yük Detayları</div>
                  <div className="flex flex-col" style={{ gap: '10px' }}>
                    {form.transportType && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Taşıma Tipi</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
                          {TRANSPORT_CARDS.find(t => t.value === form.transportType)?.label || form.transportType}
                        </span>
                      </div>
                    )}
                    {form.scope && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Kapsam</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{form.scope === 'sehirici' ? 'Şehir İçi' : 'Şehirlerarası'}</span>
                      </div>
                    )}
                    {form.placeType && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Yer Türü</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{form.placeType}</span>
                      </div>
                    )}
                    {form.vehicleType && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Araç</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{VEHICLE_TYPES[form.vehicleType as keyof typeof VEHICLE_TYPES]?.name}</span>
                      </div>
                    )}
                    {form.floor && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Kat</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{form.floor}. kat {form.hasElevator ? '(asansörlü)' : ''}</span>
                      </div>
                    )}
                    {form.timeWindow && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Zaman</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{form.timeWindow}</span>
                      </div>
                    )}
                    {form.insurance !== 'none' && (
                      <div className="flex justify-between items-center">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Sigorta</span>
                        <span style={{ background: '#EFF6FF', color: '#2563EB', fontSize: '12px', fontWeight: 500, padding: '2px 10px', borderRadius: '6px' }}>
                          {form.insurance === 'basic' ? 'Temel' : 'Tam'} Sigorta
                        </span>
                      </div>
                    )}
                    {/* Extra services chips */}
                    {(() => {
                      const svcGroup = ({'evden-eve': 'evden-eve', 'parca': 'parca', 'ofis-tasima': 'ofis', 'depolama': 'depolama'} as Record<string, string>)[form.transportType];
                      const selected = svcGroup ? (form.serviceOptions?.[svcGroup] || []) : [];
                      const allOpts = svcGroup ? (ADDITIONAL_SERVICE_OPTIONS[svcGroup] || {}) : {};
                      if (!selected.length) return null;
                      return (
                        <div>
                          <span style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px' }}>Ek Hizmetler</span>
                          <div className="flex flex-wrap" style={{ gap: '4px' }}>
                            {selected.map((k: string) => (
                              <span key={k} style={{ background: '#F1F5F9', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', color: '#374151' }}>
                                {(allOpts as Record<string, string>)[k] || k}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {form.note && (
                      <div>
                        <span style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '2px' }}>Not</span>
                        <span style={{ fontSize: '13px', color: '#0F172A' }}>{form.note}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Invite banner */}
              {inviteCarrierId && inviteCarrierName && (
                <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="flex items-center" style={{ gap: '8px', fontSize: '13px', color: '#1E40AF' }}>
                    <UserCheck style={{ width: '16px', height: '16px' }} />
                    <span><strong>{inviteCarrierName}</strong> bu talebe öncelikli davet edilecek</span>
                  </div>
                  <button onClick={() => { setInviteCarrierId(null); setInviteCarrierName(null); }} style={{ fontSize: '12px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Kaldır</button>
                </div>
              )}

              {/* Phone — her zaman göster; profil varsa pre-fill, yoksa gerekli */}
              <div style={{ marginBottom: '20px', padding: '16px', background: needsPhone ? '#FFFBEB' : '#F8FAFC', border: `1px solid ${needsPhone ? '#FDE68A' : '#E2E8F0'}`, borderRadius: '12px' }}>
                <div className="flex items-center" style={{ gap: '8px', marginBottom: '10px' }}>
                  <Phone style={{ width: '16px', height: '16px', color: needsPhone ? '#D97706' : '#64748B' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: needsPhone ? '#92400E' : '#374151' }}>
                    {needsPhone ? 'Telefon numaranızı ekleyin' : 'İletişim numarası'}
                  </span>
                </div>
                {needsPhone && (
                  <p style={{ fontSize: '13px', color: '#92400E', marginBottom: '10px' }}>
                    Nakliyecilerin sizi arayabilmesi için telefon numarası gereklidir.
                  </p>
                )}
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5XX XXX XX XX"
                  style={{ ...inputStyle, background: 'white' }}
                />
                {!needsPhone && (
                  <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>
                    Profilinizdeki numara kullanılıyor. Bu talep için farklı bir numara girebilirsiniz.
                  </p>
                )}
              </div>

              {/* Edit links */}
              <div className="flex" style={{ gap: '16px', marginTop: '8px', marginBottom: '24px' }}>
                <span onClick={() => setStep(1)} className="hover:underline" style={{ fontSize: '13px', color: '#2563EB', cursor: 'pointer' }}>✏️ Adım 1'i Düzenle</span>
                <span onClick={() => setStep(2)} className="hover:underline" style={{ fontSize: '13px', color: '#2563EB', cursor: 'pointer' }}>✏️ Adım 2'yi Düzenle</span>
              </div>

              {/* Suitable carriers (existing logic preserved) */}
              {isLoggedIn && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', marginBottom: '12px' }}>Uygun Nakliyeciler</div>
                  <div className="flex flex-wrap items-end" style={{ gap: '12px', marginBottom: '12px' }}>
                    <label className="flex items-center" style={{ gap: '6px', fontSize: '13px', color: '#374151' }}>
                      <input type="checkbox" checked={onlyApproved} onChange={(e) => setOnlyApproved(e.target.checked)} style={{ accentColor: '#2563EB' }} />
                      Sadece Onaylı
                    </label>
                    <div>
                      <Select value={String(minRating)} onValueChange={(v) => setMinRating(Number(v))}>
                        <SelectTrigger style={{ ...inputStyle, width: '140px', height: '36px', fontSize: '13px' }}><SelectValue placeholder="Min. Puan" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Farketmez</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                          <SelectItem value="4.5">4.5+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                        <SelectTrigger style={{ ...inputStyle, width: '180px', height: '36px', fontSize: '13px' }}><SelectValue placeholder="Sırala" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rating">Puan (yüksek → düşük)</SelectItem>
                          <SelectItem value="reviews">Yorum sayısı</SelectItem>
                          <SelectItem value="capacity">Kapasite</SelectItem>
                          <SelectItem value="price">Fiyat (taban ücret)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <button onClick={() => { setOnlyApproved(false); setMinRating(0); setSortBy('rating'); }} style={{ fontSize: '12px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>Sıfırla</button>
                  </div>

                  {loadingResults ? (
                    <div className="flex flex-col" style={{ gap: '8px' }}>
                      {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                    </div>
                  ) : suitableCarriers.length === 0 ? (
                    <div className="flex items-center" style={{ gap: '8px', padding: '20px', border: '1px dashed #E2E8F0', borderRadius: '10px', fontSize: '13px', color: '#64748B' }}>
                      <Info style={{ width: '16px', height: '16px' }} /> Kriterlerinize uygun nakliyeci bulunamadı.
                    </div>
                  ) : (
                    <div className="flex flex-col" style={{ gap: '8px' }}>
                      {suitableCarriers.map((c) => (
                        <CarrierCard key={c.id} carrier={c} form={form} onRequest={() => requestOffer(c)} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action bar */}
              <div className="flex justify-between items-center" style={{ paddingTop: '24px', borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={goPrev}
                  className="hover:!bg-[#F8FAFC] transition-colors"
                  style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '11px 24px', fontSize: '14px', color: '#374151', background: 'white', cursor: 'pointer' }}
                >
                  ← Geri
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  className="inline-flex items-center hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                  style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 32px', fontSize: '15px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', gap: '8px', transition: 'all 150ms' }}
                  onClick={publishRequest}
                >
                  {submitting ? (
                    <><Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} /> Yayınlanıyor...</>
                  ) : (
                    <><Check style={{ width: '16px', height: '16px' }} /> Talebi Yayınla</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
                <Button onClick={() => navigate('/giris')}>Giriş Yap</Button>
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

// ─── Backend search response → Carrier shape dönüşümü ────────────────────────

function parseVehicleSummary(summary: string | null): { type: Carrier['vehicle']['type']; capacity: number } {
  if (!summary) return { type: 'kamyonet', capacity: 0 };
  const match = summary.match(/^(\w+)\s*\((\d+)kg\)/i);
  if (match) {
    const rawType = match[1].toLowerCase();
    const typeMap: Record<string, Carrier['vehicle']['type']> = {
      kamyonet: 'kamyonet', kamyon: 'kamyon', tir: 'tir',
      panelvan: 'panelvan', panel: 'panelvan',
    };
    return { type: typeMap[rawType] ?? 'kamyonet', capacity: parseInt(match[2], 10) };
  }
  return { type: 'kamyonet', capacity: 0 };
}

function mapSearchResultToCarrier(item: {
  id: string; companyName: string; city: string | null;
  rating: number; reviewCount: number; vehicleSummary: string | null;
  serviceAreas: string[]; startingPrice: number | null;
  experienceYears: number | null; profileCompletion: number | null;
  pictureUrl: string | null;
}): Carrier {
  const { type: vehicleType, capacity } = parseVehicleSummary(item.vehicleSummary);
  const nameParts = item.companyName.trim().split(/\s+/);
  return {
    id: item.id,
    name: nameParts[0] ?? item.companyName,
    surname: nameParts.slice(1).join(' '),
    email: '',
    phone: '',
    city: item.city ?? '',
    type: 'carrier',
    createdAt: new Date(),
    vehicle: { id: '', type: vehicleType, capacity, licensePlate: '' },
    serviceAreas: item.serviceAreas ?? [],
    loadTypes: [],
    documents: { license: '', src: '', kBelgesi: '' },
    rating: item.rating ?? 0,
    reviewCount: item.reviewCount ?? 0,
    isApproved: (item.profileCompletion ?? 0) >= 80,
    baseFee: item.startingPrice ?? 0,
    badges: [],
    scopes: [],
    pictureUrl: item.pictureUrl,
  };
}
