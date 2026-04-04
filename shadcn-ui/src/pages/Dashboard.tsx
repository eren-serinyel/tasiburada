import { getSessionUser } from '@/lib/storage';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Package, Star, Clock, MapPin, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight, ArrowRight, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserType, Carrier, Shipment } from '@/lib/types';
import { getCarrierProfileTasks } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = '/api/v1';

type DashboardCarrierStats = {
  totalEarnings: number;
  activeJobs: number;
  completedJobs: number;
  rating: number;
};

type BackendShipment = {
  id: string;
  customerId?: string;
  origin?: string;
  destination?: string;
  loadDetails?: string;
  transportType?: string;
  weight?: number | string;
  price?: number | string;
  shipmentDate?: string;
  createdAt?: string;
  status?: string;
};

type ActiveOffer = {
  id: string;
  shipmentId?: string;
  price: number;
  status: string;
  offeredAt: string;
  shipment?: {
    id: string;
    origin?: string;
    destination?: string;
    loadDetails?: string;
    weight?: number | string;
    shipmentDate?: string;
    status?: string;
  };
};

type ApiNotification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<UserType | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [pendingShipments, setPendingShipments] = useState<BackendShipment[]>([]);
  const [activeOffers, setActiveOffers] = useState<ActiveOffer[]>([]);
  const [offerReceivedCount, setOfferReceivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [carrierStats, setCarrierStats] = useState<DashboardCarrierStats>({
    totalEarnings: 0,
    activeJobs: 0,
    completedJobs: 0,
    rating: 0
  });
  const [recentNotifications, setRecentNotifications] = useState<ApiNotification[]>([]);
  const [myReviews, setMyReviews] = useState<Array<{ id: string; rating: number; comment: string; createdAt: string; customer?: { firstName: string; lastName: string } }>>([]);
  const [reportForId, setReportForId] = useState<string | null>(null);
  const [reportState, setReportState] = useState<{ reason: string; details: string }>({ reason: '', details: '' });
  const { toast } = useToast();
  const navigate = useNavigate();

  const normalizeStatus = (status?: string): Shipment['status'] => {
    // Backend enum değerlerini olduğu gibi kullan, sadece küçük harfe normalize et
    return ((status ?? 'pending').toLowerCase()) as Shipment['status'];
  };

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: {
      label: 'Bekliyor',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50 border-yellow-200',
    },
    offer_received: {
      label: 'Teklif Alındı',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200',
    },
    matched: {
      label: 'Nakliyeci Seçildi',
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50 border-indigo-200',
    },
    in_transit: {
      label: 'Taşınıyor',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50 border-orange-200',
    },
    completed: {
      label: 'Tamamlandı',
      color: 'text-green-700',
      bgColor: 'bg-green-50 border-green-200',
    },
    cancelled: {
      label: 'İptal Edildi',
      color: 'text-red-700',
      bgColor: 'bg-red-50 border-red-200',
    },
  };

  const toUiShipment = (item: BackendShipment): Shipment => {
    const originText = item.origin || '';
    const destinationText = item.destination || '';
    return {
      id: item.id,
      customerId: item.customerId || '',
      origin: { address: originText, city: originText, lat: 0, lng: 0 },
      destination: { address: destinationText, city: destinationText, lat: 0, lng: 0 },
      loadType: (item.transportType as Shipment['loadType']) || 'ev-esyasi',
      weight: Number(item.weight || 0),
      date: item.shipmentDate ? new Date(item.shipmentDate) : new Date(),
      description: item.loadDetails || '',
      distance: 0,
      status: normalizeStatus(item.status),
      price: Number(item.price || 0),
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
    };
  };

  useEffect(() => {
    const loadDashboard = async () => {
      const u: UserType | null = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
      if (!u) { navigate('/giris'); return; }
      setUser(u);
      setLoading(true);

      try {
        if (u.type === 'customer') {
          const response = await apiClient(`${API_BASE_URL}/customers/shipments`);
          const json = await response.json();
          if (response.ok && json?.success && Array.isArray(json.data)) {
            const apiShipments = json.data as BackendShipment[];
            setShipments(apiShipments.map(toUiShipment));
            setOfferReceivedCount(apiShipments.filter(item => item.status === 'offer_received').length);
          } else {
            setShipments([]);
          }
        } else {
          // Nakliyeci: aktif teklifler + uygun ilanlar + stats + yorumlar + bildirimler
          const [activeOffersResult, pendingResult, statsResult, reviewsResult, notifsResult] = await Promise.allSettled([
            apiClient(`${API_BASE_URL}/carriers/me/offers`),
            apiClient(`${API_BASE_URL}/shipments/pending`),
            apiClient(`${API_BASE_URL}/carriers/me/stats`),
            apiClient(`${API_BASE_URL}/carriers/me/reviews`),
            apiClient(`${API_BASE_URL}/notifications`)
          ]);

          if (activeOffersResult.status === 'fulfilled') {
            const activeOffersRes = activeOffersResult.value;
            const activeOffersJson = await activeOffersRes.json();
            const offerList = Array.isArray(activeOffersJson?.data)
              ? activeOffersJson.data
              : Array.isArray(activeOffersJson?.data?.data)
                ? activeOffersJson.data.data
                : [];

            const accepted = (offerList as ActiveOffer[]).filter(offer => offer.status === 'accepted');
            setActiveOffers(accepted);
          } else {
            setActiveOffers([]);
          }

          if (pendingResult.status === 'fulfilled') {
            const pendingRes = pendingResult.value;
            const pendingJson = await pendingRes.json();
            if (pendingRes.ok && pendingJson?.success && Array.isArray(pendingJson.data)) {
              setPendingShipments(pendingJson.data as BackendShipment[]);
            }
          }

          if (statsResult.status === 'fulfilled') {
            const statsRes = statsResult.value;
            const statsJson = await statsRes.json();
            if (statsRes.ok && statsJson?.success && statsJson?.data) {
              setCarrierStats({
                totalEarnings: Number(statsJson.data.totalEarnings || 0),
                activeJobs: Number(statsJson.data.activeJobs || 0),
                completedJobs: Number(statsJson.data.completedJobs || 0),
                rating: Number(statsJson.data.rating || 0)
              });
            }
          }

          if (reviewsResult.status === 'fulfilled') {
            const reviewsRes = reviewsResult.value;
            const reviewsJson = await reviewsRes.json();
            if (reviewsRes.ok && reviewsJson?.success && Array.isArray(reviewsJson.data)) {
              setMyReviews(reviewsJson.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            }
          }

          if (notifsResult.status === 'fulfilled') {
            const notifsRes = notifsResult.value;
            const notifsJson = await notifsRes.json();
            if (notifsRes.ok && notifsJson?.success && Array.isArray(notifsJson.data)) {
              setRecentNotifications(notifsJson.data.slice(0, 4));
            }
          }
        }
      } catch {
        setShipments([]);
        setOfferReceivedCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton className="h-12 w-72" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-10 w-64" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const getShipmentStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Bekliyor</Badge>;
      case 'offer_received': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Teklif Var</Badge>;
      case 'matched': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Eşleşti</Badge>;
      case 'in_transit': return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Yolda</Badge>;
      case 'completed': return <Badge className="bg-green-100 text-green-800 border-green-200">Tamamlandı</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-800 border-red-200">İptal</Badge>;
      case 'accepted': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Eşleşti</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{status || 'Bilinmiyor'}</Badge>;
    }
  };

  const getOfferStatusLabel = (status?: string) => {
    const map: Record<string, string> = {
      accepted: 'Eşleşti',
      matched: 'Eşleşti',
      in_transit: 'Yolda',
      completed: 'Tamamlandı',
      pending: 'Bekliyor'
    };
    return map[status || ''] || status || '';
  };

  const getStatusColor = (status: string) => {
    const cfg = statusConfig[status];
    return cfg ? `${cfg.bgColor} ${cfg.color}` : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusText = (status: string) => {
    return statusConfig[status]?.label ?? status;
  };

  // ── Nakliyeci Dashboard ─────────────────────────────────────────────────────
  if (user.type === 'carrier') {
    const carrier = user as Carrier;
    const { tasks, percent, isComplete } = getCarrierProfileTasks(carrier);
    const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const displayName = (carrier as any).companyName || carrier.name || 'Profil';

    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

          {/* ── Karşılama ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Hoş geldiniz, {displayName} 👋
              </h1>
              <p className="text-gray-500 text-sm mt-1">{today}</p>
            </div>
            <Link to="/ilanlar">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Truck className="h-4 w-4" /> Tüm İlanları Gör
              </Button>
            </Link>
          </div>

          {/* ── KPI Kartları ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-xl shadow-sm border-l-4 border-blue-500">
              <CardContent className="pt-5 pb-4 px-5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Toplam Kazanç</p>
                <p className="text-2xl font-bold text-gray-900">₺{carrierStats.totalEarnings.toLocaleString('tr-TR')}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm border-l-4 border-green-500">
              <CardContent className="pt-5 pb-4 px-5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Aktif İş</p>
                <p className="text-2xl font-bold text-gray-900">{activeOffers.length}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm border-l-4 border-purple-500">
              <CardContent className="pt-5 pb-4 px-5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Tamamlanan</p>
                <p className="text-2xl font-bold text-gray-900">{carrierStats.completedJobs}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm border-l-4 border-yellow-400">
              <CardContent className="pt-5 pb-4 px-5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Puan</p>
                <p className="text-2xl font-bold text-gray-900">
                  {carrierStats.rating > 0 ? carrierStats.rating.toFixed(1) : '—'} <span className="text-base font-normal text-yellow-500">⭐</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Ana İçerik: Tabs ── */}
          <Tabs defaultValue="active">
            <TabsList className="bg-white border rounded-xl shadow-sm px-1 py-1 gap-1">
              <TabsTrigger value="active" className="rounded-lg px-5 py-2 text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                🚚 Aktif İşlerim ({activeOffers.length})
              </TabsTrigger>
              <TabsTrigger value="available" className="rounded-lg px-5 py-2 text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                📦 Uygun İşler ({pendingShipments.length})
              </TabsTrigger>
            </TabsList>

            {/* Aktif İşlerim */}
            <TabsContent value="active" className="mt-4 space-y-3">
              {activeOffers.length === 0 ? (
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="py-16 text-center">
                    <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Henüz aktif işiniz yok</p>
                    <p className="text-gray-400 text-sm mt-1">Uygun işler sekmesinden teklif verin</p>
                  </CardContent>
                </Card>
              ) : (
                activeOffers.map(offer => (
                  <Card
                    key={offer.id}
                    className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => offer.shipment?.id && navigate(`/ilan/${offer.shipment.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-semibold text-gray-900">
                              {offer.shipment?.origin || '—'} <ArrowRight className="inline h-4 w-4 text-gray-400" /> {offer.shipment?.destination || '—'}
                            </span>
                            {getShipmentStatusBadge(offer.shipment?.status || offer.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                            {offer.shipment?.loadDetails && <span>{offer.shipment.loadDetails}</span>}
                            {offer.shipment?.shipmentDate && (
                              <span>{new Date(offer.shipment.shipmentDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-blue-700">{Number(offer.price).toLocaleString('tr-TR')} ₺</span>
                          <Link to={`/ilan/${offer.shipment?.id || offer.shipmentId || ''}`} onClick={e => e.stopPropagation()}>
                            <Button size="sm" variant="outline" className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50">
                              Detayı Gör <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Uygun İşler */}
            <TabsContent value="available" className="mt-4 space-y-3">
              {pendingShipments.length === 0 ? (
                <Card className="rounded-xl shadow-sm">
                  <CardContent className="py-16 text-center">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Uygun iş bulunamadı</p>
                    <p className="text-gray-400 text-sm mt-1">Yeni ilanlar geldiğinde burada görünecek</p>
                  </CardContent>
                </Card>
              ) : (
                pendingShipments.map(item => (
                  <Card key={item.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/nakliyeci/yanit/${item.id}`)}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-semibold text-gray-900">
                              {item.origin || '—'} <ArrowRight className="inline h-4 w-4 text-gray-400" /> {item.destination || '—'}
                            </span>
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Bekliyor</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                            {item.loadDetails && <span>{item.loadDetails}</span>}
                            {item.weight && <span>{Number(item.weight)} kg</span>}
                            {item.shipmentDate && (
                              <span>{new Date(item.shipmentDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Link to={`/nakliyeci/yanit/${item.id}`} onClick={e => e.stopPropagation()}>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
                              Teklif Ver <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>

          {/* ── Alt İki Kutu: Profil & Bildirimler ── */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Profil Durumu */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" /> Profil Durumu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Tamamlanma: <span className="font-semibold text-gray-900">%{percent}</span></span>
                  {isComplete ? (
                    <span className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Tamamlandı
                    </span>
                  ) : (
                    <span className="flex items-center text-yellow-700 bg-yellow-50 px-2 py-1 rounded text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Eksik var
                    </span>
                  )}
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                </div>
                <ul className="space-y-1.5">
                  {tasks.map(t => (
                    <li key={t.key} className="flex items-center justify-between text-sm">
                      <span className={t.done ? 'text-gray-400 line-through' : 'text-gray-700'}>{t.label}</span>
                      {t.done
                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                        : <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-blue-600" onClick={() => navigate('/profilim')}>Tamamla</Button>
                      }
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Son Bildirimler */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-600" /> Son Bildirimler
                </CardTitle>
                <Link to="/bildirimler">
                  <Button size="sm" variant="ghost" className="text-xs text-blue-600 h-7">Tümü</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentNotifications.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Henüz bildirim yok</p>
                ) : (
                  <ul className="space-y-2">
                    {recentNotifications.map(n => (
                      <li key={n.id} className={`flex items-start gap-2 text-sm rounded-lg p-2 ${n.isRead ? 'opacity-60' : 'bg-blue-50'}`}>
                        <span className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${n.isRead ? 'bg-gray-300' : 'bg-blue-500'}`} />
                        <div>
                          <p className="font-medium text-gray-800 leading-snug">{n.title}</p>
                          <p className="text-gray-500 text-xs">{n.message}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Son Yorumlar */}
          {myReviews.length > 0 && (
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" /> Müşteri Yorumları
                </CardTitle>
                <Link to="/nakliyeci/yorumlar">
                  <Button size="sm" variant="ghost" className="text-xs text-blue-600 h-7">Tümü</Button>
                </Link>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {myReviews.slice(0, 3).map(y => {
                    const name = y.customer ? `${y.customer.firstName} ${y.customer.lastName[0]}***` : 'Anonim';
                    return (
                      <li key={y.id} className="border-b pb-3 last:border-0">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-sm text-gray-800">{name}</span>
                          <span className="text-xs text-gray-400">{new Date(y.createdAt).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <p className="text-sm text-gray-700">{y.comment}</p>
                        <span className="text-xs text-yellow-600">{'★'.repeat(y.rating)}{'☆'.repeat(5 - y.rating)}</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    );
  }

  // ── Müşteri Dashboard ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Karşılama */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Merhaba, {user.name} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Link to="/teklif-talebi">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Package className="h-4 w-4" /> Yeni İlan Oluştur
            </Button>
          </Link>
        </div>

        {/* KPI Kartları */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-xl shadow-sm border-l-4 border-blue-500">
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Toplam İlan</p>
              <p className="text-2xl font-bold text-gray-900">{shipments.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border-l-4 border-yellow-400">
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Bekleyen</p>
              <p className="text-2xl font-bold text-gray-900">{shipments.filter(s => s.status === 'pending').length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border-l-4 border-green-500">
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Gelen Teklifler</p>
              <p className="text-2xl font-bold text-blue-600">{offerReceivedCount}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border-l-4 border-purple-500">
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Tamamlanan</p>
              <p className="text-2xl font-bold text-gray-900">{shipments.filter(s => s.status === 'completed').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* İlan Listesi */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" /> Son Taşıma Taleplerim
            </CardTitle>
            <Link to="/ilanlarim">
              <Button size="sm" variant="ghost" className="text-xs text-blue-600 h-7">Tümü</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {shipments.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Henüz ilan oluşturmadınız</p>
                <Link to="/teklif-talebi">
                  <Button className="mt-3" size="sm">İlk İlanınızı Oluşturun</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {shipments.slice(0, 5).map(shipment => (
                  <div key={shipment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-xl hover:shadow-sm transition-shadow">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{shipment.origin.city} → {shipment.destination.city}</span>
                        <Badge className={getStatusColor(shipment.status)}>{getStatusText(shipment.status)}</Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        {shipment.description && <span>{shipment.description}</span>}
                        {shipment.weight > 0 && <span>{shipment.weight} kg</span>}
                        <span>{shipment.date.toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                    <Link to="/tekliflerim">
                      <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-1">
                        Teklifleri Gör <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alt linkler */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="py-5 px-5">
              <p className="font-medium text-gray-800 mb-1">Sadakat Durumu</p>
              <p className="text-xs text-gray-500 mb-2">3 taşımadan sonra %10 indirim</p>
              <Badge className="bg-purple-100 text-purple-800">Bronze</Badge>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="py-5 px-5">
              <p className="font-medium text-gray-800 mb-1">Kampanyalar</p>
              <p className="text-xs text-gray-500 mb-2">Güncel promosyonlar</p>
              <Link to="/campaigns" className="text-blue-600 text-sm font-medium">Kampanyaları Gör →</Link>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm">
            <CardContent className="py-5 px-5">
              <p className="font-medium text-gray-800 mb-1">Destek</p>
              <p className="text-xs text-gray-500 mb-2">Sorun mu var? Yardımcı olalım.</p>
              <Link to="/support" className="text-blue-600 text-sm font-medium">Destek Merkezi →</Link>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}