import { useEffect, useState, useCallback } from 'react';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader, StatusBadge, EmptyState, ErrorState } from '@/components/admin/shared';
import { ACTIVE_STATUS } from '@/lib/admin-constants';
import { Search, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

type StatusFilter = 'all' | 'active' | 'inactive';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  shipmentsCount?: number;
}

export default function AdminCustomers() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const limit = 20;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      const res = await adminApiClient(`/admin/customers?${params}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data?.data ?? data.data?.customers ?? []);
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
  }, [page, search, statusFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleToggle = async (customerId: string) => {
    setTogglingId(customerId);
    try {
      const res = await adminApiClient(`/admin/customers/${customerId}/toggle-active`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setCustomers((prev) =>
          prev.map((c) => (c.id === customerId ? { ...c, isActive: data.data.isActive } : c)),
        );
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setTogglingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader title="Müşteriler" description={`Toplam ${total} müşteri`} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="all" className="text-xs">Tümü</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Aktif</TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs">Pasif</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input placeholder="Ad, soyad veya e-posta..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
      </div>

      {/* Table */}
      {error ? (
        <ErrorState onRetry={fetchCustomers} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-600">Ad Soyad</TableHead>
                <TableHead className="font-semibold text-slate-600">E-posta</TableHead>
                <TableHead className="font-semibold text-slate-600">Telefon</TableHead>
                <TableHead className="font-semibold text-slate-600">Durum</TableHead>
                <TableHead className="font-semibold text-slate-600">Kayıt</TableHead>
                <TableHead className="font-semibold text-slate-600 text-center">Aktif/Pasif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 bg-slate-200 rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState icon={Users} title="Müşteri bulunamadı" description="Filtre kriterlerinize uygun kayıt yok." className="py-10" />
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800">{customer.firstName} {customer.lastName}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{customer.email}</TableCell>
                    <TableCell className="text-sm text-slate-600">{customer.phone}</TableCell>
                    <TableCell>
                      <StatusBadge status={customer.isActive ? 'active' : 'inactive'} statusMap={ACTIVE_STATUS} size="sm" />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true, locale: tr })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={customer.isActive}
                        disabled={togglingId === customer.id}
                        onCheckedChange={() => handleToggle(customer.id)}
                      />
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
