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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader, EmptyState, ErrorState } from '@/components/admin/shared';
import { Search, ChevronLeft, ChevronRight, HandCoins, ArrowRight, MoreHorizontal, Eye, User, Trash2 } from 'lucide-react';

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
  carrierId?: string;
  carrier?: { id?: string; companyName: string };
  shipment?: {
    id: string;
    origin: string;
    destination: string;
    customer?: { firstName: string; lastName: string };
  };
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
                    </TableCell>
                    <TableCell>
                      {o.shipment ? (
                        <button
                          onClick={() => navigate(`/admin/ilanlar/${o.shipment!.id}`)}
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <span>{o.shipment.origin}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span>{o.shipment.destination}</span>
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
