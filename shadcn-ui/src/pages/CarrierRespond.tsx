import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CalendarDays, Package, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import {
  CorporateCard,
  DetailList,
  InlineNotice,
  PageContainer,
  PageEyebrow,
  QuoteBlock,
  RoutePair,
  SectionTitle,
  ToneBadge,
} from '@/components/shared/CorporateUI';

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
  loadType?: string | null;
  transportType?: string;
  shipmentCategory?: 'HOME_MOVE' | 'OFFICE_MOVE' | 'PARTIAL_ITEM' | 'STORAGE' | string | null;
  weight?: number | string | null;
  estimatedWeight?: number | string | null;
  status: string;
  shipmentDate?: string;
  extraServices?: Array<string | { name?: string; label?: string }>;
  note?: string | null;
  originPlaceType?: string | null;
  destinationPlaceType?: string | null;
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
  photoUrls?: string[] | null;
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
  HOME_MOVE: 'Ev Eşyası',
  OFFICE_MOVE: 'Ofis',
  PARTIAL_ITEM: 'Parça eşya',
  STORAGE: 'Depolama',
  HOME: 'Ev Eşyası',
  OFFICE: 'Ofis',
  PARTIAL: 'Parça eşya',
};

const transportTypeLabel: Record<string, string> = {
  'evden-eve': 'Ev Eşyası',
  'ev-esyasi': 'Ev Eşyası',
  'ofis-tasima': 'Ofis',
  parca: 'Parça eşya',
  'parca-esya': 'Parça eşya',
  depolama: 'Depolama',
};

const insuranceLabel: Record<string, string> = {
  none: 'Sigorta yok',
  basic: 'Temel sigorta',
  premium: 'Tam sigorta',
  full: 'Tam sigorta',
};

const dateFlexibilityLabel: Record<string, string> = {
  EXACT: 'Tam bu tarih',
  FLEXIBLE: '±3 gün esnek',
  WITHIN_WEEK: '±3 gün esnek',
  PLUS_MINUS_1_DAY: '±1 gün esnek',
  PLUS_MINUS_3_DAYS: '±3 gün esnek',
};

const timePreferenceLabel: Record<string, string> = {
  sabah: 'Sabah',
  aksam: 'Akşam',
  akşam: 'Akşam',
  farketmez: 'Farketmez',
  esnek: 'Esnek',
};

const formatTimePreference = (value?: string | null) => {
  const text = String(value || '').trim();
  const normalized = text.toLocaleLowerCase('tr-TR');
  if (normalized.startsWith('belirli:')) return `Belirli saat (${text.slice('belirli:'.length)})`;
  return timePreferenceLabel[normalized] || text;
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
  const loadDetailsType = String(shipment.loadDetails || '').split('/')[0]?.trim();
  const raw = shipment.shipmentCategory || shipment.loadType || shipment.transportType || loadDetailsType;
  if (!raw) return '-';
  const normalized = String(raw).trim();
  const lower = normalized.toLocaleLowerCase('tr-TR');
  return shipmentCategoryLabel[normalized] || transportTypeLabel[lower] || normalized;
};

const formatWeight = (shipment: BackendShipment) => {
  const value = Number(shipment.estimatedWeight ?? shipment.weight);
  return Number.isFinite(value) && value > 0 ? `${value} kg` : '-';
};

const formatFloor = (floor?: number | null) => {
  if (floor === null || floor === undefined || Number.isNaN(Number(floor))) return '-';
  return Number(floor) === 0 ? 'Giriş kat' : `${floor}. kat`;
};

const placeTypeLabel: Record<string, string> = {
  Daire: 'Daire',
  'Apartman Dairesi': 'Apartman Dairesi',
  'Site İçi Daire': 'Site İçi Daire',
  'Site Ä°Ã§i Daire': 'Site İçi Daire',
  'Müstakil Ev': 'Müstakil Ev',
  'MÃ¼stakil Ev': 'Müstakil Ev',
  Villa: 'Villa',
  Ofis: 'Ofis',
  'Plaza/Ofis': 'Plaza/Ofis',
  Depo: 'Depo',
  Dükkan: 'Dükkan',
  'DÃ¼kkan': 'Dükkan',
  Diğer: 'Diğer',
  'DiÄŸer': 'Diğer',
};

const formatPlaceType = (placeType?: string | null) => {
  if (!placeType) return null;
  return placeTypeLabel[String(placeType)] || placeType;
};

const formatPlaceAndFloor = (placeType?: string | null, floor?: number | null) => {
  const parts = [formatPlaceType(placeType), formatFloor(floor)].filter((item) => item && item !== '-');
  return parts.length ? parts.join(' — ') : '-';
};

