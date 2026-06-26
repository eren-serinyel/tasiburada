import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/apiClient';
import { toast } from '@/components/ui/sonner';
import { formatLocation } from '@/utils/formatLocation';
import {
  CorporateCard,
  DetailList,
  EmptyValue,
  PageContainer,
  QuoteBlock,
  RoutePair,
  SectionTitle,
  ToneBadge,
  offerStatusTone,
  shipmentStatusTone,
} from '@/components/shared/CorporateUI';

const API_BASE_URL = '/api/v1';

type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'cancelled' | 'expired' | string;
type ShipmentStatus = 'pending' | 'offer_received' | 'matched' | 'in_transit' | 'completed' | 'cancelled' | 'expired' | string;

interface BackendShipment {
  id: string;
  origin?: string | null;
  destination?: string | null;
  originCity?: string | null;
  originDistrict?: string | null;
  destinationCity?: string | null;
  destinationDistrict?: string | null;
  loadDetails?: string | null;
  shipmentCategory?: 'HOME_MOVE' | 'OFFICE_MOVE' | 'PARTIAL_ITEM' | 'STORAGE' | string | null;
  transportType?: string | null;
  status?: ShipmentStatus;
  shipmentDate?: string | null;
  extraServices?: Array<string | { name?: string; label?: string }>;
}

interface BackendOffer {
  id: string;
  shipmentId: string;
  carrierId: string;
  shipment?: BackendShipment | null;
  price: number | string;
  message?: string | null;
  estimatedDuration?: number | null;
  status: OfferStatus;
  offeredAt: string;
  validUntil?: string | null;
}

const offerStatusLabel: Record<string, string> = {
  pending: 'Beklemede',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
  withdrawn: 'Geri Çekildi',
  cancelled: 'İptal Edildi',
  expired: 'Süresi Doldu',
};

const offerStatusDescription: Record<string, string> = {
  pending: 'Müşteri kararını bekliyor. Bu teklifi güncelleyebilir veya geri çekebilirsiniz.',
  accepted: 'Müşteri teklifinizi kabul etti. İş detaylarını açıp süreci takip edin.',
  rejected: 'Müşteri başka bir teklifi tercih etti veya bu teklifi reddetti.',
  withdrawn: 'Bu teklif sizin tarafınızdan geri çekildi.',
  cancelled: 'Bu teklif artık aktif değil.',
  expired: 'Bu teklifin geçerlilik süresi doldu.',
};

const shipmentStatusLabel: Record<string, string> = {
  pending: 'Beklemede',
  offer_received: 'Beklemede',
  matched: 'İş Eşleşti',
  in_transit: 'Taşınıyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
  expired: 'Süresi Doldu',
};

const shipmentCategoryLabel: Record<string, string> = {
  HOME_MOVE: 'Ev taşıma',
  OFFICE_MOVE: 'Ofis taşıma',
  PARTIAL_ITEM: 'Parça eşya',
  STORAGE: 'Depolama',
};

const formatPrice = (value: number | string) =>
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Number(value || 0));

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatLocationLine = (city?: string | null, district?: string | null, fallback?: string | null) => {
  const parts = [city, district].map((item) => item?.trim()).filter(Boolean);
  if (parts.length) return parts.join(' / ');
  return fallback ? formatLocation(fallback) : '-';
};

const formatLoadType = (shipment?: BackendShipment | null) => {
  const raw = shipment?.shipmentCategory || shipment?.transportType;
  if (!raw) return '-';
  return shipmentCategoryLabel[String(raw)] || String(raw);
};

const normalizeExtraServices = (services?: BackendShipment['extraServices']) => {
  if (!Array.isArray(services)) return [];
  return services
    .map((item) => (typeof item === 'string' ? item : item.name || item.label || ''))
    .filter(Boolean);
};

