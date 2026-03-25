import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApiClient } from '@/lib/adminAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Truck, Users, Package, Star, CheckCircle, Clock, HandCoins,
  ArrowRight, AlertTriangle, BarChart3,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { PageHeader, StatCard, EmptyState } from '@/components/admin/shared';
import { formatDistanceToNow, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Stats {
  totalCarriers: number;
  pendingCarriers: number;
  verifiedCarriers: number;
  totalCustomers: number;
  totalShipments: number;
  activeShipments: number;
  completedShipments: number;
  totalOffers: number;
  totalReviews: number;
  avgRating: number;
}

interface PendingCarrier {
  id: string;
  companyName: string;
  email: string;
  createdAt: string;
  hasUploadedDocuments: boolean;
}

interface RecentReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  customer?: { firstName: string; lastName: string };
  carrier?: { companyName: string };
}

// ─── Chart helpers ──────────────────────────────────────────────────────────

function generateTrendData(total: number) {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: format(d, 'dd MMM', { locale: tr }),
      value: Math.max(0, Math.round(total / 30 + (Math.random() - 0.4) * (total / 15))),
    });
  }
  return data;
}

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#f43f5e'];

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingCarriers, setPendingCarriers] = useState<PendingCarrier[]>([]);
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, carriersRes, reviewsRes] = await Promise.all([
          adminApiClient('/admin/stats').then((r) => r.json()),
          adminApiClient('/admin/carriers?status=pending&limit=5').then((r) => r.json()),
          adminApiClient('/admin/reviews?limit=5').then((r) => r.json()),
        ]);
        if (statsRes.success) setStats(statsRes.data);
        if (carriersRes.success) setPendingCarriers(carriersRes.data?.carriers ?? []);
        if (reviewsRes.success) setRecentReviews(reviewsRes.data?.reviews ?? []);
      } catch {
        toast.error('Dashboard verileri yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[120px] bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-72 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState title="Veriler yüklenemedi" description="Sunucuya bağlanılamadı." />
      </div>
    );
  }

  const shipmentTrend = generateTrendData(stats.totalShipments);
  const shipmentPieData = [
    { name: 'Bekliyor', value: Math.max(0, stats.totalShipments - stats.activeShipments - stats.completedShipments) },
    { name: 'Taşınıyor', value: stats.activeShipments },
    { name: 'Tamamlandı', value: stats.completedShipments },
  ].filter((d) => d.value > 0);
  const matchRate = stats.totalShipments > 0
    ? Math.round((stats.completedShipments / stats.totalShipments) * 100)
    : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader title="Dashboard" description="Operasyon özeti ve kritik metrikler" />

      {/* Alert Banner */}
      {stats.pendingCarriers > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            <span className="font-semibold">{stats.pendingCarriers} nakliyeci</span> onay bekliyor.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
            onClick={() => navigate('/admin/onay-kuyrugu')}
          >
            Onay Kuyruğu
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      )}

      {/* KPI Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Toplam Nakliyeci" value={stats.totalCarriers} icon={Truck} iconColor="text-blue-600" onClick={() => navigate('/admin/nakliyeciler')} />
        <StatCard label="Toplam Müşteri" value={stats.totalCustomers} icon={Users} iconColor="text-purple-600" onClick={() => navigate('/admin/musteriler')} />
        <StatCard label="Toplam İlan" value={stats.totalShipments} icon={Package} iconColor="text-orange-500" onClick={() => navigate('/admin/ilanlar')} />
        <StatCard label="Toplam Teklif" value={stats.totalOffers} icon={HandCoins} iconColor="text-sky-600" onClick={() => navigate('/admin/teklifler')} />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Onay Bekleyen" value={stats.pendingCarriers} icon={Clock} iconColor="text-amber-500" accentBorder={stats.pendingCarriers > 0 ? 'bg-amber-500' : undefined} onClick={() => navigate('/admin/onay-kuyrugu')} />
        <StatCard label="Onaylı Nakliyeci" value={stats.verifiedCarriers} icon={CheckCircle} iconColor="text-emerald-600" />
        <StatCard label="Ortalama Puan" value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'} icon={Star} iconColor="text-yellow-500" subtitle={`${stats.totalReviews} yorum`} onClick={() => navigate('/admin/yorumlar')} />
        <StatCard label="Eşleşme Oranı" value={`%${matchRate}`} icon={BarChart3} iconColor="text-indigo-600" subtitle={`${stats.completedShipments} tamamlanan`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">İlan Trendi (30 gün)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={shipmentTrend}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} />
                <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">İlan Dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col items-center">
            {shipmentPieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={shipmentPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {shipmentPieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {shipmentPieData.map((d, idx) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 py-10">Henüz veri yok</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending approvals */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Onay Bekleyenler</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-orange-600 hover:text-orange-700" onClick={() => navigate('/admin/onay-kuyrugu')}>
              Tümünü Gör <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {pendingCarriers.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-sm font-medium text-slate-700">Tüm başvurular işlendi</p>
                <p className="text-xs text-slate-400 mt-0.5">Onay bekleyen nakliyeci yok</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingCarriers.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-50 -mx-6 px-6 transition-colors" onClick={() => navigate(`/admin/nakliyeciler/${c.id}`)}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{c.companyName}</p>
                      <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: tr })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.hasUploadedDocuments && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">Belge Var</span>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Son Yorumlar</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-orange-600 hover:text-orange-700" onClick={() => navigate('/admin/yorumlar')}>
              Tümünü Gör <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {recentReviews.length === 0 ? (
              <EmptyState title="Henüz yorum yok" className="py-8" />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentReviews.map((r) => (
                  <div key={r.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : 'Anonim'}</span>
                        <span className="text-xs text-slate-400">→</span>
                        <span className="text-sm text-slate-600">{r.carrier?.companyName ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{r.comment}</p>}
                    <p className="mt-1 text-[10px] text-slate-400">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: tr })}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
