import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Plus, Package, MessageSquare, Truck, CheckCircle2,
  MapPin, RotateCcw, Home, Building2, ChevronRight,
  Star, Phone, UserCheck, FileEdit, Headphones,
  Heart, History, Settings, HeadphonesIcon
} from 'lucide-react';
import { Shipment } from '@/lib/types';
import { getSessionUser } from '@/lib/storage';
import { apiClient } from '@/lib/apiClient';

/* ─────────────────────────────────────
   Back-end raw shapes
───────────────────────────────────── */
type BackendShipment = {
  id: string;
  customerId?: string;
  origin?: string;
  destination?: string;
  loadDetails?: string;
  transportType?: string;
  weight?: number | string;
  price?: number | string;
  shipmentDate?: string;
  createdAt?: string;
  status?: string;
  offerCount?: number;
  hasReview?: boolean;
};

type BackendOffer = {
  id: string;
  shipmentId?: string;
  price: number;
  status: string;
  estimatedDuration?: number;
  carrier?: {
    id?: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;
    rating?: number;
  };
  shipment?: {
    id?: string;
    origin?: string;
    destination?: string;
  };
};

type CustomerProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string;
};

/* ─────────────────────────────────────
   Helpers
───────────────────────────────────── */
type UiShipment = Shipment & { rawStatus: string; offerCount: number; hasReview: boolean };

const normalizeStatus = (s?: string): Shipment['status'] => {
  switch (s) {
    case 'matched':   return 'matched';
    case 'completed': return 'delivered';
    case 'cancelled': return 'cancelled';
    case 'in_transit': return 'matched';
    default:          return 'pending';
  }
};

const toUi = (b: BackendShipment): UiShipment => ({
  id: b.id,
  customerId: b.customerId ?? '',
  origin:      { address: b.origin ?? '', city: b.origin ?? '', lat: 0, lng: 0 },
  destination: { address: b.destination ?? '', city: b.destination ?? '', lat: 0, lng: 0 },
  loadType:    (b.transportType as Shipment['loadType']) ?? 'ev-esyasi',
  weight:      Number(b.weight ?? 0),
  date:        b.shipmentDate ? new Date(b.shipmentDate) : new Date(),
  description: b.loadDetails ?? '',
  distance:    0,
  status:      normalizeStatus(b.status),
  price:       Number(b.price ?? 0),
  createdAt:   b.createdAt ? new Date(b.createdAt) : new Date(),
  rawStatus:   b.status ?? 'pending',
  offerCount:  b.offerCount ?? 0,
  hasReview:   b.hasReview ?? false,
});

const formatLocation = (loc: { city?: string; address?: string }) =>
  loc.city || loc.address || '—';

/* ─────────────────────────────────────
   StatusBadge
───────────────────────────────────── */
const statusCfg: Record<string, {
  bg: string; color: string; border: string; label: string;
  dot?: 'animate' | 'static'; dotColor?: string;
}> = {
  pending:        { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA', label: 'Teklif Bekleniyor', dot: 'animate', dotColor: '#F97316' },
  offer_received: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Teklifler Geldi',  dot: 'animate', dotColor: '#3B82F6' },
  matched:        { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'Nakliyeci Seçildi', dot: 'static', dotColor: '#16A34A' },
  in_transit:     { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Taşınıyor' },
  completed:      { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'Tamamlandı' },
  cancelled:      { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: 'İptal Edildi' },
};

function StatusBadge({ status }: { status: string }) {
  const s = statusCfg[status] ?? statusCfg.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {s.dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full inline-block', s.dot === 'animate' && 'animate-pulse')}
          style={{ background: s.dotColor }}
        />
      )}
      {s.label}
    </span>
  );
}

