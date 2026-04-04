import { useEffect, useState, useCallback } from 'react';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader, EmptyState, ErrorState } from '@/components/admin/shared';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Truck, HandCoins, TrendingUp, BarChart3, ArrowRight, MapPin,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Overview {
  totalShipments: number;
  totalOffers: number;
  matchRate: number;
  totalRevenue: number;
  monthlyTrend: { month: string; shipments: number; offers: number; revenue: number }[];
}

interface TopCarrier {
  carrierId: string;
  companyName: string;
  city?: string;
  completedCount: number;
  rating: number;
  totalRevenue: number;
}

interface PopularRoute {
  origin: string;
  destination: string;
  count: number;
  avgPrice: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const periodOptions = [
  { value: 'week', label: 'Haftalık' },
  { value: 'month', label: 'Aylık' },
  { value: 'quarter', label: 'Çeyreklik' },
  { value: 'year', label: 'Yıllık' },
];

const medals = ['🥇', '🥈', '🥉'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function Stars({ count }: { count: number }) {
  const filled = Math.round(count);
  return (
    <span className="text-xs tracking-tight">
      {Array.from({ length: 5 }, (_, i) => (i < filled ? '⭐' : '☆')).join('')}
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminReports() {
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');

  // Overview
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState(false);

  // Carriers
  const [carriers, setCarriers] = useState<TopCarrier[]>([]);
  const [carriersLoading, setCarriersLoading] = useState(false);
  const [carriersError, setCarriersError] = useState(false);

  // Routes
  const [routes, setRoutes] = useState<PopularRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState(false);

  // ── Fetchers ────────────────────────────────────────────────────────

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(false);
    try {
      const res = await adminApiClient(`/admin/reports/overview?period=${period}`);
      const json = await res.json();
      if (json.success) setOverview(json.data);
      else setOverviewError(true);
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
      setOverviewError(true);
    } finally {
      setOverviewLoading(false);
    }
  }, [period]);

  const fetchCarriers = useCallback(async () => {
    setCarriersLoading(true);
    setCarriersError(false);
    try {
      const res = await adminApiClient('/admin/reports/top-carriers?limit=10');
      const json = await res.json();
      if (json.success) setCarriers(json.data ?? []);
      else setCarriersError(true);
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
      setCarriersError(true);
    } finally {
      setCarriersLoading(false);
    }
  }, []);

  const fetchRoutes = useCallback(async () => {
    setRoutesLoading(true);
    setRoutesError(false);
    try {
      const res = await adminApiClient('/admin/reports/popular-routes?limit=10');
      const json = await res.json();
      if (json.success) setRoutes(json.data ?? []);
      else setRoutesError(true);
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
      setRoutesError(true);
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  // ── Effects (tab-based lazy loading, period triggers re-fetch) ─────

  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
  }, [activeTab, fetchOverview]);

  useEffect(() => {
    if (activeTab === 'carriers') fetchCarriers();
  }, [activeTab, fetchCarriers]);

  useEffect(() => {
    if (activeTab === 'routes') fetchRoutes();
  }, [activeTab, fetchRoutes]);

  // Period change → re-fetch active tab
  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
    else if (activeTab === 'carriers') fetchCarriers();
    else if (activeTab === 'routes') fetchRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const maxRouteCount = routes.length > 0 ? routes[0].count : 1;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header + period selector */}
      <div className="flex items-center justify-between">
        <PageHeader title="Raporlar" description="Platform performans metrikleri" />
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview" className="text-xs">Genel Bakış</TabsTrigger>
          <TabsTrigger value="carriers" className="text-xs">Nakliyeci Analizi</TabsTrigger>
          <TabsTrigger value="routes" className="text-xs">Güzergah Analizi</TabsTrigger>
        </TabsList>

        {/* ═══ GENEL BAKIŞ ═══ */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {overviewError ? (
            <ErrorState onRetry={fetchOverview} />
          ) : overviewLoading ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="bg-white shadow-sm border-slate-200">
                    <CardContent className="p-5">
                      <div className="h-3 w-16 bg-slate-200 rounded animate-pulse mb-3" />
                      <div className="h-8 w-28 bg-slate-200 rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="bg-white shadow-sm border-slate-200">
                <CardContent className="p-6">
                  <div className="h-[280px] bg-slate-100 rounded animate-pulse" />
                </CardContent>
              </Card>
            </>
          ) : overview ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={Truck} iconColor="text-blue-600" label="Toplam İlan" value={overview.totalShipments.toLocaleString('tr-TR')} />
                <KpiCard icon={HandCoins} iconColor="text-amber-600" label="Toplam Teklif" value={overview.totalOffers.toLocaleString('tr-TR')} />
                <KpiCard icon={BarChart3} iconColor="text-indigo-600" label="Eşleşme Oranı" value={`%${overview.matchRate.toFixed(1)}`} />
                <KpiCard icon={TrendingUp} iconColor="text-emerald-600" label="Toplam Gelir" value={`₺${overview.totalRevenue.toLocaleString('tr-TR')}`} />
              </div>

              {/* Monthly Trend Chart */}
              {overview.monthlyTrend?.length > 0 && (
                <Card className="bg-white shadow-sm border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">Aylık Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={overview.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="shipments" name="İlanlar" stroke="#2563EB" fill="#EFF6FF" strokeWidth={2} />
                        <Area type="monotone" dataKey="offers" name="Teklifler" stroke="#F97316" fill="#FFF7ED" strokeWidth={2} />
                        <Area type="monotone" dataKey="revenue" name="Gelir (₺)" stroke="#16A34A" fill="#F0FDF4" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>

        {/* ═══ NAKLİYECİ ANALİZİ ═══ */}
        <TabsContent value="carriers" className="mt-4">
          {carriersError ? (
            <ErrorState onRetry={fetchCarriers} />
          ) : (
            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">En İyi 10 Nakliyeci</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="text-xs font-semibold text-slate-500 w-12">Sıra</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Firma Adı</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Şehir</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 text-right">Tamamlanan İş</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Puan</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 text-right">Toplam Kazanç</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carriersLoading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}><div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : carriers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <EmptyState icon={BarChart3} title="Veri bulunamadı" description="Henüz yeterli nakliyeci verisi yok." className="py-10" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      carriers.map((c, i) => (
                        <TableRow key={c.carrierId} className="hover:bg-slate-50/60 transition-colors">
                          <TableCell className="text-sm font-medium text-slate-600">
                            {i < 3 ? <span className="text-base">{medals[i]}</span> : i + 1}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-slate-700">{c.companyName}</TableCell>
                          <TableCell className="text-xs text-slate-500">{c.city ?? '—'}</TableCell>
                          <TableCell className="text-sm text-right text-slate-700">{c.completedCount.toLocaleString('tr-TR')}</TableCell>
                          <TableCell><Stars count={c.rating} /></TableCell>
                          <TableCell className="text-sm text-right font-semibold text-emerald-700">
                            ₺{Number(c.totalRevenue).toLocaleString('tr-TR')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ GÜZERGAH ANALİZİ ═══ */}
        <TabsContent value="routes" className="mt-4">
          {routesError ? (
            <ErrorState onRetry={fetchRoutes} />
          ) : (
            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">En Popüler 10 Güzergah</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="text-xs font-semibold text-slate-500 w-12">Sıra</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Güzergah</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Sefer Sayısı</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 text-right">Ortalama Fiyat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routesLoading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 4 }).map((_, j) => (
                            <TableCell key={j}><div className="h-4 w-20 bg-slate-200 rounded animate-pulse" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : routes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <EmptyState icon={MapPin} title="Veri bulunamadı" description="Henüz yeterli güzergah verisi yok." className="py-10" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      routes.map((r, i) => (
                        <TableRow key={`${r.origin}-${r.destination}`} className="hover:bg-slate-50/60 transition-colors">
                          <TableCell className="text-sm font-medium text-slate-600">{i + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-slate-700">
                              <span className="font-medium">{r.origin}</span>
                              <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="font-medium">{r.destination}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-700 min-w-[2rem]">{r.count}</span>
                              <div className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${(r.count / maxRouteCount) * 100}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-right font-semibold text-emerald-700">
                            ₺{Number(r.avgPrice).toLocaleString('tr-TR')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, iconColor }: {
  label: string; value: string; icon: React.ElementType; iconColor: string;
}) {
  return (
    <Card className="bg-white shadow-sm border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <p className="text-xs font-medium text-gray-500">{label}</p>
        </div>
        <p className="text-[2rem] font-[800] leading-tight text-slate-800">{value}</p>
      </CardContent>
    </Card>
  );
}
