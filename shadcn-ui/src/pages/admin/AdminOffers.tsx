import { useEffect, useState, useCallback } from 'react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PageHeader, EmptyState, ErrorState } from '@/components/admin/shared';
import { Search, ChevronLeft, ChevronRight, HandCoins, ArrowRight, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

type OfferStatusFilter = 'all' | 'pending' | 'accepted' | 'rejected' | 'withdrawn';

const statusTabs: { value: OfferStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Bekleyen' },
  { value: 'accepted', label: 'Kabul' },
  { value: 'rejected', label: 'Reddedilen' },
  { value: 'withdrawn', label: 'Geri Çekilen' },
];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  withdrawn: 'bg-slate-100 text-slate-600',
};

const statusLabels: Record<string, string> = {
  pending: 'Bekliyor',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
  withdrawn: 'Geri Çekildi',
};

interface Offer {
  id: string;
  price: number;
  status: string;
  offeredAt: string;
  message?: string;
  carrier?: { companyName: string };
  shipment?: {
    id: string;
    origin: string;
    destination: string;
    customer?: { firstName: string; lastName: string };
  };
}

export default function AdminOffers() {
  const [status, setStatus] = useState<OfferStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
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

  const handleCancel = async (offerId: string) => {
    setCancellingId(offerId);
    try {
      const res = await adminApiClient(`/admin/offers/${offerId}/cancel`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        toast.success('Teklif iptal edildi.');
        fetchOffers();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('İptal işlemi başarısız.');
    } finally {
      setCancellingId(null);
    }
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
          <Input placeholder="Nakliyeci veya güzergah..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
      </div>

      {error ? (
        <ErrorState onRetry={fetchOffers} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-600">Güzergah</TableHead>
                <TableHead className="font-semibold text-slate-600">Nakliyeci</TableHead>
                <TableHead className="font-semibold text-slate-600">Müşteri</TableHead>
                <TableHead className="font-semibold text-slate-600">Fiyat</TableHead>
                <TableHead className="font-semibold text-slate-600">Durum</TableHead>
                <TableHead className="font-semibold text-slate-600">Tarih</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 bg-slate-200 rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : offers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState icon={HandCoins} title="Teklif bulunamadı" description="Filtre kriterlerinize uygun teklif yok." className="py-10" />
                  </TableCell>
                </TableRow>
              ) : (
                offers.map((o) => (
                  <TableRow key={o.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <span>{o.shipment?.origin ?? '—'}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span>{o.shipment?.destination ?? '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">{o.carrier?.companyName ?? '—'}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {o.shipment?.customer ? `${o.shipment.customer.firstName} ${o.shipment.customer.lastName}` : '—'}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-emerald-700">{Number(o.price).toLocaleString('tr-TR')}₺</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${statusColors[o.status] || 'bg-slate-100'}`}>
                        {statusLabels[o.status] || o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(o.offeredAt), { addSuffix: true, locale: tr })}
                    </TableCell>
                    <TableCell>
                      {o.status === 'pending' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:text-rose-600 hover:bg-rose-50" disabled={cancellingId === o.id}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Teklifi İptal Et</AlertDialogTitle>
                              <AlertDialogDescription>Bu teklifi iptal etmek istediğinizden emin misiniz?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancel(o.id)} className="bg-rose-600 hover:bg-rose-700">İptal Et</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                {total} kayıttan {(page - 1) * limit + 1} - {Math.min(page * limit, total)} gösteriliyor
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 text-xs text-slate-600">{page} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
