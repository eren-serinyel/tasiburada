import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  Hash,
  Lock,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  Shield,
  Star,
  Truck,
  XCircle,
} from 'lucide-react';
import { adminApiClient, getAdminId } from '@/lib/adminAuth';
import { getApprovalActions, isApprovalLockExpired, resolveApprovalState, type CarrierApprovalState } from '@/lib/admin-approval';
import { APPROVAL_STATUS, DOCUMENT_STATUS, REVIEW_STATUS, SHIPMENT_STATUS } from '@/lib/admin-constants';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState, ErrorState, StatusBadge } from '@/components/admin/shared';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DocumentItem {
  id: string;
  type: string;
  fileUrl: string;
  downloadUrl?: string;
  status: string;
  isApproved: boolean;
  uploadedAt: string;
}

interface ReviewItem {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  customer?: { firstName?: string; lastName?: string };
}

interface ShipmentItem {
  id: string;
  loadDetails?: string;
  status: string;
  origin?: string;
  destination?: string;
  createdAt: string;
  price?: number;
  customer?: { firstName?: string; lastName?: string };
}

interface CarrierDetail {
  id: string;
  companyName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  taxNumber?: string | null;
  isActive?: boolean;
  verifiedByAdmin?: boolean;
  pendingApproval?: boolean;
  approvalState?: CarrierApprovalState | string | null;
  approvalVersion?: number;
  resubmissionCount?: number;
  lastRejectedAt?: string | null;
  lastSubmittedAt?: string | null;
  reviewLockAdminId?: string | null;
  reviewLockExpiresAt?: string | null;
  rejectionReason?: string | null;
  lastDecisionReason?: string | null;
  rating?: number;
  completedShipments?: number;
  cancelledShipments?: number;
  createdAt: string;
  documents?: DocumentItem[];
}

type DecisionMode = 'reject' | 'suspend' | null;

