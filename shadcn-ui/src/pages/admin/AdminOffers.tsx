import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader, EmptyState, ErrorState } from '@/components/admin/shared';
import { Search, ChevronLeft, ChevronRight, HandCoins, ArrowRight, MoreHorizontal, Eye, User, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { formatLocation } from '@/utils/formatLocation';

type OfferStatusFilter = 'all' | 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';

const statusTabs: { value: OfferStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Bekleyen' },
  { value: 'accepted', label: 'Kabul' },
  { value: 'rejected', label: 'Reddedilen' },
  { value: 'withdrawn', label: 'Geri Çekilen' },
  { value: 'expired', label: 'Süresi Dolan' },
];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  withdrawn: 'bg-slate-100 text-slate-600',
  expired: 'bg-slate-100 text-slate-600',
};

const statusLabels: Record<string, string> = {
  pending: 'Bekliyor',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
  withdrawn: 'Geri Çekildi',
  expired: 'Süresi Doldu',
};

const formatMoney = (value?: number | string | null) =>
  `₺${Number(value ?? 0).toLocaleString('tr-TR')}`;

const formatDateTime = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleString('tr-TR') : '—';

const maskCustomerName = (customer?: { firstName?: string; lastName?: string }) => {
  if (!customer) return '—';
  const firstName = customer.firstName || 'Müşteri';
  const lastInitial = customer.lastName?.[0] ? `${customer.lastName[0]}***` : '';
  return `${firstName} ${lastInitial}`.trim();
};

const getExtraServiceName = (item: unknown): string => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && 'name' in item) {
    return String((item as { name?: string }).name || 'Ek hizmet');
  }
  return 'Ek hizmet';
};

interface Offer {
  id: string;
  price: number;
  status: string;
  offeredAt: string;
  validUntil?: string | null;
  message?: string;
  hasSuspiciousContent?: boolean;
  basePrice?: number | null;
  extraServicesTotal?: number | null;
  extraServicesBreakdown?: Array<{ name: string; price: number; source?: string }> | null;
  carrierId?: string;
  carrier?: { id?: string; companyName: string; rating?: number; completedShipments?: number };
  shipment?: {
    id: string;
    origin: string;
    destination: string;
    originCity?: string | null;
    originDistrict?: string | null;
    destinationCity?: string | null;
    destinationDistrict?: string | null;
    shipmentDate?: string;
    shipmentCategory?: string | null;
    extraServices?: Array<{ id?: string; name?: string }> | string[] | null;
    customer?: { firstName: string; lastName: string };
  };
}

interface ContactLog {
  id: number;
  createdAt: string;
  surface: string;
  action: string;
  severity: string;
  riskScore?: number;
  matchedRules?: string[];
  textHashPreview?: string;
}

interface OfferDetail {
  offer: Offer;
  contactLogs: ContactLog[];
}

