import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApiClient } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader, EmptyState, ErrorState } from '@/components/admin/shared';
import { ShieldAlert, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ContactFilterLogItem {
  id: number;
  createdAt: string;
  actorType: string;
  actorId: string | null;
  surface: string;
  shipmentId: string | null;
  offerId: string | null;
  action: string;
  severity: 'low' | 'medium' | 'high';
  riskScore: number;
  reviewStatus: 'unreviewed' | 'false_positive' | 'confirmed' | 'ignored';
  matchedRules: string[];
  textHashPreview: string;
}

const SURFACE_LABELS: Record<string, string> = {
  shipment_load_details: 'İlan Yük Detayı',
  shipment_note: 'İlan Notu',
  offer_message: 'Teklif Mesajı',
  platform_message: 'Platform Mesajı',
};

const ACTION_CLASS: Record<string, string> = {
  blocked: 'bg-rose-100 text-rose-700',
  flagged: 'bg-amber-100 text-amber-700',
};

const SEVERITY_CLASS: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  unreviewed: 'İncelenmedi',
  false_positive: 'Yanlış Pozitif',
  confirmed: 'Doğrulandı',
  ignored: 'Yok Sayıldı',
};

const ACTOR_TYPE_CLASS: Record<string, string> = {
  customer: 'bg-blue-100 text-blue-700',
  carrier: 'bg-violet-100 text-violet-700',
  admin: 'bg-slate-100 text-slate-700',
  system: 'bg-slate-100 text-slate-500',
};

const ALL_VALUE = '__all__';

