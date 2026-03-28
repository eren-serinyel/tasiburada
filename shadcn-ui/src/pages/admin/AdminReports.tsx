import { useEffect, useState, useCallback } from 'react';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader, ErrorState, EmptyState } from '@/components/admin/shared';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, Truck, HandCoins, BarChart3, Users, ArrowRight,
  Percent, XCircle,
} from 'lucide-react';

interface KPI {
  totalShipments: number;
  totalOffers: number;
  totalRevenue: number;
  matchRate: number;
  cancelRate: number;
  newCarriers: number;
  newCustomers: number;
}

interface MonthlyData {
  month: string;
  shipments: number;
  offers: number;
}

interface TopCarrier {
  carrierId: string;
  companyName: string;
  shipmentCount: number;
  totalRevenue: number;
}

interface TopRoute {
  origin: string;
  destination: string;
  count: number;
  avgPrice: number;
}

interface ReportsData {
  kpis: KPI;
  monthlyTrends: MonthlyData[];
  topCarriers: TopCarrier[];
  topRoutes: TopRoute[];
}

const periodOptions = [
  { value: 'month', label: 'Son 1 Ay' },
  { value: 'quarter', label: 'Son 3 Ay' },
  { value: 'half', label: 'Son 6 Ay' },
  { value: 'year', label: 'Son 1 Yıl' },
];

function KpiCard({ label, value, icon: Icon, iconColor, subtitle }: {
  label: string; value: string; icon: React.ElementType; iconColor: string; subtitle?: string;
}) {
  return (
    <Card className="bg-white shadow-sm border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-slate-50 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminReports() {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await adminApiClient(`/admin/reports/overview?period=${period}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(true);
      }
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const kpi = data?.kpis;

  return (
    <div className="p-6 lg:p-8 space-y-6">
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

      {error ? (
        <ErrorState onRetry={fetchReports} />
      ) : loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="bg-white shadow-sm border-slate-200">
              <CardContent className="p-5">
                <div className="h-4 w-16 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-7 w-24 bg-slate-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Toplam Gönderi" value={String(kpi?.totalShipments ?? 0)} icon={Truck} iconColor="text-blue-600" />
            <KpiCard label="Toplam Teklif" value={String(kpi?.totalOffers ?? 0)} icon={HandCoins} iconColor="text-amber-600" />
            <KpiCard label="Toplam Gelir" value={`${(kpi?.totalRevenue ?? 0).toLocaleString('tr-TR')}₺`} icon={TrendingUp} iconColor="text-emerald-600" />
            <KpiCard label="Eşleşme Oranı" value={`%${kpi?.matchRate ?? 0}`} icon={BarChart3} iconColor="text-indigo-600" />
            <KpiCard label="İptal Oranı" value={`%${kpi?.cancelRate ?? 0}`} icon={XCircle} iconColor="text-rose-500" />
            <KpiCard label="Yeni Nakliyeci" value={String(kpi?.newCarriers ?? 0)} icon={Users} iconColor="text-cyan-600" subtitle="Dönem içi" />
            <KpiCard label="Yeni Müşteri" value={String(kpi?.newCustomers ?? 0)} icon={Users} iconColor="text-violet-600" subtitle="Dönem içi" />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Aylık Gönderi Trendi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.monthlyTrends}>
                    <defs>
                      <linearGradient id="colorShipments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="shipments" name="Gönderi" stroke="#3b82f6" fill="url(#colorShipments)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Aylık Teklif Trendi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <RechartsTooltip />
                    <Bar dataKey="offers" name="Teklif" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tables */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top Carriers */}
            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">En İyi Nakliyeciler</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="text-xs font-semibold text-slate-500">#</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Firma</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 text-right">Gönderi</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 text-right">Gelir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topCarriers.map((c, i) => (
                      <TableRow key={c.carrierId} className="hover:bg-slate-50/60">
                        <TableCell className="text-xs text-slate-400 font-medium">{i + 1}</TableCell>
                        <TableCell className="text-sm text-slate-700 font-medium">{c.companyName}</TableCell>
                        <TableCell className="text-sm text-right">{c.shipmentCount}</TableCell>
                        <TableCell className="text-sm text-right font-semibold text-emerald-700">{Number(c.totalRevenue).toLocaleString('tr-TR')}₺</TableCell>
                      </TableRow>
                    ))}
                    {data.topCarriers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <EmptyState icon={Users} title="Veri yok" description="Bu dönem için nakliyeci sıralaması oluşmadı." className="py-8" />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Top Routes */}
            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">En Popüler Güzergahlar</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="text-xs font-semibold text-slate-500">#</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Güzergah</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 text-right">Adet</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 text-right">Ort. Fiyat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topRoutes.map((r, i) => (
                      <TableRow key={`${r.origin}-${r.destination}`} className="hover:bg-slate-50/60">
                        <TableCell className="text-xs text-slate-400 font-medium">{i + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <span>{r.origin}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span>{r.destination}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-right">{r.count}</TableCell>
                        <TableCell className="text-sm text-right font-semibold text-emerald-700">{Number(r.avgPrice).toLocaleString('tr-TR')}₺</TableCell>
                      </TableRow>
                    ))}
                    {data.topRoutes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <EmptyState icon={ArrowRight} title="Veri yok" description="Bu dönem için güzergah trendi oluşmadı." className="py-8" />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