export default function AdminOffers() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OfferStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<OfferDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const limit = 20;

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(limit), status,
        ...(search ? { search } : {}),
      });
      const res = await adminApiClient(`/admin/offers?${params}`);
      const data = await res.json();
      if (data.success) {
        setOffers(data.data?.offers ?? []);
        setTotal(data.data?.pagination?.total ?? 0);
      } else {
        setError(true);
      }
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { setPage(1); }, [status, search]);
  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  // Debounced search
  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value), 300);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeletingId(deleteTargetId);
    try {
      const res = await adminApiClient(`/admin/offers/${deleteTargetId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Teklif silindi.');
        fetchOffers();
      } else {
        toast.error(data.message || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  };

  const openDetail = async (offerId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await adminApiClient(`/admin/offers/${offerId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDetail(data.data as OfferDetail);
      } else {
        toast.error(data.message || 'Teklif detayı alınamadı.');
      }
    } catch {
      toast.error('Teklif detayı alınamadı.');
    } finally {
      setDetailLoading(false);
    }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID kopyalandı.');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader title="Teklifler" description={`Toplam ${total} teklif`} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={status} onValueChange={(v) => setStatus(v as OfferStatusFilter)}>
          <TabsList className="bg-slate-100">
            {statusTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input placeholder="Nakliyeci veya güzergah ara..." value={searchInput} onChange={(e) => handleSearchInput(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
      </div>

      {error ? (
        <ErrorState onRetry={fetchOffers} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-600 text-xs">Teklif ID</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">İlan Güzergahı</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Nakliyeci</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Müşteri</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Fiyat</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Durum</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Tarih</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs w-10">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 bg-slate-200 rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : offers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState icon={HandCoins} title="Teklif bulunamadı" description="Filtre kriterlerinize uygun teklif yok." className="py-10" />
                  </TableCell>
                </TableRow>
              ) : (
                offers.map((o) => (
                  <TableRow key={o.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      <button
                        onClick={() => copyId(o.id)}
                        className="font-mono text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                        title="Kopyalamak için tıkla"
                      >
                        {o.id.slice(0, 8)}
                      </button>
                      {o.hasSuspiciousContent && (
                        <div className="mt-1">
                          <span
                            className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600"
                            title="Bu teklif şüpheli içerik taşıyor"
                          >
                            <AlertTriangle className="h-3 w-3" /> Şüpheli
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {o.shipment ? (
                        <button
                          onClick={() => navigate(`/admin/ilanlar/${o.shipment!.id}`)}
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <span>{formatLocation(o.shipment.origin)}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span>{formatLocation(o.shipment.destination)}</span>
                        </button>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {o.carrier ? (
                        <button
                          onClick={() => navigate(`/admin/nakliyeciler/${o.carrierId ?? o.carrier!.id}`)}
                          className="text-sm text-slate-700 hover:text-blue-600 hover:underline"
                        >
                          {o.carrier.companyName}
                        </button>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {o.shipment?.customer ? `${o.shipment.customer.firstName} ${o.shipment.customer.lastName}` : '—'}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-emerald-700">₺{Number(o.price).toLocaleString('tr-TR')}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${statusColors[o.status] || 'bg-slate-100'}`}>
                        {statusLabels[o.status] || o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(o.offeredAt).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(o.id)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> Teklif Detayı
                          </DropdownMenuItem>
                          {o.shipment && (
                            <DropdownMenuItem onClick={() => navigate(`/admin/ilanlar/${o.shipment!.id}`)}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> İlanı Görüntüle
                            </DropdownMenuItem>
                          )}
                          {o.carrier && (
                            <DropdownMenuItem onClick={() => navigate(`/admin/nakliyeciler/${o.carrierId ?? o.carrier!.id}`)}>
                              <User className="h-3.5 w-3.5 mr-2" /> Nakliyeci Profilini Gör
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-rose-600 focus:text-rose-600"
                            disabled={deletingId === o.id}
                            onClick={() => { setDeleteTargetId(o.id); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Teklifi Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                {(page - 1) * limit + 1} - {Math.min(page * limit, total)} / {total} teklif
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Önceki
                </Button>
                <span className="px-2 text-xs text-slate-600">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Sonraki <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Teklif Detayı</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Detay yükleniyor...
            </div>
          ) : detail ? (
            <div className="space-y-5">
              {detail.offer.hasSuspiciousContent && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-red-700">
                    <AlertTriangle className="h-4 w-4" /> Şüpheli içerik tespit edildi
                  </div>
                  {detail.contactLogs.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-red-700">
                      {detail.contactLogs.map((log) => (
                        <li key={log.id}>
                          • {log.surface || 'teklif'} — {(log.matchedRules || []).join(', ') || 'iletişim paylaşımı'} · {formatDateTime(log.createdAt)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-red-700">Bayrak var ama bağlı log kaydı bulunamadı.</p>
                  )}
                </div>
              )}

              <section className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teklif</p>
                    <p className="mt-1 text-sm text-slate-500">ID: {detail.offer.id}</p>
                  </div>
                  <Badge variant="secondary" className={`text-xs ${statusColors[detail.offer.status] || 'bg-slate-100'}`}>
                    {statusLabels[detail.offer.status] || detail.offer.status}
                  </Badge>
                </div>

                {detail.offer.extraServicesBreakdown?.length ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Taşıma bedeli</span>
                      <span>{formatMoney(detail.offer.basePrice ?? detail.offer.price)}</span>
                    </div>
                    {detail.offer.extraServicesBreakdown.map((item, index) => (
                      <div key={`${item.name}-${index}`} className="flex justify-between text-slate-500">
                        <span>+ {item.name}{item.source === 'offered' ? ' (Nakliyeci önerisi)' : ''}</span>
                        <span>{formatMoney(item.price)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span>Toplam</span>
                      <span>{formatMoney(detail.offer.price)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm font-bold">
                    <span>Fiyat</span>
                    <span>{formatMoney(detail.offer.price)}</span>
                  </div>
                )}

                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <div>Teklif tarihi: {formatDateTime(detail.offer.offeredAt)}</div>
                  <div>Geçerlilik: {formatDateTime(detail.offer.validUntil)}</div>
                </div>

                {detail.offer.message && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teklif Mesajı</p>
                    <p className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                      {detail.offer.message}
                    </p>
                  </div>
                )}
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">İlan</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {formatLocation(detail.offer.shipment?.origin || '')} → {formatLocation(detail.offer.shipment?.destination || '')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Tarih: {formatDateTime(detail.offer.shipment?.shipmentDate)}</p>
                  <p className="mt-1 text-xs text-slate-500">Kategori: {detail.offer.shipment?.shipmentCategory || '—'}</p>
                  {!!detail.offer.shipment?.extraServices?.length && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {detail.offer.shipment.extraServices.map((item, index) => (
                        <Badge key={index} variant="outline" className="text-[11px]">
                          {getExtraServiceName(item)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Taraflar</p>
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-medium">Nakliyeci:</span> {detail.offer.carrier?.companyName || '—'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    <span className="font-medium">Müşteri:</span> {maskCustomerName(detail.offer.shipment?.customer)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detail.offer.shipment?.id && (
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/ilanlar/${detail.offer.shipment!.id}`)}>
                        İlanı Gör
                      </Button>
                    )}
                    {detail.offer.carrier && (
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/nakliyeciler/${detail.offer.carrierId ?? detail.offer.carrier!.id}`)}>
                        Nakliyeci
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-600"
                      onClick={() => {
                        setDeleteTargetId(detail.offer.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">Detay bulunamadı.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Teklifi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu teklifi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setDeleteTargetId(null); }}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
