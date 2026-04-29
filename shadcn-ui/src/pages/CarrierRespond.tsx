import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CalendarDays, MapPin, Package, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import { formatLocation } from '@/utils/formatLocation';

const API_BASE_URL = '/api/v1';

interface BackendShipment {
  id: string;
  origin?: string;
  destination?: string;
  originCity?: string | null;
  originDistrict?: string | null;
  destinationCity?: string | null;
  destinationDistrict?: string | null;
  loadDetails?: string;
  transportType?: string;
  shipmentCategory?: 'HOME_MOVE' | 'OFFICE_MOVE' | 'PARTIAL_ITEM' | 'STORAGE' | string | null;
  weight?: number | string | null;
  estimatedWeight?: number | string | null;
  status: string;
  shipmentDate?: string;
  extraServices?: Array<string | { name?: string; label?: string }>;
  note?: string | null;
  originFloor?: number | null;
  destinationFloor?: number | null;
  floor?: number | null;
  originHasElevator?: boolean | null;
  destinationHasElevator?: boolean | null;
  hasElevator?: boolean | null;
  insuranceType?: string | null;
  dateFlexibility?: string | null;
  timePreference?: string | null;
  contactPhone?: string | null;
  originAddressText?: string | null;
  destinationAddressText?: string | null;
  converter?: {
    converterEstimatedVolumeMin?: number | string | null;
    converterEstimatedVolumeMax?: number | string | null;
    converterRecommendedVehicleCode?: string | null;
    converterAppliedAt?: string | null;
  } | null;
}

interface OfferWarning {
  code?: string;
  message?: string;
}

const shipmentCategoryLabel: Record<string, string> = {
  HOME_MOVE: 'Ev taşıma',
  OFFICE_MOVE: 'Ofis taşıma',
  PARTIAL_ITEM: 'Parça eşya',
  STORAGE: 'Depolama',
};

const insuranceLabel: Record<string, string> = {
  none: 'Sigorta yok',
  basic: 'Temel sigorta',
  premium: 'Tam sigorta',
  full: 'Tam sigorta',
};

const dateFlexibilityLabel: Record<string, string> = {
  EXACT: 'Sabit tarih',
  FLEXIBLE: 'Esnek tarih',
  WITHIN_WEEK: 'Hafta içinde esnek',
};

