import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { StatusBadge, EmptyState, ErrorState } from '@/components/admin/shared';
import { CARRIER_STATUS, DOCUMENT_STATUS, SHIPMENT_STATUS, REVIEW_STATUS, resolveCarrierStatus } from '@/lib/admin-constants';
import {
  ArrowLeft, CheckCircle, XCircle, FileText, Phone, Mail, MapPin,
  Building2, Calendar, Star, Truck, AlertTriangle, ExternalLink,
  Shield, Hash,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Document {
  id: string;
  type: string;
  fileUrl: string;
  status: string;
  isApproved: boolean;
  uploadedAt: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user?: { firstName: string; lastName: string };
  customer?: { firstName: string; lastName: string };
  shipment?: { origin: string; destination: string };
}

interface Shipment {
  id: string;
  loadDetails: string;
  status: string;
  origin: string;
  destination: string;
  createdAt: string;
  price?: number;
  customer?: { firstName: string; lastName: string };
}

interface Carrier {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  taxNumber: string;
  isActive: boolean;
  verifiedByAdmin: boolean;
  hasUploadedDocuments: boolean;
  rejectionReason?: string;
  rating: number;
  completedShipments: number;
  cancelledShipments: number;
  createdAt: string;
  documents?: Document[];
  reviews?: Review[];
  shipments?: Shipment[];
}

export default function AdminCarrierDetail() {
  const { carrierId } = useParams<{ carrierId: string }>();
  const navigate = useNavigate();
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  // Shipments tab state
  const [carrierShipments, setCarrierShipments] = useState<Shipment[]>([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [shipmentsPage, setShipmentsPage] = useState(1);
  const [shipmentsMeta, setShipmentsMeta] = useState({ total: 0, totalPages: 1 });

  // Reviews tab state
  const [carrierReviews, setCarrierReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsMeta, setReviewsMeta] = useState({ total: 0, totalPages: 1, averageRating: 0 });

  const fetchCarrier = () => {
    if (!carrierId) return;
    setLoading(true);
    setError(false);
    Promise.all([
      adminApiClient(`/admin/carriers/${carrierId}`).then((r) => r.json()),
      adminApiClient(`/admin/carriers/${carrierId}/documents`).then((r) => r.json()),
    ])
      .then(([carrierRes, docsRes]) => {
        if (carrierRes.success) {
          setCarrier({
            ...carrierRes.data,
            documents: docsRes.success ? docsRes.data : [],
          });
        } else {
          toast.error(carrierRes.message);
          setError(true);
        }
      })
      .catch(() => {
        toast.error('Veriler yüklenemedi.');
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  const fetchCarrierShipments = async (page: number) => {
    if (!carrierId) return;
    setShipmentsLoading(true);
    try {
      const res = await adminApiClient(`/admin/carriers/${carrierId}/shipments?page=${page}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setCarrierShipments(data.data.shipments ?? []);
        setShipmentsMeta({
          total: data.data.pagination?.total ?? 0,
          totalPages: data.data.pagination?.totalPages ?? 1,
        });
      }
    } catch {
      toast.error('İş verileri yüklenemedi.');
    } finally {
      setShipmentsLoading(false);
    }
  };

  const fetchCarrierReviews = async (page: number) => {
    if (!carrierId) return;
    setReviewsLoading(true);
    try {
      const res = await adminApiClient(`/admin/carriers/${carrierId}/reviews?page=${page}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setCarrierReviews(data.data.reviews ?? []);
        setReviewsMeta({
          total: data.data.pagination?.total ?? 0,
          totalPages: data.data.pagination?.totalPages ?? 1,
          averageRating: data.data.averageRating ?? 0,
        });
      }
    } catch {
      toast.error('Yorum verileri yüklenemedi.');
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => { fetchCarrier(); }, [carrierId]);

  useEffect(() => {
    if (activeTab === 'shipments') fetchCarrierShipments(shipmentsPage);
  }, [activeTab, shipmentsPage, carrierId]);

  useEffect(() => {
    if (activeTab === 'reviews') fetchCarrierReviews(reviewsPage);
  }, [activeTab, reviewsPage, carrierId]);

  const handleVerify = async (approved: boolean, reason?: string) => {
    if (!carrierId) return;
    setActionLoading(true);
    try {
      const res = await adminApiClient(`/admin/carriers/${carrierId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, rejectionReason: reason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setCarrier((prev) =>
          prev ? { ...prev, verifiedByAdmin: approved, isActive: approved, rejectionReason: reason } : prev,
        );
        setRejectDialogOpen(false);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <div className="h-5 w-16 bg-slate-200 animate-pulse rounded" />
        <div className="h-8 w-64 bg-slate-200 animate-pulse rounded" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !carrier) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState message="Nakliyeci bilgileri yüklenemedi." onRetry={fetchCarrier} />
      </div>
    );
  }

  const st = resolveCarrierStatus(carrier);
  const isPending = st === 'pending';
  const isVerified = st === 'verified';
  const totalJobs = (carrier.completedShipments ?? 0) + (carrier.cancelledShipments ?? 0);
  const cancelRate = totalJobs > 0 ? Math.round(((carrier.cancelledShipments ?? 0) / totalJobs) * 100) : 0;

  const infoFields = [
    { icon: Phone, label: 'Telefon', value: carrier.phone },
    { icon: Mail, label: 'E-posta', value: carrier.email },
    { icon: MapPin, label: 'Şehir', value: carrier.city },
    { icon: Building2, label: 'Adres', value: carrier.address },
    { icon: Hash, label: 'Vergi No', value: carrier.taxNumber },
    { icon: Calendar, label: 'Kayıt Tarihi', value: carrier.createdAt ? format(new Date(carrier.createdAt), 'dd MMMM yyyy', { locale: tr }) : '—' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Back / Header */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Nakliyeciler
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
            {carrier.companyName?.charAt(0) ?? 'N'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{carrier.companyName}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <StatusBadge status={st} statusMap={CARRIER_STATUS} />
              {(carrier.rating ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  {Number(carrier.rating).toFixed(1)}
                </span>
              )}
              <span className="text-xs text-slate-400">ID: {carrier.id}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPending && (
            <Button size="sm" onClick={() => handleVerify(true)} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Onayla
            </Button>
          )}
          {(isPending || isVerified) && (
            <Button size="sm" variant="destructive" onClick={() => setRejectDialogOpen(true)} disabled={actionLoading}>
              <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reddet
            </Button>
          )}
        </div>
      </div>

      {carrier.rejectionReason && (
        <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span><strong>Red gerekçesi:</strong> {carrier.rejectionReason}</span>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tamamlanan İş', value: carrier.completedShipments ?? 0, icon: Truck },
          { label: 'İptal Oranı', value: `%${cancelRate}`, icon: XCircle, warn: cancelRate > 15 },
          { label: 'Ortalama Puan', value: (carrier.rating ?? 0) > 0 ? Number(carrier.rating).toFixed(1) : '—', icon: Star },
          { label: 'Belgeler', value: carrier.documents?.length ?? 0, icon: FileText },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-slate-200">
            <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${kpi.warn ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className={`text-lg font-semibold tabular-nums ${kpi.warn ? 'text-rose-600' : 'text-slate-800'}`}>{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="general" className="text-xs">Genel Bilgiler</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">
            Belgeler {carrier.documents && carrier.documents.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1.5">{carrier.documents.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="shipments" className="text-xs">İşler</TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs">Yorumlar</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">İletişim & Şirket Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {infoFields.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          {carrier.documents && carrier.documents.length > 0 ? (
            <div className="space-y-2">
              {carrier.documents.map((doc) => (
                <Card key={doc.id} className="border-slate-200">
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{doc.type}</p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(doc.uploadedAt), 'dd MMM yyyy', { locale: tr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={doc.isApproved ? 'verified' : 'pending'} statusMap={DOCUMENT_STATUS} size="sm" />
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        Görüntüle <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={FileText} title="Belge yüklenmemiş" description="Bu nakliyeci henüz belge yüklememiş." />
          )}
        </TabsContent>

        {/* Shipments Tab */}
        <TabsContent value="shipments">
          {shipmentsLoading ? (
            <Card className="border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="font-semibold text-slate-600 text-xs">İlan ID</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs">Güzergah</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs">Müşteri</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs">Durum</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs">Tarih</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-xs">Fiyat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 w-20 bg-slate-200 rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : carrierShipments.length > 0 ? (
            <div className="space-y-3">
              <Card className="border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-semibold text-slate-600 text-xs">İlan ID</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-xs">Güzergah</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-xs">Müşteri</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-xs">Durum</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-xs">Tarih</TableHead>
                      <TableHead className="font-semibold text-slate-600 text-xs">Fiyat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carrierShipments.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs text-gray-400">{s.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm text-slate-600">{s.origin} → {s.destination}</TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={s.status} statusMap={SHIPMENT_STATUS} size="sm" />
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(s.createdAt).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-800">
                          {s.price ? `₺${s.price.toLocaleString('tr-TR')}` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              {shipmentsMeta.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Toplam {shipmentsMeta.total} kayıt</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={shipmentsPage <= 1} onClick={() => setShipmentsPage((p) => p - 1)}>Önceki</Button>
                    <span className="text-xs text-slate-600">{shipmentsPage} / {shipmentsMeta.totalPages}</span>
                    <Button size="sm" variant="outline" disabled={shipmentsPage >= shipmentsMeta.totalPages} onClick={() => setShipmentsPage((p) => p + 1)}>Sonraki</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon={Truck} title="📦 Bu nakliyeci henüz iş almamış" description="Bu nakliyeciye ait iş kaydı bulunamadı." />
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          {reviewsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : carrierReviews.length > 0 ? (
            <div className="space-y-4">
              {/* Summary */}
              <Card className="border-slate-200">
                <CardContent className="py-4 px-5 flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-slate-800">{reviewsMeta.averageRating.toFixed(1)}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < Math.round(reviewsMeta.averageRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-sm text-slate-500">{reviewsMeta.total} yorum</span>
                </CardContent>
              </Card>

              {/* Review Cards */}
              {carrierReviews.map((r) => (
                <Card key={r.id} className="border-slate-200">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {(r.customer || r.user) ? `${(r.customer ?? r.user)!.firstName} ${(r.customer ?? r.user)!.lastName}` : 'Anonim'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm text-slate-700 mb-1.5">{r.comment}</p>}
                    {r.shipment && (
                      <p className="text-xs text-slate-400">📦 {r.shipment.origin} → {r.shipment.destination}</p>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              {reviewsMeta.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Toplam {reviewsMeta.total} yorum</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={reviewsPage <= 1} onClick={() => setReviewsPage((p) => p - 1)}>Önceki</Button>
                    <span className="text-xs text-slate-600">{reviewsPage} / {reviewsMeta.totalPages}</span>
                    <Button size="sm" variant="outline" disabled={reviewsPage >= reviewsMeta.totalPages} onClick={() => setReviewsPage((p) => p + 1)}>Sonraki</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon={Star} title="Henüz yorum yok" description="Bu nakliyeciye henüz yorum yapılmamış." />
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nakliyeciyi Reddet</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reason">Red Gerekçesi (opsiyonel)</Label>
            <Textarea
              id="reason"
              placeholder="Eksik belge, hatalı bilgi vb."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Vazgeç</Button>
            <Button variant="destructive" disabled={actionLoading} onClick={() => handleVerify(false, rejectionReason || undefined)}>
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
