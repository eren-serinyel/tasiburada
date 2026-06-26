import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, Phone, RotateCcw, Copy, MapPin } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import type { CarrierEligibility } from '@/lib/customerOfferTrust';
import { getCarrierEligibilityWarning, isOfferAcceptDisabled } from '@/lib/customerOfferTrust';
import { toast } from '@/components/ui/sonner';
import { getUserType, getUserId } from '@/lib/auth';
import {
  CorporateCard,
  InlineNotice,
  PageContainer,
  PageEyebrow,
  RoutePair,
  SectionTitle,
  ToneBadge,
  shipmentStatusTone,
} from '@/components/shared/CorporateUI';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const API_BASE_URL = '/api/v1';

interface BackendOffer {
  id: string;
  shipmentId: string;
  carrierId: string;
  carrier?: {
    id: string;
    companyName?: string | null;
    rating?: number;
    pictureUrl?: string | null;
    phone?: string;
    isActive?: boolean;
    verifiedByAdmin?: boolean;
    approvalState?: string | null;
  };
  carrierEligibility?: CarrierEligibility;
  price: number;
  message?: string;
  estimatedDuration?: number;
  status: string;
  offeredAt: string;
}

interface BackendShipment {
  id: string;
  origin: string;
  destination: string;
  originCity?: string | null;
  originDistrict?: string | null;
  destinationCity?: string | null;
  destinationDistrict?: string | null;
  originAddressText?: string | null;
  destinationAddressText?: string | null;
  loadDetails: string;
  transportType?: string;
  originPlaceType?: string;
  destinationPlaceType?: string;
  placeType?: string;
  originHasElevator?: boolean;
  destinationHasElevator?: boolean;
  hasElevator?: boolean;
  originFloor?: number;
  destinationFloor?: number;
  floor?: number;
  insuranceType?: string;
  timePreference?: string;
  weight?: number;
  status: string;
  price?: number;
  shipmentDate: string;
  createdAt: string;
  customerId: string;
  carrierId?: string | null;
  carrier?: {
    id: string;
    companyName?: string | null;
    rating?: number;
    pictureUrl?: string | null;
    phone?: string;
    isActive?: boolean;
    verifiedByAdmin?: boolean;
    approvalState?: string | null;
  };
  customer?: { firstName: string; lastName: string; phone?: string; email?: string };
  contactPhone?: string | null;
  extraServices?: string[];
  converter?: {
    converterSessionId?: string | null;
    converterAppliedAt?: string | null;
    converterEstimatedVolumeMin?: number | null;
    converterEstimatedVolumeMax?: number | null;
    converterRecommendedVehicleCode?: string | null;
  } | null;
  offers?: BackendOffer[];
}

const statusLabel: Record<string, string> = {
  pending: 'Teklif Bekleniyor',
  offer_received: 'Teklif Geldi',
  matched: 'Nakliyeci Seçildi',
  in_transit: 'Taşınıyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
};

