import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader, EmptyState, ErrorState } from '@/components/admin/shared';
import { ChevronLeft, ChevronRight, Clock3, ShieldOff } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { tr } from 'date-fns/locale';

type CooldownStatus = 'active' | 'expired' | 'waived';

interface MatchCooldownItem {
  id: number;
  customerId: string;
  carrierId: string;
  shipmentId: string;
  reason: string | null;
  matchedAt: string;
  cancelledAt: string;
  activeUntil: string;
  status: CooldownStatus;
  createdAt: string;
}

interface CooldownListResponse {
  data: MatchCooldownItem[];
  total: number;
  page: number;
  limit: number;
}

const ALL_VALUE = '__all__';

const STATUS_LABELS: Record<CooldownStatus, string> = {
  active: 'ACTIVE',
  expired: 'EXPIRED',
  waived: 'WAIVED',
};

const STATUS_CLASS: Record<CooldownStatus, string> = {
  active: 'bg-amber-100 text-amber-700',
  expired: 'bg-slate-100 text-slate-700',
  waived: 'bg-emerald-100 text-emerald-700',
};

const LIMIT_OPTIONS = [20, 30, 50, 100];

function formatDateTime(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'dd MMM yyyy HH:mm', { locale: tr });
}

function getRemainingInfo(item: MatchCooldownItem): string {
  if (item.status === 'waived') return 'Waive edildi';
  const until = new Date(item.activeUntil);
  if (Number.isNaN(until.getTime())) return '—';
  const now = new Date();

  if (item.status === 'expired' || until <= now) {
    return 'Süresi doldu';
  }

  return `Kalan: ${formatDistanceToNowStrict(until, { locale: tr })}`;
}

