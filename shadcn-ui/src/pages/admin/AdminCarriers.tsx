import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader, StatusBadge, EmptyState, ErrorState } from '@/components/admin/shared';
import { CARRIER_STATUS, resolveCarrierStatus } from '@/lib/admin-constants';
import { Search, MoreHorizontal, Eye, CheckCircle, XCircle, ChevronLeft, ChevronRight, Download, Star, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

type CarrierStatus = 'all' | 'pending' | 'verified' | 'rejected';

interface Carrier {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  isActive: boolean;
  verifiedByAdmin: boolean;
  hasUploadedDocuments: boolean;
  rating: number;
  completedShipments: number;
  cancelledShipments: number;
  createdAt: string;
  city?: string;
}

const statusTabs: { value: CarrierStatus; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Bekleyen' },
  { value: 'verified', label: 'Onaylı' },
  { value: 'rejected', label: 'Reddedilen' },
];

export default function AdminCarriers() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<CarrierStatus>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const limit = 20;

  // Date filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchCarriers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
      });
      const res = await adminApiClient(`/admin/carriers?${params}`);
      const data = await res.json();
      if (data.success) {
        setCarriers(data.data?.carriers ?? []);
        setTotal(data.data?.pagination?.total ?? 0);
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
  }, [status, page, search]);

  useEffect(() => { setPage(1); }, [status, search]);
  useEffect(() => { fetchCarriers(); }, [fetchCarriers]);

  const totalPages = Math.ceil(total / limit);

  // Client-side date filter applied on top of server-side paged results
  const filteredCarriers = carriers.filter((c) => {
    if (dateFrom) {
      if (new Date(c.createdAt) < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(c.createdAt) > toDate) return false;
    }
    return true;
  });

  const exportToCSV = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '10000', status });
      const res = await adminApiClient(`/admin/carriers?${params}`);
      const data = await res.json();
      const allCarriers: Carrier[] = data.data?.carriers ?? [];
      const headers = ['ID', 'Firma Adı', 'E-posta', 'Telefon', 'Şehir', 'Durum', 'Tamamlanan Sefer', 'Puan', 'Kayıt Tarihi'];
      const rows = allCarriers.map((c) => [
        c.id,
        `"${c.companyName || ''}"`,
        c.email || '',
        c.phone || '',
        c.city || '',
        c.verifiedByAdmin ? 'Onaylı' : 'Beklemede',
        c.completedShipments || 0,
        c.rating ? Number(c.rating).toFixed(1) : '',
        c.createdAt ? new Date(c.createdAt).toLocaleDateString('tr-TR') : '',
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nakliyeciler_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[AdminCarriers] CSV export:', error);
      toast.error('CSV indirme başarısız.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((id) =>
          adminApiClient(`/admin/carriers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verifiedByAdmin: true }),
          })
        )
      );
      toast.success(`${selectedIds.length} nakliyeci onaylandı.`);
      setSelectedIds([]);
      fetchCarriers();
    } catch {
      toast.error('Bazı onaylar başarısız oldu.');
    }
  };
  const cancelRate = (c: Carrier) => {
    const t = (c.completedShipments ?? 0) + (c.cancelledShipments ?? 0);
    return t > 0 ? Math.round(((c.cancelledShipments ?? 0) / t) * 100) : 0;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Nakliyeciler"
        description={`Toplam ${total} nakliyeci`}
      />

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Tabs value={status} onValueChange={(v) => setStatus(v as CarrierStatus)}>
            <TabsList className="bg-slate-100">
              {statusTabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="text-xs">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Şirket adı, e-posta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          {/* Date filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 border border-slate-200 rounded-lg px-3 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            />
            <span className="text-slate-400 text-xs">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 border border-slate-200 rounded-lg px-3 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            />
          </div>
          {/* CSV export */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={exportLoading}
            className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 h-9"
          >
            {exportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} CSV İndir
          </Button>
        </div>

        {/* Bulk approve bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <span className="text-blue-700 font-medium">{selectedIds.length} nakliyeci seçildi</span>
            <Button size="sm" onClick={handleBulkApprove} className="h-7 bg-blue-600 hover:bg-blue-700 text-white text-xs">
              Tümünü Onayla
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds([])} className="h-7 text-xs">
              Seçimi Temizle
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {error ? (
        <ErrorState onRetry={fetchCarriers} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="w-10 px-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-blue-600"
                    checked={selectedIds.length === filteredCarriers.length && filteredCarriers.length > 0}
                    onChange={(e) => setSelectedIds(e.target.checked ? filteredCarriers.map((c) => c.id) : [])}
                  />
                </TableHead>
                <TableHead className="font-semibold text-slate-600">Şirket Adı</TableHead>
                <TableHead className="font-semibold text-slate-600">Şehir</TableHead>
                <TableHead className="font-semibold text-slate-600">Durum</TableHead>
                <TableHead className="font-semibold text-slate-600">Puan</TableHead>
                <TableHead className="font-semibold text-slate-600">İş</TableHead>
                <TableHead className="font-semibold text-slate-600">Kayıt</TableHead>
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
              ) : carriers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState title="Nakliyeci bulunamadı" description="Filtre kriterlerinize uygun kayıt yok." className="py-10" />
                  </TableCell>
                </TableRow>
              ) : (
                filteredCarriers.map((carrier) => {
                  const st = resolveCarrierStatus(carrier);
                  const cr = cancelRate(carrier);
                  return (
                    <TableRow
                      key={carrier.id}
                      className="cursor-pointer hover:bg-slate-50/60 transition-colors"
                      onClick={() => navigate(`/admin/nakliyeciler/${carrier.id}`)}
                    >
                      <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-blue-600"
                          checked={selectedIds.includes(carrier.id)}
                          onChange={(e) => setSelectedIds(prev =>
                            e.target.checked ? [...prev, carrier.id] : prev.filter((id) => id !== carrier.id)
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{carrier.companyName}</p>
                          <p className="text-xs text-slate-400">{carrier.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{carrier.city || '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={st} statusMap={CARRIER_STATUS} />
                      </TableCell>
                      <TableCell>
                        {(carrier.rating ?? 0) > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                            <span className="text-sm text-slate-700">{Number(carrier.rating).toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-700">
                          {carrier.completedShipments ?? 0}
                          {cr > 15 && <span className="ml-1 text-xs text-rose-500">(%{cr} iptal)</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(carrier.createdAt), { addSuffix: true, locale: tr })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/admin/nakliyeciler/${carrier.id}`); }}>
                              <Eye className="mr-2 h-3.5 w-3.5" /> Detay
                            </DropdownMenuItem>
                            {!carrier.verifiedByAdmin && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/admin/nakliyeciler/${carrier.id}`); }}>
                                <CheckCircle className="mr-2 h-3.5 w-3.5" /> Onayla
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
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
