import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader, EmptyState, ErrorState } from '@/components/admin/shared';
import {
  Search, ChevronLeft, ChevronRight, FileCheck2, CheckCircle, XCircle,
  Eye, Download, Building2, Mail, Phone,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────

type DocStatusFilter = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';

const statusTabs: { value: DocStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'PENDING', label: 'Bekleyen' },
  { value: 'APPROVED', label: 'Onaylı' },
  { value: 'REJECTED', label: 'Reddedildi' },
];

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Bekliyor',
  APPROVED: 'Onaylı',
  REJECTED: 'Reddedildi',
};

const docTypeLabels: Record<string, string> = {
  AUTHORIZATION_CERT: 'K Belgesi',
  SRC_CERT: 'SRC Belgesi',
  VEHICLE_LICENSE: 'Araç Ruhsatı',
  TAX_PLATE: 'Vergi Levhası',
  INSURANCE_POLICY: 'Kasko/Sigorta',
};

const docTypeBadgeColors: Record<string, string> = {
  AUTHORIZATION_CERT: 'bg-blue-100 text-blue-700 border-blue-200',
  SRC_CERT: 'bg-purple-100 text-purple-700 border-purple-200',
  VEHICLE_LICENSE: 'bg-teal-100 text-teal-700 border-teal-200',
  TAX_PLATE: 'bg-orange-100 text-orange-700 border-orange-200',
  INSURANCE_POLICY: 'bg-green-100 text-green-700 border-green-200',
};

