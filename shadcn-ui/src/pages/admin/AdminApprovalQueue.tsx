import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PageHeader, EmptyState, ErrorState } from '@/components/admin/shared';
import {
  CheckCircle, XCircle, Eye, Clock, FileText, Building2, AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface PendingCarrier {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  city: string;
  taxNumber: string;
  hasUploadedDocuments: boolean;
  createdAt: string;
}

export default function AdminApprovalQueue() {
  const navigate = useNavigate();
  const [carriers, setCarriers] = useState<PendingCarrier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingCarrier | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await adminApiClient('/admin/carriers?status=pending&limit=100');
      const data = await res.json();
      if (data.success) {
        setCarriers(data.data?.carriers ?? data.data?.data ?? []);
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
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleVerify = async (carrierId: string, approved: boolean, reason?: string) => {
    setActionLoading(carrierId);
    try {
      const res = await adminApiClient(`/admin/carriers/${carrierId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, rejectionReason: reason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setCarriers((prev) => prev.filter((c) => c.id !== carrierId));
        setRejectTarget(null);
        setRejectionReason('');
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Onay Kuyruğu"
        description={loading ? 'Yükleniyor...' : `${carriers.length} nakliyeci onay bekliyor`}
      />

      {error ? (
        <ErrorState onRetry={fetchPending} />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : carriers.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="Kuyruk boş"
          description="Onay bekleyen nakliyeci bulunmuyor."
        />
      ) : (
        <div className="space-y-3">
          {carriers.map((carrier) => (
            <Card key={carrier.id} className="border-slate-200 hover:border-slate-300 transition-colors">
              <CardContent className="py-4 px-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Info */}
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-800">{carrier.companyName}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>{carrier.email}</span>
                        <span>{carrier.phone}</span>
                        {carrier.city && <span>{carrier.city}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(carrier.createdAt), { addSuffix: true, locale: tr })}
                        </span>
                        <span className={`flex items-center gap-1 ${carrier.hasUploadedDocuments ? 'text-emerald-600' : 'text-amber-500'}`}>
                          <FileText className="h-3 w-3" />
                          {carrier.hasUploadedDocuments ? 'Belgeler yüklendi' : 'Belge bekleniyor'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => navigate(`/admin/nakliyeciler/${carrier.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> İncele
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      disabled={actionLoading === carrier.id}
                      onClick={() => handleVerify(carrier.id, true)}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Onayla
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs"
                      disabled={actionLoading === carrier.id}
                      onClick={() => setRejectTarget(carrier)}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reddet
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                {rejectTarget?.companyName} - Reddet
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">Red Gerekçesi (opsiyonel)</Label>
            <Textarea
              id="reject-reason"
              placeholder="Eksik belge, hatalı bilgi vb."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Vazgeç</Button>
            <Button
              variant="destructive"
              disabled={actionLoading === rejectTarget?.id}
              onClick={() => rejectTarget && handleVerify(rejectTarget.id, false, rejectionReason || undefined)}
            >
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
