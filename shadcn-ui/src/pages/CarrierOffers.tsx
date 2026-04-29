import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Package,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/apiClient';
import { toast } from '@/components/ui/sonner';
import { formatLocation } from '@/utils/formatLocation';

const API_BASE_URL = '/api/v1';

type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'cancelled' | string;
type ShipmentStatus = 'pending' | 'offer_received' | 'matched' | 'in_transit' | 'completed' | 'cancelled' | string;

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
}

const offerStatusConfig: Record<string, { label: string; className: string; description: string }> = {
  pending: {
    label: 'Beklemede',
    className: 'bg-amber-100 text-amber-800',
    description: 'Müşteri kararını bekliyor. Bu teklifi güncelleyebilir veya geri çekebilirsiniz.',
  },
  accepted: {
    label: 'Kabul Edildi',
    className: 'bg-green-100 text-green-800',
    description: 'Müşteri teklifinizi kabul etti. İş detaylarını açıp süreci takip edin.',
  },
  rejected: {
    label: 'Reddedildi',
    className: 'bg-red-100 text-red-800',
    description: 'Müşteri başka bir teklifi tercih etti veya bu teklifi reddetti.',
  },
  withdrawn: {
    label: 'Geri Çekildi',
    className: 'bg-slate-100 text-slate-700',
    description: 'Bu teklif sizin tarafınızdan geri çekildi.',
  },
  cancelled: {
    label: 'İptal Edildi',
    className: 'bg-slate-100 text-slate-700',
    description: 'Bu teklif artık aktif değil.',
  },
};

const shipmentStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Beklemede', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  offer_received: { label: 'Beklemede', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  matched: { label: 'İş Eşleşti', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_transit: { label: 'Taşıma Sürecinde', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  completed: { label: 'Tamamlandı', className: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { label: 'İptal Edildi', className: 'bg-slate-100 text-slate-700 border-slate-200' },
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

const getOfferStatus = (status: OfferStatus) =>
  offerStatusConfig[status] || { label: String(status), className: 'bg-slate-100 text-slate-700', description: 'Bu teklif artık aktif işlem beklemiyor.' };