export default function AdminMatchCooldowns() {
  const [items, setItems] = useState<MatchCooldownItem[]>([]);
  const [status, setStatus] = useState<string>(ALL_VALUE);
  const [carrierId, setCarrierId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false);
  const [waiveTarget, setWaiveTarget] = useState<MatchCooldownItem | null>(null);
  const [waiveNote, setWaiveNote] = useState('');
  const [waiveSubmitting, setWaiveSubmitting] = useState(false);

  const fetchCooldowns = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (status !== ALL_VALUE) params.set('status', status);
      if (carrierId.trim()) params.set('carrierId', carrierId.trim());
      if (customerId.trim()) params.set('customerId', customerId.trim());

      const res = await adminApiClient(`/admin/match-cooldowns?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        setError(true);
        toast.error(data.message || 'Cooldown kayıtları alınamadı.');
        return;
      }

      const payload = (data.data ?? {}) as CooldownListResponse;
      setItems(Array.isArray(payload.data) ? payload.data : []);
      setTotal(payload.total ?? 0);
    } catch {
      setError(true);
      toast.error('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, carrierId, customerId]);

  useEffect(() => {
    setPage(1);
  }, [status, carrierId, customerId, limit]);

  useEffect(() => {
    fetchCooldowns();
  }, [fetchCooldowns]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const openWaiveDialog = (item: MatchCooldownItem) => {
    setWaiveTarget(item);
    setWaiveNote('');
    setWaiveDialogOpen(true);
  };

  const handleWaive = async () => {
    if (!waiveTarget) return;

    setWaiveSubmitting(true);
    try {
      const res = await adminApiClient(`/admin/match-cooldowns/${waiveTarget.id}/waive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: waiveNote.trim() || null }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || 'Waive işlemi başarısız.');
        return;
      }

      toast.success('Cooldown kaldırıldı (WAIVED).');
      setWaiveDialogOpen(false);
      setWaiveTarget(null);
      setWaiveNote('');
      fetchCooldowns();
    } catch {
      toast.error('Waive işlemi sırasında hata oluştu.');
    } finally {
      setWaiveSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState message="Cooldown kayıtları yüklenemedi." onRetry={fetchCooldowns} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Eşleşme Bekleme Süreleri"
        description="Sadece okuma + ACTIVE kayıtlar için waive aksiyonu"
        actions={
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock3 className="h-4 w-4" />
            <span>{total} kayıt</span>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 text-xs w-44">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tüm durumlar</SelectItem>
            <SelectItem value="active">ACTIVE</SelectItem>
            <SelectItem value="expired">EXPIRED</SelectItem>
            <SelectItem value="waived">WAIVED</SelectItem>
          </SelectContent>
        </Select>

        <Input
          className="h-9 text-xs w-72 font-mono"
          placeholder="Carrier ID"
          value={carrierId}
          onChange={(e) => setCarrierId(e.target.value)}
        />

        <Input
          className="h-9 text-xs w-72 font-mono"
          placeholder="Customer ID"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        />

        <Select
          value={String(limit)}
          onValueChange={(value) => setLimit(Number(value))}
        >
          <SelectTrigger className="h-9 text-xs w-28">
            <SelectValue placeholder="Limit" />
          </SelectTrigger>
          <SelectContent>
            {LIMIT_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(status !== ALL_VALUE || carrierId || customerId) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-slate-500"
            onClick={() => {
              setStatus(ALL_VALUE);
              setCarrierId('');
              setCustomerId('');
            }}
          >
            Filtreleri Temizle
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <EmptyState message="Bu filtrelerle eşleşen cooldown kaydı bulunamadı." />
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-semibold">ID</TableHead>
                <TableHead className="text-xs font-semibold">Durum</TableHead>
                <TableHead className="text-xs font-semibold">Created</TableHead>
                <TableHead className="text-xs font-semibold">Matched</TableHead>
                <TableHead className="text-xs font-semibold">Cancelled</TableHead>
                <TableHead className="text-xs font-semibold">Active Until</TableHead>
                <TableHead className="text-xs font-semibold">Kalan Süre</TableHead>
                <TableHead className="text-xs font-semibold">Customer ID</TableHead>
                <TableHead className="text-xs font-semibold">Carrier ID</TableHead>
                <TableHead className="text-xs font-semibold">Shipment ID</TableHead>
                <TableHead className="text-xs font-semibold">Reason</TableHead>
                <TableHead className="text-xs font-semibold text-right">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50">
                  <TableCell className="text-xs font-mono text-slate-600">{item.id}</TableCell>
                  <TableCell className="text-xs">
                    <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_CLASS[item.status]}`}>
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatDateTime(item.createdAt)}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatDateTime(item.matchedAt)}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatDateTime(item.cancelledAt)}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatDateTime(item.activeUntil)}</TableCell>
                  <TableCell className="text-xs text-slate-600">{getRemainingInfo(item)}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-500 max-w-[180px] truncate" title={item.customerId}>{item.customerId}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-500 max-w-[180px] truncate" title={item.carrierId}>{item.carrierId}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-500 max-w-[180px] truncate" title={item.shipmentId}>{item.shipmentId}</TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-[220px] truncate" title={item.reason ?? ''}>{item.reason ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {item.status === 'active' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => openWaiveDialog(item)}
                      >
                        <ShieldOff className="h-3.5 w-3.5 mr-1" />
                        Waive
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-8 text-xs" disabled>
                        Waive
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-slate-500">
          Sayfa {page} / {totalPages} • Toplam {total}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Önceki
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Sonraki <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>

      <Dialog open={waiveDialogOpen} onOpenChange={(open) => !waiveSubmitting && setWaiveDialogOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cooldown Waive Onayı</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Sadece ACTIVE kayıtlar waive edilebilir. Bu işlem kaydı silmez, durumu WAIVED yapar.
            </p>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
              <div><span className="font-medium">Cooldown ID:</span> {waiveTarget?.id}</div>
              <div><span className="font-medium">Carrier:</span> {waiveTarget?.carrierId}</div>
              <div><span className="font-medium">Customer:</span> {waiveTarget?.customerId}</div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Admin Notu (opsiyonel)</label>
              <Input
                value={waiveNote}
                onChange={(e) => setWaiveNote(e.target.value)}
                placeholder="Neden kaldırıldı?"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWaiveDialogOpen(false)}
              disabled={waiveSubmitting}
            >
              Vazgeç
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleWaive}
              disabled={waiveSubmitting}
            >
              {waiveSubmitting ? 'Gönderiliyor...' : 'Waive / Kaldır'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
