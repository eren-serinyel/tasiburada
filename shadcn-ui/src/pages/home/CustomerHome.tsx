import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Package, Calendar, LayoutGrid, MessageSquare,
  CheckCircle, MapPin, Shield, Phone,
} from 'lucide-react';
import { User, Shipment } from '@/lib/types';
import { getSessionUser } from '@/lib/storage';
import { apiClient } from '@/lib/apiClient';

const API = '/api/v1';

/* ── Backend → UI mapping (same logic as Dashboard.tsx) ── */
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
};

type BackendOffer = {
  id: string;
  shipmentId?: string;
  price: number;
  status: string;
  offeredAt?: string;
  carrier?: {
    id?: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;
  };
  shipment?: {
    id?: string;
    origin?: string;
    destination?: string;
  };
};

const normalizeStatus = (s?: string): Shipment['status'] => {
  switch (s) {
    case 'matched': return 'matched';
    case 'completed': return 'delivered';
    case 'cancelled': return 'cancelled';
    case 'in_transit': return 'matched';
    default: return 'pending';
  }
};

const toUi = (b: BackendShipment): Shipment & { rawStatus: string; offerCount: number } => ({
  id: b.id,
  customerId: b.customerId || '',
  origin: { address: b.origin || '', city: b.origin || '', lat: 0, lng: 0 },
  destination: { address: b.destination || '', city: b.destination || '', lat: 0, lng: 0 },
  loadType: (b.transportType as Shipment['loadType']) || 'ev-esyasi',
  weight: Number(b.weight || 0),
  date: b.shipmentDate ? new Date(b.shipmentDate) : new Date(),
  description: b.loadDetails || '',
  distance: 0,
  status: normalizeStatus(b.status),
  price: Number(b.price || 0),
  createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
  rawStatus: b.status || 'pending',
  offerCount: b.offerCount ?? 0,
});

