import { useEffect, useState, useCallback } from 'react';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader, EmptyState, ErrorState } from '@/components/admin/shared';
import { AUDIT_ACTIONS } from '@/lib/admin-constants';
import { Search, ChevronLeft, ChevronRight, ScrollText, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface AuditEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  adminId: string;
  details?: Record<string, any> | null;
  createdAt: string;
}

export default function AdminAuditLog() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const limit = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
      });
      const res = await adminApiClient(`/admin/audit-log?${params}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data?.data ?? data.data?.logs ?? []);
        setTotal(data.data?.total ?? data.data?.pagination?.total ?? 0);
      } else {
        // API might not exist yet - show empty gracefully
        setEntries([]);
        setTotal(0);
      }
    } catch {
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const actionColor = (action: string) => {
    if (action.includes('approve') || action.includes('verify')) return 'bg-emerald-100 text-emerald-700';
    if (action.includes('reject') || action.includes('delete')) return 'bg-rose-100 text-rose-700';
    if (action.includes('create') || action.includes('add')) return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Denetim Günlüğü"
        description="Admin işlemlerinin kayıt geçmişi"
        actions={
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500">{total} kayıt</span>
          </div>
        }
      />

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input placeholder="İşlem veya admin ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      {/* Table */}
      {error ? (
        <ErrorState onRetry={fetchLogs} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-600">Tarih</TableHead>
                <TableHead className="font-semibold text-slate-600">İşlem</TableHead>
                <TableHead className="font-semibold text-slate-600">Varlık</TableHead>
                <TableHead className="font-semibold text-slate-600">Admin</TableHead>
                <TableHead className="font-semibold text-slate-600">Detay</TableHead>
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
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState icon={ScrollText} title="Kayıt bulunamadı" description="Henüz denetim günlüğü kaydı oluşmamış." className="py-10" />
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs font-medium ${actionColor(entry.action)}`}>
                        {AUDIT_ACTIONS[entry.action] ?? entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-600">
                        <span className="font-medium">{entry.targetType}</span>
                        <span className="text-slate-400 ml-1">#{entry.targetId?.slice(0, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">{`Admin #${entry.adminId?.slice(0, 6)}`}</TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">{entry.details ? JSON.stringify(entry.details) : '—'}</TableCell>
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
