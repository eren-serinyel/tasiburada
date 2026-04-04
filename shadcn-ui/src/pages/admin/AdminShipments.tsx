import { useEffect, useState, useCallback, useRef } from 'react';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader, StatusBadge, EmptyState, ErrorState } from '@/components/admin/shared';
import { SHIPMENT_STATUS } from '@/lib/admin-constants';
import { Search, ChevronLeft, ChevronRight, Package, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { formatLocation } from '@/utils/formatLocation';

type ShipmentStatus = 'all' | 'pending' | 'active' | 'in_transit' | 'completed' | 'cancelled';

const statusTabs: { value: ShipmentStatus; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Bekleyen' },
  { value: 'active', label: 'Aktif' },
  { value: 'in_transit', label: 'Yolda' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'cancelled', label: 'İptal' },
];

interface Shipment {
  id: string;
  loadDetails: string;
  status: string;
  origin: string;
  destination: string;
  createdAt: string;
  price?: number;
  customer?: { firstName: string; lastName: string };
}

export default function AdminShipments() {
  const [status, setStatus] = useState<ShipmentStatus>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const limit = 20;

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value), 400);
  };

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status,
        ...(search ? { search } : {}),
      });
      const res = await adminApiClient(`/admin/shipments?${params}`);
      const data = await res.json();
      if (data.success) {
        setShipments(data.data?.data ?? data.data?.shipments ?? []);
        setTotal(data.data?.total ?? data.data?.pagination?.total ?? 0);
      } else {
        toast.error(data.message);
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
  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader title="İlanlar" description={`Toplam ${total} ilan`} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={status} onValueChange={(v) => setStatus(v as ShipmentStatus)}>
          <TabsList className="bg-slate-100">
            {statusTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input placeholder="Güzergah veya müşteri ara..." value={searchInput} onChange={(e) => handleSearchInput(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
      </div>

      {/* Table */}
      {error ? (
        <ErrorState onRetry={fetchShipments} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-600">Başlık</TableHead>
                <TableHead className="font-semibold text-slate-600">Müşteri</TableHead>
                <TableHead className="font-semibold text-slate-600">Güzergah</TableHead>
                <TableHead className="font-semibold text-slate-600">Durum</TableHead>
                <TableHead className="font-semibold text-slate-600">Tarih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 bg-slate-200 rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : shipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState icon={Package} title="İlan bulunamadı" description="Filtre kriterlerinize uygun kayıt yok." className="py-10" />
                  </TableCell>
                </TableRow>
              ) : (
                shipments.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800">{s.loadDetails}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <span>{formatLocation(s.origin)}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span>{formatLocation(s.destination)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} statusMap={SHIPMENT_STATUS} size="sm" />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true, locale: tr })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
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
