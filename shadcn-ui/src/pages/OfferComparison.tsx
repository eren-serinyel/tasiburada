import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Star, PackageOpen, ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { toast } from '@/components/ui/sonner';

interface OfferCarrier {
  id: string;
  companyName?: string | null;
  contactName?: string | null;
  rating?: number;
  completedShipments?: number;
  pictureUrl?: string | null;
  vehicleType?: string | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  activityCity?: string | null;
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

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

export default function OfferComparison() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<BackendOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [confirmOffer, setConfirmOffer] = useState<BackendOffer | null>(null);

  const fetchOffers = async () => {
    try {
      const res = await apiClient('/api/v1/customers/offers');
      const json = await res.json();
      if (res.ok && json?.success && Array.isArray(json.data)) {
        const filtered = (json.data as BackendOffer[])
          .filter(o => !shipmentId || o.shipmentId === shipmentId)
          .sort((a, b) => Number(a.price) - Number(b.price));
        setOffers(filtered);
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

  const decide = async (offerId: string, accept: boolean) => {
    setDecidingId(offerId);
    try {
      const action = accept ? 'accept' : 'reject';
      const res = await apiClient(`/api/v1/offers/${offerId}/${action}`, { method: 'PUT' });
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

  const shipment = offers.length > 0 ? offers[0].shipment : null;
  const stCfg = shipmentStatusConfig[shipment?.status || ''] || { label: '', bg: 'bg-gray-100', text: 'text-gray-600' };
  const lowestPrice = offers.length > 0 ? Number(offers[0].price) : null;

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
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Geri
        </button>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teklif Karşılaştırma</h1>
            <p className="text-[15px] text-gray-500 mt-1">
              {shipment
                ? `${shipment.origin || '?'} → ${shipment.destination || '?'} taşıması için gelen teklifler`
                : 'Teklifleri karşılaştırın ve en uygununu seçin.'
              }
            </p>
          </div>
          {shipment && (
            <div className="flex items-center gap-2">
              {shipment.shipmentDate && (
                <span className="inline-flex items-center bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded">
                  📅 {fmtDate(shipment.shipmentDate)}
                </span>
              )}
              <span className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold ${stCfg.bg} ${stCfg.text}`}>
                {stCfg.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Empty ── */}
      {offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageOpen className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-[15px] text-gray-500 mb-1">Bu ilan için teklif bulunamadı.</p>
          <p className="text-sm text-gray-400">
            <Link to="/tekliflerim" className="text-blue-600 hover:text-blue-700 font-medium">
              Tüm tekliflere dön
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {offers.map((offer) => {
            const isCheapest = lowestPrice !== null && Number(offer.price) === lowestPrice && offer.status === 'pending';
            const carrierName = offer.carrier?.companyName || offer.carrier?.contactName || 'Nakliyeci';

            return (
              <div
                key={offer.id}
                className="relative bg-white border border-gray-200 rounded-xl p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                {/* Cheapest ribbon */}
                {isCheapest && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold tracking-[0.08em] px-2.5 py-1 rounded-bl-lg rounded-tr-xl">
                    EN UYGUN
                  </div>
                )}

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

                {/* Time */}
                <div className="text-xs text-gray-400 mb-3">
                  {timeAgo(offer.offeredAt)}
                </div>

                {/* Carrier details */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500 mb-4 border-t border-gray-100 pt-3">
                  <div>
                    <span className="text-gray-400">Araç:&nbsp;</span>
                    {offer.carrier?.vehicleBrand || offer.carrier?.vehicleModel
                      ? `${offer.carrier?.vehicleBrand || ''} ${offer.carrier?.vehicleModel || ''}`.trim()
                      : offer.carrier?.vehicleType || 'Belirtilmemiş'}
                  </div>
                  <div>
                    <span className="text-gray-400">Şehir:&nbsp;</span>
                    {offer.carrier?.activityCity || 'Belirtilmemiş'}
                  </div>
                  <div>
                    <span className="text-gray-400">Tamamlanan:&nbsp;</span>
                    {(offer.carrier?.completedShipments ?? 0)} sefer
                  </div>
                  <div>
                    <span className="text-gray-400">Puan:&nbsp;</span>
                    {offer.carrier?.rating && Number(offer.carrier.rating) > 0
                      ? `${Number(offer.carrier.rating).toFixed(1)} ⭐`
                      : 'Henüz puan yok'}
                  </div>
                </div>

                {/* Actions */}
                {offer.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                      disabled={decidingId === offer.id}
                      onClick={() => setConfirmOffer(offer)}
                    >
                      Kabul Et
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50 text-sm"
                      disabled={decidingId === offer.id}
                      onClick={() => decide(offer.id, false)}
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
      )}

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