const formatFloorLine = (placeType?: string | null, floor?: number | null, hasElevator?: boolean | null): string => {
  const parts: string[] = [];
  if (placeType) {
    const label = formatPlaceType(placeType);
    if (label) parts.push(label);
  }
  if (floor != null && !Number.isNaN(Number(floor))) {
    parts.push(Number(floor) === 0 ? 'Giriş kat' : `${floor}. kat`);
  }
  if (hasElevator === true) parts.push('(asansörlü)');
  else if (hasElevator === false) parts.push('(asansör yok)');
  return parts.length > 0 ? parts.join(' — ') : '-';
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
  if (warning.code === 'MISSING_EXTRA_SERVICE_CAPABILITY') {
    return warning.message || 'Bazı ek hizmetler profilinizde aktif değil.';
  }
  return warning.message || 'Teklifinizle ilgili dikkat edilmesi gereken bir uyarı var.';
};

const getOfferErrorMessage = (json: Record<string, unknown> | null, fallback = 'Teklif gönderilemedi.') => {
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

function SecureShipmentPhoto({ url, index }: { url: string; index: number }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let localObjectUrl: string | null = null;

    const load = async () => {
      if (!url.startsWith('/api/')) {
        setObjectUrl(url);
        return;
      }

      try {
        const response = await apiClient(url, { suppressErrorToast: true });
        if (!response.ok) return;
        const blob = await response.blob();
        if (cancelled) return;
        localObjectUrl = window.URL.createObjectURL(blob);
        setObjectUrl(localObjectUrl);
      } catch {
        if (!cancelled) setObjectUrl(null);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (localObjectUrl) {
        window.URL.revokeObjectURL(localObjectUrl);
      }
    };
  }, [url]);

  if (!objectUrl) {
    return (
      <div className="flex h-24 w-full items-center justify-center rounded-[var(--tb-radius-sm)] border text-xs" style={{ borderColor: 'var(--tb-border)', color: 'var(--tb-ink-400)' }}>
        YÃ¼kleniyor
      </div>
    );
  }

  return (
    <a href={objectUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-[var(--tb-radius-sm)] border" style={{ borderColor: 'var(--tb-border)' }}>
      <img src={objectUrl} alt={`YÃ¼k fotoÄŸrafÄ± ${index + 1}`} className="h-24 w-full object-cover" loading="lazy" />
    </a>
  );
}

export default function CarrierRespond() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<BackendShipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [price, setPrice] = useState('');
  const [eta, setEta] = useState('');
  const [note, setNote] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('');
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
        const approvalState = String(carrier?.approvalState ?? '').toUpperCase();
        const adminApproved = Boolean(carrier?.verifiedByAdmin || carrier?.verificationStatus === 'verified')
          && (!approvalState || approvalState === 'APPROVED');
        if (profilePercent < 75) {
          setOfferBlocked('Teklif verebilmek için profilinizin en az %75 tamamlanması gerekiyor.');
        } else if (!adminApproved) {
          setOfferBlocked('Teklif verebilmek icin belgelerinizi yukleyip admin onayini bekleyin.');
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
      const composedMessage = [
        note.trim(),
        suggestedTime.trim() ? `Önerilen saat: ${suggestedTime.trim()}` : '',
      ].filter(Boolean).join('\n\n');
      if (composedMessage) body.message = composedMessage;
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
        console.error('Offer create failed:', {
          status: res.status,
          response: json,
          payload: body,
          shipment,
        });
        toast.error(getOfferErrorMessage(json), {
          description: json?.message && getOfferErrorMessage(json) !== json.message ? json.message : undefined,
          duration: 7000,
        });
      }
    } catch (error) {
      console.error('Offer create request failed:', { error, shipmentId: shipment.id });
      toast.error('Teklif gönderilirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="py-10 text-center text-gray-600">Yükleniyor...</CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (!shipment) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="py-10 text-center text-gray-600">Talep bulunamadı.</CardContent>
        </Card>
      </PageContainer>
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
  const timePreference = shipment.timePreference ? formatTimePreference(shipment.timePreference) : '-';
  const canSuggestTime = String(shipment.timePreference || '').toLocaleLowerCase('tr-TR') === 'farketmez';

  return (
    <PageContainer className="space-y-5">
      {/* Hero: Route */}
      <RoutePair
        originCity={shipment.originCity}
        originDistrict={shipment.originDistrict}
        destinationCity={shipment.destinationCity}
        destinationDistrict={shipment.destinationDistrict}
        originFallback={shipment.origin}
        destinationFallback={shipment.destination}
      />

      {/* Shipment details card */}
      <CorporateCard>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionTitle>Talep Detayları</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <ToneBadge tone="info"><Package className="mr-1 h-3.5 w-3.5" />{formatShipmentCategory(shipment)}</ToneBadge>
            <ToneBadge tone="neutral"><CalendarDays className="mr-1 h-3.5 w-3.5" />{formatDate(shipment.shipmentDate)}</ToneBadge>
          </div>
        </div>

        <div className="space-y-5 text-sm">
          <DetailList
            rows={[
              { label: 'Tahmini ağırlık', value: formatWeight(shipment) },
              { label: 'Çıkış', value: formatFloorLine(shipment.originPlaceType, shipment.originFloor ?? shipment.floor, originElevator) },
              { label: 'Varış', value: formatFloorLine(shipment.destinationPlaceType, shipment.destinationFloor ?? shipment.floor, destinationElevator) },
              { label: 'Sigorta', value: insurance },
              { label: 'Tarih esnekliği', value: dateFlexibility },
              { label: 'Saat tercihi', value: timePreference },
            ]}
          />

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
            <PageEyebrow>Yük detayı</PageEyebrow>
            <QuoteBlock>{shipment.loadDetails || '-'}</QuoteBlock>
          </div>

          <div className="space-y-2">
            <PageEyebrow>Müşterinin talep ettiği ek hizmetler</PageEyebrow>
            {extraServices.length ? (
              <div className="flex flex-wrap gap-2">
                {extraServices.map((service) => (
                  <ToneBadge key={service} tone="info">{service}</ToneBadge>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--tb-ink-400)' }}>Talep edilen ek hizmet yok.</p>
            )}
          </div>

          {shipment.note && (
            <div className="space-y-2">
              <PageEyebrow>Müşteri notu</PageEyebrow>
              <QuoteBlock>{shipment.note}</QuoteBlock>
            </div>
          )}

          {shipment.photoUrls && shipment.photoUrls.length > 0 && (
            <div className="space-y-2">
              <PageEyebrow>Fotoğraflar</PageEyebrow>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {shipment.photoUrls.map((url, i) => (
                  <SecureShipmentPhoto key={`${url}-${i}`} url={url} index={i} />
                ))}
              </div>
            </div>
          )}

          <InlineNotice tone="warning" icon={<AlertTriangle className="h-4 w-4" />}>
            İletişim ve açık adres bilgileri teklif aşamasında gizli tutulur; taşıma başladığında paylaşılır.
          </InlineNotice>
        </div>
      </CorporateCard>

      {/* Blocked warning */}
      {offerBlocked && (
        <InlineNotice tone="danger" icon={<AlertTriangle className="h-4 w-4" />}>
          <span>{offerBlocked}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-3 h-8"
            onClick={() => navigate('/profilim?tab=documents')}
          >
            Belgeleri Yükle
          </Button>
        </InlineNotice>
      )}

      {/* Offer creation form */}
      <CorporateCard>
        <SectionTitle className="mb-4">Teklif Oluştur</SectionTitle>
        <p className="mb-4 text-sm" style={{ color: 'var(--tb-ink-500)' }}>
          Fiyat ve süre bilgisiyle müşteriye teklif gönderin.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--tb-ink-700)' }}>Fiyat (TL)</label>
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
            <p className="mt-1 text-xs" style={{ color: 'var(--tb-ink-400)' }}>Minimum teklif: ₺{minOfferPrice}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--tb-ink-700)' }}>Tahmini Süre (saat)</label>
            <Input type="number" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>
        </div>

        {canSuggestTime && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--tb-ink-700)' }}>Önerilen saat (opsiyonel)</label>
            <Input
              value={suggestedTime}
              onChange={(e) => setSuggestedTime(e.target.value)}
              placeholder="Örn. 10:00-12:00"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--tb-ink-400)' }}>
              Müşteri saat tercihini fark etmez seçtiği için uygun gördüğünüz zaman aralığını önerebilirsiniz.
            </p>
          </div>
        )}

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--tb-ink-700)' }}>Ek Not</label>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>İptal</Button>
          <Button
            className="min-w-36 bg-blue-600 text-white hover:bg-blue-700"
            onClick={submitOffer}
            disabled={submitting || !price || !!priceError || Boolean(offerBlocked)}
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? 'Gönderiliyor...' : 'Teklif Gönder'}
          </Button>
        </div>
      </CorporateCard>
    </PageContainer>
  );
}
