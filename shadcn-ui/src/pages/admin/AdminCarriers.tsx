import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CheckCircle, ChevronLeft, ChevronRight, Download, Eye, MoreHorizontal, Search, Star } from 'lucide-react';
import { adminApiClient } from '@/lib/adminAuth';
import { resolveApprovalState, type CarrierApprovalState } from '@/lib/admin-approval';
import { APPROVAL_STATUS } from '@/lib/admin-constants';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, ErrorState, PageHeader, StatusBadge } from '@/components/admin/shared';

type CarrierStatusFilter = 'all' | 'pending' | 'verified' | 'rejected';

interface CarrierListItem {
  id: string;
  companyName: string;
  email: string;
  phone?: string;
  city?: string;
  rating?: number;
  completedShipments?: number;
  cancelledShipments?: number;
  createdAt: string;
  approvalState?: CarrierApprovalState;
  verifiedByAdmin?: boolean;
  pendingApproval?: boolean;
  isActive?: boolean;
}

const statusTabs: Array<{ value: CarrierStatusFilter; label: string }> = [
  { value: 'all', label: 'Tumu' },
  { value: 'pending', label: 'Bekleyen' },
  { value: 'verified', label: 'Onayli' },
  { value: 'rejected', label: 'Reddedilen' },
];

export default function AdminCarriers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = (searchParams.get('tab') === 'bekleyen' ? 'pending' : 'all') as CarrierStatusFilter;
  const [status, setStatus] = useState<CarrierStatusFilter>(initialStatus);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [carriers, setCarriers] = useState<CarrierListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const limit = 20;

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
      const res = await adminApiClient(`/admin/carriers?${params.toString()}`);
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || 'Nakliyeci listesi yuklenemedi.');
        setError(true);
        return;
      }
      setCarriers(data.data?.carriers ?? []);
      setTotal(data.data?.pagination?.total ?? 0);
    } catch {
      toast.error('Nakliyeci listesi yuklenemedi.');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [status, page, search]);

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  useEffect(() => {
    fetchCarriers();
  }, [fetchCarriers]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '10000', status });
      const res = await adminApiClient(`/admin/carriers?${params.toString()}`);
      const data = await res.json();
      const allCarriers: CarrierListItem[] = data.data?.carriers ?? [];
      const headers = ['ID', 'Firma Adi', 'E-posta', 'Sehir', 'Approval State', 'Kayit Tarihi'];
      const rows = allCarriers.map((carrier) => [
        carrier.id,
        `"${carrier.companyName || ''}"`,
        carrier.email || '',
        carrier.city || '',
        resolveApprovalState(carrier),
        carrier.createdAt ? new Date(carrier.createdAt).toLocaleDateString('tr-TR') : '',
      ]);
      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `carrier-approval-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('CSV export basarisiz.');
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader title="Nakliyeciler" description={`Toplam ${total} kayit`} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs value={status} onValueChange={(value) => setStatus(value as CarrierStatusFilter)}>
            <TabsList className="bg-slate-100">
              {statusTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Sirket adi, e-posta..."
              className="h-9 pl-9 text-sm"
            />
          </div>

          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportToCSV}>
            <Download className="h-3.5 w-3.5" />
            CSV indir
          </Button>

          {status === 'pending' && (
            <Button size="sm" className="h-9 bg-sky-600 hover:bg-sky-700 text-white" onClick={() => navigate('/admin/onay-kuyrugu')}>
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              Approval kuyrugunu ac
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState onRetry={fetchCarriers} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-600">Sirket</TableHead>
                <TableHead className="font-semibold text-slate-600">Sehir</TableHead>
                <TableHead className="font-semibold text-slate-600">Approval</TableHead>
                <TableHead className="font-semibold text-slate-600">Puan</TableHead>
                <TableHead className="font-semibold text-slate-600">Tamamlanan is</TableHead>
                <TableHead className="font-semibold text-slate-600">Kayit</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 7 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : carriers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      className="py-10"
                      title="Nakliyeci bulunamadi"
                      description="Filtre kriterlerine uygun kayit yok."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                carriers.map((carrier) => {
                  const approvalState = resolveApprovalState(carrier);
                  return (
                    <TableRow
                      key={carrier.id}
                      className="cursor-pointer hover:bg-slate-50/60 transition-colors"
                      onClick={() => navigate(`/admin/nakliyeciler/${carrier.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{carrier.companyName}</p>
                          <p className="text-xs text-slate-400">{carrier.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{carrier.city || '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={approvalState} statusMap={APPROVAL_STATUS} />
                      </TableCell>
                      <TableCell>
                        {(carrier.rating ?? 0) > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-sm text-slate-700">{Number(carrier.rating).toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">{carrier.completedShipments ?? 0}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(carrier.createdAt), { addSuffix: true, locale: tr })}
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => navigate(`/admin/nakliyeciler/${carrier.id}`)}>
                              <Eye className="mr-2 h-3.5 w-3.5" />
                              Detay
                            </DropdownMenuItem>
                            {(approvalState === 'SUBMITTED' || approvalState === 'IN_REVIEW') && (
                              <DropdownMenuItem onClick={() => navigate('/admin/onay-kuyrugu')}>
                                <CheckCircle className="mr-2 h-3.5 w-3.5" />
                                Approval kuyrugu
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                {total} kayittan {(page - 1) * limit + 1} - {Math.min(page * limit, total)} gosteriliyor
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 text-xs text-slate-600">
                  {page} / {totalPages}
                </span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
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