/* ─────────────────────────────────────
   Main component
───────────────────────────────────── */
export default function CustomerHome() {
  const navigate = useNavigate();

  /* ── state ── */
  const [allShipments, setAllShipments] = useState<UiShipment[]>([]);
  const [allOffers,    setAllOffers]    = useState<BackendOffer[]>([]);
  const [profile,      setProfile]      = useState<CustomerProfile | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  /* ── session user (for first name while profile loads) ── */
  const sessionUser = useMemo(() => getSessionUser(), []);

  /* ── data fetch ── */
  useEffect(() => {
    (async () => {
      if (!sessionUser) { navigate('/giris'); return; }
      setLoading(true);
      try {
        const [shipRes, offRes, profRes] = await Promise.allSettled([
          apiClient('/api/v1/customers/shipments'),
          apiClient('/api/v1/customers/offers'),
          apiClient('/api/v1/customers/profile'),
        ]);

        if (shipRes.status === 'fulfilled') {
          const j = await shipRes.value.json();
          if (j?.success && Array.isArray(j.data)) setAllShipments(j.data.map(toUi));
        }
        if (offRes.status === 'fulfilled') {
          const j = await offRes.value.json();
          const arr = Array.isArray(j?.data) ? j.data
                    : Array.isArray(j?.data?.data) ? j.data.data : [];
          setAllOffers(arr);
        }
        if (profRes.status === 'fulfilled') {
          const j = await profRes.value.json();
          if (j?.success && j?.data) setProfile(j.data as CustomerProfile);
        }
      } catch { /* keep empty — allSettled already isolates failures */ }
      finally { setLoading(false); }
    })();
  }, [navigate, sessionUser]);

  /* ── derived ── */
  const activeShipments    = useMemo(() => allShipments.filter(s => ['pending', 'offer_received', 'matched'].includes(s.rawStatus)), [allShipments]);
  const inTransitShipments = useMemo(() => allShipments.filter(s => s.rawStatus === 'in_transit'),  [allShipments]);
  const completedShipments = useMemo(() => allShipments.filter(s => s.rawStatus === 'completed'),   [allShipments]);
  const lastShipment       = useMemo(() => allShipments[0] ?? null, [allShipments]);
  const pendingOffers      = useMemo(() => allOffers.filter(o => o.status === 'pending').length, [allOffers]);
  const recentOffers       = useMemo(() => allOffers.slice(0, 3), [allOffers]);

  const displayName = profile?.firstName ?? sessionUser?.name ?? 'Kullanıcı';

  const statusMessage = useMemo(() => {
    if (pendingOffers > 0)
      return `${pendingOffers} teklifiniz karşılaştırılmayı bekliyor.`;
    if (inTransitShipments.length > 0)
      return 'Devam eden bir taşımanız var.';
    if (activeShipments.length > 0)
      return 'Aktif taleplerinize teklif bekleniyor.';
    return 'Yeni bir taşıma talebi oluşturabilirsiniz.';
  }, [pendingOffers, inTransitShipments, activeShipments]);

  const pendingActions = useMemo(() => {
    const actions: {
      id: string; icon: React.ElementType; title: string;
      description: string; href: string; urgent: boolean;
    }[] = [];

    if (profile && !profile.phone) {
      actions.push({
        id: 'phone', icon: Phone,
        title: 'Telefon numaranı doğrula',
        description: 'Nakliyecilerin seni arayabilmesi için gerekli',
        href: '/profilim?tab=hesap', urgent: true,
      });
    }
    if (pendingOffers > 0) {
      actions.push({
        id: 'offers', icon: MessageSquare,
        title: `${pendingOffers} yeni teklifi incele`,
        description: 'Teklifler sizi bekliyor',
        href: '/tekliflerim', urgent: true,
      });
    }
    const needsSelection = activeShipments.filter(s => s.rawStatus === 'offer_received');
    if (needsSelection.length > 0) {
      actions.push({
        id: 'selection', icon: UserCheck,
        title: `${needsSelection.length} talep için nakliyeci seçmen gerekiyor`,
        description: 'Teklifleri karşılaştır ve seç',
        href: '/tekliflerim', urgent: true,
      });
    }
    const unreviewed = completedShipments.filter(s => !s.hasReview);
    if (unreviewed.length > 0) {
      actions.push({
        id: 'review', icon: Star,
        title: `${unreviewed.length} tamamlanan iş için yorum yap`,
        description: 'Deneyimini paylaş',
        href: '/gecmis', urgent: false,
      });
    }
    return actions;
  }, [profile, pendingOffers, activeShipments, completedShipments]);

  /* ── handlers ── */
  const handleRepeatShipment = (shipment: UiShipment) => {
    sessionStorage.setItem('repeatShipment', JSON.stringify({
      origin:        shipment.origin,
      destination:   shipment.destination,
      transportType: shipment.loadType,
      loadDetails:   shipment.description,
      weight:        shipment.weight,
    }));
    navigate('/teklif-talebi?repeat=true');
  };

  const handleCancelShipment = async (id: string) => {
    if (!confirm('Bu talebi iptal etmek istediğinize emin misiniz?')) return;
    setCancellingId(id);
    try {
      const res = await apiClient(`/api/v1/shipments/${id}/cancel`, { method: 'PUT' });
      const j = await res.json();
      if (res.ok && j?.success) {
        setAllShipments(prev =>
          prev.map(s => s.id === id ? { ...s, rawStatus: 'cancelled', status: 'cancelled' as Shipment['status'] } : s)
        );
      }
    } finally {
      setCancellingId(null);
    }
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Skeleton className="h-28 rounded-xl mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  /* ── RENDER ── */
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">

      {/* ══════════════════════════════════
          BLOK 1 — Karşılama + CTA
      ══════════════════════════════════ */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Merhaba, {displayName} 👋</h1>
            <p className="text-muted-foreground mt-1 text-sm">{statusMessage}</p>
          </div>
          <Button size="lg" className="shrink-0" onClick={() => navigate('/teklif-talebi')}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Taşıma Talebi Oluştur
          </Button>
        </div>

        {(lastShipment) && (
          <div className="flex flex-wrap gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => handleRepeatShipment(lastShipment)}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Son Talebi Tekrar Oluştur
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/teklif-talebi?draft=true')}>
              <FileEdit className="h-3 w-3 mr-1" />
              Taslak Talebe Devam Et
            </Button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════
          BLOK 2 — KPI Kartları
      ══════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {([
          {
            label: 'Aktif Talepler',
            value: activeShipments.length,
            description: activeShipments.length > 0 ? `${activeShipments.length} ilan yayında` : 'Aktif talebiniz yok',
            icon: Package,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            href: '/ilanlarim',
            urgent: false,
          },
          {
            label: 'Bekleyen Teklifler',
            value: pendingOffers,
            description: pendingOffers > 0 ? 'Karşılaştırılmayı bekliyor' : 'Yeni teklif yok',
            icon: MessageSquare,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            href: '/tekliflerim',
            urgent: pendingOffers > 0,
          },
          {
            label: 'Devam Eden Taşıma',
            value: inTransitShipments.length,
            description: inTransitShipments.length > 0 ? 'Taşıma yolda' : 'Devam eden iş yok',
            icon: Truck,
            color: 'text-green-600',
            bg: 'bg-green-50',
            href: '/ilanlarim?status=in_transit',
            urgent: false,
          },
          {
            label: 'Tamamlanan İşler',
            value: completedShipments.length,
            description: completedShipments.length > 0 ? `Toplam ${completedShipments.length} iş` : 'Henüz tamamlanan iş yok',
            icon: CheckCircle2,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            href: '/gecmis',
            urgent: false,
          },
        ] as const).map((stat) => (
          <div
            key={stat.label}
            onClick={() => navigate(stat.href)}
            className={cn(
              'p-4 rounded-xl border bg-card cursor-pointer hover:shadow-md transition-all',
              stat.urgent && 'border-orange-300 ring-1 ring-orange-200'
            )}
          >
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', stat.bg)}>
              <stat.icon className={cn('h-5 w-5', stat.color)} />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{stat.value}</span>
              {stat.urgent && (
                <span className="mb-1 text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                  Yeni
                </span>
              )}
            </div>
            <p className="font-medium mt-1 text-sm">{stat.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════
          Ana grid: sol 2/3 + sağ sidebar 1/3
      ══════════════════════════════════ */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ── SOL KOLON: Blok 3 + Blok 4 ── */}
        <div className="md:col-span-2 space-y-6">

          {/* ═══ BLOK 3 — Akıllı içerik ═══ */}

          {/* State C — Devam eden taşıma */}
          {inTransitShipments.length > 0 && (
            <section className="space-y-3">
              {inTransitShipments.map(shipment => (
                <div key={shipment.id} className="border border-green-200 bg-green-50/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-green-600 animate-pulse" />
                    <span className="text-sm font-medium text-green-700">Taşıma Devam Ediyor</span>
                  </div>
                  <p className="font-semibold">
                    {formatLocation(shipment.origin)} → {formatLocation(shipment.destination)}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/ilan/${shipment.id}`)}>
                      Taşıma Detayı
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/mesajlar')}>
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Nakliyeciyle İletişim
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* State A — Aktif ilanlar */}
          {activeShipments.length > 0 ? (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Aktif Taleplerim</h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/ilanlarim')}>
                  Tümünü Gör →
                </Button>
              </div>
              <div className="space-y-3">
                {activeShipments.slice(0, 3).map(shipment => (
                  <div
                    key={shipment.id}
                    className="border rounded-xl p-4 bg-card hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {formatLocation(shipment.origin)} → {formatLocation(shipment.destination)}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground items-center">
                          <span>{shipment.date.toLocaleDateString('tr-TR')}</span>
                          {shipment.weight > 0 && <><span>·</span><span>{shipment.weight} kg</span></>}
                          <span>·</span>
                          <StatusBadge status={shipment.rawStatus} />
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <span className="text-2xl font-bold text-primary">{shipment.offerCount}</span>
                        <p className="text-xs text-muted-foreground">teklif</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button size="sm" variant="default"
                        onClick={() => navigate(`/tekliflerim?shipment=${shipment.id}`)}>
                        Teklifleri Gör
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => navigate(`/ilan/${shipment.id}`)}>
                        Detay
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="text-destructive ml-auto"
                        disabled={cancellingId === shipment.id}
                        onClick={() => handleCancelShipment(shipment.id)}
                      >
                        {cancellingId === shipment.id ? 'İptal ediliyor...' : 'İptal Et'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            /* State B — Boş state */
            <section className="border-2 border-dashed rounded-xl p-6">
              <div className="text-center mb-6">
                <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <h3 className="font-medium">Henüz aktif talebiniz yok</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Hızlı başlamak için aşağıdaki seçeneklerden birini kullanın
                </p>
              </div>

              {lastShipment && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">Son kullandığın rota</p>
                    <p className="font-medium">
                      {formatLocation(lastShipment.origin)} → {formatLocation(lastShipment.destination)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleRepeatShipment(lastShipment)}>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Tekrar Oluştur
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: 'Ev Taşıma',    icon: Home,      type: 'residential' },
                  { label: 'Ofis Taşıma',  icon: Building2, type: 'office' },
                  { label: 'Parça Eşya',   icon: Package,   type: 'partial' },
                ] as const).map(({ label, icon: Icon, type }) => (
                  <button
                    key={type}
                    onClick={() => navigate(`/teklif-talebi?type=${type}`)}
                    className="p-4 rounded-xl border bg-card text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <Icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">{label}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ═══ BLOK 4 — Senden Beklenenler ═══ */}
          {pendingActions.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Senden Beklenenler</h2>
              <div className="space-y-2">
                {pendingActions.map(action => (
                  <div
                    key={action.id}
                    onClick={() => navigate(action.href)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:shadow-sm transition-all',
                      action.urgent ? 'border-orange-200 bg-orange-50/50' : 'bg-card'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      action.urgent ? 'bg-orange-100' : 'bg-muted'
                    )}>
                      <action.icon className={cn('h-4 w-4', action.urgent ? 'text-orange-600' : 'text-muted-foreground')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium', action.urgent && 'text-orange-900')}>
                        {action.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── SAĞ SIDEBAR: Blok 5 + Blok 6 ── */}
        <div className="space-y-6">

          {/* ═══ BLOK 5 — Hızlı İşlemler ═══ */}
          <div className="rounded-xl border bg-card p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-muted-foreground
                             uppercase tracking-wide mb-3">
                Hızlı İşlemler
              </h3>
              {[
                {
                  icon: Heart,
                  label: 'Kayıtlı Firmalarım',
                  description: 'Daha önce çalıştığın nakliyeciler',
                  href: '/kayitli-firmalarim',
                },
                {
                  icon: History,
                  label: 'Geçmiş İşlerim',
                  description: 'Tamamlanan taşımalar',
                  href: '/gecmis',
                },
                {
                  icon: Settings,
                  label: 'Hesap Ayarları',
                  description: 'Profil ve güvenlik',
                  href: '/profilim',
                },
                {
                  icon: HeadphonesIcon,
                  label: 'Destek Al',
                  description: 'Yardım ve SSS',
                  href: '/destek',
                },
              ].map(({ icon: Icon, label, description, href }) => (
                <button
                  key={href}
                  onClick={() => navigate(href)}
                  className="w-full flex items-center gap-3 px-3 py-2.5
                             rounded-lg text-left hover:bg-muted
                             transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted
                                  group-hover:bg-background
                                  flex items-center justify-center
                                  flex-shrink-0 transition-colors">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ═══ BLOK 6 — Son Teklifler ═══ */}
          {recentOffers.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Son Teklifler</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/tekliflerim')}>
                  Tümü →
                </Button>
              </div>
              <div className="space-y-3">
                {recentOffers.map(offer => {
                  const name = offer.carrier?.companyName
                    || [offer.carrier?.firstName, offer.carrier?.lastName].filter(Boolean).join(' ')
                    || 'Nakliyeci';
                  return (
                    <div
                      key={offer.id}
                      className="border rounded-xl p-3 bg-card hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => navigate('/tekliflerim')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm truncate">{name}</span>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{offer.carrier?.rating ?? '—'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">
                          ₺{Number(offer.price).toLocaleString('tr-TR')}
                        </span>
                        {offer.estimatedDuration != null && (
                          <span className="text-xs text-muted-foreground">
                            ~{offer.estimatedDuration} saat
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <StatusBadge status={offer.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Boş teklifler */}
          {recentOffers.length === 0 && (
            <div className="rounded-xl border bg-card p-4 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Henüz teklif bulunmuyor.</p>
              <p className="text-xs text-muted-foreground mt-1">Bir talep oluşturduktan sonra teklifler burada görünür.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