const truncate = (value?: string | null, max = 120) => {
  const clean = value?.trim();
  if (!clean) return null;
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

export default function CarrierOffers() {
  const [offers, setOffers] = useState<BackendOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ id: string; price: string; message: string; estimatedDuration: string } | null>(null);
  const [confirm, setConfirm] = useState<{ id: string } | null>(null);
  const navigate = useNavigate();

  const fetchOffers = async () => {
    try {
      setError(null);
      const res = await apiClient(`${API_BASE_URL}/carriers/me/offers`);
      const json = await res.json();
      if (res.ok && json?.success) {
        setOffers(json.data || []);
      } else {
        setOffers([]);
        setError(json?.message || 'Teklifler alınamadı.');
      }
    } catch {
      setOffers([]);
      setError('Teklifler yüklenirken bağlantı hatası oluştu.');
      toast.error('Teklifler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOffers(); }, []);

  const grouped = useMemo(() => {
    const pending = offers.filter((offer) => offer.status === 'pending');
    const accepted = offers.filter((offer) => offer.status === 'accepted');
    const closed = offers.filter((offer) => offer.status !== 'pending' && offer.status !== 'accepted');
    return { pending, accepted, closed };
  }, [offers]);

  const handleUpdate = async () => {
    if (!edit) return;
    try {
      const body: Record<string, unknown> = {};
      const price = parseFloat(edit.price);
      if (!Number.isNaN(price) && price > 0) body.price = price;
      if (edit.message !== undefined) body.message = edit.message;
      const duration = parseInt(edit.estimatedDuration, 10);
      if (!Number.isNaN(duration) && duration > 0) body.estimatedDuration = duration;

      const res = await apiClient(`${API_BASE_URL}/offers/${edit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Teklif güncellendi.');
        fetchOffers();
      } else {
        toast.error(json?.message || 'Güncelleme başarısız.');
      }
    } catch {
      toast.error('Teklif güncellenirken hata oluştu.');
    } finally {
      setEdit(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm) return;
    try {
      const res = await apiClient(`${API_BASE_URL}/offers/${confirm.id}/withdraw`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Teklif geri çekildi.');
        fetchOffers();
      } else {
        toast.error(json?.message || 'Geri çekme başarısız.');
      }
    } catch {
      toast.error('Teklif geri çekilirken hata oluştu.');
    } finally {
      setConfirm(null);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Card><CardContent className="py-10 text-center text-gray-600">Yükleniyor...</CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-8">
      <div>
        <p className="text-sm" style={{ color: 'var(--tb-ink-500)' }}>Verdiğiniz teklifleri durumlarına göre takip edin.</p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-600">
            <p className="font-medium" style={{ color: 'var(--tb-ink-900)' }}>Teklifler yüklenemedi</p>
            <p className="mt-1 text-sm">{error}</p>
            <Button className="mt-4" variant="outline" onClick={fetchOffers}>Tekrar Dene</Button>
          </CardContent>
        </Card>
      ) : offers.length === 0 ? (
        <EmptyState
          title="Henüz teklif vermediniz"
          description="Uygun ilanları inceleyip teklif verdiğinizde bu ekranda durumlarını takip edebilirsiniz."
        />
      ) : (
        <div className="space-y-8">
          <OfferSection
            title="Bekleyen Teklifler"
            count={grouped.pending.length}
            emptyDescription="Şu anda müşteri kararını bekleyen aktif teklifiniz bulunmuyor."
            offers={grouped.pending}
            navigate={navigate}
            onEdit={(offer) => setEdit({
              id: offer.id,
              price: String(offer.price),
              message: offer.message || '',
              estimatedDuration: offer.estimatedDuration ? String(offer.estimatedDuration) : '',
            })}
            onWithdraw={(offer) => setConfirm({ id: offer.id })}
          />

          <OfferSection
            title="Kabul Edilen İşler"
            count={grouped.accepted.length}
            emptyDescription="Kabul edilen teklifler burada iş olarak görünür."
            offers={grouped.accepted}
            navigate={navigate}
            onEdit={() => undefined}
            onWithdraw={() => undefined}
          />

          <OfferSection
            title="Kapanan Teklifler"
            count={grouped.closed.length}
            emptyDescription="Reddedilmiş veya geri çekilmiş teklifiniz bulunmuyor."
            offers={grouped.closed}
            navigate={navigate}
            onEdit={() => undefined}
            onWithdraw={() => undefined}
          />
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklif Güncelle</DialogTitle>
            <DialogDescription>
              Bekleyen teklifinizin fiyat, mesaj ve tahmini süre bilgisini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Yeni Fiyat (₺)</Label>
              <Input value={edit?.price || ''} onChange={(e) => setEdit((prev) => prev ? { ...prev, price: e.target.value } : prev)} type="number" />
            </div>
            <div>
              <Label>Mesaj</Label>
              <Input value={edit?.message || ''} onChange={(e) => setEdit((prev) => prev ? { ...prev, message: e.target.value } : prev)} />
            </div>
            <div>
              <Label>Tahmini Süre (saat)</Label>
              <Input value={edit?.estimatedDuration || ''} onChange={(e) => setEdit((prev) => prev ? { ...prev, estimatedDuration: e.target.value } : prev)} type="number" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEdit(null)}>Vazgeç</Button>
              <Button onClick={handleUpdate}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw confirmation dialog */}
      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklifi Geri Çek</DialogTitle>
            <DialogDescription>
              Bu işlem bekleyen teklifinizi müşterinin değerlendirmesinden kaldırır.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--tb-ink-500)' }}>Bu teklifi geri çekmek istediğinize emin misiniz?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)}>Vazgeç</Button>
              <Button
                className="border-[var(--tb-danger-border)] bg-[var(--tb-danger-bg)] text-[var(--tb-danger)] hover:bg-red-100"
                onClick={handleCancel}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Geri Çek
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function OfferSection({
  title,
  count,
  emptyDescription,
  offers,
  navigate,
  onEdit,
  onWithdraw,
}: {
  title: string;
  count: number;
  emptyDescription: string;
  offers: BackendOffer[];
  navigate: ReturnType<typeof useNavigate>;
  onEdit: (offer: BackendOffer) => void;
  onWithdraw: (offer: BackendOffer) => void;
}) {
  return (
    <section className="space-y-3">
      <SectionTitle count={count}>{title}</SectionTitle>
      {offers.length === 0 ? (
        <EmptyState title="" description={emptyDescription} compact />
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} navigate={navigate} onEdit={onEdit} onWithdraw={onWithdraw} />
          ))}
        </div>
      )}
    </section>
  );
}

function OfferCard({
  offer,
  navigate,
  onEdit,
  onWithdraw,
}: {
  offer: BackendOffer;
  navigate: ReturnType<typeof useNavigate>;
  onEdit: (offer: BackendOffer) => void;
  onWithdraw: (offer: BackendOffer) => void;
}) {
  const shipment = offer.shipment;
  const extraServices = normalizeExtraServices(shipment?.extraServices);
  const messagePreview = truncate(offer.message);
  const originText = shipment ? formatLocationLine(shipment.originCity, shipment.originDistrict, shipment.origin) : offer.shipmentId;
  const destinationText = shipment ? formatLocationLine(shipment.destinationCity, shipment.destinationDistrict, shipment.destination) : '';

  const statusExplanation = getStatusExplanation(offer, shipment);

  return (
    <CorporateCard>
      <div className="space-y-4">
        {/* Header: route + status badges + price */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <RoutePair
              compact
              originCity={shipment?.originCity}
              originDistrict={shipment?.originDistrict}
              destinationCity={shipment?.destinationCity}
              destinationDistrict={shipment?.destinationDistrict}
              originFallback={originText}
              destinationFallback={destinationText}
            />
            <p className="text-xs" style={{ color: 'var(--tb-ink-400)' }}>
              Teklif: {new Date(offer.offeredAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <ToneBadge tone={offerStatusTone[offer.status] || 'neutral'}>
                {offerStatusLabel[offer.status] || offer.status}
              </ToneBadge>
              {shipment?.status && (
                <ToneBadge tone={shipmentStatusTone[shipment.status] || 'neutral'}>
                  {shipmentStatusLabel[shipment.status] || shipment.status}
                </ToneBadge>
              )}
            </div>
            <div className="text-3xl font-bold" style={{ color: 'var(--tb-success)' }}>₺{formatPrice(offer.price)}</div>
          </div>
        </div>

        {/* Detail grid */}
        <DetailList
          rows={[
            { label: 'Talep tarihi', value: formatDate(shipment?.shipmentDate) },
            { label: 'Yük türü', value: formatLoadType(shipment) },
            { label: 'Tahmini süre', value: offer.estimatedDuration ? `${offer.estimatedDuration} saat` : '-' },
            { label: 'Geçerlilik', value: formatDate(offer.validUntil) },
            { label: 'Ekler', value: extraServices.length ? `${extraServices.length} hizmet` : '-' },
          ]}
        />

        {/* Extra service badges */}
        {extraServices.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {extraServices.map((service) => <ToneBadge key={service} tone="info">{service}</ToneBadge>)}
          </div>
        )}
        {extraServices.length === 0 && (
          <p className="text-sm"><EmptyValue>Ek hizmet yok</EmptyValue></p>
        )}

        {/* Message preview */}
        {messagePreview && <QuoteBlock>{messagePreview}</QuoteBlock>}

        {/* Footer: status explanation + action buttons */}
        <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--tb-border)' }}>
          <p className="text-sm" style={{ color: 'var(--tb-ink-500)' }}>{statusExplanation}</p>
          <div className="flex shrink-0 gap-2">
            {offer.status === 'pending' && (
              <>
                <Button size="sm" variant="outline" onClick={() => onEdit(offer)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Güncelle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[var(--tb-danger-border)] text-[var(--tb-danger)] hover:bg-[var(--tb-danger-bg)]"
                  onClick={() => onWithdraw(offer)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Geri Çek
                </Button>
              </>
            )}
            {offer.status === 'accepted' && shipment && (
              <Button size="sm" onClick={() => navigate(`/ilan/${shipment.id}`)}>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> İşi Aç
              </Button>
            )}
          </div>
        </div>
      </div>
    </CorporateCard>
  );
}

function getStatusExplanation(offer: BackendOffer, shipment?: BackendShipment | null) {
  if (shipment?.status === 'cancelled') {
    return 'İlan iptal edildiği için bu teklif üzerinden işlem yapılamaz.';
  }
  if (offer.status === 'accepted' && shipment?.status === 'in_transit') {
    return 'Teklif kabul edildi; taşıma süreci devam ediyor.';
  }
  if (offer.status === 'accepted' && shipment?.status === 'completed') {
    return 'Bu iş tamamlandı.';
  }
  return offerStatusDescription[offer.status] || 'Bu teklif artık aktif işlem beklemiyor.';
}

function EmptyState({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <Card>
      <CardContent className={compact ? 'py-6 text-center' : 'py-10 text-center'}>
        {title && <p className="font-medium" style={{ color: 'var(--tb-ink-900)' }}>{title}</p>}
        <p className="mt-1 text-sm" style={{ color: 'var(--tb-ink-500)' }}>{description}</p>
      </CardContent>
    </Card>
  );
}
