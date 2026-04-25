import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AlertTriangle, Building2, CheckCircle, Clock, Eye, FileText, Lock, RefreshCcw } from 'lucide-react';
import { adminApiClient, getAdminId } from '@/lib/adminAuth';
import { buildApprovalQueueViewModel, isApprovalLockExpired, type ApprovalQueueItemLike, type CarrierApprovalState } from '@/lib/admin-approval';
import { APPROVAL_STATUS } from '@/lib/admin-constants';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader, EmptyState, ErrorState, StatusBadge } from '@/components/admin/shared';

type QueueFilter = 'all' | CarrierApprovalState;

interface ApprovalQueueItem extends ApprovalQueueItemLike {
  submittedAt?: string | null;
  lastRejectedAt?: string | null;
  requiredDocumentsComplete?: boolean;
  requiredDocumentsValid?: boolean;
  isReadyForSubmission?: boolean;
  assignedAdminId?: string | null;
}

const queueTabs: Array<{ value: QueueFilter; label: string }> = [
  { value: 'all', label: 'Aktif Kuyruk' },
  { value: 'SUBMITTED', label: 'Gonderildi' },
  { value: 'IN_REVIEW', label: 'Incelemede' },
  { value: 'REJECTED', label: 'Reddedildi' },
  { value: 'APPROVED', label: 'Onayli' },
  { value: 'SUSPENDED', label: 'Askida' },
];

export default function AdminApprovalQueue() {
  const navigate = useNavigate();
  const adminId = getAdminId();
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter !== 'all') params.set('state', filter);
      const res = await adminApiClient(`/admin/carriers/approval-queue?${params.toString()}`);
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || 'Approval kuyruğu yüklenemedi.');
        setError(true);
        return;
      }
      setItems(data.data?.items ?? []);
    } catch {
      toast.error('Approval kuyruğu yüklenemedi.');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleClaim = async (carrierId: string) => {
    setActionLoading(carrierId);
    try {
      const res = await adminApiClient(`/admin/carriers/${carrierId}/approval/claim`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || 'Kayit claim edilemedi.');
        return;
      }
      toast.success('Kayit incelemeye alindi.');
      await fetchQueue();
      navigate(`/admin/nakliyeciler/${carrierId}`);
    } catch {
      toast.error('Kayit claim edilemedi.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Approval Kuyrugu"
        description={loading ? 'Yukleniyor...' : `${items.length} kayit gosteriliyor`}
      />

      <Tabs value={filter} onValueChange={(value) => setFilter(value as QueueFilter)}>
        <TabsList className="bg-slate-100">
          {queueTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error ? (
        <ErrorState onRetry={fetchQueue} />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 rounded-xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="Kuyruk bos"
          description="Secili filtre icin approval kaydi bulunmuyor."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const viewModel = buildApprovalQueueViewModel(item, adminId);
            const isExpired = isApprovalLockExpired(item.reviewLockExpiresAt);

            return (
              <Card key={item.carrierId} className="border-slate-200 hover:border-slate-300 transition-colors">
                <CardContent className="px-5 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">{item.companyName}</p>
                          <StatusBadge status={viewModel.approvalState} statusMap={APPROVAL_STATUS} />
                          {isExpired && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                              <AlertTriangle className="h-3 w-3" />
                              Lock expired
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {item.email && <span>{item.email}</span>}
                          <span>{viewModel.versionLabel}</span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {item.submittedAt && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(item.submittedAt), { addSuffix: true, locale: tr })}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {viewModel.documentsSummary}
                          </span>
                          {item.reviewLockAdminId && (
                            <span className="inline-flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              {viewModel.lockMessage}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {item.reviewLockExpiresAt && (
                            <span>
                              Lock bitis:{' '}
                              {format(new Date(item.reviewLockExpiresAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
                            </span>
                          )}
                          {item.lastRejectedAt && (
                            <span>
                              Son red:{' '}
                              {format(new Date(item.lastRejectedAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/nakliyeciler/${item.carrierId}`)}>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Detay
                      </Button>
                      {viewModel.actions.canClaim && (
                        <Button
                          size="sm"
                          className="bg-sky-600 hover:bg-sky-700 text-white"
                          disabled={actionLoading === item.carrierId}
                          onClick={() => handleClaim(item.carrierId)}
                        >
                          <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                          Claim
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
