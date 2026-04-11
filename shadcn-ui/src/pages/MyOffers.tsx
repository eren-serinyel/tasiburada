import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Star, PackageOpen, Sparkles, Bookmark, CheckCircle2, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { toast } from '@/components/ui/sonner';
import { formatLocation } from '@/utils/formatLocation';
import { cn } from '@/lib/utils';

const API_BASE_URL = '/api/v1';

interface OfferCarrier {
  id: string;
  companyName?: string | null;
  contactName?: string | null;
  rating?: number;
  completedShipments?: number;
  pictureUrl?: string | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  vehicleCapacityM3?: number | null;
}

interface OfferShipment {
  id: string;
  origin?: string;
  destination?: string;
  loadDetails?: string;
  weight?: number;
  shipmentDate?: string;
  status?: string;
}

interface BackendOffer {
  id: string;
  shipmentId: string;
  carrierId: string;
  carrier?: OfferCarrier;
  shipment?: OfferShipment;
  price: number;
  message?: string;
  estimatedDuration?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  offeredAt: string;
}

type SortOption = 'price_asc' | 'price_desc' | 'rating_desc' | 'duration_asc' | 'date_desc';

/* ── Helpers ── */
const shipmentStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending:        { label: 'Teklif Bekleniyor', bg: 'bg-amber-50',  text: 'text-amber-700' },
  offer_received: { label: 'Teklif Geldi',      bg: 'bg-amber-50',  text: 'text-amber-700' },
  matched:        { label: 'Eşleşti',            bg: 'bg-blue-50',   text: 'text-blue-700' },
  in_transit:     { label: 'Taşınıyor',          bg: 'bg-orange-50', text: 'text-orange-700' },
  completed:      { label: 'Tamamlandı',         bg: 'bg-green-50',  text: 'text-green-700' },
  cancelled:      { label: 'İptal',              bg: 'bg-gray-100',  text: 'text-gray-500' },
};

