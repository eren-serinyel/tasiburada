import { useEffect, useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CustomerOffer,
  CustomerOfferCard,
  getCapacityDecisionText,
  getExtraServiceCompatibilityText,
} from '@/components/offers/CustomerOfferCard';
import { Bookmark, PackageOpen, Rows3, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { isOfferAcceptDisabled } from '@/lib/customerOfferTrust';
import { toast } from '@/components/ui/sonner';
import { formatLocation } from '@/utils/formatLocation';
import { cn } from '@/lib/utils';

const API_BASE_URL = '/api/v1';

type SortOption = 'recommended' | 'rating_desc' | 'price_asc' | 'duration_asc' | 'date_desc';

const shipmentStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Teklif Bekleniyor', bg: 'bg-amber-50', text: 'text-amber-700' },
  offer_received: { label: 'Teklif Geldi', bg: 'bg-blue-50', text: 'text-blue-700' },
  matched: { label: 'Eslesme Yapildi', bg: 'bg-green-50', text: 'text-green-700' },
  in_transit: { label: 'Tasiniyor', bg: 'bg-orange-50', text: 'text-orange-700' },
  completed: { label: 'Tamamlandi', bg: 'bg-green-50', text: 'text-green-700' },
  cancelled: { label: 'Iptal', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const fmtPrice = (n: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function MyOffers() {
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [filterShipmentId, setFilterShipmentId] = useState<string>('all');
  const [confirmOffer, setConfirmOffer] = useState<CustomerOffer | null>(null);
  const [detailsOffer, setDetailsOffer] = useState<CustomerOffer | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const navigate = useNavigate();

  const [bookmarked, setBookmarked] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('bookmarkedOffers') ?? '[]');
    } catch {
      return [];
    }
  });

  const fetchOffers = async () => {
    try {
      const res = await apiClient(`${API_BASE_URL}/customers/offers`);
      const json = await res.json();
      if (res.ok && json?.success) {
        setOffers(Array.isArray(json.data) ? json.data : []);
      } else {
        toast.error(json?.message || 'Teklifler alinamadi.');
      }
    } catch {
      toast.error('Teklifler yuklenirken hata olustu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOffers(); }, []);

  const openAcceptConfirm = (offer: CustomerOffer) => {
    if (isOfferAcceptDisabled(offer)) {
      toast.error('Bu tasiyici artik teklif kabulu icin uygun degil.');
      return;
    }

    setConfirmOffer(offer);
  };

  const decide = async (offerId: string, accept: boolean) => {
    const targetOffer = offers.find((offer) => offer.id === offerId);
    if (accept && targetOffer && isOfferAcceptDisabled(targetOffer)) {
      toast.error('Bu tasiyici artik teklif kabulu icin uygun degil.');
      return;
    }

    setDecidingId(offerId);
    try {
      const action = accept ? 'accept' : 'reject';
      const res = await apiClient(`${API_BASE_URL}/offers/${offerId}/${action}`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success(accept ? 'Teklif kabul edildi.' : 'Teklif reddedildi.');
        setConfirmOffer(null);
        setDetailsOffer(null);
        await fetchOffers();
      } else {
        toast.error(json?.message || 'Islem basarisiz.');
      }
    } catch {
      toast.error('Islem sirasinda hata olustu.');
    } finally {
      setDecidingId(null);
    }
  };

  const toggleBookmark = (offer: CustomerOffer) => {
    setBookmarked(prev => {
      const next = prev.includes(offer.id)
        ? prev.filter(id => id !== offer.id)
        : [...prev, offer.id];
      localStorage.setItem('bookmarkedOffers', JSON.stringify(next));
      return next;
    });
  };

  const grouped = useMemo(() => {
    let filtered = filterShipmentId === 'all'
      ? offers
      : offers.filter(o => o.shipmentId === filterShipmentId);

    if (showBookmarked) filtered = filtered.filter(o => bookmarked.includes(o.id));
    if (verifiedOnly) filtered = filtered.filter(o => Boolean(o.carrier?.isVerified || o.carrier?.verifiedByAdmin));

    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'recommended') {
        const recommended = Number(Boolean(b.isRecommended)) - Number(Boolean(a.isRecommended));
        if (recommended !== 0) return recommended;
        const ratingDiff = Number(b.carrier?.rating || 0) - Number(a.carrier?.rating || 0);
        return ratingDiff !== 0 ? ratingDiff : Number(a.price) - Number(b.price);
      }
      if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
      if (sortBy === 'rating_desc') return Number(b.carrier?.rating || 0) - Number(a.carrier?.rating || 0);
      if (sortBy === 'duration_asc') return Number(a.estimatedDuration || 9999) - Number(b.estimatedDuration || 9999);
      return new Date(b.offeredAt).getTime() - new Date(a.offeredAt).getTime();
    });

    const map = new Map<string, { shipment: CustomerOffer['shipment']; offers: CustomerOffer[] }>();
    filtered.forEach(offer => {
      if (!map.has(offer.shipmentId)) {
        map.set(offer.shipmentId, { shipment: offer.shipment, offers: [] });
      }
      map.get(offer.shipmentId)!.offers.push(offer);
    });
    return [...map.entries()];
  }, [offers, filterShipmentId, sortBy, showBookmarked, bookmarked, verifiedOnly]);

  const shipmentOptions = useMemo(() => {
    const seen = new Map<string, string>();
    offers.forEach(offer => {
      if (!seen.has(offer.shipmentId)) {
        const s = offer.shipment;
        seen.set(offer.shipmentId, s ? `${formatLocation(s.origin)} -> ${formatLocation(s.destination)}` : offer.shipmentId.slice(0, 8));
      }
    });
    return [...seen.entries()];
  }, [offers]);

  const pendingCount = offers.filter(offer => offer.status === 'pending').length;
  const recommendedCount = offers.filter(offer => offer.isRecommended && offer.status === 'pending').length;
  const minPrice = offers.length ? Math.min(...offers.map(offer => Number(offer.price))) : 0;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tekliflerim</h1>
          <p className="mt-1 text-[15px] text-gray-500">
            Fiyat yerine guven, puan ve hizmet kapsamiyla karar verin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBookmarked(!showBookmarked)}
            className={showBookmarked ? 'border-blue-300 bg-blue-50 text-blue-700' : ''}
          >
            <Bookmark className="mr-1.5 h-4 w-4" />
            Kaydettiklerim
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={verifiedOnly ? 'border-blue-300 bg-blue-50 text-blue-700' : ''}
          >
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            Onayli
          </Button>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Onerilen</SelectItem>
              <SelectItem value="rating_desc">En Yuksek Puan</SelectItem>
              <SelectItem value="price_asc">En Dusuk Fiyat</SelectItem>
              <SelectItem value="duration_asc">En Kisa Sure</SelectItem>
              <SelectItem value="date_desc">En Yeni Teklif</SelectItem>
            </SelectContent>
          </Select>
          {shipmentOptions.length > 1 && (
            <Select value={filterShipmentId} onValueChange={setFilterShipmentId}>
              <SelectTrigger className="h-9 w-[220px] text-sm">
                <SelectValue placeholder="Tum ilanlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tum ilanlar</SelectItem>
                {shipmentOptions.map(([id, label]) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {offers.length > 0 && (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <Metric label="Aktif teklif" value={String(pendingCount)} />
          <Metric label="Onerilen" value={String(recommendedCount)} />
          <Metric label="Baslayan fiyat" value={`₺${fmtPrice(minPrice)}`} />
        </div>
      )}

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Tasiyiciyla iletisim ve odeme sureclerini platform uzerinden surdurun.
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        Uygun olmayan tasiyicilarin teklifleri gecmis icin gorunur, ancak kabul edilemez.
      </div>

      {offers.length === 0 ? (
        <EmptyState />
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageOpen className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-[15px] text-gray-500">Secili filtrelerde teklif bulunamadi.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([shipmentId, group]) => {
            const s = group.shipment;
            const stCfg = shipmentStatusConfig[s?.status || ''] || { label: s?.status || '', bg: 'bg-gray-100', text: 'text-gray-600' };

            return (
              <section key={shipmentId}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <Link to={`/ilan/${shipmentId}`} className="text-base font-semibold text-gray-900 transition-colors hover:text-blue-600">
                    {s?.origin || '?'} {'->'} {s?.destination || '?'}
                  </Link>
                  <div className="flex items-center gap-2">
                    {s?.shipmentDate && (
                      <span className="inline-flex items-center rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {fmtDate(s.shipmentDate)}
                      </span>
                    )}
                    <span className={cn('inline-flex items-center rounded px-2.5 py-1 text-[11px] font-semibold', stCfg.bg, stCfg.text)}>
                      {stCfg.label}
                    </span>
                    {group.offers.length >= 2 && (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/teklifler/${shipmentId}`)}>
                        <Rows3 className="mr-1.5 h-4 w-4" />
                        Karsilastir
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {group.offers.map(offer => (
                    <CustomerOfferCard
                      key={offer.id}
                      offer={offer}
                      bookmarked={bookmarked.includes(offer.id)}
                      disabled={decidingId === offer.id}
                      onAccept={openAcceptConfirm}
                      onReject={(item) => decide(item.id, false)}
                      onDetails={setDetailsOffer}
                      onBookmark={toggleBookmark}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={!!detailsOffer} onOpenChange={(open) => { if (!open) setDetailsOffer(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Teklif Detayi</DialogTitle>
          </DialogHeader>
          {detailsOffer && (
            <CustomerOfferCard
              offer={detailsOffer}
              compact
              bookmarked={bookmarked.includes(detailsOffer.id)}
              disabled={decidingId === detailsOffer.id}
              onAccept={openAcceptConfirm}
              onReject={(item) => decide(item.id, false)}
              onBookmark={toggleBookmark}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmOffer} onOpenChange={(open) => { if (!open) setConfirmOffer(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Teklifi kabul et</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmOffer && (
                <div className="space-y-2 text-slate-700">
                  <p>
                    <strong>{confirmOffer.carrier?.displayName || confirmOffer.carrier?.companyName || 'Nakliyeci'}</strong>
                    {' '}teklifi kabul edilecek.
                  </p>
                  <p><strong>Fiyat:</strong> ₺{fmtPrice(Number(confirmOffer.price))}</p>
                  <p><strong>Ek hizmet uyumu:</strong> {getExtraServiceCompatibilityText(confirmOffer) || 'Ek hizmet gerekmiyor'}</p>
                  <p><strong>Kapasite durumu:</strong> {getCapacityDecisionText(confirmOffer)}</p>
                  <p>Diger teklifler otomatik reddedilecek, iletisim platform kurallarina gore acilacak.</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={decidingId === confirmOffer?.id}>Vazgec</AlertDialogCancel>
            <AlertDialogAction
              disabled={!confirmOffer || isOfferAcceptDisabled(confirmOffer, decidingId === confirmOffer.id)}
              className="bg-blue-600 text-white hover:bg-blue-700"
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <PackageOpen className="mb-4 h-12 w-12 text-gray-300" />
      <p className="mb-1 text-[15px] text-gray-500">Henuz teklif almadiniz.</p>
      <p className="text-sm text-gray-400">
        <Link to="/teklif-talebi" className="font-medium text-blue-600 hover:text-blue-700">
          Ilan olusturun
        </Link>
        {' '}ve nakliyecilerden teklif alin.
      </p>
    </div>
  );
}
