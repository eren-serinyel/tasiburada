import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, Star, Phone, ChevronRight, User, RotateCcw, Copy } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { toast } from '@/components/ui/sonner';
import { getUserType, getUserId } from '@/lib/auth';
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
  };
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
  loadDetails: string;
  transportType?: string;
  placeType?: string;
  hasElevator?: boolean;
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
  };
  customer?: { firstName: string; lastName: string; phone?: string; email?: string };
  extraServices?: string[];
  offers?: BackendOffer[];
}

/* ── Status helpers ── */
const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending:        { label: 'Teklif Bekleniyor', bg: 'bg-amber-50',  text: 'text-amber-700' },
  offer_received: { label: 'Teklif Geldi',      bg: 'bg-amber-50',  text: 'text-amber-700' },
  matched:        { label: 'Nakliyeci Seçildi',  bg: 'bg-blue-50',   text: 'text-blue-700' },
  in_transit:     { label: 'Taşınıyor',          bg: 'bg-orange-50', text: 'text-orange-700' },
  completed:      { label: 'Tamamlandı',         bg: 'bg-green-50',  text: 'text-green-700' },
  cancelled:      { label: 'İptal Edildi',        bg: 'bg-gray-100',  text: 'text-gray-500' },
};

const getStatus = (st: string) => statusConfig[st] || { label: st, bg: 'bg-gray-100', text: 'text-gray-600' };