const getShipmentStatus = (status?: ShipmentStatus) =>
  shipmentStatusConfig[status || ''] || { label: status || '-', className: 'bg-slate-100 text-slate-700 border-slate-200' };

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
        toast.error(json?.message || 'İptal başarısız.');
      }
    } catch {
      toast.error('Teklif iptal edilirken hata oluştu.');
    } finally {
      setConfirm(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Card><CardContent className="py-10 text-center text-gray-600">Yükleniyor...</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Teklif Yönetimi</h1>
        <p className="text-gray-600">Verdiğiniz teklifleri durumlarına göre takip edin.</p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-600">
            <p className="font-medium text-gray-900">Teklifler yüklenemedi</p>
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
        <div className="space-y-6">
          <OfferSection
            title="Bekleyen Teklifler"
            description="Müşteri yanıtı bekleyen aktif teklifleriniz."
            emptyTitle="Bekleyen teklif yok"
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
            description="İşi açarak taşıma sürecini takip edebilirsiniz."
            emptyTitle="Kabul edilmiş iş yok"
            emptyDescription="Kabul edilen teklifler burada iş olarak görünür."
            offers={grouped.accepted}
            navigate={navigate}
            onEdit={() => undefined}
            onWithdraw={() => undefined}
          />

          <OfferSection
            title="Kapanan Teklifler"
            description="Reddedilen, geri çekilen veya iptal edilen teklifler."
            emptyTitle="Kapanan teklif yok"
            emptyDescription="Reddedilmiş veya geri çekilmiş teklifiniz bulunmuyor."
            offers={grouped.closed}
            navigate={navigate}
            onEdit={() => undefined}
            onWithdraw={() => undefined}
          />
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklif Güncelle</DialogTitle>
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
              <Button variant="outline" onClick={() => setEdit(null)}><XCircle className="mr-1 h-4 w-4" /> Vazgeç</Button>
              <Button onClick={handleUpdate}><CheckCircle2 className="mr-1 h-4 w-4" /> Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklifi Geri Çek</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Bu teklifi geri çekmek istediğinize emin misiniz?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)}><XCircle className="mr-1 h-4 w-4" /> Vazgeç</Button>
              <Button onClick={handleCancel}><Trash2 className="mr-1 h-4 w-4" /> Geri Çek</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OfferSection({
  title,
  description,
  emptyTitle,
  emptyDescription,
  offers,
  navigate,
  onEdit,
  onWithdraw,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  offers: BackendOffer[];
  navigate: ReturnType<typeof useNavigate>;
  onEdit: (offer: BackendOffer) => void;
  onWithdraw: (offer: BackendOffer) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      {offers.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} compact />
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
  const offerStatus = getOfferStatus(offer.status);
  const shipmentStatus = getShipmentStatus(shipment?.status);
  const extraServices = normalizeExtraServices(shipment?.extraServices);
  const messagePreview = truncate(offer.message);
  const route = shipment
    ? `${formatLocationLine(shipment.originCity, shipment.originDistrict, shipment.origin)} → ${formatLocationLine(shipment.destinationCity, shipment.destinationDistrict, shipment.destination)}`
    : offer.shipmentId;

  return (
    <Card className="hover:shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span>{route}</span>
            </CardTitle>
            <CardDescription>Teklif tarihi: {new Date(offer.offeredAt).toLocaleString('tr-TR')}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={offerStatus.className}>Teklif: {offerStatus.label}</Badge>
            <Badge variant="outline" className={shipmentStatus.className}>İlan: {shipmentStatus.label}</Badge>
            <div className="text-xl font-bold text-green-700">₺{formatPrice(offer.price)}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <InfoItem icon={<CalendarDays className="h-4 w-4" />} label="Talep tarihi" value={formatDate(shipment?.shipmentDate)} />
          <InfoItem icon={<Package className="h-4 w-4" />} label="Yük türü" value={formatLoadType(shipment)} />
          <InfoItem icon={<Clock className="h-4 w-4" />} label="Tahmini süre" value={offer.estimatedDuration ? `${offer.estimatedDuration} saat` : '-'} />
          <InfoItem icon={<AlertCircle className="h-4 w-4" />} label="Ek hizmet" value={extraServices.length ? `${extraServices.length} hizmet` : '-'} />
        </div>

        {extraServices.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {extraServices.map((service) => <Badge key={service} variant="secondary">{service}</Badge>)}
          </div>
        )}

        {messagePreview && (
          <div className="flex gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>{messagePreview}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">{getStatusExplanation(offer, shipment)}</p>
          <div className="flex shrink-0 gap-2">
            {offer.status === 'pending' && (
              <>
                <Button size="sm" variant="outline" onClick={() => onEdit(offer)}>
                  <Pencil className="mr-1 h-4 w-4" /> Güncelle
                </Button>
                <Button size="sm" variant="outline" onClick={() => onWithdraw(offer)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Geri Çek
                </Button>
              </>
            )}
            {offer.status === 'accepted' && shipment && (
              <Button size="sm" onClick={() => navigate(`/ilan/${shipment.id}`)}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> İşi Aç
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusExplanation(offer: BackendOffer, shipment?: BackendShipment | null) {
  if (shipment?.status === 'cancelled') {
    return 'İlan iptal edildiği için bu teklif üzerinden işlem yapılamaz.';
  }
  if (offer.status === 'rejected') {
    return offerStatusConfig.rejected.description;
  }
  if (offer.status === 'withdrawn') {
    return offerStatusConfig.withdrawn.description;
  }
  if (offer.status === 'accepted' && shipment?.status === 'in_transit') {
    return 'Teklif kabul edildi; taşıma süreci devam ediyor.';
  }
  if (offer.status === 'accepted' && shipment?.status === 'completed') {
    return 'Bu iş tamamlandı.';
  }
  return getOfferStatus(offer.status).description;
}

function InfoItem({ icon, label, value }: { icon?: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border bg-white px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function EmptyState({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <Card>
      <CardContent className={compact ? 'py-6 text-center text-slate-600' : 'py-10 text-center text-slate-600'}>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="mt-1 text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}