export default function AdminContactFilterLogs() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [surface, setSurface] = useState(ALL_VALUE);
  const [actorType, setActorType] = useState(ALL_VALUE);
  const [action, setAction] = useState(ALL_VALUE);
  const [severity, setSeverity] = useState(ALL_VALUE);
  const [reviewStatus, setReviewStatus] = useState(ALL_VALUE);
  const [actorIdFilter, setActorIdFilter] = useState('');
  const [shipmentIdFilter, setShipmentIdFilter] = useState('');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<ContactFilterLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const limit = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (surface && surface !== ALL_VALUE) params.set('surface', surface);
      if (actorType && actorType !== ALL_VALUE) params.set('actorType', actorType);
      if (action && action !== ALL_VALUE) params.set('action', action);
      if (severity && severity !== ALL_VALUE) params.set('severity', severity);
      if (reviewStatus && reviewStatus !== ALL_VALUE) params.set('reviewStatus', reviewStatus);
      if (actorIdFilter.trim()) params.set('actorId', actorIdFilter.trim());
      if (shipmentIdFilter.trim()) params.set('shipmentId', shipmentIdFilter.trim());

      const res = await adminApiClient(`/admin/contact-filter-logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data?.data ?? []);
        setTotal(data.data?.total ?? 0);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, surface, actorType, action, severity, reviewStatus, actorIdFilter, shipmentIdFilter]);

  useEffect(() => { setPage(1); }, [dateFrom, dateTo, surface, actorType, action, severity, reviewStatus, actorIdFilter, shipmentIdFilter]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const actorLink = (item: ContactFilterLogItem) => {
    if (!item.actorId) return null;
    if (item.actorType === 'customer') {
      return (
        <Link to={`/admin/musteriler`} className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
          {item.actorId.slice(0, 8)}… <ExternalLink className="h-3 w-3" />
        </Link>
      );
    }
    if (item.actorType === 'carrier') {
      return (
        <Link to={`/admin/nakliyeciler/${item.actorId}`} className="inline-flex items-center gap-1 text-violet-600 hover:underline text-xs">
          {item.actorId.slice(0, 8)}… <ExternalLink className="h-3 w-3" />
        </Link>
      );
    }
    return <span className="text-xs font-mono text-slate-500">{item.actorId.slice(0, 8)}…</span>;
  };

  const shipmentLink = (shipmentId: string | null) => {
    if (!shipmentId) return <span className="text-slate-300">—</span>;
    return (
      <Link to={`/admin/ilanlar`} className="inline-flex items-center gap-1 text-slate-600 hover:underline text-xs">
        {shipmentId.slice(0, 8)}… <ExternalLink className="h-3 w-3" />
      </Link>
    );
  };

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState message="Kaçak iletişim logları yüklenemedi." onRetry={fetchLogs} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Kaçak İletişim Logları"
        description="Platform içi iletişim filtresi — sadece hash kaydedilir, ham metin saklanmaz"
        actions={
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500">{total} kayıt</span>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 text-xs w-36"
              aria-label="Başlangıç tarihi"
            />
            <span className="text-xs text-slate-400">—</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 text-xs w-36"
              aria-label="Bitiş tarihi"
            />
          </div>

          {/* Surface */}
          <Select value={surface} onValueChange={setSurface}>
            <SelectTrigger className="h-9 text-xs w-44">
              <SelectValue placeholder="Kaynak" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tüm kaynaklar</SelectItem>
              <SelectItem value="shipment_load_details">İlan Yük Detayı</SelectItem>
              <SelectItem value="shipment_note">İlan Notu</SelectItem>
              <SelectItem value="offer_message">Teklif Mesajı</SelectItem>
              <SelectItem value="platform_message">Platform Mesajı</SelectItem>
            </SelectContent>
          </Select>

          {/* Actor type */}
          <Select value={actorType} onValueChange={setActorType}>
            <SelectTrigger className="h-9 text-xs w-36">
              <SelectValue placeholder="Aktör tipi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tüm aktörler</SelectItem>
              <SelectItem value="customer">Müşteri</SelectItem>
              <SelectItem value="carrier">Nakliyeci</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="system">Sistem</SelectItem>
            </SelectContent>
          </Select>

          {/* Action */}
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-9 text-xs w-36">
              <SelectValue placeholder="İşlem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tüm işlemler</SelectItem>
              <SelectItem value="blocked">Engellendi</SelectItem>
              <SelectItem value="flagged">İşaretlendi</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-9 text-xs w-36">
              <SelectValue placeholder="Seviye" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tüm seviyeler</SelectItem>
              <SelectItem value="high">Yüksek</SelectItem>
              <SelectItem value="medium">Orta</SelectItem>
              <SelectItem value="low">Düşük</SelectItem>
            </SelectContent>
          </Select>

          <Select value={reviewStatus} onValueChange={setReviewStatus}>
            <SelectTrigger className="h-9 text-xs w-40">
              <SelectValue placeholder="İnceleme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tüm durumlar</SelectItem>
              <SelectItem value="unreviewed">İncelenmedi</SelectItem>
              <SelectItem value="false_positive">Yanlış Pozitif</SelectItem>
              <SelectItem value="confirmed">Doğrulandı</SelectItem>
              <SelectItem value="ignored">Yok Sayıldı</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Aktör ID (UUID)"
            value={actorIdFilter}
            onChange={(e) => setActorIdFilter(e.target.value)}
            className="h-9 text-xs w-72 font-mono"
          />
          <Input
            placeholder="İlan ID (UUID)"
            value={shipmentIdFilter}
            onChange={(e) => setShipmentIdFilter(e.target.value)}
            className="h-9 text-xs w-72 font-mono"
          />
          {(dateFrom || dateTo || (surface && surface !== ALL_VALUE) || (actorType && actorType !== ALL_VALUE) || (action && action !== ALL_VALUE) || (severity && severity !== ALL_VALUE) || (reviewStatus && reviewStatus !== ALL_VALUE) || actorIdFilter || shipmentIdFilter) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-slate-500"
              onClick={() => {
                setDateFrom(''); setDateTo(''); setSurface(ALL_VALUE);
                setActorType(ALL_VALUE); setAction(ALL_VALUE);
                setSeverity(ALL_VALUE); setReviewStatus(ALL_VALUE);
                setActorIdFilter(''); setShipmentIdFilter('');
              }}
            >
              Filtreleri Temizle
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400">Yükleniyor…</div>
      ) : entries.length === 0 ? (
        <EmptyState message="Bu filtrelerle eşleşen kayıt bulunamadı." />
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-semibold">ID</TableHead>
                <TableHead className="text-xs font-semibold">Tarih</TableHead>
                <TableHead className="text-xs font-semibold">Aktör</TableHead>
                <TableHead className="text-xs font-semibold">Kaynak</TableHead>
                <TableHead className="text-xs font-semibold">Tespit Türü</TableHead>
                <TableHead className="text-xs font-semibold">Seviye</TableHead>
                <TableHead className="text-xs font-semibold">Risk</TableHead>
                <TableHead className="text-xs font-semibold">İşlem</TableHead>
                <TableHead className="text-xs font-semibold">İnceleme</TableHead>
                <TableHead className="text-xs font-semibold">Hash (kısmi)</TableHead>
                <TableHead className="text-xs font-semibold">İlan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-slate-50">
                  <TableCell className="text-xs text-slate-500 font-mono">{entry.id}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <Badge className={`text-[10px] px-1.5 py-0 w-fit ${ACTOR_TYPE_CLASS[entry.actorType] ?? 'bg-slate-100 text-slate-700'}`}>
                        {entry.actorType}
                      </Badge>
                      {actorLink(entry)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{SURFACE_LABELS[entry.surface] ?? entry.surface}</TableCell>
                  <TableCell className="text-xs">
                    {entry.matchedRules.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {entry.matchedRules.slice(0, 3).map((rule) => (
                          <span key={rule} className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-mono text-slate-600">
                            {rule}
                          </span>
                        ))}
                        {entry.matchedRules.length > 3 && (
                          <span className="text-[10px] text-slate-400">+{entry.matchedRules.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] px-1.5 py-0 ${SEVERITY_CLASS[entry.severity] ?? 'bg-slate-100 text-slate-600'}`}>
                      {entry.severity === 'high' ? 'Yüksek' : entry.severity === 'medium' ? 'Orta' : 'Düşük'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-600">{entry.riskScore ?? 0}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] px-1.5 py-0 ${ACTION_CLASS[entry.action] ?? 'bg-slate-100 text-slate-600'}`}>
                      {entry.action === 'blocked' ? 'Engellendi' : entry.action === 'flagged' ? 'İşaretlendi' : entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-700">
                      {REVIEW_STATUS_LABELS[entry.reviewStatus] ?? entry.reviewStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-400 select-none" title="Ham metin saklanmaz — sadece SHA-256 hash kısmi gösterilir">
                    {entry.textHashPreview || '—'}
                  </TableCell>
                  <TableCell className="text-xs">{shipmentLink(entry.shipmentId)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {total} kayıttan {(page - 1) * limit + 1}–{Math.min(page * limit, total)} gösteriliyor
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-slate-600">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