/* ── Status badge ── */
const statusCfg: Record<string, { bg: string; color: string; border: string; label: string; dot?: 'animate' | 'static'; dotColor?: string }> = {
  pending:        { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA', label: 'Teklif Bekleniyor', dot: 'animate', dotColor: '#F97316' },
  offer_received: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Teklifler Geldi', dot: 'animate', dotColor: '#3B82F6' },
  matched:        { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'Nakliyeci Seçildi', dot: 'static', dotColor: '#16A34A' },
  in_transit:     { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Taşınıyor' },
  completed:      { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'Tamamlandı' },
  cancelled:      { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: 'İptal Edildi' },
};

function StatusBadge({ status }: { status: string }) {
  const s = statusCfg[status] || statusCfg.pending;
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: '5px', borderRadius: '9999px', padding: '3px 10px', fontSize: '11px', fontWeight: 500, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {s.dot && (
        <span
          className={s.dot === 'animate' ? 'animate-pulse' : ''}
          style={{ width: '6px', height: '6px', borderRadius: '9999px', background: s.dotColor, display: 'inline-block' }}
        />
      )}
      {s.label}
    </span>
  );
}

/* ── Component ── */
export default function CustomerHome() {
  const [user, setUser] = useState<User | null>(null);
  const [shipments, setShipments] = useState<(Shipment & { rawStatus: string; offerCount: number })[]>([]);
  const [offers, setOffers] = useState<BackendOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const u: User | null = getSessionUser()
        || (localStorage.getItem('currentUser')
          ? JSON.parse(localStorage.getItem('currentUser') as string)
          : null);
      if (!u) { navigate('/giris'); return; }
      setUser(u);
      setLoading(true);
      try {
        const [shipRes, offRes] = await Promise.allSettled([
          apiClient(`${API}/customers/shipments`),
          apiClient(`${API}/customers/offers`),
        ]);
        if (shipRes.status === 'fulfilled') {
          const j = await shipRes.value.json();
          if (j?.success && Array.isArray(j.data)) setShipments(j.data.map(toUi));
        }
        if (offRes.status === 'fulfilled') {
          const j = await offRes.value.json();
          if (j?.success && Array.isArray(j.data)) setOffers(j.data);
          else if (Array.isArray(j?.data?.data)) setOffers(j.data.data);
        }
      } catch { /* keep empty */ }
      finally { setLoading(false); }
    })();
  }, [navigate]);

  /* derived stats */
  const activeShipments = useMemo(() => shipments.filter(s => !['completed', 'cancelled', 'delivered'].includes(s.rawStatus)), [shipments]);
  const totalOffers = useMemo(() => offers.length || shipments.reduce((a, s) => a + s.offerCount, 0), [offers, shipments]);
  const completedCount = useMemo(() => shipments.filter(s => s.rawStatus === 'completed' || s.status === 'delivered').length, [shipments]);
  const pendingOffers = useMemo(() => offers.filter(o => o.status === 'pending'), [offers]);

  if (!user || loading) {
    return (
      <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] items-start" style={{ padding: '24px 28px', gap: '20px' }}>
          <div className="flex flex-col" style={{ gap: '16px' }}>
            <Skeleton className="h-28 rounded-[14px]" />
            <div className="grid grid-cols-3" style={{ gap: '10px' }}>
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-[10px]" />)}
            </div>
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="flex flex-col" style={{ gap: '12px' }}>
            <Skeleton className="h-52 rounded-[14px]" />
            <Skeleton className="h-40 rounded-[14px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] items-start" style={{ padding: '24px 28px', gap: '20px' }}>

        {/* ═══ SOL KOLON ═══ */}
        <div className="flex flex-col" style={{ gap: '16px' }}>

          {/* BÖLÜM 1 — HERO KARTI */}
          <div className="flex items-center justify-between" style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px' }}>
            <div>
              <div className="flex items-center" style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0F172A', gap: '8px' }}>
                Merhaba, {user.name} 👋
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', marginBottom: '18px' }}>
                Taşınmak için hazır mısınız?
              </p>
              <Link to="/teklif-talebi">
                <button
                  className="inline-flex items-center hover:!bg-[#1D4ED8]"
                  style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', gap: '6px' }}
                >
                  <Plus style={{ width: '14px', height: '14px' }} /> Yeni İlan Oluştur
                </button>
              </Link>
            </div>
          </div>

          {/* BÖLÜM 2 — STAT KARTLARI */}
          <div className="grid grid-cols-3" style={{ gap: '10px' }}>
            {[
              { label: 'Aktif İlan', value: activeShipments.length, bg: '#EFF6FF', iconColor: '#2563EB', icon: <LayoutGrid style={{ width: '16px', height: '16px' }} /> },
              { label: 'Gelen Teklif', value: totalOffers, bg: '#FFF7ED', iconColor: '#D97706', icon: <MessageSquare style={{ width: '16px', height: '16px' }} /> },
              { label: 'Tamamlanan', value: completedCount, bg: '#F0FDF4', iconColor: '#16A34A', icon: <CheckCircle style={{ width: '16px', height: '16px' }} /> },
            ].map(k => (
              <div key={k.label} className="flex items-center" style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px', gap: '12px' }}>
                <div className="flex items-center justify-center shrink-0" style={{ width: '36px', height: '36px', borderRadius: '10px', background: k.bg, color: k.iconColor }}>
                  {k.icon}
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 600, color: '#0F172A', lineHeight: 1 }}>{k.value}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* BÖLÜM 3 — AKTİF İLANLARIM */}
          <section>
            <div className="flex justify-between items-center" style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>Aktif İlanlarım</span>
              <Link to="/ilanlarim" style={{ fontSize: '12px', color: '#2563EB', textDecoration: 'none' }}>Tümünü Gör →</Link>
            </div>

            {activeShipments.length === 0 ? (
              <div className="text-center" style={{ background: 'white', border: '2px dashed #E2E8F0', borderRadius: '12px', padding: '48px 24px' }}>
                <Package className="mx-auto" style={{ width: '48px', height: '48px', color: '#CBD5E1', marginBottom: '12px' }} />
                <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '16px' }}>Henüz aktif ilanınız yok</p>
                <Link to="/teklif-talebi">
                  <button
                    className="hover:!bg-[#1D4ED8]"
                    style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    İlk İlanınızı Oluşturun
                  </button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: '8px' }}>
                {activeShipments.slice(0, 5).map(s => (
                  <div
                    key={s.id}
                    className="cursor-pointer border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors duration-150"
                    style={{ background: 'white', borderRadius: '12px', padding: '16px 18px' }}
                    onClick={() => navigate(`/ilan/${s.id}`)}
                  >
                    {/* ilan-top */}
                    <div className="flex justify-between items-center" style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
                        {s.origin.city || '—'}
                        <span style={{ color: '#94A3B8', fontSize: '12px', margin: '0 4px' }}>→</span>
                        {s.destination.city || '—'}
                      </span>
                      <StatusBadge status={s.rawStatus} />
                    </div>

                    {/* Chip satırı */}
                    <div className="flex flex-wrap" style={{ gap: '6px', marginBottom: '12px' }}>
                      <span className="inline-flex items-center" style={{ background: '#F1F5F9', borderRadius: '6px', padding: '3px 9px', fontSize: '12px', color: '#64748B', gap: '4px' }}>
                        <Calendar style={{ width: '12px', height: '12px', color: '#94A3B8' }} />
                        {s.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </span>
                      {s.description && (
                        <span style={{ background: '#F1F5F9', borderRadius: '6px', padding: '3px 9px', fontSize: '12px', color: '#64748B' }}>
                          {s.description}
                        </span>
                      )}
                      {s.weight > 0 && (
                        <span style={{ background: '#F1F5F9', borderRadius: '6px', padding: '3px 9px', fontSize: '12px', color: '#64748B' }}>
                          {s.weight} kg
                        </span>
                      )}
                    </div>

                    {/* ilan-bottom */}
                    <div className="flex justify-between items-center">
                      <span style={{ fontSize: '12px', color: s.offerCount > 0 ? '#1D4ED8' : '#94A3B8', fontWeight: s.offerCount > 0 ? 500 : 400 }}>
                        {s.offerCount > 0 ? `${s.offerCount} teklif geldi` : '0 teklif'}
                      </span>
                      <Link to="/tekliflerim" onClick={e => e.stopPropagation()}>
                        <button
                          className="hover:bg-[#EFF6FF] hover:!border-[#BFDBFE] transition-colors"
                          style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '5px 14px', fontSize: '12px', color: '#2563EB', background: 'transparent', cursor: 'pointer' }}
                        >
                          Teklifleri Gör
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ═══ SAĞ KOLON ═══ */}
        <div className="flex flex-col" style={{ gap: '12px' }}>

          {/* KART 1 — HIZLI İLAN OLUŞTUR */}
          <div style={{ background: '#2563EB', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'white' }}>Hızlı İlan Oluştur</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '16px' }}>Dakikalar içinde teklif alın</div>

            <div
              className="flex items-center cursor-pointer"
              onClick={() => navigate('/teklif-talebi')}
              style={{ width: '100%', height: '36px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', padding: '0 12px', marginBottom: '8px' }}
            >
              <MapPin style={{ width: '14px', height: '14px', marginRight: '8px' }} /> Nereden?
            </div>
            <div
              className="flex items-center cursor-pointer"
              onClick={() => navigate('/teklif-talebi')}
              style={{ width: '100%', height: '36px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', padding: '0 12px' }}
            >
              <MapPin style={{ width: '14px', height: '14px', marginRight: '8px' }} /> Nereye?
            </div>

            <button
              onClick={() => navigate('/teklif-talebi')}
              style={{ width: '100%', height: '36px', marginTop: '4px', background: 'white', color: '#1D4ED8', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              İlan Oluştur
            </button>
          </div>

          {/* KART 2 — SON TEKLİFLER */}
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '18px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>Son Teklifler</span>
              <Link to="/tekliflerim" style={{ fontSize: '12px', color: '#2563EB', textDecoration: 'none' }}>Tümü →</Link>
            </div>

            {pendingOffers.length === 0 && offers.length === 0 ? (
              <div className="text-center" style={{ padding: '24px 0' }}>
                <p style={{ fontSize: '13px', color: '#94A3B8' }}>Henüz teklif bulunmuyor.</p>
              </div>
            ) : (
              <div>
                {(pendingOffers.length > 0 ? pendingOffers : offers).slice(0, 5).map((o, idx, arr) => {
                  const carrierName = o.carrier?.companyName
                    || [o.carrier?.firstName, o.carrier?.lastName].filter(Boolean).join(' ')
                    || 'Nakliyeci';
                  const route = [o.shipment?.origin, o.shipment?.destination].filter(Boolean).join(' → ') || '';
                  const initials = carrierName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const isPending = o.status === 'pending';
                  const isLast = idx === arr.length - 1;

                  return (
                    <div key={o.id} className="flex items-center" style={{ padding: '10px 0', gap: '10px', borderBottom: isLast ? 'none' : '1px solid #F1F5F9' }}>
                      <div className="flex items-center justify-center shrink-0" style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#1E3A5F', color: 'white', fontSize: '12px', fontWeight: 500 }}>
                        {initials}
                      </div>
                      <div className="min-w-0" style={{ flex: 1 }}>
                        <div className="truncate" style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>{carrierName}</div>
                        {route && <div className="truncate" style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>{route}</div>}
                      </div>
                      <div className="shrink-0" style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
                        ₺{Number(o.price).toLocaleString('tr-TR')}
                      </div>
                      {isPending ? (
                        <div className="flex shrink-0" style={{ gap: '4px' }}>
                          <Link to="/tekliflerim" onClick={e => e.stopPropagation()}>
                            <button style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>Kabul</button>
                          </Link>
                          <Link to="/tekliflerim" onClick={e => e.stopPropagation()}>
                            <button style={{ background: 'transparent', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}>Red</button>
                          </Link>
                        </div>
                      ) : (
                        <span style={{
                          fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '6px',
                          ...(o.status === 'accepted' ? { background: '#F0FDF4', color: '#15803D' }
                            : o.status === 'rejected' ? { background: '#FEF2F2', color: '#DC2626' }
                            : { background: '#F1F5F9', color: '#64748B' })
                        }}>
                          {o.status === 'accepted' ? 'Kabul Edildi' : o.status === 'rejected' ? 'Reddedildi' : o.status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* KART 3 — NEDEN TAŞIBURADA? */}
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '12px' }}>
              NEDEN TAŞIBURADA?
            </div>
            {[
              { icon: <Shield style={{ width: '14px', height: '14px', color: '#16A34A' }} />, bg: '#F0FDF4', title: 'Güvenli Ödeme', desc: 'Para iadesi garantisi' },
              { icon: <CheckCircle style={{ width: '14px', height: '14px', color: '#2563EB' }} />, bg: '#EFF6FF', title: 'Onaylı Nakliyeciler', desc: 'Belge doğrulaması' },
              { icon: <Phone style={{ width: '14px', height: '14px', color: '#D97706' }} />, bg: '#FFF7ED', title: '7/24 Destek', desc: 'Her zaman yanınızdayız' },
            ].map((r, idx, arr) => (
              <div key={r.title} className="flex" style={{ gap: '10px', padding: '8px 0', borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                <div className="flex items-center justify-center shrink-0" style={{ width: '30px', height: '30px', borderRadius: '8px', background: r.bg }}>
                  {r.icon}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>{r.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

