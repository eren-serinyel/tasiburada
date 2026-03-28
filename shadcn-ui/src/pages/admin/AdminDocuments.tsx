import { useEffect, useState, useCallback } from 'react';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader, EmptyState, ErrorState } from '@/components/admin/shared';
import { Search, ChevronLeft, ChevronRight, FileCheck2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type DocStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const statusTabs: { value: DocStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Bekleyen' },
  { value: 'approved', label: 'Onaylanan' },
  { value: 'rejected', label: 'Reddedilen' },
];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const statusLabels: Record<string, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
};

const docTypeLabels: Record<string, string> = {
  license: 'Ehliyet',
  insurance: 'Sigorta',
  registration: 'Ruhsat',
  k_document: 'K Belgesi',
  other: 'Diğer',
};

interface CarrierDoc {
  id: string;
  type: string;
  status: string;
  fileUrl: string;
  uploadedAt: string;
  verifiedAt?: string;
  carrier?: { companyName: string; id: string };
}

export default function AdminDocuments() {
  const [status, setStatus] = useState<DocStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [docs, setDocs] = useState<CarrierDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // verify dialog
  const [verifyDoc, setVerifyDoc] = useState<CarrierDoc | null>(null);
  const [verifyAction, setVerifyAction] = useState<'approve' | 'reject'>('approve');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const limit = 20;

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(limit), status,
        ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
        ...(search ? { search } : {}),
      });
      const res = await adminApiClient(`/admin/documents?${params}`);
      const data = await res.json();
      if (data.success) {
        setDocs(data.data?.documents ?? []);
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
  }, [page, status, typeFilter, search]);

  useEffect(() => { setPage(1); }, [status, search, typeFilter]);
  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const openVerify = (doc: CarrierDoc, action: 'approve' | 'reject') => {
    setVerifyDoc(doc);
    setVerifyAction(action);
    setReason('');
  };

  const handleVerify = async () => {
    if (!verifyDoc) return;
    setSubmitting(true);
    try {
      const res = await adminApiClient(`/admin/documents/${verifyDoc.id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: verifyAction === 'approve', reason: reason || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(verifyAction === 'approve' ? 'Belge onaylandı.' : 'Belge reddedildi.');
        setVerifyDoc(null);
        fetchDocs();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader title="Belgeler" description={`Toplam ${total} belge`} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <Tabs value={status} onValueChange={(v) => setStatus(v as DocStatusFilter)}>
          <TabsList className="bg-slate-100">
            {statusTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-9 text-xs">
            <SelectValue placeholder="Belge tipi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Tipler</SelectItem>
            {Object.entries(docTypeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input placeholder="Nakliyeci ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
      </div>

      {error ? (
        <ErrorState onRetry={fetchDocs} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-600">Nakliyeci</TableHead>
                <TableHead className="font-semibold text-slate-600">Belge Tipi</TableHead>
                <TableHead className="font-semibold text-slate-600">Durum</TableHead>
                <TableHead className="font-semibold text-slate-600">Dosya</TableHead>
                <TableHead className="font-semibold text-slate-600">Yükleme Tarihi</TableHead>
                <TableHead className="w-24" />
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
              ) : docs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState icon={FileCheck2} title="Belge bulunamadı" description="Filtre kriterlerinize uygun belge yok." className="py-10" />
                  </TableCell>
                </TableRow>
              ) : (
                docs.map((d) => (
                  <TableRow key={d.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="text-sm text-slate-700 font-medium">{d.carrier?.companyName ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{docTypeLabels[d.type] || d.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${statusColors[d.status] || 'bg-slate-100'}`}>
                        {statusLabels[d.status] || d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs">
                        <ExternalLink className="h-3 w-3" /> Görüntüle
                      </a>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(d.uploadedAt), 'dd MMM yyyy', { locale: tr })}
                    </TableCell>
                    <TableCell>
                      {d.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => openVerify(d, 'approve')}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => openVerify(d, 'reject')}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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

      {/* Verify / Reject Dialog */}
      <Dialog open={!!verifyDoc} onOpenChange={() => setVerifyDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{verifyAction === 'approve' ? 'Belgeyi Onayla' : 'Belgeyi Reddet'}</DialogTitle>
            <DialogDescription>
              {verifyDoc?.carrier?.companyName ?? 'Nakliyeci'} — {docTypeLabels[verifyDoc?.type ?? ''] ?? verifyDoc?.type}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">{verifyAction === 'reject' ? 'Red sebebi (zorunlu)' : 'Not (isteğe bağlı)'}</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Açıklama girin..." rows={3} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDoc(null)}>Vazgeç</Button>
            <Button
              onClick={handleVerify}
              disabled={submitting || (verifyAction === 'reject' && !reason.trim())}
              className={verifyAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
            >
              {submitting ? 'İşleniyor...' : verifyAction === 'approve' ? 'Onayla' : 'Reddet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
