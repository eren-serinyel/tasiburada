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
import { ArrowLeft, BarChart2, PackageOpen, SlidersHorizontal } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { getCarrierEligibilityComparisonText, isOfferAcceptDisabled } from '@/lib/customerOfferTrust';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

type SortMode = 'backend' | 'recommended' | 'rating_desc' | 'price_asc' | 'duration_asc';

const shipmentStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Teklif Bekleniyor', bg: 'bg-amber-50', text: 'text-amber-700' },
  offer_received: { label: 'Teklif Geldi', bg: 'bg-blue-50', text: 'text-blue-700' },
  matched: { label: 'Eslesme Yapildi', bg: 'bg-green-50', text: 'text-green-700' },
  in_transit: { label: 'Tasinıyor', bg: 'bg-orange-50', text: 'text-orange-700' },
  completed: { label: 'Tamamlandi', bg: 'bg-green-50', text: 'text-green-700' },
  cancelled: { label: 'Iptal', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const fmtPrice = (n: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

export default function OfferComparison() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [confirmOffer, setConfirmOffer] = useState<CustomerOffer | null>(null);
  const [detailsOffer, setDetailsOffer] = useState<CustomerOffer | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('backend');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const fetchOffers = async () => {
    try {
      const endpoint = shipmentId
        ? `/api/v1/customers/offers?shipmentId=${encodeURIComponent(shipmentId)}`
        : '/api/v1/customers/offers';
      const res = await apiClient(endpoint);
      const json = await res.json();
      if (res.ok && json?.success && Array.isArray(json.data)) {
        setOffers((json.data as CustomerOffer[]).filter(o => !shipmentId || o.shipmentId === shipmentId));
      } else {
        setOffers([]);
      }
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOffers(); }, [shipmentId]);

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
      const res = await apiClient(`/api/v1/offers/${offerId}/${action}`, { method: 'PUT' });
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

  const sortedOffers = useMemo(() => {
    const filtered = verifiedOnly ? offers.filter(o => Boolean(o.carrier?.isVerified || o.carrier?.verifiedByAdmin)) : offers;
    if (sortMode === 'backend') {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      if (sortMode === 'recommended') {
        const recommended = Number(Boolean(b.isRecommended)) - Number(Boolean(a.isRecommended));
        if (recommended !== 0) return recommended;
        const ratingDiff = Number(b.carrier?.rating || 0) - Number(a.carrier?.rating || 0);
        return ratingDiff !== 0 ? ratingDiff : Number(a.price) - Number(b.price);
      }
      if (sortMode === 'rating_desc') return Number(b.carrier?.rating || 0) - Number(a.carrier?.rating || 0);
      if (sortMode === 'duration_asc') return Number(a.estimatedDuration || 9999) - Number(b.estimatedDuration || 9999);
      return Number(a.price) - Number(b.price);
    });
  }, [offers, sortMode, verifiedOnly]);

  const shipment = offers[0]?.shipment;
  const stCfg = shipmentStatusConfig[shipment?.status || ''] || { label: shipment?.status || '', bg: 'bg-gray-100', text: 'text-gray-600' };
  const pendingCount = offers.filter(o => o.status === 'pending').length;
  const topThree = sortedOffers.filter(o => o.status === 'pending').slice(0, 3);

  const toggleCompare = (offerId: string) => {
    setSelectedForCompare(prev =>
      prev.includes(offerId)
        ? prev.filter(id => id !== offerId)
        : prev.length < 3
          ? [...prev, offerId]
          : prev
    );
  };

  const compareOffers = selectedForCompare.length
    ? selectedForCompare.map(id => offers.find(o => o.id === id)).filter(Boolean) as CustomerOffer[]
    : topThree;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Geri
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teklif Degerlendirme</h1>
            <p className="mt-1 text-[15px] text-gray-500">
              {shipment
                ? `${shipment.origin || '?'} -> ${shipment.destination || '?'} tasimasi icin ${offers.length} teklif`
                : 'Teklifleri fiyat, puan ve guven sinyallerine gore karsilastirin.'
              }
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {shipment?.shipmentDate && (
              <span className="inline-flex items-center rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                {fmtDate(shipment.shipmentDate)}
              </span>
            )}
            {shipment && (
              <span className={cn('inline-flex items-center rounded px-2.5 py-1 text-[11px] font-semibold', stCfg.bg, stCfg.text)}>
                {stCfg.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {offers.length > 0 && (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr,auto] md:items-center">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Aktif teklif" value={String(pendingCount)} />
            <Metric label="En dusuk fiyat" value={`₺${fmtPrice(Math.min(...offers.map(o => Number(o.price))))}`} />
            <Metric label="En yuksek puan" value={(Math.max(...offers.map(o => Number(o.carrier?.rating || 0))) || 0).toFixed(1)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setVerifiedOnly(v => !v)} className={verifiedOnly ? 'border-blue-300 bg-blue-50 text-blue-700' : ''}>
              <SlidersHorizontal className="mr-1.5 h-4 w-4" />
              Sadece onayli
            </Button>
            <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backend">Varsayilan</SelectItem>
                <SelectItem value="recommended">Onerilen</SelectItem>
                <SelectItem value="rating_desc">Puan yuksek</SelectItem>
                <SelectItem value="price_asc">Fiyat dusuk</SelectItem>
                <SelectItem value="duration_asc">Sure kisa</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setCompareMode(true)} disabled={compareOffers.length < 2}>
              <BarChart2 className="mr-1.5 h-4 w-4" />
              Karsilastir
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Tasiyiciyla iletisim ve odeme sureclerini platform uzerinden surdurun.
      </div>

      {sortedOffers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageOpen className="mb-4 h-12 w-12 text-gray-300" />
          <p className="mb-1 text-[15px] text-gray-500">Bu ilan icin teklif bulunamadi.</p>
          <p className="text-sm text-gray-400">
            <Link to="/tekliflerim" className="font-medium text-blue-600 hover:text-blue-700">Tum tekliflere don</Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {sortedOffers.map(offer => (
            <div key={offer.id} className="space-y-2">
              {offer.status === 'pending' && (
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={selectedForCompare.includes(offer.id)}
                    onChange={() => toggleCompare(offer.id)}
                    className="rounded"
                  />
                  Karsilastirmaya ekle
                </label>
              )}
              <CustomerOfferCard
                offer={offer}
                disabled={decidingId === offer.id}
                onAccept={openAcceptConfirm}
                onReject={(item) => decide(item.id, false)}
                onDetails={setDetailsOffer}
              />
            </div>
          ))}
        </div>
      )}

      <Dialog open={compareMode} onOpenChange={setCompareMode}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Teklifleri Karsilastir</DialogTitle>
          </DialogHeader>
          <ComparisonTable offers={compareOffers} onChoose={(offer) => { setConfirmOffer(offer); setCompareMode(false); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailsOffer} onOpenChange={(open) => { if (!open) setDetailsOffer(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Teklif Detayi</DialogTitle>
          </DialogHeader>
          {detailsOffer && (
            <CustomerOfferCard
              offer={detailsOffer}
              compact
              disabled={decidingId === detailsOffer.id}
              onAccept={openAcceptConfirm}
              onReject={(item) => decide(item.id, false)}
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
            <AlertDialogAction disabled={!confirmOffer || isOfferAcceptDisabled(confirmOffer, decidingId === confirmOffer.id)} className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => confirmOffer && decide(confirmOffer.id, true)}>
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

function ComparisonTable({ offers, onChoose }: { offers: CustomerOffer[]; onChoose: (offer: CustomerOffer) => void }) {
  const rows = [
    ['Fiyat', (o: CustomerOffer) => `₺${fmtPrice(Number(o.price))}`],
    ['Sure', (o: CustomerOffer) => o.estimatedDuration ? `${o.estimatedDuration} saat` : 'Belirtilmedi'],
    ['Puan', (o: CustomerOffer) => o.carrier?.rating ? `${Number(o.carrier.rating).toFixed(1)} / 5 (${o.carrier?.ratingCount ?? 0} yorum)` : 'Yeni / yorum yok'],
    ['Tasiyici uygunlugu', (o: CustomerOffer) => getCarrierEligibilityComparisonText(o)],
    ['Ek hizmet uyumu', (o: CustomerOffer) => getExtraServiceCompatibilityText(o) || 'Gerekmiyor'],
    ['Kapasite', (o: CustomerOffer) => getCapacityDecisionText(o)],
    ['Sigorta / dogrulama', (o: CustomerOffer) => {
      const sigorta = o.carrier?.hasInsurance ? 'Sigorta var' : 'Sigorta bilgisi yok';
      const verify = (o.carrier?.isVerified || o.carrier?.verifiedByAdmin) ? 'Dogrulanmis' : 'Dogrulama yok';
      return `${sigorta} • ${verify}`;
    }],
    ['Son yorum', (o: CustomerOffer) => {
      const comment = o.carrier?.latestPositiveReview?.comment || o.carrier?.latestReview?.comment;
      if (!comment) return 'Yorum yok';
      return comment.length > 70 ? `${comment.slice(0, 70)}...` : comment;
    }],
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr>
            <th className="w-36 p-2 text-left font-normal text-slate-500">Kriter</th>
            {offers.map(offer => (
              <th key={offer.id} className="p-2 text-center font-semibold text-slate-900">
                {offer.carrier?.displayName || offer.carrier?.companyName || 'Nakliyeci'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(([label, render]) => (
            <tr key={label as string}>
              <td className="p-2 text-slate-500">{label as string}</td>
              {offers.map(offer => (
                <td key={offer.id} className={cn('p-2 text-center', offer.isRecommended && 'bg-blue-50 font-semibold')}>
                  {(render as (o: CustomerOffer) => string)(offer)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td />
            {offers.map(offer => (
              <td key={offer.id} className="p-2">
                {offer.status === 'pending' && (
                  <Button className="w-full" size="sm" disabled={isOfferAcceptDisabled(offer)} onClick={() => onChoose(offer)}>
                    Sec
                  </Button>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