export default function AdminCarrierDetail() {
  const { carrierId } = useParams<{ carrierId: string }>();
  const navigate = useNavigate();
  const adminId = getAdminId();

  const [carrier, setCarrier] = useState<CarrierDetail | null>(null);
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [actionLoading, setActionLoading] = useState(false);
  const [decisionMode, setDecisionMode] = useState<DecisionMode>(null);
  const [decisionReason, setDecisionReason] = useState('');

  const fetchCarrier = async () => {
    if (!carrierId) return;
    setLoading(true);
    setError(false);

    try {
      const [carrierResponse, documentsResponse] = await Promise.all([
        adminApiClient(`/admin/carriers/${carrierId}`),
        adminApiClient(`/admin/carriers/${carrierId}/documents`),
      ]);

      const carrierData = await carrierResponse.json();
      const documentsData = await documentsResponse.json();

      if (!carrierData.success) {
        toast.error(carrierData.message || 'Carrier detayi yuklenemedi.');
        setError(true);
        return;
      }

      setCarrier({
        ...carrierData.data,
        documents: documentsData.success ? documentsData.data : [],
      });
    } catch {
      toast.error('Carrier detayi yuklenemedi.');
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchShipments = async () => {
    if (!carrierId) return;
    try {
      const response = await adminApiClient(`/admin/carriers/${carrierId}/shipments?page=1&limit=10`);
      const data = await response.json();
      if (data.success) {
        setShipments(data.data?.shipments ?? []);
      }
    } catch {
      toast.error('Tasima verileri yuklenemedi.');
    }
  };

  const fetchReviews = async () => {
    if (!carrierId) return;
    try {
      const response = await adminApiClient(`/admin/carriers/${carrierId}/reviews?page=1&limit=10`);
      const data = await response.json();
      if (data.success) {
        setReviews(data.data?.reviews ?? []);
      }
    } catch {
      toast.error('Yorum verileri yuklenemedi.');
    }
  };

  useEffect(() => {
    fetchCarrier();
  }, [carrierId]);

  useEffect(() => {
    if (activeTab === 'shipments') void fetchShipments();
    if (activeTab === 'reviews') void fetchReviews();
  }, [activeTab, carrierId]);

  const approvalState = useMemo(() => resolveApprovalState(carrier ?? {}), [carrier]);
  const approvalActions = useMemo(() => getApprovalActions(carrier ?? {}, adminId), [carrier, adminId]);
  const lockExpired = isApprovalLockExpired(carrier?.reviewLockExpiresAt);

  const performAction = async (path: string, body?: Record<string, unknown>, successMessage?: string) => {
    if (!carrierId) return;
    setActionLoading(true);
    try {
      const response = await adminApiClient(path, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!data.success) {
        toast.error(data.message || 'Islem basarisiz.');
        return;
      }
      if (successMessage) {
        toast.success(successMessage);
      }
      setDecisionMode(null);
      setDecisionReason('');
      await fetchCarrier();
    } catch {
      toast.error('Islem basarisiz.');
    } finally {
      setActionLoading(false);
    }
  };

  const toDocumentApiPath = (url: string) => String(url || '').replace(/^\/api\/v1/, '');

  const openDocument = async (document: DocumentItem) => {
    try {
      const response = await adminApiClient(toDocumentApiPath(document.fileUrl));
      if (!response.ok) throw new Error('Belge acilamadi.');
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    } catch (error: any) {
      toast.error(error?.message || 'Belge acilamadi.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <div className="h-5 w-20 rounded bg-slate-200 animate-pulse" />
        <div className="h-8 w-72 rounded bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 rounded-xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !carrier) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState message="Carrier detaylari yuklenemedi." onRetry={fetchCarrier} />
      </div>
    );
  }

  const totalJobs = (carrier.completedShipments ?? 0) + (carrier.cancelledShipments ?? 0);
  const cancelRate = totalJobs > 0 ? Math.round(((carrier.cancelledShipments ?? 0) / totalJobs) * 100) : 0;
  const rejectReasonFromApi = carrier.lastDecisionReason || carrier.rejectionReason || null;

  const infoFields = [
    { icon: Phone, label: 'Telefon', value: carrier.phone || '—' },
    { icon: Mail, label: 'E-posta', value: carrier.email || '—' },
    { icon: MapPin, label: 'Sehir', value: [carrier.city, carrier.district].filter(Boolean).join(' / ') || '—' },
    { icon: Building2, label: 'Adres', value: carrier.address || '—' },
    { icon: Hash, label: 'Vergi No', value: carrier.taxNumber || '—' },
    {
      icon: Calendar,
      label: 'Kayit Tarihi',
      value: carrier.createdAt ? format(new Date(carrier.createdAt), 'dd MMMM yyyy', { locale: tr }) : '—',
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" />
        Nakliyeciler
      </button>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-lg font-bold text-white">
            {carrier.companyName?.charAt(0) ?? 'N'}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{carrier.companyName}</h1>
              <StatusBadge status={approvalState} statusMap={APPROVAL_STATUS} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>ID: {carrier.id}</span>
              <span>v{carrier.approvalVersion ?? 0}</span>
              <span>tekrar {carrier.resubmissionCount ?? 0}</span>
              {(carrier.rating ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {Number(carrier.rating).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {approvalActions.canClaim && (
            <Button
              size="sm"
              className="bg-sky-600 hover:bg-sky-700 text-white"
              disabled={actionLoading}
              onClick={() => performAction(`/admin/carriers/${carrier.id}/approval/claim`, undefined, 'Kayit incelemeye alindi.')}
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Claim
            </Button>
          )}
          {approvalActions.canRelease && (
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading}
              onClick={() => performAction(`/admin/carriers/${carrier.id}/approval/release`, undefined, 'Review birakildi.')}
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              Release
            </Button>
          )}
          {approvalActions.canApprove && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={actionLoading}
              onClick={() => performAction(`/admin/carriers/${carrier.id}/approval/approve`, {}, 'Carrier onaylandi.')}
            >
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              Approve
            </Button>
          )}
          {approvalActions.canReject && (
            <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => setDecisionMode('reject')}>
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              Reject
            </Button>
          )}
          {approvalActions.canSuspend && (
            <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => setDecisionMode('suspend')}>
              <Shield className="mr-1.5 h-3.5 w-3.5" />
              Suspend
            </Button>
          )}
        </div>
      </div>

      {(carrier.reviewLockAdminId || carrier.reviewLockExpiresAt) && (
        <div className={`rounded-lg border p-3 text-sm ${lockExpired ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>
          <div className="flex items-start gap-2">
            {lockExpired ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Lock className="mt-0.5 h-4 w-4 shrink-0" />}
            <div className="space-y-1">
              {carrier.reviewLockAdminId && <p><strong>reviewLockAdminId:</strong> {carrier.reviewLockAdminId}</p>}
              {carrier.reviewLockExpiresAt && (
                <p>
                  <strong>reviewLockExpiresAt:</strong>{' '}
                  {format(new Date(carrier.reviewLockExpiresAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
                </p>
              )}
              {lockExpired && <p>Lock suresi dolmus. Kayit tekrar claim edilebilir.</p>}
            </div>
          </div>
        </div>
      )}

      {rejectReasonFromApi && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Reject reason</p>
              <p>{rejectReasonFromApi}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tamamlanan is', value: carrier.completedShipments ?? 0, icon: Truck },
          { label: 'Iptal orani', value: `%${cancelRate}`, icon: XCircle, warn: cancelRate > 15 },
          { label: 'Ortalama puan', value: (carrier.rating ?? 0) > 0 ? Number(carrier.rating).toFixed(1) : '—', icon: Star },
          { label: 'Belgeler', value: carrier.documents?.length ?? 0, icon: FileText },
        ].map((metric) => (
          <Card key={metric.label} className="border-slate-200">
            <CardContent className="px-4 py-4 flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${metric.warn ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                <metric.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{metric.label}</p>
                <p className={`text-lg font-semibold ${metric.warn ? 'text-rose-600' : 'text-slate-800'}`}>{metric.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="general" className="text-xs">Genel</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">Belgeler</TabsTrigger>
          <TabsTrigger value="shipments" className="text-xs">Isler</TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs">Yorumlar</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Iletisim ve sirket bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {infoFields.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-sm font-medium text-slate-800">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
                <div>
                  <p className="text-xs text-slate-500">Approval state</p>
                  <p className="font-medium">{approvalState}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Last submitted</p>
                  <p className="font-medium">
                    {carrier.lastSubmittedAt ? format(new Date(carrier.lastSubmittedAt), 'dd.MM.yyyy HH:mm', { locale: tr }) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Last rejected</p>
                  <p className="font-medium">
                    {carrier.lastRejectedAt ? format(new Date(carrier.lastRejectedAt), 'dd.MM.yyyy HH:mm', { locale: tr }) : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          {carrier.documents && carrier.documents.length > 0 ? (
            <div className="space-y-2">
              {carrier.documents.map((document) => (
                <Card key={document.id} className="border-slate-200">
                  <CardContent className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{document.type}</p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(document.uploadedAt), 'dd MMM yyyy', { locale: tr })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={String(document.status || 'PENDING').toUpperCase()} statusMap={DOCUMENT_STATUS} />
                      <button type="button" onClick={() => openDocument(document)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        Goruntule
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={FileText} title="Belge yok" description="Carrier icin yuklenmis belge bulunmuyor." />
          )}
        </TabsContent>

        <TabsContent value="shipments">
          {shipments.length > 0 ? (
            <Card className="border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Yuk</TableHead>
                    <TableHead>Guzergah</TableHead>
                    <TableHead>Musteri</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="text-sm text-slate-700">{shipment.loadDetails || shipment.id}</TableCell>
                      <TableCell className="text-sm text-slate-700">{[shipment.origin, shipment.destination].filter(Boolean).join(' → ') || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-700">{[shipment.customer?.firstName, shipment.customer?.lastName].filter(Boolean).join(' ') || '—'}</TableCell>
                      <TableCell><StatusBadge status={shipment.status} statusMap={SHIPMENT_STATUS} /></TableCell>
                      <TableCell className="text-sm text-slate-500">{format(new Date(shipment.createdAt), 'dd.MM.yyyy', { locale: tr })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <EmptyState icon={Truck} title="Is bulunmuyor" description="Bu carrier icin kayitli tasima bulunmuyor." />
          )}
        </TabsContent>

        <TabsContent value="reviews">
          {reviews.length > 0 ? (
            <div className="space-y-2">
              {reviews.map((review) => (
                <Card key={review.id} className="border-slate-200">
                  <CardContent className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status="published" statusMap={REVIEW_STATUS} />
                        <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {review.rating}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {format(new Date(review.createdAt), 'dd.MM.yyyy', { locale: tr })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{review.comment || 'Yorum yok.'}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Star} title="Yorum yok" description="Carrier icin kayitli yorum bulunmuyor." />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={decisionMode !== null} onOpenChange={(open) => !open && setDecisionMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decisionMode === 'suspend' ? 'Carrier suspend' : 'Carrier reject'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="decision-reason">Reason</Label>
            <Textarea
              id="decision-reason"
              rows={4}
              value={decisionReason}
              onChange={(event) => setDecisionReason(event.target.value)}
              placeholder={decisionMode === 'suspend' ? 'Suspend reason zorunlu' : 'Reject reason zorunlu'}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionMode(null)}>
              Vazgec
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading || !decisionReason.trim()}
              onClick={() => {
                if (decisionMode === 'suspend') {
                  void performAction(`/admin/carriers/${carrier.id}/approval/suspend`, { reason: decisionReason }, 'Carrier askiya alindi.');
                } else {
                  void performAction(`/admin/carriers/${carrier.id}/approval/reject`, { reason: decisionReason }, 'Carrier reddedildi.');
                }
              }}
            >
              {decisionMode === 'suspend' ? 'Suspend' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