const insuranceLabel: Record<string, string> = {
  none: 'Sigortasız',
  basic: 'Temel Sigorta',
  full: 'Tam Sigorta',
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const fmtPrice = (n: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtFloorLine = (placeType?: string | null, floor?: number | null, hasElevator?: boolean | null): string => {
  const parts: string[] = [];
  if (placeType) parts.push(placeType);
  if (floor != null && !Number.isNaN(Number(floor))) {
    parts.push(Number(floor) === 0 ? 'Giriş kat' : `${floor}. kat`);
  }
  if (hasElevator === true) parts.push('(asansörlü)');
  else if (hasElevator === false) parts.push('(asansör yok)');
  return parts.length > 0 ? parts.join(' — ') : '—';
};

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userType = getUserType();
  const userId = getUserId();
  const [shipment, setShipment] = useState<BackendShipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const fetchShipment = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/shipments/${id}`);
      const json = await res.json();
      if (res.ok && json?.success && json.data) {
        setShipment(json.data);
      } else {
        setShipment(null);
      }
    } catch {
      setShipment(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchShipment(); }, [fetchShipment]);

  const handleStart = async () => {
    if (!shipment) return;
    setUpdating(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/shipments/${shipment.id}/start`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Taşıma başlatıldı!');
        await fetchShipment();
      } else {
        toast.error(json?.message || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setUpdating(false);
    }
  };

  const handleComplete = async () => {
    if (!shipment) return;
    setUpdating(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/shipments/${shipment.id}/complete`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Taşıma tamamlandı!');
        await fetchShipment();
      } else {
        toast.error(json?.message || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!shipment) return;
    setCancelDialogOpen(false);
    setUpdating(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/shipments/${shipment.id}/cancel`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Taşıma iptal edildi.');
        navigate('/ilanlarim');
      } else {
        toast.error(json?.message || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setUpdating(false);
    }
  };

  const handleAcceptOffer = async (offer: BackendOffer) => {
    if (isOfferAcceptDisabled(offer)) {
      toast.error('Bu taşıyıcı artık teklif kabulü için uygun değil.');
      return;
    }
    setUpdating(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/offers/${offer.id}/accept`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Teklif kabul edildi!');
        await fetchShipment();
      } else {
        toast.error(json?.message || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    setUpdating(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/offers/${offerId}/reject`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Teklif reddedildi.');
        await fetchShipment();
      } else {
        toast.error(json?.message || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="grid animate-pulse gap-4 lg:grid-cols-3">
          {[1,2,3].map(i => (
            <CorporateCard key={i}>
              <div className="space-y-3">
                <div className="h-4 w-2/5 rounded" style={{ background: 'var(--tb-border)' }} />
                <div className="h-3 w-full rounded" style={{ background: 'var(--tb-divider)' }} />
                <div className="h-3 w-4/5 rounded" style={{ background: 'var(--tb-divider)' }} />
                <div className="h-3 w-full rounded" style={{ background: 'var(--tb-divider)' }} />
              </div>
            </CorporateCard>
          ))}
        </div>
      </PageContainer>
    );
  }

  if (!shipment) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-base font-semibold" style={{ color: 'var(--tb-ink-900)' }}>İlan bulunamadı</p>
          <Link to="/" className="mt-2 block text-sm font-medium" style={{ color: 'var(--tb-brand-600)' }}>Ana Sayfaya Dön</Link>
        </div>
      </PageContainer>
    );
  }

  const shortId = shipment.id.slice(0, 8).toUpperCase();
  const offers = shipment.offers || [];
  const pendingOffers = offers.filter(o => o.status === 'pending');
  const lowestPrice = offers.length > 0 ? Math.min(...offers.map(o => Number(o.price))) : null;
  const isCarrierOwner = userType === 'carrier' && shipment.carrierId === userId;
  const offerPrices = offers.map(o => Number(o.price)).filter(p => p > 0);
  const minOfferPrice = offerPrices.length > 0 ? Math.min(...offerPrices) : null;
  const maxOfferPrice = offerPrices.length > 0 ? Math.max(...offerPrices) : null;
  const directPhone = userType === 'customer'
    ? shipment.carrier?.phone
    : userType === 'carrier'
      ? (shipment.customer?.phone || shipment.contactPhone)
      : shipment.carrier?.phone || shipment.customer?.phone || shipment.contactPhone;
  const showContactGate = ['matched', 'in_transit'].includes(shipment.status);
  const canShowOpenAddress = shipment.status === 'in_transit' && isCarrierOwner;
  const openAddressAvailable = Boolean(shipment.originAddressText || shipment.destinationAddressText);

  const isCancelled = shipment.status === 'cancelled';
  const timelineSteps = [
    { label: 'İlan Oluşturuldu', desc: '', date: shipment.createdAt, done: true },
    { label: 'Teklifler Alındı', desc: offers.length > 0 ? `${offers.length} teklif geldi` : 'Nakliyeciler teklif veriyor', date: offers[0]?.offeredAt || null, done: !isCancelled && ['offer_received','matched','in_transit','completed'].includes(shipment.status) },
    { label: 'Nakliyeci Seçildi', desc: shipment.carrier?.companyName || '', date: null as string|null, done: !isCancelled && ['matched','in_transit','completed'].includes(shipment.status) },
    { label: 'Taşıma Başladı', desc: '', date: null as string|null, done: !isCancelled && ['in_transit','completed'].includes(shipment.status) },
    { label: 'Teslim Edildi', desc: '', date: null as string|null, done: !isCancelled && shipment.status === 'completed' },
  ];
  const lastDoneIdx = timelineSteps.reduce((last, s, i) => (s.done ? i : last), -1);
  const activeIdx = isCancelled ? -1 : (lastDoneIdx + 1 < timelineSteps.length ? lastDoneIdx + 1 : -1);

  const handleRepeatShipment = () => {
    if (!shipment) return;
    sessionStorage.setItem('repeatShipment', JSON.stringify({
      origin: shipment.origin, destination: shipment.destination,
      transportType: shipment.transportType, loadDetails: shipment.loadDetails,
      weight: shipment.weight, placeType: shipment.originPlaceType ?? shipment.placeType,
      floor: shipment.originFloor ?? shipment.floor,
      hasElevator: shipment.originHasElevator ?? shipment.hasElevator,
      insuranceType: shipment.insuranceType, extraServices: shipment.extraServices,
    }));
    navigate('/teklif-talebi?repeat=true');
  };

  const handleRepeatWithCarrier = () => {
    if (!shipment || !shipment.carrierId) return;
    sessionStorage.setItem('repeatShipment', JSON.stringify({
      origin: shipment.origin, destination: shipment.destination,
      transportType: shipment.transportType, loadDetails: shipment.loadDetails,
      weight: shipment.weight, placeType: shipment.originPlaceType ?? shipment.placeType,
      floor: shipment.originFloor ?? shipment.floor,
      hasElevator: shipment.originHasElevator ?? shipment.hasElevator,
      insuranceType: shipment.insuranceType, extraServices: shipment.extraServices,
      inviteCarrierId: shipment.carrierId, inviteCarrierName: shipment.carrier?.companyName,
    }));
    navigate('/teklif-talebi?repeat=true&invite=true');
  };

  const priceDisplay = minOfferPrice != null && maxOfferPrice != null && minOfferPrice !== maxOfferPrice
    ? `₺${fmtPrice(minOfferPrice)} – ₺${fmtPrice(maxOfferPrice)}`
    : minOfferPrice != null ? `₺${fmtPrice(minOfferPrice)}`
    : shipment.price ? `₺${fmtPrice(Number(shipment.price))}`
    : '—';

  const elevatorBadge = (val?: boolean) =>
    val === true
      ? <ToneBadge tone="success">Var</ToneBadge>
      : val === false
        ? <ToneBadge tone="danger">Yok</ToneBadge>
        : <span style={{ color: 'var(--tb-ink-400)' }}>—</span>;

  return (
    <PageContainer className="space-y-4">
      {/* Breadcrumb */}
      <div className="text-xs" style={{ color: 'var(--tb-ink-400)' }}>
        <Link to="/ilanlarim" className="hover:underline" style={{ color: 'var(--tb-ink-400)' }}>İlanlarım</Link>
        <span className="mx-1.5">/</span>
        <span style={{ color: 'var(--tb-ink-500)' }}>İlan Detayı</span>
      </div>

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-[var(--tb-radius-sm)] px-2 py-0.5 font-mono text-xs" style={{ background: 'var(--tb-divider)', color: 'var(--tb-ink-500)' }}>#{shortId}</span>
        </div>
        <ToneBadge tone={shipmentStatusTone[shipment.status] || 'neutral'}>
          {statusLabel[shipment.status] || shipment.status}
        </ToneBadge>
      </div>

      {/* Route hero */}
      <RoutePair
        originCity={shipment.originCity}
        originDistrict={shipment.originDistrict}
        destinationCity={shipment.destinationCity}
        destinationDistrict={shipment.destinationDistrict}
        originFallback={shipment.origin}
        destinationFallback={shipment.destination}
      />

      {/* 3-column grid */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* COL 1: İlan Detayları */}
        <CorporateCard>
          <SectionTitle className="mb-4">İlan Detayları</SectionTitle>
          <div className="space-y-0">
            {[
              { label: 'TARİH', value: fmtDate(shipment.shipmentDate) },
              { label: 'YÜK', value: shipment.loadDetails },
              { label: 'AĞIRLIK', value: shipment.weight ? `${shipment.weight} kg` : '—' },
              { label: 'ÇIKIŞ', value: fmtFloorLine(shipment.originPlaceType ?? shipment.placeType, shipment.originFloor ?? shipment.floor, shipment.originHasElevator ?? shipment.hasElevator) },
              { label: 'VARIŞ', value: fmtFloorLine(shipment.destinationPlaceType, shipment.destinationFloor, shipment.destinationHasElevator) },
              { label: 'SİGORTA', value: insuranceLabel[shipment.insuranceType || 'none'] || shipment.insuranceType || '—' },
            ].map((row, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2" style={{ borderBottom: '0.5px solid var(--tb-divider)' }}>
                <span className="shrink-0 pt-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--tb-ink-400)', letterSpacing: '0.06em' }}>{row.label}</span>
                <span className="text-right text-[13px] font-medium" style={{ color: 'var(--tb-ink-900)' }}>{row.value}</span>
              </div>
            ))}
            {/* EKLER row */}
            <div className="py-2">
              <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--tb-ink-400)', letterSpacing: '0.06em' }}>EKLER</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {shipment.extraServices && shipment.extraServices.length > 0
                  ? shipment.extraServices.map((s, i) => <ToneBadge key={i} tone="info">{s}</ToneBadge>)
                  : <span className="text-xs" style={{ color: 'var(--tb-ink-400)' }}>—</span>}
              </div>
            </div>
          </div>

          {shipment.converter && (
            <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--tb-border)' }}>
              <PageEyebrow>Converter Özeti</PageEyebrow>
              <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--tb-ink-700)' }}>
                <div className="flex justify-between">
                  <span>Hacim</span>
                  <span className="font-medium" style={{ color: 'var(--tb-ink-900)' }}>
                    {shipment.converter.converterEstimatedVolumeMin != null && shipment.converter.converterEstimatedVolumeMax != null
                      ? `${shipment.converter.converterEstimatedVolumeMin}-${shipment.converter.converterEstimatedVolumeMax} m³` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Araç Önerisi</span>
                  <span className="font-medium" style={{ color: 'var(--tb-ink-900)' }}>{shipment.converter.converterRecommendedVehicleCode || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Uygulandı</span>
                  <span className="font-medium" style={{ color: 'var(--tb-ink-900)' }}>{shipment.converter.converterAppliedAt ? 'Evet' : 'Hayır'}</span>
                </div>
                <p className="pt-1 text-[11px]" style={{ color: 'var(--tb-ink-400)' }}>Bu sonuç tahminidir.</p>
              </div>
            </div>
          )}
        </CorporateCard>

        {/* COL 2: Taşıma Süreci (Timeline) */}
        <CorporateCard>
          <SectionTitle className="mb-4">Taşıma Süreci</SectionTitle>
          <div className="flex flex-col">
            {timelineSteps.map((ts, idx) => {
              const isDone = ts.done;
              const isActive = idx === activeIdx;
              const isLast = idx === timelineSteps.length - 1;
              return (
                <div key={idx} className="flex gap-3">
                  <div className="flex w-6 shrink-0 flex-col items-center">
                    {isDone ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'var(--tb-brand-600)' }}>
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    ) : isActive ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2" style={{ borderColor: 'var(--tb-brand-600)', background: 'var(--tb-surface)' }}>
                        <div className="h-2 w-2 rounded-full" style={{ background: 'var(--tb-brand-600)' }} />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full border" style={{ background: 'var(--tb-divider)', borderColor: 'var(--tb-border)' }} />
                    )}
                    {!isLast && (
                      <div className="my-0.5 w-0.5 flex-1" style={{ minHeight: '16px', background: isDone ? 'var(--tb-brand-600)' : 'var(--tb-border)' }} />
                    )}
                  </div>
                  <div className={isLast ? '' : 'pb-3.5'}>
                    <p className="text-[13px] font-medium" style={{ color: isDone ? 'var(--tb-ink-900)' : isActive ? 'var(--tb-brand-700)' : 'var(--tb-ink-400)' }}>{ts.label}</p>
                    {ts.desc && <p className="text-[11px]" style={{ color: 'var(--tb-ink-500)' }}>{ts.desc}</p>}
                    {ts.date && <p className="text-[11px]" style={{ color: 'var(--tb-ink-400)' }}>{fmtDate(ts.date)}</p>}
                    {isCancelled && idx === 0 && <p className="text-[11px]" style={{ color: 'var(--tb-danger)' }}>Taşıma iptal edildi</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </CorporateCard>

        {/* COL 3: Özet + Aksiyonlar */}
        <CorporateCard>
          <SectionTitle className="mb-4">Özet</SectionTitle>

          {/* Summary rows */}
          <div className="space-y-0">
            {[
              { label: 'Fiyat Aralığı', value: priceDisplay },
              { label: 'Tarih', value: fmtDate(shipment.shipmentDate) },
              { label: 'Durum', value: <ToneBadge tone={shipmentStatusTone[shipment.status] || 'neutral'}>{statusLabel[shipment.status] || shipment.status}</ToneBadge> },
              { label: 'Teklif Sayısı', value: <span className="font-medium" style={{ color: offers.length > 0 ? 'var(--tb-brand-700)' : 'var(--tb-ink-400)' }}>{offers.length} teklif</span> },
              { label: 'Oluşturulma', value: fmtDate(shipment.createdAt) },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: '0.5px solid var(--tb-divider)' }}>
                <span className="text-[13px]" style={{ color: 'var(--tb-ink-500)' }}>{row.label}</span>
                <span className="text-[13px] font-medium" style={{ color: 'var(--tb-ink-900)' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Contact gateway */}
          {showContactGate && (
            <div className="mt-3 flex items-center gap-2 rounded-[var(--tb-radius-sm)] border p-2.5" style={{ borderColor: 'var(--tb-border)', background: directPhone ? 'var(--tb-success-bg)' : 'var(--tb-divider)' }}>
              <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: directPhone ? 'var(--tb-success)' : 'var(--tb-ink-500)' }} />
              <div className="min-w-0">
                <p className="text-[11px]" style={{ color: 'var(--tb-ink-500)' }}>İletişim</p>
                <p className="truncate text-[13px] font-semibold" style={{ color: directPhone ? 'var(--tb-success)' : 'var(--tb-ink-900)' }}>
                  {directPhone || 'Platform içi mesajlaşma'}
                </p>
              </div>
            </div>
          )}

          {/* Open Address */}
          <div className="mt-3 rounded-[var(--tb-radius-sm)] border p-3" style={{ borderColor: 'var(--tb-border)', background: 'var(--tb-canvas)' }}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-bold" style={{ color: 'var(--tb-ink-900)' }}>Açık Adres</span>
              <ToneBadge tone={canShowOpenAddress && openAddressAvailable ? 'success' : 'warning'}>
                {canShowOpenAddress && openAddressAvailable ? 'Açık' : 'Maskeli'}
              </ToneBadge>
            </div>
            {canShowOpenAddress && openAddressAvailable ? (
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex items-center gap-1" style={{ color: 'var(--tb-ink-500)' }}>
                    <MapPin className="h-3 w-3" />
                    <span className="font-bold uppercase tracking-wide" style={{ letterSpacing: '0.06em' }}>Çıkış</span>
                  </div>
                  <p className="mt-0.5 font-semibold" style={{ color: 'var(--tb-ink-900)' }}>{shipment.originAddressText || 'Adres girilmemiş'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1" style={{ color: 'var(--tb-ink-500)' }}>
                    <MapPin className="h-3 w-3" />
                    <span className="font-bold uppercase tracking-wide" style={{ letterSpacing: '0.06em' }}>Varış</span>
                  </div>
                  <p className="mt-0.5 font-semibold" style={{ color: 'var(--tb-ink-900)' }}>{shipment.destinationAddressText || 'Adres girilmemiş'}</p>
                </div>
              </div>
            ) : (
              <InlineNotice tone="warning">
                Açık adres taşıma başlayınca seçilmiş nakliyeciye görünür.
              </InlineNotice>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: 'var(--tb-divider)' }}>
            {/* Customer: pending/offer_received */}
            {userType === 'customer' && ['pending', 'offer_received'].includes(shipment.status) && (
              <>
                {pendingOffers.length > 0 && (
                  <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" onClick={() => navigate(`/teklifler/${shipment.id}`)}>
                    Teklif Karşılaştır
                  </Button>
                )}
                <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" disabled={updating} onClick={() => setCancelDialogOpen(true)}>
                  İptal Et
                </Button>
              </>
            )}

            {/* Customer: matched/in_transit */}
            {userType === 'customer' && ['matched', 'in_transit'].includes(shipment.status) && shipment.carrierId && (
              <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" onClick={() => navigate(`/nakliyeci/${shipment.carrierId}`)}>
                Nakliyeci Detayı
              </Button>
            )}

            {/* Customer: completed */}
            {userType === 'customer' && shipment.status === 'completed' && (
              <>
                <div className="rounded-[var(--tb-radius-sm)] p-3" style={{ background: 'var(--tb-success-bg)', border: '0.5px solid var(--tb-success-border)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--tb-success)' }}>Taşıma tamamlandı</p>
                  <p className="mt-0.5 text-[11px]" style={{ color: '#166534' }}>Deneyiminizi paylaşın veya tekrar ilan oluşturun</p>
                </div>
                {shipment.carrierId && (
                  <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" onClick={() => navigate(`/nakliyeci/${shipment.carrierId}`)}>
                    Nakliyeciyi Değerlendir
                  </Button>
                )}
                {shipment.carrierId && (
                  <Button variant="outline" className="w-full" onClick={handleRepeatWithCarrier}>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" /> Bu Firma ile Tekrar
                  </Button>
                )}
                <Button variant="outline" className="w-full" onClick={handleRepeatShipment}>
                  <Copy className="mr-2 h-3.5 w-3.5" /> Bu İlanı Tekrar Oluştur
                </Button>
              </>
            )}

            {/* Customer: cancelled */}
            {userType === 'customer' && shipment.status === 'cancelled' && (
              <>
                <div className="rounded-[var(--tb-radius-sm)] p-3" style={{ background: 'var(--tb-danger-bg)', border: '0.5px solid var(--tb-danger-border)' }}>
                  <p className="text-xs" style={{ color: '#991B1B' }}>Bu ilan iptal edildi.</p>
                </div>
                <Button variant="outline" className="w-full" onClick={handleRepeatShipment}>
                  <RotateCcw className="mr-2 h-3.5 w-3.5" /> Yeniden Oluştur
                </Button>
              </>
            )}

            {/* Carrier: pending/offer_received */}
            {userType === 'carrier' && ['pending', 'offer_received'].includes(shipment.status) && (
              <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" onClick={() => navigate(`/nakliyeci/yanit/${shipment.id}`)}>
                Teklif Ver
              </Button>
            )}

            {/* Carrier: matched → start */}
            {isCarrierOwner && shipment.status === 'matched' && (
              <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" disabled={updating} onClick={handleStart}>
                Taşımayı Başlat
              </Button>
            )}

            {/* Carrier: in_transit → complete */}
            {isCarrierOwner && shipment.status === 'in_transit' && (
              <Button className="w-full bg-green-700 text-white hover:bg-green-800" disabled={updating} onClick={handleComplete}>
                Teslim Edildi
              </Button>
            )}
          </div>
        </CorporateCard>
      </div>

      {/* Bottom: Offers grid (customer, pending/offer_received) */}
      {userType === 'customer' && ['pending', 'offer_received'].includes(shipment.status) && offers.length > 0 && (
        <CorporateCard>
          <SectionTitle count={offers.length} className="mb-4">Gelen Teklifler</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {offers.map(offer => {
              const isCheapest = Number(offer.price) === lowestPrice && offer.status === 'pending';
              const initials = (offer.carrier?.companyName || 'N').slice(0, 2).toUpperCase();
              const eligibilityWarning = getCarrierEligibilityWarning(offer);
              const acceptDisabled = isOfferAcceptDisabled(offer, updating);
              return (
                <div
                  key={offer.id}
                  className="relative flex flex-col gap-3 overflow-hidden rounded-[var(--tb-radius-sm)] border p-4 transition hover:shadow-md"
                  style={{ borderColor: isCheapest ? 'var(--tb-brand-600)' : 'var(--tb-border)', borderWidth: isCheapest ? '1.5px' : '1px' }}
                >
                  {isCheapest && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--tb-brand-600)' }} />
                  )}
                  {isCheapest && (
                    <div className="absolute right-0 top-0 rounded-bl-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white" style={{ background: 'var(--tb-brand-600)' }}>
                      EN UYGUN
                    </div>
                  )}

                  {/* Carrier info */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--tb-brand-900)' }}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" style={{ color: 'var(--tb-ink-900)' }}>{offer.carrier?.companyName || 'Nakliyeci'}</p>
                      {offer.carrier?.rating != null && Number(offer.carrier.rating) > 0 && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span style={{ color: 'var(--tb-rating)' }}>★</span>
                          <span className="font-medium">{Number(offer.carrier.rating).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="border-y py-2.5" style={{ borderColor: 'var(--tb-divider)' }}>
                    <p className="text-xl font-bold" style={{ color: 'var(--tb-ink-900)' }}>₺{fmtPrice(Number(offer.price))}</p>
                    <p className="text-[11px]" style={{ color: 'var(--tb-ink-400)' }}>teklif fiyatı</p>
                    {offer.message && (
                      <p className="mt-1.5 line-clamp-2 text-xs" style={{ color: 'var(--tb-ink-500)' }}>{offer.message}</p>
                    )}
                  </div>

                  {eligibilityWarning && (
                    <div className="rounded-[var(--tb-radius-sm)] p-2.5" style={{ background: 'var(--tb-danger-bg)', border: '0.5px solid var(--tb-danger-border)' }}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--tb-danger)' }}>{eligibilityWarning.title}</p>
                      <p className="mt-1 text-xs" style={{ color: '#9F1239' }}>{eligibilityWarning.detail}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {offer.status === 'accepted' ? (
                    <div className="rounded-[var(--tb-radius-sm)] p-2.5 text-center text-xs font-semibold" style={{ background: 'var(--tb-success-bg)', color: 'var(--tb-success)' }}>
                      Kabul Edildi
                    </div>
                  ) : offer.status === 'rejected' ? (
                    <div className="rounded-[var(--tb-radius-sm)] p-2.5 text-center text-xs" style={{ background: 'var(--tb-canvas)', color: 'var(--tb-ink-400)' }}>
                      Reddedildi
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-blue-600 text-white hover:bg-blue-700" disabled={acceptDisabled} onClick={() => handleAcceptOffer(offer)}>
                        Kabul Et
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50" disabled={updating} onClick={() => handleRejectOffer(offer.id)}>
                        Reddet
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CorporateCard>
      )}

      {/* Cancel dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İlanı İptal Et</AlertDialogTitle>
            <AlertDialogDescription>
              İlanı iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
              Evet, İptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