const docTypeOptions = [
  { value: 'AUTHORIZATION_CERT', label: 'K Belgesi' },
  { value: 'SRC_CERT', label: 'SRC Belgesi' },
  { value: 'VEHICLE_LICENSE', label: 'Araç Ruhsatı' },
  { value: 'TAX_PLATE', label: 'Vergi Levhası' },
  { value: 'INSURANCE_POLICY', label: 'Kasko/Sigorta' },
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface CarrierDoc {
  id: string;
  type: string;
  status: string;
  fileUrl: string;
  uploadedAt: string;
  verifiedAt?: string;
  carrier?: { id: string; companyName: string; email?: string; phone?: string };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminDocuments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DocStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [page, setPage] = useState(1);
  const [docs, setDocs] = useState<CarrierDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Preview / verify modal
  const [selectedDocument, setSelectedDocument] = useState<CarrierDoc | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const limit = 15;

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(activeTab !== 'all' ? { status: activeTab } : {}),
        ...(selectedType !== 'all' ? { type: selectedType } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
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
  }, [page, activeTab, selectedType, searchQuery]);

  // Fetch pending count for header badge
  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await adminApiClient('/admin/documents?status=PENDING&limit=1');
      const data = await res.json();
      if (data.success) setPendingCount(data.data?.pagination?.total ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { setPage(1); }, [activeTab, searchQuery, selectedType]);
  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);
  useEffect(() => { fetchPendingCount(); }, [fetchPendingCount]);

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(value), 300);
  };

  const handleVerify = async (approved: boolean) => {
    if (!selectedDocument) return;
    setVerifyLoading(true);
    try {
      const res = await adminApiClient(`/admin/documents/${selectedDocument.id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, reason: rejectReason || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(approved ? 'Belge onaylandı ✓' : 'Belge reddedildi');
        setSelectedDocument(null);
        setRejectReason('');
        fetchDocuments();
        fetchPendingCount();
      } else {
        toast.error(data.message || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const isPdf = (url: string) => url?.toLowerCase().endsWith('.pdf');
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <PageHeader title="Belgeler" description={`Toplam ${total} belge`} />
        {pendingCount > 0 && (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">{pendingCount} bekleyen</Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocStatusFilter)}>
          <TabsList className="bg-slate-100">
            {statusTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-40 h-9 text-xs">
            <SelectValue placeholder="Belge tipi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            {docTypeOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Nakliyeci adı ara..."
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {error ? (
        <ErrorState onRetry={fetchDocuments} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-600 text-xs">Nakliyeci</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Belge Tipi</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Durum</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Yükleme Tarihi</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Doğrulama</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
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
                    <TableCell>
                      {d.carrier ? (
                        <button
                          onClick={() => navigate(`/admin/nakliyeciler/${d.carrier!.id}`)}
                          className="text-sm font-medium text-slate-700 hover:text-blue-600 hover:underline"
                        >
                          {d.carrier.companyName}
                        </button>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${docTypeBadgeColors[d.type] || ''}`}>
                        {docTypeLabels[d.type] || d.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${statusColors[d.status] || 'bg-slate-100'}`}>
                        {statusLabels[d.status] || d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(d.uploadedAt).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {d.verifiedAt ? new Date(d.verifiedAt).toLocaleDateString('tr-TR') : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-slate-600 hover:text-slate-800"
                          onClick={() => { setSelectedDocument(d); setRejectReason(''); setPreviewError(false); }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Görüntüle
                        </Button>
                        {d.status === 'PENDING' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => { setSelectedDocument(d); setRejectReason(''); setPreviewError(false); }}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => { setSelectedDocument(d); setRejectReason(''); setPreviewError(false); }}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                {(page - 1) * limit + 1} - {Math.min(page * limit, total)} / {total} belge
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

      {/* Preview & Verify Modal */}
      <Dialog open={!!selectedDocument} onOpenChange={() => { setSelectedDocument(null); setRejectReason(''); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Belge Önizleme</DialogTitle>
          </DialogHeader>

          {selectedDocument && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Left: Document preview */}
              <div className="md:col-span-3 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                {previewError ? (
                  <div className="flex flex-col items-center justify-center h-96 gap-3">
                    <p className="text-sm text-slate-500">Belge önizlenemiyor</p>
                    <a href={selectedDocument.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="h-3.5 w-3.5 mr-1.5" /> İndir
                      </Button>
                    </a>
                  </div>
                ) : isPdf(selectedDocument.fileUrl) ? (
                  <iframe
                    src={selectedDocument.fileUrl}
                    width="100%"
                    height="400"
                    className="border-0"
                    title="Belge Önizleme"
                    onError={() => setPreviewError(true)}
                  />
                ) : (
                  <img
                    src={selectedDocument.fileUrl}
                    alt="Belge"
                    className="max-h-96 object-contain w-full"
                    onError={() => setPreviewError(true)}
                  />
                )}
              </div>

              {/* Right: Carrier info */}
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Firma</p>
                      <p className="text-sm font-medium text-slate-800">{selectedDocument.carrier?.companyName ?? '—'}</p>
                    </div>
                  </div>
                  {selectedDocument.carrier?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">E-posta</p>
                        <p className="text-sm text-slate-700">{selectedDocument.carrier.email}</p>
                      </div>
                    </div>
                  )}
                  {selectedDocument.carrier?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Telefon</p>
                        <p className="text-sm text-slate-700">{selectedDocument.carrier.phone}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Belge Tipi</p>
                    <Badge variant="outline" className={`text-xs ${docTypeBadgeColors[selectedDocument.type] || ''}`}>
                      {docTypeLabels[selectedDocument.type] || selectedDocument.type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Durum</p>
                    <Badge variant="secondary" className={`text-xs mt-0.5 ${statusColors[selectedDocument.status] || ''}`}>
                      {statusLabels[selectedDocument.status] || selectedDocument.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Yükleme Tarihi</p>
                    <p className="text-sm text-slate-700">{new Date(selectedDocument.uploadedAt).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions — only for PENDING documents */}
          {selectedDocument?.status === 'PENDING' && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Red nedeni (opsiyonel)..."
                rows={2}
                className="text-sm"
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50"
                  onClick={() => handleVerify(false)}
                  disabled={verifyLoading}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  {verifyLoading ? 'İşleniyor...' : 'Reddet'}
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleVerify(true)}
                  disabled={verifyLoading}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  {verifyLoading ? 'İşleniyor...' : 'Onayla'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