const insuranceLabel: Record<string, string> = {
  none: 'Sigortasız',
  basic: 'Temel Sigorta',
  full: 'Tam Sigorta',
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const fmtPrice = (n: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

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

  const handleAcceptOffer = async (offerId: string) => {
    setUpdating(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/offers/${offerId}/accept`, { method: 'PUT' });
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

  /* ── Status badge config ── */
  const STATUS_MAP: Record<string, { label: string; bg: string; color: string; border: string; dot?: boolean }> = {
    pending:        { label: 'Teklif Bekleniyor', bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA', dot: true },
    offer_received: { label: 'Teklif Geldi',      bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', dot: true },
    matched:        { label: 'Nakliyeci Seçildi',  bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', dot: true },
    in_transit:     { label: 'Taşınıyor',          bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
    completed:      { label: 'Tamamlandı',         bg: '#F0FDF4', color: '#15803D', border: 'transparent' },
    cancelled:      { label: 'İptal Edildi',        bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' },
  };

  const StatusBadge = ({ status, size = 'normal' }: { status: string; size?: 'normal' | 'small' }) => {
    const cfg = STATUS_MAP[status] || STATUS_MAP.cancelled;
    const pad = size === 'small' ? '2px 8px' : '4px 12px';
    return (
      <span style={{ background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}`, borderRadius: '9999px', padding: pad, fontSize: '11px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
        {cfg.dot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color, animation: 'pulse 2s infinite' }} />}
        {cfg.label}
      </span>
    );
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '20px 24px' }}>
          <div className="animate-pulse" style={{ height: '14px', width: '140px', background: '#E2E8F0', borderRadius: '4px', marginBottom: '14px' }} />
          <div className="animate-pulse" style={{ height: '22px', width: '320px', background: '#E2E8F0', borderRadius: '6px', marginBottom: '20px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: 'white', border: '0.5px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
                <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ height: '14px', width: '40%', background: '#E2E8F0', borderRadius: '4px' }} />
                  <div style={{ height: '12px', width: '100%', background: '#F1F5F9', borderRadius: '4px' }} />
                  <div style={{ height: '12px', width: '80%', background: '#F1F5F9', borderRadius: '4px' }} />
                  <div style={{ height: '12px', width: '100%', background: '#F1F5F9', borderRadius: '4px' }} />
                  <div style={{ height: '12px', width: '60%', background: '#F1F5F9', borderRadius: '4px' }} />
                  <div style={{ height: '12px', width: '90%', background: '#F1F5F9', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', border: '0.5px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
            <div className="animate-pulse" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ border: '0.5px solid #E2E8F0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#F1F5F9', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ height: '12px', width: '70%', background: '#F1F5F9', borderRadius: '4px' }} />
                      <div style={{ height: '10px', width: '40%', background: '#F1F5F9', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div style={{ height: '28px', width: '50%', background: '#F1F5F9', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div style={{ background: '#F8FAFC', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginBottom: '12px' }}>İlan bulunamadı</div>
          <Link to="/" style={{ color: '#2563EB', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>Ana Sayfaya Dön</Link>
        </div>
      </div>
    );
  }

  /* ── Computed ── */
  const shortId = shipment.id.slice(0, 8).toUpperCase();
  const offers = shipment.offers || [];
  const pendingOffers = offers.filter(o => o.status === 'pending');
  const lowestPrice = offers.length > 0 ? Math.min(...offers.map(o => Number(o.price))) : null;
  const isCarrierOwner = userType === 'carrier' && shipment.carrierId === userId;
  const offerPrices = offers.map(o => Number(o.price)).filter(p => p > 0);
  const minOfferPrice = offerPrices.length > 0 ? Math.min(...offerPrices) : null;
  const maxOfferPrice = offerPrices.length > 0 ? Math.max(...offerPrices) : null;

  /* ── Timeline steps ── */
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

  /* ── Repeat helpers ── */
  const handleRepeatShipment = () => {
    if (!shipment) return;
    sessionStorage.setItem('repeatShipment', JSON.stringify({
      origin: shipment.origin,
      destination: shipment.destination,
      transportType: shipment.transportType,
      loadDetails: shipment.loadDetails,
      weight: shipment.weight,
      placeType: shipment.placeType,
      floor: shipment.floor,
      hasElevator: shipment.hasElevator,
      insuranceType: shipment.insuranceType,
      extraServices: shipment.extraServices,
    }));
    navigate('/teklif-talebi?repeat=true');
  };

  const handleRepeatWithCarrier = () => {
    if (!shipment || !shipment.carrierId) return;
    sessionStorage.setItem('repeatShipment', JSON.stringify({
      origin: shipment.origin,
      destination: shipment.destination,
      transportType: shipment.transportType,
      loadDetails: shipment.loadDetails,
      weight: shipment.weight,
      placeType: shipment.placeType,
      floor: shipment.floor,
      hasElevator: shipment.hasElevator,
      insuranceType: shipment.insuranceType,
      extraServices: shipment.extraServices,
      inviteCarrierId: shipment.carrierId,
      inviteCarrierName: shipment.carrier?.companyName,
    }));
    navigate('/teklif-talebi?repeat=true&invite=true');
  };

  /* ── Detail rows ── */
  const detailRows: { label: string; value: React.ReactNode }[] = [
    { label: 'ÇIKIŞ', value: shipment.origin },
    { label: 'VARIŞ', value: shipment.destination },
    { label: 'TARİH', value: fmtDate(shipment.shipmentDate) },
    { label: 'YÜK', value: shipment.loadDetails },
    { label: 'AĞIRLIK', value: shipment.weight ? `${shipment.weight} kg` : '—' },
    { label: 'YER', value: `${shipment.placeType || '—'}${shipment.floor ? ` — ${shipment.floor}. Kat` : ''}` },
    { label: 'ASANSÖR', value: shipment.hasElevator
      ? <span style={{ background: '#F0FDF4', color: '#15803D', borderRadius: '5px', padding: '1px 8px', fontSize: '11px', fontWeight: 500 }}>Var ✓</span>
      : <span style={{ background: '#FEF2F2', color: '#B91C1C', borderRadius: '5px', padding: '1px 8px', fontSize: '11px', fontWeight: 500 }}>Yok</span>
    },
    { label: 'SİGORTA', value: insuranceLabel[shipment.insuranceType || 'none'] || shipment.insuranceType || '—' },
    { label: 'EKLER', value: shipment.extraServices && shipment.extraServices.length > 0
      ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' }}>{shipment.extraServices.map((s, i) => <span key={i} style={{ background: '#F1F5F9', borderRadius: '5px', padding: '2px 8px', fontSize: '11px' }}>{s}</span>)}</div>
      : '—'
    },
  ];

  /* ── Summary rows ── */
  const priceDisplay = minOfferPrice != null && maxOfferPrice != null && minOfferPrice !== maxOfferPrice
    ? `₺${fmtPrice(minOfferPrice)} – ₺${fmtPrice(maxOfferPrice)}`
    : minOfferPrice != null ? `₺${fmtPrice(minOfferPrice)}`
    : shipment.price ? `₺${fmtPrice(Number(shipment.price))}`
    : '—';

  const summaryRows: { label: string; value: React.ReactNode }[] = [
    { label: 'Fiyat Aralığı', value: priceDisplay },
    { label: 'Tarih', value: fmtDate(shipment.shipmentDate) },
    { label: 'Durum', value: <StatusBadge status={shipment.status} size="small" /> },
    { label: 'Teklif Sayısı', value: <span style={{ color: offers.length > 0 ? '#1D4ED8' : '#94A3B8', fontWeight: 500 }}>{offers.length} teklif</span> },
    { label: 'Oluşturulma', value: fmtDate(shipment.createdAt) },
  ];

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '20px 24px' }}>

        {/* ═══ BREADCRUMB ═══ */}
        <div style={{ fontSize: '12px', marginBottom: '14px' }}>
          <Link to="/ilanlarim" style={{ color: '#94A3B8', textDecoration: 'none' }}>İlanlarım</Link>
          <span style={{ color: '#CBD5E1', margin: '0 5px' }}>/</span>
          <span style={{ color: '#64748B' }}>İlan Detayı</span>
        </div>

        {/* ═══ PAGE HEADER ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '7px', margin: 0 }}>
            {shipment.origin} <span style={{ color: '#94A3B8', fontSize: '14px' }}>→</span> {shipment.destination}
          </h1>
          <StatusBadge status={shipment.status} />
        </div>

        {/* ═══ TOP ROW — 3 COLUMN GRID ═══ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>

          {/* ── COL 1: İLAN DETAYLARI ── */}
          <div style={{ background: 'white', border: '0.5px solid #E2E8F0', borderRadius: '12px', padding: '18px', alignSelf: 'stretch' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>İlan Detayları</span>
              <span style={{ background: '#F1F5F9', borderRadius: '5px', padding: '2px 7px', fontFamily: 'monospace', fontSize: '11px', color: '#64748B' }}>#{shortId}</span>
            </div>
            {/* Detail rows */}
            {detailRows.map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: i < detailRows.length - 1 ? '0.5px solid #F1F5F9' : 'none', gap: '8px', ...(i === 0 ? { paddingTop: 0 } : {}) }}>
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, paddingTop: '1px' }}>{row.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', textAlign: 'right' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* ── COL 2: TAŞIMA SÜRECİ (TIMELINE) ── */}
          <div style={{ background: 'white', border: '0.5px solid #E2E8F0', borderRadius: '12px', padding: '18px', alignSelf: 'stretch' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', marginBottom: '12px' }}>Taşıma Süreci</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {timelineSteps.map((ts, idx) => {
                const isDone = ts.done;
                const isActive = idx === activeIdx;
                const isPending = !isDone && !isActive;
                const isLast = idx === timelineSteps.length - 1;
                return (
                  <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                    {/* Left: circle + line */}
                    <div style={{ width: '24px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {isDone ? (
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check style={{ width: '11px', height: '11px', color: 'white' }} />
                        </div>
                      ) : isActive ? (
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'white', border: '2px solid #2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }} />
                        </div>
                      ) : (
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#F1F5F9', border: '0.5px solid #E2E8F0' }} />
                      )}
                      {!isLast && (
                        <div style={{ width: '2px', flex: 1, minHeight: '16px', margin: '2px 0', background: isDone ? '#2563EB' : '#E2E8F0' }} />
                      )}
                    </div>
                    {/* Right: content */}
                    <div style={{ flex: 1, paddingBottom: isLast ? 0 : '14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '1px', color: isDone ? '#0F172A' : isActive ? '#1D4ED8' : '#94A3B8' }}>{ts.label}</div>
                      {ts.desc && <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.4 }}>{ts.desc}</div>}
                      {ts.date && <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>{fmtDate(ts.date)}</div>}
                      {isCancelled && idx === 0 && <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '1px' }}>Taşıma iptal edildi</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── COL 3: ÖZET + AKSİYONLAR ── */}
          <div style={{ background: 'white', border: '0.5px solid #E2E8F0', borderRadius: '12px', padding: '18px', alignSelf: 'stretch' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', marginBottom: '12px' }}>Özet</div>
            {/* Summary rows */}
            {summaryRows.map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < summaryRows.length - 1 ? '0.5px solid #F1F5F9' : 'none', ...(i === 0 ? { paddingTop: 0 } : {}), ...(i === summaryRows.length - 1 ? { paddingBottom: 0 } : {}) }}>
                <span style={{ fontSize: '13px', color: '#64748B' }}>{row.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', textAlign: 'right' }}>{row.value}</span>
              </div>
            ))}

            {/* Action buttons */}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '0.5px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* CUSTOMER — pending / offer_received */}
              {userType === 'customer' && ['pending', 'offer_received'].includes(shipment.status) && (
                <>
                  {pendingOffers.length > 0 && (
                    <button onClick={() => navigate(`/teklifler/${shipment.id}`)} style={{ width: '100%', height: '36px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                      Teklif Karşılaştır
                    </button>
                  )}
                  <button onClick={() => navigate(`/ilan-duzenle/${shipment.id}`)} style={{ width: '100%', height: '36px', background: 'white', color: '#374151', border: '0.5px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                    İlanı Düzenle
                  </button>
                  <button disabled={updating} onClick={() => setCancelDialogOpen(true)} style={{ width: '100%', height: '36px', background: 'white', color: '#DC2626', border: '0.5px solid #FECACA', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                    İptal Et
                  </button>
                </>
              )}

              {/* CUSTOMER — matched / in_transit */}
              {userType === 'customer' && ['matched', 'in_transit'].includes(shipment.status) && shipment.carrierId && (
                <button onClick={() => navigate(`/nakliyeci/${shipment.carrierId}`)} style={{ width: '100%', height: '36px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                  Nakliyeci Detayı
                </button>
              )}

              {/* CUSTOMER — completed */}
              {userType === 'customer' && shipment.status === 'completed' && (
                <>
                  <div style={{ padding: '10px 12px', background: '#F0FDF4', border: '0.5px solid #BBF7D0', borderRadius: '8px', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#15803D' }}>Taşıma tamamlandı 🎉</div>
                    <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>Deneyiminizi paylaşın veya tekrar ilan oluşturun</div>
                  </div>
                  {shipment.carrierId && (
                    <button onClick={() => navigate(`/nakliyeci/${shipment.carrierId}`)} style={{ width: '100%', height: '36px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                      Nakliyeciyi Değerlendir
                    </button>
                  )}
                  {shipment.carrierId && (
                    <button onClick={() => handleRepeatWithCarrier()} style={{ width: '100%', height: '36px', background: 'white', color: '#374151', border: '0.5px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <RotateCcw style={{ width: '14px', height: '14px' }} /> Bu Firma ile Tekrar
                    </button>
                  )}
                  <button onClick={() => handleRepeatShipment()} style={{ width: '100%', height: '36px', background: 'white', color: '#374151', border: '0.5px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Copy style={{ width: '14px', height: '14px' }} /> Bu İlanı Tekrar Oluştur
                  </button>
                </>
              )}

              {/* CUSTOMER — cancelled */}
              {userType === 'customer' && shipment.status === 'cancelled' && (
                <>
                  <div style={{ padding: '10px 12px', background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: '8px', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#991B1B' }}>Bu ilan iptal edildi.</div>
                  </div>
                  <button onClick={() => handleRepeatShipment()} style={{ width: '100%', height: '36px', background: 'white', color: '#374151', border: '0.5px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <RotateCcw style={{ width: '14px', height: '14px' }} /> Yeniden Oluştur
                  </button>
                </>
              )}

              {/* CARRIER — pending / offer_received: teklif ver */}
              {userType === 'carrier' && ['pending', 'offer_received'].includes(shipment.status) && (
                <button onClick={() => navigate(`/nakliyeci/yanit/${shipment.id}`)} style={{ width: '100%', height: '40px', background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Teklif Ver
                </button>
              )}

              {/* CARRIER — matched */}
              {isCarrierOwner && shipment.status === 'matched' && (
                <button disabled={updating} onClick={handleStart} style={{ width: '100%', height: '40px', background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Taşımayı Başlat
                </button>
              )}

              {/* CARRIER — in_transit */}
              {isCarrierOwner && shipment.status === 'in_transit' && (
                <button disabled={updating} onClick={handleComplete} style={{ width: '100%', height: '40px', background: 'linear-gradient(135deg, #14532D 0%, #15803D 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Teslim Edildi
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══ BOTTOM ROW — OFFERS (FULL WIDTH) ═══ */}
        {userType === 'customer' && ['pending', 'offer_received'].includes(shipment.status) && offers.length > 0 && (
          <div style={{ background: 'white', border: '0.5px solid #E2E8F0', borderRadius: '12px', padding: '18px', width: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>Gelen Teklifler</span>
              <span style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: '9999px', padding: '2px 9px', fontSize: '11px', fontWeight: 500 }}>{offers.length} teklif</span>
            </div>

            {/* Offer cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: offers.length <= 3 ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: '12px' }}>
              {offers.map(offer => {
                const isCheapest = Number(offer.price) === lowestPrice && offer.status === 'pending';
                const initials = (offer.carrier?.companyName || 'N').slice(0, 2).toUpperCase();
                return (
                  <div key={offer.id} style={{ border: isCheapest ? '1.5px solid #2563EB' : '0.5px solid #E2E8F0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 150ms' }}>
                    {/* Cheapest bar + tag */}
                    {isCheapest && (
                      <>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#2563EB' }} />
                        <div style={{ position: 'absolute', top: 0, right: 0, background: '#2563EB', color: 'white', fontSize: '9px', fontWeight: 700, padding: '3px 10px', borderRadius: '0 9px 0 7px', letterSpacing: '0.07em' }}>EN UYGUN</div>
                      </>
                    )}

                    {/* Top: avatar + info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#1E3A5F', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 500, flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{offer.carrier?.companyName || 'Nakliyeci'}</div>
                        {offer.carrier?.rating != null && Number(offer.carrier.rating) > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                            <span style={{ color: '#F59E0B', fontSize: '11px' }}>★</span>
                            <span style={{ fontSize: '11px', fontWeight: 500 }}>{Number(offer.carrier.rating).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price section */}
                    <div style={{ padding: '10px 0', borderTop: '0.5px solid #F1F5F9', borderBottom: '0.5px solid #F1F5F9' }}>
                      <div style={{ fontSize: '22px', fontWeight: 600, color: '#0F172A', lineHeight: 1 }}>₺{fmtPrice(Number(offer.price))}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>teklif fiyatı</div>
                      {offer.message && (
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{offer.message}</div>
                      )}
                    </div>

                    {/* Buttons / Status */}
                    {offer.status === 'accepted' ? (
                      <div style={{ background: '#F0FDF4', color: '#15803D', fontSize: '12px', fontWeight: 600, textAlign: 'center', borderRadius: '7px', padding: '10px' }}>✓ Kabul Edildi</div>
                    ) : offer.status === 'rejected' ? (
                      <div style={{ background: '#F8FAFC', color: '#94A3B8', fontSize: '12px', textAlign: 'center', borderRadius: '7px', padding: '10px' }}>✗ Reddedildi</div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button disabled={updating} onClick={() => handleAcceptOffer(offer.id)} style={{ flex: 1, background: '#2563EB', color: 'white', border: 'none', borderRadius: '7px', padding: '8px 0', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                          Kabul Et
                        </button>
                        <button disabled={updating} onClick={() => handleRejectOffer(offer.id)} style={{ flex: 1, background: 'transparent', color: '#DC2626', border: '0.5px solid #FECACA', borderRadius: '7px', padding: '8px 0', fontSize: '12px', cursor: 'pointer' }}>
                          Reddet
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

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
    </div>
  );
}