const fmtPrice = (n: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

function getOfferAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} gün önce`;
  if (hours > 0) return `${hours} saat önce`;
  return 'Az önce';
}

const isOldOffer = (createdAt: string): boolean => {
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff > 48 * 60 * 60 * 1000;
};

function getInitials(name?: string | null): string {
  if (!name) return 'N';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const gradients = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-emerald-500 to-emerald-600',
  'from-orange-500 to-orange-600',
  'from-pink-500 to-pink-600',
  'from-cyan-500 to-cyan-600',
];

function pickGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return gradients[Math.abs(hash) % gradients.length];
}

export default function MyOffers() {
  const [offers, setOffers] = useState<BackendOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [filterShipmentId, setFilterShipmentId] = useState<string>('all');
  const [confirmOffer, setConfirmOffer] = useState<BackendOffer | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [selectedOffer, setSelectedOffer] = useState<BackendOffer | null>(null);
  const [showBookmarked, setShowBookmarked] = useState(false);
  const navigate = useNavigate();

  const [bookmarked, setBookmarked] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('bookmarkedOffers') ?? '[]');
    } catch { return []; }
  });

  const toggleBookmark = (offerId: string) => {
    setBookmarked((prev) => {
      const next = prev.includes(offerId)
        ? prev.filter(id => id !== offerId)
        : [...prev, offerId];
      localStorage.setItem('bookmarkedOffers', JSON.stringify(next));
      return next;
    });
  };

  const fetchOffers = async () => {
    try {
      const res = await apiClient(`${API_BASE_URL}/customers/offers`);
      const json = await res.json();
      if (res.ok && json?.success) {
        setOffers(Array.isArray(json.data) ? json.data : []);
      } else {
        toast.error(json?.message || 'Teklifler alınamadı.');
      }
    } catch {
      toast.error('Teklifler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOffers(); }, []);

  const decide = async (offerId: string, accept: boolean) => {
    setDecidingId(offerId);
    try {
      const action = accept ? 'accept' : 'reject';
      const res = await apiClient(`${API_BASE_URL}/offers/${offerId}/${action}`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success(accept ? 'Teklif kabul edildi!' : 'Teklif reddedildi.');
        setConfirmOffer(null);
        await fetchOffers();
      } else {
        toast.error(json?.message || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem sırasında hata oluştu.');
    } finally {
      setDecidingId(null);
    }
  };

  /* ── Badge helpers ── */
  const pendingOffers = useMemo(() => offers.filter(o => o.status === 'pending'), [offers]);

  const bestPrice = useMemo(() =>
    pendingOffers.length > 0 ? Math.min(...pendingOffers.map(o => Number(o.price))) : null,
  [pendingOffers]);

  const bestRating = useMemo(() =>
    pendingOffers.length > 0 ? Math.max(...pendingOffers.map(o => o.carrier?.rating ?? 0)) : null,
  [pendingOffers]);

  const fastestDuration = useMemo(() => {
    const durations = pendingOffers.filter(o => o.estimatedDuration).map(o => o.estimatedDuration!);
    return durations.length > 0 ? Math.min(...durations) : null;
  }, [pendingOffers]);

  const getBadge = (offer: BackendOffer): string | null => {
    if (offer.status !== 'pending') return null;
    if (bestPrice !== null && Number(offer.price) === bestPrice) return 'En Uygun Fiyat';
    if (bestRating !== null && bestRating > 0 && (offer.carrier?.rating ?? 0) === bestRating) return 'En Yüksek Puan';
    if (fastestDuration !== null && offer.estimatedDuration === fastestDuration) return 'En Hızlı';
    return null;
  };

  /* ── Group offers by shipmentId ── */
  const grouped = useMemo(() => {
    let filtered = filterShipmentId === 'all'
      ? offers
      : offers.filter(o => o.shipmentId === filterShipmentId);

    if (showBookmarked) {
      filtered = filtered.filter(o => bookmarked.includes(o.id));
    }

    const map = new Map<string, { shipment: OfferShipment | undefined; offers: BackendOffer[] }>();
    for (const o of filtered) {
      const key = o.shipmentId;
      if (!map.has(key)) {
        map.set(key, { shipment: o.shipment, offers: [] });
      }
      map.get(key)!.offers.push(o);
    }

    // Sort offers within each group
    for (const group of map.values()) {
      group.offers.sort((a, b) => {
        switch (sortBy) {
          case 'price_asc':
            return Number(a.price) - Number(b.price);
          case 'price_desc':
            return Number(b.price) - Number(a.price);
          case 'rating_desc':
            return (b.carrier?.rating ?? 0) - (a.carrier?.rating ?? 0);
          case 'duration_asc':
            return (a.estimatedDuration ?? 999) - (b.estimatedDuration ?? 999);
          case 'date_desc':
          default:
            return new Date(b.offeredAt).getTime() - new Date(a.offeredAt).getTime();
        }
      });
    }
    return [...map.entries()];
  }, [offers, filterShipmentId, sortBy, showBookmarked, bookmarked]);

  /* ── Unique shipment options for filter ── */
  const shipmentOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const o of offers) {
      if (!seen.has(o.shipmentId)) {
        const s = o.shipment;
        seen.set(o.shipmentId, s ? `${formatLocation(s.origin)} → ${formatLocation(s.destination)}` : o.shipmentId.slice(0, 8));
      }
    }
    return [...seen.entries()];
  }, [offers]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tekliflerim</h1>
          <p className="text-[15px] text-gray-500 mt-1">
            Nakliyecilerden gelen teklifleri karşılaştırın ve en uygununu seçin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Bookmark filter */}
          <button
            onClick={() => setShowBookmarked(!showBookmarked)}
            className={cn(
              'text-sm px-3 py-1 rounded-full border transition-colors',
              showBookmarked
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-input hover:bg-muted'
            )}
          >
            <Bookmark className="h-3 w-3 inline mr-1" />
            Kaydettiklerim
          </button>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sırala:</span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-48 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_asc">En Düşük Fiyat</SelectItem>
                <SelectItem value="price_desc">En Yüksek Fiyat</SelectItem>
                <SelectItem value="rating_desc">En Yüksek Puan</SelectItem>
                <SelectItem value="duration_asc">En Hızlı Teslimat</SelectItem>
                <SelectItem value="date_desc">En Yeni Teklif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shipment filter */}
          {shipmentOptions.length > 1 && (
            <Select value={filterShipmentId} onValueChange={setFilterShipmentId}>
              <SelectTrigger className="w-[220px] text-sm h-8">
                <SelectValue placeholder="Tüm İlanlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm İlanlar</SelectItem>
                {shipmentOptions.map(([id, label]) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── Empty ── */}
      {offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageOpen className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-[15px] text-gray-500 mb-1">Henüz teklif almadınız.</p>
          <p className="text-sm text-gray-400">
            <Link to="/tasima-olustur" className="text-blue-600 hover:text-blue-700 font-medium">
              İlan oluşturun
            </Link>
            {' '}ve nakliyecilerden teklif alın.
          </p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageOpen className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-[15px] text-gray-500">
            {showBookmarked ? 'Kaydedilmiş teklif bulunamadı.' : 'Bu ilan için teklif bulunamadı.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([shipmentId, group]) => {
            const s = group.shipment;
            const stCfg = shipmentStatusConfig[s?.status || ''] || { label: s?.status || '', bg: 'bg-gray-100', text: 'text-gray-600' };

            return (
              <section key={shipmentId}>
                {/* ── Group header ── */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 mb-4 border-b border-gray-100">
                  <Link
                    to={`/ilan/${shipmentId}`}
                    className="text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {s?.origin || '?'} → {s?.destination || '?'}
                  </Link>
                  <div className="flex items-center gap-2">
                    {s?.shipmentDate && (
                      <span className="inline-flex items-center bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded">
                        📅 {fmtDate(s.shipmentDate)}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold ${stCfg.bg} ${stCfg.text}`}>
                      {stCfg.label}
                    </span>
                  </div>
                </div>

                {/* ── Offer cards grid ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {group.offers.map((offer) => {
                    const badge = getBadge(offer);
                    const carrierName = offer.carrier?.companyName || offer.carrier?.contactName || 'Nakliyeci';

                    return (
                      <div
                        key={offer.id}
                        className="relative bg-white border border-gray-200 rounded-xl p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                        onClick={() => setSelectedOffer(offer)}
                      >
                        {/* Badge */}
                        {badge && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 mb-3">
                            <Sparkles className="h-3 w-3" />
                            {badge}
                          </span>
                        )}

                        {/* Bookmark button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(offer.id);
                          }}
                          className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted transition-colors"
                          title={bookmarked.includes(offer.id) ? 'Kaydedildi' : 'Daha sonra karar ver'}
                        >
                          <Bookmark
                            className={cn(
                              'h-4 w-4',
                              bookmarked.includes(offer.id)
                                ? 'fill-primary text-primary'
                                : 'text-muted-foreground'
                            )}
                          />
                        </button>

                        {/* Carrier info */}
                        <div className="flex items-center gap-3 mb-4">
                          {offer.carrier?.pictureUrl ? (
                            <img
                              src={offer.carrier.pictureUrl}
                              className="h-11 w-11 rounded-full object-cover"
                              alt=""
                            />
                          ) : (
                            <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${pickGradient(offer.carrierId)} flex items-center justify-center text-white text-sm font-semibold`}>
                              {getInitials(carrierName)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-[15px] font-semibold text-gray-900 truncate">{carrierName}</div>
                            <div className="flex items-center gap-2 text-[13px] text-gray-500">
                              {offer.carrier?.rating != null && Number(offer.carrier.rating) > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  {Number(offer.carrier.rating).toFixed(1)}
                                  {offer.carrier.completedShipments != null && Number(offer.carrier.completedShipments) > 0 && (
                                    <span className="text-gray-400 ml-0.5">({offer.carrier.completedShipments})</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mb-3">
                          <div className="text-gray-900 tracking-[-0.02em]">
                            <span className="text-base font-bold align-top">₺</span>
                            <span className="text-[2rem] font-extrabold leading-none">{fmtPrice(Number(offer.price))}</span>
                          </div>
                          {offer.estimatedDuration != null && Number(offer.estimatedDuration) > 0 && (
                            <div className="text-[13px] text-gray-500 mt-0.5">
                              Tahmini {offer.estimatedDuration} saat
                            </div>
                          )}
                        </div>

                        {/* Message */}
                        {offer.message && (
                          <div className="border-l-[3px] border-gray-200 pl-3 mb-3">
                            <p className="text-[13px] text-gray-600 leading-relaxed line-clamp-2">
                              {offer.message}
                            </p>
                          </div>
                        )}

                        {/* Time with age indicator */}
                        <div className="mb-4">
                          <span className={cn(
                            'text-xs',
                            isOldOffer(offer.offeredAt)
                              ? 'text-orange-500'
                              : 'text-muted-foreground'
                          )}>
                            {isOldOffer(offer.offeredAt) && '⚠️ '}
                            {getOfferAge(offer.offeredAt)}
                          </span>
                        </div>

                        {/* Actions */}
                        {offer.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                              disabled={decidingId === offer.id}
                              onClick={(e) => { e.stopPropagation(); setConfirmOffer(offer); }}
                            >
                              Kabul Et
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 text-sm"
                              disabled={decidingId === offer.id}
                              onClick={(e) => { e.stopPropagation(); decide(offer.id, false); }}
                            >
                              Reddet
                            </Button>
                          </div>
                        )}
                        {offer.status === 'accepted' && (
                          <div className="bg-green-50 text-green-700 font-semibold text-center py-2.5 rounded text-sm">
                            ✓ Kabul Edildi
                          </div>
                        )}
                        {offer.status === 'rejected' && (
                          <div className="bg-gray-100 text-gray-500 font-semibold text-center py-2.5 rounded text-sm">
                            ✗ Reddedildi
                          </div>
                        )}
                        {offer.status === 'withdrawn' && (
                          <div className="bg-gray-100 text-gray-400 font-semibold text-center py-2.5 rounded text-sm">
                            Geri Çekildi
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ── Offer Detail Sheet ── */}
      <Sheet open={!!selectedOffer} onOpenChange={(o) => { if (!o) setSelectedOffer(null); }}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Teklif Detayı</SheetTitle>
          </SheetHeader>

          {selectedOffer && (
            <div className="space-y-4 mt-4">
              {/* Carrier info */}
              <div className="flex items-center gap-3">
                {selectedOffer.carrier?.pictureUrl ? (
                  <img src={selectedOffer.carrier.pictureUrl} className="w-12 h-12 rounded-full object-cover" alt="" />
                ) : (
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${pickGradient(selectedOffer.carrierId)} flex items-center justify-center text-white font-semibold`}>
                    {getInitials(selectedOffer.carrier?.companyName || selectedOffer.carrier?.contactName)}
                  </div>
                )}
                <div>
                  <p className="font-semibold">
                    {selectedOffer.carrier?.companyName || selectedOffer.carrier?.contactName || 'Nakliyeci'}
                  </p>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">
                      {selectedOffer.carrier?.rating ? Number(selectedOffer.carrier.rating).toFixed(1) : '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({selectedOffer.carrier?.completedShipments ?? 0} iş)
                    </span>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="p-4 bg-muted/50 rounded-xl text-center">
                <p className="text-3xl font-bold text-primary">
                  ₺{fmtPrice(Number(selectedOffer.price))}
                </p>
                {selectedOffer.estimatedDuration && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Tahmini süre: {selectedOffer.estimatedDuration} saat
                  </p>
                )}
              </div>

              {/* Message */}
              {selectedOffer.message && (
                <div>
                  <p className="text-sm font-medium mb-1">Nakliyecinin notu:</p>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                    {selectedOffer.message}
                  </p>
                </div>
              )}

              {/* Vehicle info */}
              {(selectedOffer.carrier?.vehicleBrand || selectedOffer.carrier?.vehicleModel) && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Araç</p>
                    <p className="font-medium">
                      {selectedOffer.carrier.vehicleBrand}{' '}
                      {selectedOffer.carrier.vehicleModel}
                    </p>
                  </div>
                  {selectedOffer.carrier.vehicleCapacityM3 && (
                    <div>
                      <p className="text-muted-foreground">Kapasite</p>
                      <p className="font-medium">
                        {selectedOffer.carrier.vehicleCapacityM3} m³
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Shipment route */}
              {selectedOffer.shipment && (
                <div className="text-sm border-t pt-3">
                  <p className="text-muted-foreground mb-1">Taşıma Güzergahı</p>
                  <p className="font-medium">{selectedOffer.shipment.origin} → {selectedOffer.shipment.destination}</p>
                </div>
              )}

              {/* Age indicator */}
              <div className="text-sm">
                <span className={cn(
                  isOldOffer(selectedOffer.offeredAt) ? 'text-orange-500' : 'text-muted-foreground'
                )}>
                  {isOldOffer(selectedOffer.offeredAt) && '⚠️ '}
                  Teklif tarihi: {getOfferAge(selectedOffer.offeredAt)}
                </span>
              </div>

              {/* Action buttons */}
              {selectedOffer.status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setConfirmOffer(selectedOffer);
                      setSelectedOffer(null);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Kabul Et
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => {
                      decide(selectedOffer.id, false);
                      setSelectedOffer(null);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reddet
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate(`/nakliyeci/${selectedOffer.carrierId}`)}
              >
                Nakliyeci Profilini Gör →
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Confirm Accept Dialog ── */}
      <AlertDialog open={!!confirmOffer} onOpenChange={(open) => { if (!open) setConfirmOffer(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Teklifi kabul et</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmOffer && (
                <>
                  <strong>{confirmOffer.carrier?.companyName || confirmOffer.carrier?.contactName || 'Nakliyeci'}</strong>
                  {' '}firmasının{' '}
                  <strong>₺{fmtPrice(Number(confirmOffer.price))}</strong>
                  {' '}tutarındaki teklifini kabul etmek istediğinizden emin misiniz?
                  Diğer teklifler otomatik reddedilecektir.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={decidingId === confirmOffer?.id}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={decidingId === confirmOffer?.id}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => confirmOffer && decide(confirmOffer.id, true)}
            >
              Kabul Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