const vehicleLabel: Record<string, string> = {
  panelvan: 'Panelvan',
  short_chassis_van: 'Kısa şasi van',
  long_chassis_van: 'Uzun şasi van',
  small_truck: 'Küçük kamyon',
  large_truck: 'Büyük kamyon',
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatShipmentCategory = (shipment: BackendShipment) => {
  const raw = shipment.shipmentCategory || shipment.transportType;
  if (!raw) return '-';
  return shipmentCategoryLabel[String(raw)] || String(raw);
};

const formatLocationLine = (city?: string | null, district?: string | null, fallback?: string) => {
  const parts = [city, district].map((item) => item?.trim()).filter(Boolean);
  if (parts.length) return parts.join(' / ');
  return fallback ? formatLocation(fallback) : '-';
};

const formatWeight = (shipment: BackendShipment) => {
  const value = Number(shipment.estimatedWeight ?? shipment.weight);
  return Number.isFinite(value) && value > 0 ? `${value} kg` : '-';
};

const formatFloor = (floor?: number | null) => {
  if (floor === null || floor === undefined || Number.isNaN(Number(floor))) return '-';
  return Number(floor) === 0 ? 'Giriş kat' : `${floor}. kat`;
};

const formatElevator = (value?: boolean | null) => {
  if (value === true) return 'Var';
  if (value === false) return 'Yok';
  return '-';
};

const normalizeExtraServices = (services?: BackendShipment['extraServices']) => {
  if (!Array.isArray(services)) return [];
  return services
    .map((item) => (typeof item === 'string' ? item : item.name || item.label || ''))
    .filter(Boolean);
};

const formatConverterVolume = (shipment: BackendShipment) => {
  const min = shipment.converter?.converterEstimatedVolumeMin;
  const max = shipment.converter?.converterEstimatedVolumeMax;
  if (min === null || min === undefined || max === null || max === undefined) return null;
  return `${Number(min)}-${Number(max)} m³`;
};

const formatWarning = (warning: OfferWarning) => {
  if (warning.code === 'CAPACITY_MISMATCH') {
    return warning.message || 'Bu ilanın tahmini ağırlığı araç kapasitenizin üzerinde olabilir.';
  }
  return warning.message || 'Teklifinizle ilgili dikkat edilmesi gereken bir uyarı var.';
};

const getOfferErrorMessage = (json: any, fallback = 'Teklif gönderilemedi.') => {
  const code = String(json?.code || '').toUpperCase();
  const message = String(json?.message || '');
  const normalized = message.toLocaleLowerCase('tr-TR');

  if (code.includes('CONTACT') || /iletişim|iletisim|telefon|email|e-posta|whatsapp|numara/.test(normalized)) {
    return 'İletişim bilgisi paylaşamazsınız. Platform üzerinden devam edin.';
  }

  if (/bekleme süresi|bekleme suresi|cooldown|aktif eşleşme|aktif eslesme/.test(normalized)) {
    return 'Bu müşteriyle aktif bekleme süresi var. Bekleme süresi bitmeden tekrar teklif veremezsiniz.';
  }

  if (/approved|onay|admin|aktif değil|aktif degil|hesab/.test(normalized)) {
    return 'Teklif verebilmek için hesabınız aktif, doğrulanmış ve admin onaylı olmalıdır.';
  }

  if (/yuk turu|yük türü|ek hizmet|yetkiniz yok|capability|yetki/.test(normalized)) {
    return 'Bu ilan için gerekli yük türü veya ek hizmet yetkiniz yok. Profil yetkinizi kontrol edin.';
  }

  if (/minimum|min_offer_price|platform minimum|fiyat/.test(normalized)) {
    return message || 'Teklif tutarı platform minimumunun altında olamaz.';
  }

  return message || fallback;
};

export default function CarrierRespond() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<BackendShipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [price, setPrice] = useState('');
  const [eta, setEta] = useState('');
  const [note, setNote] = useState('');
  const [priceError, setPriceError] = useState('');
  const [minOfferPrice, setMinOfferPrice] = useState(100);
  const [offerBlocked, setOfferBlocked] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient(`${API_BASE_URL}/config/public`);
        const json = await res.json();
        if (res.ok && json?.success && json?.data) {
          setMinOfferPrice(Number(json.data.minOfferPrice ?? 100));
        }
      } catch {
        // keep default
      }
    })();
  }, []);

  useEffect(() => {
    if (!requestId) return;
    (async () => {
      try {
        const [res, statusRes, carrierRes] = await Promise.all([
          apiClient(`${API_BASE_URL}/shipments/${requestId}`),
          apiClient(`${API_BASE_URL}/carriers/me/profile-status`),
          apiClient(`${API_BASE_URL}/carriers/me`),
        ]);
        const json = await res.json();
        if (res.ok && json?.success && json.data) {
          setShipment(json.data);
        } else {
          toast.error('Taşıma talebi bulunamadı.');
        }

        const statusJson = await statusRes.json().catch(() => ({}));
        const carrierJson = await carrierRes.json().catch(() => ({}));
        const carrier = carrierJson?.data?.carrier ?? carrierJson?.data;
        const profilePercent = Number(statusJson?.data?.overallPercentage ?? 0);
        const adminApproved = Boolean(carrier?.verifiedByAdmin || carrier?.verificationStatus === 'verified');
        if (profilePercent < 75) {
          setOfferBlocked('Teklif verebilmek için profilinizin en az %75 tamamlanması gerekiyor.');
        } else if (!adminApproved) {
          setOfferBlocked('Teklif verebilmek için hesabınızın admin tarafından onaylanması gerekiyor.');
        } else {
          setOfferBlocked(null);
        }
      } catch {
        toast.error('Veri yüklenirken hata oluştu.');
      } finally {
        setLoading(false);
      }
    })();
  }, [requestId]);

  const submitOffer = async () => {
    if (!shipment || !price) return;
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      toast.error('Geçerli bir fiyat giriniz.');
      return;
    }
    if (priceNum < minOfferPrice) {
      toast.error(`Minimum teklif tutarı ₺${minOfferPrice} olmalıdır.`);
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        shipmentId: shipment.id,
        price: priceNum,
      };
      if (note.trim()) body.message = note.trim();
      if (eta) body.estimatedDuration = Number(eta);

      const res = await apiClient(`${API_BASE_URL}/offers/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        suppressErrorToast: true,
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        const warnings = Array.isArray(json.warnings) ? (json.warnings as OfferWarning[]) : [];
        if (warnings.length) {
          toast.warning('Teklif gönderildi, dikkat gereken noktalar var.', {
            description: warnings.map(formatWarning).join(' '),
            duration: 6000,
          });
        } else {
          toast.success('Teklif başarıyla gönderildi!');
        }

        const redirect = () => navigate('/nakliyeci/teklifler');
        if (warnings.length) setTimeout(redirect, 900);
        else redirect();
      } else {
        toast.error(getOfferErrorMessage(json));
      }
    } catch {
      toast.error('Teklif gönderilirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Card>
          <CardContent className="py-10 text-center text-gray-600">Yükleniyor...</CardContent>
        </Card>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Card>
          <CardContent className="py-10 text-center text-gray-600">Talep bulunamadı.</CardContent>
        </Card>
      </div>
    );
  }

  const extraServices = normalizeExtraServices(shipment.extraServices);
  const converterVolume = formatConverterVolume(shipment);
  const converterVehicle = shipment.converter?.converterRecommendedVehicleCode
    ? vehicleLabel[shipment.converter.converterRecommendedVehicleCode] || shipment.converter.converterRecommendedVehicleCode
    : null;
  const originElevator = shipment.originHasElevator ?? shipment.hasElevator;
  const destinationElevator = shipment.destinationHasElevator ?? shipment.hasElevator;
  const insurance = shipment.insuranceType
    ? insuranceLabel[String(shipment.insuranceType)] || shipment.insuranceType
    : '-';
  const dateFlexibility = shipment.dateFlexibility
    ? dateFlexibilityLabel[String(shipment.dateFlexibility)] || shipment.dateFlexibility
    : '-';

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Teklif Talebi</CardTitle>
          <CardDescription>Müşteri talep özeti</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <SummaryItem icon={<Package className="h-4 w-4" />} label="Yük türü" value={formatShipmentCategory(shipment)} />
            <SummaryItem icon={<CalendarDays className="h-4 w-4" />} label="Talep edilen tarih" value={formatDate(shipment.shipmentDate)} />
            <SummaryItem icon={<MapPin className="h-4 w-4" />} label="Çıkış" value={formatLocationLine(shipment.originCity, shipment.originDistrict, shipment.origin)} />
            <SummaryItem icon={<MapPin className="h-4 w-4" />} label="Varış" value={formatLocationLine(shipment.destinationCity, shipment.destinationDistrict, shipment.destination)} />
            <SummaryItem label="Tahmini ağırlık" value={formatWeight(shipment)} />
            <SummaryItem label="Çıkış katı" value={formatFloor(shipment.originFloor ?? shipment.floor)} />
            <SummaryItem label="Varış katı" value={formatFloor(shipment.destinationFloor)} />
            <SummaryItem label="Çıkış asansörü" value={formatElevator(originElevator)} />
            <SummaryItem label="Varış asansörü" value={formatElevator(destinationElevator)} />
            <SummaryItem icon={<ShieldCheck className="h-4 w-4" />} label="Sigorta" value={insurance} />
            <SummaryItem label="Tarih esnekliği" value={dateFlexibility} />
            <SummaryItem label="Saat tercihi" value={shipment.timePreference || '-'} />
          </div>

          {converterVolume && (
            <Alert className="border-blue-200 bg-blue-50 text-blue-950">
              <Package className="h-4 w-4" />
              <AlertTitle>Hacim özeti</AlertTitle>
              <AlertDescription>
                {converterVolume}
                {converterVehicle ? ` · Önerilen araç: ${converterVehicle}` : ''}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="font-medium text-slate-900">Yük detayı</div>
            <p className="rounded-md border bg-slate-50 px-3 py-2 text-slate-700">{shipment.loadDetails || '-'}</p>
          </div>

          <div className="space-y-2">
            <div className="font-medium text-slate-900">Ek hizmetler</div>
            {extraServices.length ? (
              <div className="flex flex-wrap gap-2">
                {extraServices.map((service) => (
                  <Badge key={service} variant="secondary">{service}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">Ek hizmet yok.</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="font-medium text-slate-900">Müşteri notu</div>
            <p className="rounded-md border bg-slate-50 px-3 py-2 text-slate-700">{shipment.note || '-'}</p>
          </div>

          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>İletişim ve açık adres gizli</AlertTitle>
            <AlertDescription>
              Telefon ve açık adres bilgileri teklif aşamasında maskeli tutulur.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {offerBlocked && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-800">
            {offerBlocked}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Teklif Oluştur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm">Fiyat (TL)</label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={() => {
                const value = parseFloat(price);
                if (!price || Number.isNaN(value) || value <= 0) setPriceError("Teklif fiyatı 0 TL'den büyük olmalıdır");
                else if (value < minOfferPrice) setPriceError(`Minimum teklif tutarı ₺${minOfferPrice}'dir`);
                else setPriceError('');
              }}
            />
            {priceError && <p className="mt-1 text-sm text-red-500">{priceError}</p>}
            <p className="mt-1 text-xs text-slate-500">Minimum teklif: ₺{minOfferPrice}</p>
          </div>
          <div>
            <label className="text-sm">Tahmini Süre (saat)</label>
            <Input type="number" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Ek Not</label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>İptal</Button>
            <Button onClick={submitOffer} disabled={submitting || !price || !!priceError || Boolean(offerBlocked)}>
              {submitting ? 'Gönderiliyor...' : 'Gönder'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryItem({ icon, label, value }: { icon?: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border bg-white px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
