import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Truck, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Star, 
  TrendingUp, 
  Bell, 
  ArrowRight, 
  Search, 
  Package,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getCarrierProfileTasks } from '@/lib/utils';
import { Shipment, User } from '@/lib/types';
import { getSessionUser, setSessionUser } from '@/lib/storage';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/lib/apiClient';

type PendingShipmentApi = {
  id: string;
  origin?: string;
  destination?: string;
  loadDetails?: string;
  weight?: number | string;
  price?: number | string;
  shipmentDate?: string;
  status?: string;
};

export default function CarrierHome() {
  const [user, setUser] = useState<User | null>(null);
  const [profileCompletion, setProfileCompletion] = useState<number | null>(null);
  const [pendingJobs, setPendingJobs] = useState<Shipment[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const navigate = useNavigate();
  const API_BASE_URL = '/api/v1';

  useEffect(() => {
    const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
    setUser(u);
  }, []);

  useEffect(() => {
    if (!user || user.type !== 'carrier') return;
    let ignore = false;

    const fetchProfileCompletion = async () => {
      try {
        // Use the dedicated status endpoint for fresh calculation
        const res = await apiClient(`${API_BASE_URL}/carriers/me/profile-status`);
        const json = await res.json();
        if (!res.ok || !json?.success) return;
        
        // Data comes directly as the status object
        const percent = Number(json.data?.overallPercentage);
        
        if (!ignore && Number.isFinite(percent)) {
          const clamped = Math.max(0, Math.min(100, Math.round(percent)));
          setProfileCompletion(clamped);
          localStorage.setItem('profileCompletion', String(clamped));
          
          // Update user state if changed
          if (user && user.profileCompletion !== clamped) {
             const updatedUser = { ...user, profileCompletion: clamped };
             setUser(updatedUser);
             setSessionUser(updatedUser);
          }
        }
      } catch {}
    };

    fetchProfileCompletion();
    return () => {
      ignore = true;
    };
  }, [user?.id, user?.type]);

  const [stats, setStats] = useState({
    totalEarnings: 0,
    activeJobs: 0,
    completedJobs: 0,
    rating: 0
  });

  useEffect(() => {
    if (!user || user.type !== 'carrier') return;
    
    const fetchStats = async () => {
      try {
        const res = await apiClient(`${API_BASE_URL}/carriers/me/stats`);
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setStats({
            totalEarnings: Number(json.data.totalEarnings) || 0,
            activeJobs: Number(json.data.activeJobs) || 0,
            completedJobs: Number(json.data.totalJobs) || 0, // Using totalJobs as completed for now or strictly completed
            rating: Number(json.data.averageRating) || 0
          });
        }
      } catch (err) {
        console.error("Stats fetch error:", err);
      }
    };
    
    fetchStats();
  }, [user]);

  useEffect(() => {
    if (!user || user.type !== 'carrier') return;

    const fetchPending = async () => {
      setPendingLoading(true);
      try {
        const res = await apiClient(`${API_BASE_URL}/shipments/pending`);
        const json = await res.json();

        if (res.ok && json?.success && Array.isArray(json.data)) {
          const mapped: Shipment[] = (json.data as PendingShipmentApi[]).map(item => ({
            id: item.id,
            customerId: '',
            origin: {
              address: item.origin || '',
              city: item.origin || '',
              lat: 0,
              lng: 0
            },
            destination: {
              address: item.destination || '',
              city: item.destination || '',
              lat: 0,
              lng: 0
            },
            loadType: 'ev-esyasi',
            weight: Number(item.weight || 0),
            date: item.shipmentDate ? new Date(item.shipmentDate) : new Date(),
            requestedDate: item.shipmentDate ? new Date(item.shipmentDate) : new Date(),
            description: item.loadDetails || '',
            distance: 0,
            status: 'pending',
            price: Number(item.price || 0),
            createdAt: new Date()
          }));
          setPendingJobs(mapped.slice(0, 5));
        } else {
          setPendingJobs([]);
        }
      } catch {
        setPendingJobs([]);
      } finally {
        setPendingLoading(false);
      }
    };

    fetchPending();
  }, [user]);

  const completedJobsCount = stats.completedJobs;
  const totalEarnings = stats.totalEarnings;
  const rating = stats.rating;

  const fallbackProgress = user ? getCarrierProfileTasks(user as any) : { percent: 0, isComplete: false };
  const percentFromDb = profileCompletion ?? user?.profileCompletion;
  const percent = typeof percentFromDb === 'number' && Number.isFinite(percentFromDb)
    ? Math.max(0, Math.min(100, Math.round(percentFromDb)))
    : fallbackProgress.percent;
  const profileReady = typeof percentFromDb === 'number'
    ? percent >= 100
    : fallbackProgress.isComplete;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-10">
      {/* Header Section */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Merhaba, {user?.name || 'Nakliyeci'} 👋
            </h1>
            <p className="text-sm text-gray-500">İşlerini yönet ve yeni fırsatları keşfet.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:flex" asChild>
              <Link to="/takvim">
                <Calendar className="mr-2 h-4 w-4" />
                Takvim
              </Link>
            </Button>
            <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
              <Link to="/carrier/directory">
                <Search className="mr-2 h-4 w-4" />
                Yük Ara
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard 
            title="Toplam Kazanç" 
            value={`₺${totalEarnings.toLocaleString('tr-TR')}`} 
            description="+₺2,500 geçen aydan" 
            icon={DollarSign}
            trend="up"
          />
          <StatsCard 
            title="Aktif İşler" 
            value={pendingJobs.length.toString()} 
            description="3 teslimat yolda" 
            icon={Truck}
          />
          <StatsCard 
            title="Tamamlanan" 
            value={completedJobsCount.toString()} 
            description="Bu yıl toplam" 
            icon={CheckCircle2}
          />
          <StatsCard 
            title="Mağaza Puanı" 
            value={rating.toString()} 
            description="5 üzerinden" 
            icon={Star}
            highlight
          />
        </div>

        <div className="grid gap-8 md:grid-cols-7">
          
          {/* Main Content Area */}
          <div className="md:col-span-4 lg:col-span-5 space-y-6">
            
            {/* Action Banner if Profile/Docs Incomplete */}
            {!profileReady && (
              <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100 shadow-sm">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-full text-amber-600 shrink-0">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900 text-lg">Hesap Onayı Bekleniyor</h3>
                    <p className="text-amber-700 mt-1">
                      Teklif vermeye başlamak için profilini tamamlaman ve gerekli belgeleri yüklemen gerekiyor.
                      Şu an profilin %{percent} tamamlandı.
                    </p>
                    <Button variant="outline" className="mt-4 border-amber-200 text-amber-800 hover:bg-amber-100" asChild>
                      <Link to="/profilim">Profili Tamamla</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="available" className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
                  <TabsTrigger value="available">Sizin İçin Önerilenler</TabsTrigger>
                  <TabsTrigger value="active">Aktif İşlerim</TabsTrigger>
                </TabsList>
                <Link to="/carrier/directory" className="text-sm text-blue-600 hover:underline flex items-center font-medium">
                  Tüm İlanları Gör <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>

              <TabsContent value="available" className="space-y-4">
                {pendingLoading ? (
                  <Card className="flex items-center justify-center py-10">
                    <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
                  </Card>
                ) : pendingJobs.length === 0 ? (
                  <Card className="flex items-center justify-center py-10 text-gray-500">Henüz ilan yok</Card>
                ) : (
                  pendingJobs.map((job) => (
                    <Card key={job.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Bekliyor</Badge>
                            <span className="text-xs text-gray-500 font-mono">#{job.id.substring(0,8)}</span>
                          </div>
                          <span className="font-bold text-lg text-gray-900">₺{Number(job.price || 0).toLocaleString('tr-TR')}</span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500">Nereden</p>
                            <p className="font-medium text-gray-900">{job.origin.city || job.origin.address}</p>
                            <p className="text-sm text-gray-500">Nereye</p>
                            <p className="font-medium text-gray-900">{job.destination.city || job.destination.address}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500">Yük</p>
                            <p className="font-medium text-gray-900">{job.weight} kg</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="active" className="space-y-4">
                {pendingJobs.length === 0 ? (
                  <Card className="flex flex-col items-center justify-center py-12 text-center border-dashed">
                    <Package className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-900">Aktif iş bulunamadı</p>
                    <p className="text-sm text-gray-500 max-w-sm mt-1 mx-auto">Şu anda üzerinde çalıştığınız bir taşıma işi yok. Fırsatları inceleyip teklif verin.</p>
                    <Button className="mt-6" asChild>
                       <Link to="/carrier/directory">İş Ara</Link>
                    </Button>
                  </Card>
                ) : (
                  pendingJobs.map((job) => (
                    <Card key={job.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant={job.status === 'matched' ? 'default' : 'secondary'} className={job.status === 'matched' ? 'bg-green-600' : ''}>
                              {job.status === 'matched' ? 'Onaylandı' : 'Teklif Verildi'}
                            </Badge>
                            <span className="text-xs text-gray-500 font-mono">#{job.id.substring(0,8)}</span>
                          </div>
                          <span className="font-bold text-lg text-gray-900">₺{job.price.toLocaleString()}</span>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1.5 bg-blue-50 rounded-full text-blue-600">
                                        <MapPin className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-medium">Nereden</p>
                                        <p className="font-medium text-gray-900">{job.origin.city || job.origin.address}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1.5 bg-orange-50 rounded-full text-orange-600">
                                        <MapPin className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-medium">Nereye</p>
                                        <p className="font-medium text-gray-900">{job.destination.city || job.destination.address}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col justify-center space-y-2 pl-0 md:pl-4 border-l-0 md:border-l border-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="h-4 w-4 opacity-70" />
                                    <span>Teslimat: {new Date(job.requestedDate || job.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Package className="h-4 w-4 opacity-70" />
                                    <span>{job.weight} kg Yük</span>
                                </div>
                            </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-6 py-3 border-t flex justify-end">
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                              Detayları Gör <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="md:col-span-3 lg:col-span-2 space-y-6">
            
            {/* Profile Completion Widget */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Profil Durumu</CardTitle>
                <CardDescription>Hesap onayı ve güvenilirlik</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-bold text-gray-900">%{percent}</span>
                        <span className={`text-sm font-medium ${percent >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
                            {percent >= 100 ? 'Tamamlandı' : 'Eksikler var'}
                        </span>
                    </div>
                    <Progress value={percent} className="h-2" />
                    
                    <div className="space-y-2 pt-2">
                        <CheckItem label="Firma Bilgileri" checked={true} />
                        <CheckItem label="Vergi Levhası" checked={user?.verificationStatus === 'verified'} />
                        <CheckItem label="K3 Yetki Belgesi" checked={false} />
                        <CheckItem label="Araç Fotoğrafları" checked={false} />
                    </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 border-t p-4">
                  <Button variant="outline" className="w-full text-xs h-8" asChild>
                    <Link to="/profilim">Profili Düzenle</Link>
                  </Button>
              </CardFooter>
            </Card>

            {/* Recent Notifications / Activity */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                        Bildirimler
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">2 Yeni</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex gap-3 items-start">
                         <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-0.5">
                             <Bell className="h-3 w-3" />
                         </div>
                         <div>
                             <p className="text-sm font-medium text-gray-900">Yeni İş Fırsatı</p>
                             <p className="text-xs text-gray-500 mt-0.5">Bölgendeki "İstanbul - İzmir" rotasında yeni bir ilan var.</p>
                             <p className="text-[10px] text-gray-400 mt-1">10 dk önce</p>
                         </div>
                     </div>
                     <Separator />
                     <div className="flex gap-3 items-start">
                         <div className="bg-green-100 p-2 rounded-full text-green-600 mt-0.5">
                             <DollarSign className="h-3 w-3" />
                         </div>
                         <div>
                             <p className="text-sm font-medium text-gray-900">Ödeme Alındı</p>
                             <p className="text-xs text-gray-500 mt-0.5">#TR8823 nolu taşıma için ödeme hesabına geçti.</p>
                             <p className="text-[10px] text-gray-400 mt-1">2 saat önce</p>
                         </div>
                     </div>
                </CardContent>
            </Card>

            {/* Quick Promo */}
            <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none shadow-lg">
                <CardContent className="p-5">
                    <div className="mb-4 bg-white/20 w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur">
                        <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">Kazancını Arttır</h3>
                    <p className="text-indigo-100 text-sm mb-4">Premium üye olarak komisyon oranlarını düşürebilirsin.</p>
                    <Button size="sm" className="w-full bg-white text-indigo-600 hover:bg-slate-100 border-none font-semibold">
                        Premium'a Geç
                    </Button>
                </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}

// --- Sub Components ---

function StatsCard({ title, value, description, icon: Icon, trend, highlight }: any) {
  return (
    <Card className={`${highlight ? 'border-blue-200 bg-blue-50/50' : ''} shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <Icon className={`h-4 w-4 ${highlight ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
                {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                {description}
            </p>
        </div>
      </CardContent>
    </Card>
  );
}

function MarketplaceItem({ from, to, price, date, type, distance }: any) {
    return (
        <Card className="hover:border-blue-300 transition-all group cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-600 shadow-sm hover:shadow-md">
            <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3 text-sm">
                            <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {from}
                            </span>
                            <ArrowRight className="h-4 w-4 text-gray-300" />
                            <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                {to}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                <Calendar className="h-3 w-3" /> {date}
                            </span>
                            <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                <Truck className="h-3 w-3" /> {type}
                            </span>
                             <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                <MapPin className="h-3 w-3" /> {distance}
                            </span>
                        </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 min-w-[100px]">
                        <span className="text-lg font-bold text-blue-600">{price}</span>
                        <Button size="sm" className="h-8 text-xs w-full sm:w-auto opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-200">
                            Teklif Ver
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function CheckItem({ label, checked }: { label: string, checked: boolean }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            <div className={`p-0.5 rounded-full ${checked ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {checked ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-gray-400" />}
            </div>
            <span className={checked ? 'text-gray-900' : 'text-gray-500'}>{label}</span>
        </div>
    )
}
