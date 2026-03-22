import { getSessionUser } from '@/lib/storage';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Star, Clock, MapPin, User, Calendar, MessageCircle, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserType, Carrier, Shipment } from '@/lib/types';
import { getCarrierProfileTasks } from '@/lib/utils';
import { reviewsApi, type ReviewRecord } from '@/utils/mockDb';
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
  weight?: number | string;
  price?: number | string;
  shipmentDate?: string;
  createdAt?: string;
  status?: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<UserType | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [offerReceivedCount, setOfferReceivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [carrierStats, setCarrierStats] = useState<DashboardCarrierStats>({
    totalEarnings: 0,
    activeJobs: 0,
    completedJobs: 0,
    rating: 0
  });
  const [myReviews, setMyReviews] = useState<ReviewRecord[]>([]);
  const [reportForId, setReportForId] = useState<string | null>(null);
  const [reportState, setReportState] = useState<{ reason: string; details: string }>({ reason: '', details: '' });
  const { toast } = useToast();
  const navigate = useNavigate();

  const normalizeStatus = (status?: string): Shipment['status'] => {
    switch (status) {
      case 'matched':
        return 'matched';
      case 'completed':
        return 'delivered';
      case 'cancelled':
        return 'cancelled';
      case 'in_transit':
        return 'matched';
      case 'offer_received':
      case 'pending':
      default:
        return 'pending';
    }
  };

  const toUiShipment = (item: BackendShipment): Shipment => {
    const originText = item.origin || '';
    const destinationText = item.destination || '';

    return {
      id: item.id,
      customerId: item.customerId || '',
      origin: {
        address: originText,
        city: originText,
        lat: 0,
        lng: 0
      },
      destination: {
        address: destinationText,
        city: destinationText,
        lat: 0,
        lng: 0
      },
      loadType: 'ev-esyasi',
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
      if (!u) {
        navigate('/giris');
        return;
      }

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
            setOfferReceivedCount(0);
          }
        } else {
          const [pendingResponse, statsResponse] = await Promise.all([
            apiClient(`${API_BASE_URL}/shipments/pending`),
            apiClient(`${API_BASE_URL}/carriers/me/stats`)
          ]);

          const pendingJson = await pendingResponse.json();
          const statsJson = await statsResponse.json();

          if (pendingResponse.ok && pendingJson?.success && Array.isArray(pendingJson.data)) {
            setShipments((pendingJson.data as BackendShipment[]).map(toUiShipment));
          } else {
            setShipments([]);
          }

          if (statsResponse.ok && statsJson?.success && statsJson?.data) {
            setCarrierStats({
              totalEarnings: Number(statsJson.data.totalEarnings || 0),
              activeJobs: Number(statsJson.data.activeJobs || 0),
              completedJobs: Number(statsJson.data.completedJobs || 0),
              rating: Number(statsJson.data.rating || 0)
            });
          }

          const list = reviewsApi.getByCarrier(u.id).filter(r => (r.status ?? 'aktif') === 'aktif');
          setMyReviews(list.sort((a,b) => (a.tarih < b.tarih ? 1 : -1)));
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
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'in-transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'accepted': return 'Kabul Edildi';
      case 'in-transit': return 'Yolda';
      case 'delivered': return 'Teslim Edildi';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {user.type === 'customer' ? `Merhaba ${user.name}, taşınmaya hazır mısın?` : `Hoş geldiniz, ${user.name}!`}
        </h1>
        <p className="text-gray-600 mt-2">
          {user.type === 'customer' ? 'Teklifleri ve taleplerinizi buradan yönetin' : 'Mevcut işleri görüntüleyin ve takviminizi yönetin'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {user.type === 'customer' ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Taşıma</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{shipments.length}</div>
                <p className="text-xs text-muted-foreground">Tüm zamanlar</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bekleyen</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {shipments.filter(s => s.status === 'pending').length}
                </div>
                <p className="text-xs text-muted-foreground">Onay bekliyor</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gelen Teklifler</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {offerReceivedCount}
                </div>
                <p className="text-xs text-muted-foreground">Değerlendirme bekliyor</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {shipments.filter(s => s.status === 'delivered').length}
                </div>
                <p className="text-xs text-muted-foreground">Başarılı teslimat</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Profil Tamamlama - Her nakliyeci için görünür */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Profil Tamamlama</CardTitle>
                <CardDescription>Eksik bilgilerinizi tamamlayın, daha çok işe çıkın</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const c = user as Carrier;
                  const { tasks, percent, isComplete } = getCarrierProfileTasks(c);
                  return (
                    <div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-green-500" style={{ width: `${percent}%` }} />
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-gray-600">Tamamlanma: <span className="font-semibold text-gray-900">%{percent}</span></div>
                        {!isComplete ? (
                          <div className="flex items-center text-yellow-700 bg-yellow-50 px-2 py-1 rounded text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Eksik bilgiler yüzünden bazı işlere katılamazsınız
                          </div>
                        ) : (
                          <div className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Öne Çıkan Nakliyeci
                          </div>
                        )}
                      </div>
                      {!isComplete && (
                        <div className="mb-3">
                          <Button size="sm" onClick={() => navigate('/profilim')}>
                            Profili tamamen tamamla
                          </Button>
                        </div>
                      )}
                      <ul className="space-y-2">
                        {tasks.map(t => (
                          <li key={t.key} className="flex items-center justify-between p-2 rounded border bg-white">
                            <span className="text-sm">{t.label}</span>
                            {t.done ? (
                              <Badge className="bg-green-100 text-green-800">Tamamlandı</Badge>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => {
                                // Basit yönlendirmeler - ileride özel sayfalara bağlanabilir
                                navigate('/profilim');
                              }}>Tamamla</Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Kazanç</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₺{carrierStats.totalEarnings.toLocaleString('tr-TR')}</div>
                <p className="text-xs text-muted-foreground">Toplam gelir</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Puan</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{carrierStats.rating.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Mevcut puan</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mevcut İşler</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{carrierStats.activeJobs}</div>
                <p className="text-xs text-muted-foreground">Uygun işler</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bu Ay Müsaitlik</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {carrierStats.completedJobs}
                </div>
                <p className="text-xs text-muted-foreground">Tamamlanan işler</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mb-8">
        {user.type !== 'customer' ? (
          <div className="flex flex-wrap gap-4">
            <Link to="/ilanlar">
              <Button size="lg">
                <Truck className="h-4 w-4 mr-2" />
                Mevcut İşleri Görüntüle
              </Button>
            </Link>
            <Link to="/takvim">
              <Button variant="outline" size="lg">
                <Calendar className="h-4 w-4 mr-2" />
                Takvimi Yönet
              </Button>
            </Link>
          </div>
        ) : null}
      </div>

      {/* Carrier: Beni Değerlendirenler */}
      {user.type === 'carrier' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Beni Değerlendirenler</CardTitle>
            <CardDescription>Son müşteri yorumlarını buradan görüntüleyin</CardDescription>
          </CardHeader>
          <CardContent>
            {myReviews.slice(0,3).map(y => {
              const name = y.kullanici;
              return (
                <div key={y.id} className="border-b pb-3 mb-3 last:border-0">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-800">{name.split(' ')[0]} {name.split(' ')[1]?.[0]}***</span>
                    <span className="text-xs text-gray-500">{new Date(y.tarih).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <p className="text-gray-700 mt-1">{y.yorum}</p>
                  <div className="flex gap-2 text-xs text-gray-600 mt-1">
                    <span>Dakiklik: {y.puanlar.dakiklik}/5</span>
                    <span>İletişim: {y.puanlar.iletisim}/5</span>
                    <span>Özen: {y.puanlar.ozen}/5</span>
                    <span>Profesyonellik: {y.puanlar.profesyonellik}/5</span>
                  </div>
                </div>
              );
            })}
            <div className="mt-2 text-right">
              <Link to="/nakliyeci/yorumlar">
                <Button size="sm" variant="outline">Tümünü Gör</Button>
              </Link>
            </div>
            {myReviews.length === 0 && (
              <div className="text-gray-500 text-sm">Henüz yorum yapılmamış.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity + Yan kutular */}
      <Card>
        <CardHeader>
          <CardTitle>{user.type === 'customer' ? 'Son Taşıma Taleplerin' : 'Mevcut İşler'}</CardTitle>
          <CardDescription>
            {user.type === 'customer' 
              ? 'Oluşturduğunuz taşıma taleplerinin durumu ve gelen teklifler'
              : 'Size uygun taşıma işleri'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Henüz ilan yok
            </div>
          ) : (
            <div className="space-y-4">
              {shipments.slice(0, 5).map((shipment) => {
                return (
                  <div key={shipment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {shipment.origin.city} → {shipment.destination.city}
                        </span>
                        <Badge className={getStatusColor(shipment.status)}>
                          {getStatusText(shipment.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-800">{shipment.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{shipment.weight}kg</span>
                        <span>{shipment.distance}km</span>
                        <span>{shipment.price}₺</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {user.type === 'carrier' && shipment.status === 'pending' && (
                        (() => {
                          const { isComplete } = getCarrierProfileTasks(user as Carrier);
                          return isComplete ? (
                            <Button size="sm" variant="outline" disabled>
                              Teklif Ver
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => navigate('/profilim')}>
                              Profili tamamla
                            </Button>
                          );
                        })()
                      )}
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report dialog */}
      {reportForId && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setReportForId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yorumu Şikayet Et</DialogTitle>
              <DialogDescription>Bu yorumu neden şikayet ediyorsunuz?</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label className="text-sm">Gerekçe</Label>
                <div className="flex flex-wrap gap-2">
                  {['Argo / küfür', 'Yanlış bilgi', 'Haksız değerlendirme'].map(r => (
                    <Button key={r} type="button" variant={reportState.reason === r ? 'default' : 'outline'} size="sm" onClick={() => setReportState(s => ({ ...s, reason: r }))}>{r}</Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm">Açıklama</Label>
                <Textarea rows={3} value={reportState.details} onChange={(e) => setReportState(s => ({ ...s, details: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReportForId(null)}>İptal</Button>
              <Button onClick={() => {
                if (!reportState.reason) { toast({ title: 'Gerekçe seçin' }); return; }
                reviewsApi.report(reportForId, { reason: reportState.reason, details: reportState.details });
                setMyReviews(prev => prev.map(r => r.id === reportForId ? { ...r, status: 'askida' } : r));
                setReportForId(null);
                setReportState({ reason: '', details: '' });
                toast({ title: 'Şikayet alındı', description: 'Yorum incelemeye alındı.' });
              }}>Gönder</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {user.type === 'customer' && (
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sadakat Durumu</CardTitle>
              <CardDescription>3 taşımadan sonra %10 indirim</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge className="bg-purple-100 text-purple-800">2/3 • Bronze</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Kampanyalar</CardTitle>
              <CardDescription>Güncel promosyonlar</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/campaigns" className="text-blue-600 text-sm">Tüm kampanyaları gör</Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Destek</CardTitle>
              <CardDescription>Sorun mu var? Yardımcı olalım.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/support" className="text-blue-600 text-sm">Destek merkezine git</Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}