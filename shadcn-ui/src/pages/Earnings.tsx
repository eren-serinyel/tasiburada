import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Briefcase } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const API_BASE = '/api/v1';

type Period = 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Bu Hafta',
  month: 'Bu Ay',
  year: 'Bu Yıl',
};

interface EarningEntry {
  id: string;
  shipmentId: string;
  amount: number;
  earnedAt: string;
  origin?: string;
  destination?: string;
}

interface Stats {
  totalEarnings: number;
  completedJobs: number;
  activeJobs: number;
  rating: number;
  totalReviews: number;
}

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0 });
}

export default function Earnings() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<EarningEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('month');

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, historyRes] = await Promise.all([
          apiClient(`${API_BASE}/carriers/me/stats`),
          apiClient(`${API_BASE}/carriers/me/earnings-history`),
        ]);

        if (!statsRes.ok) throw new Error('İstatistikler alınamadı');
        if (!historyRes.ok) throw new Error('Kazanç geçmişi alınamadı');

        const statsData = await statsRes.json();
        const historyData = await historyRes.json();

        setStats(statsData.data);
        setHistory(historyData.data ?? []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ── period-filtered history ── */
  const filtered = useMemo(() => {
    const now = new Date();
    return history.filter((e) => {
      const d = new Date(e.earnedAt);
      if (period === 'week') {
        const diff = (now.getTime() - d.getTime()) / 86_400_000;
        return diff <= 7;
      }
      if (period === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return d.getFullYear() === now.getFullYear();
    });
  }, [history, period]);

  const periodTotal = useMemo(() => filtered.reduce((s, e) => s + Number(e.amount), 0), [filtered]);
  const periodJobs = filtered.length;
  const avgJob = periodJobs > 0 ? Math.round(periodTotal / periodJobs) : 0;

  /* ── chart data ── */
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => {
      const d = new Date(e.earnedAt);
      const key =
        period === 'year'
          ? d.toLocaleDateString('tr-TR', { month: 'short' })
          : d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
      map[key] = (map[key] || 0) + Number(e.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered, period]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center py-20 text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Kazançlarım</h1>
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Toplam Kazanç — dark gradient */}
        <div
          className="rounded-xl p-6"
          style={{ background: 'linear-gradient(135deg, #0B1629, #1E3A5F)' }}
        >
          <p className="text-sm text-white/70">Toplam Kazanç</p>
          <p className="text-[2.5rem] font-extrabold text-white leading-tight mt-1">
            ₺{fmt(periodTotal)}
          </p>
        </div>

        {/* Tamamlanan İş */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Tamamlanan İş</p>
            <p className="text-[2rem] font-extrabold text-blue-600 leading-tight mt-1">
              {periodJobs}
            </p>
            <p className="text-sm text-gray-500 mt-2">Bu dönemde</p>
          </CardContent>
        </Card>

        {/* Ortalama İş Değeri */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Ortalama İş Değeri</p>
            <p className="text-[2rem] font-extrabold text-gray-900 leading-tight mt-1">
              ₺{fmt(avgJob)}
            </p>
            <p className="text-sm text-gray-500 mt-2">Sipariş başına</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Chart ── */}
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-4">Kazanç Trendi</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₺${v}`} />
                <Tooltip
                  formatter={(value: number) => [`₺${fmt(value)}`, 'Kazanç']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                />
                <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-sm text-gray-400">
              Bu dönem için veri bulunmuyor
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Transaction table ── */}
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-4">İşlem Geçmişi</h2>

          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Henüz kazanç kaydı yok</p>
              <p className="text-xs text-gray-400 mt-1">Tamamlanan işleriniz burada görünecek</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 py-3.5 hover:bg-gray-50 -mx-2 px-2 rounded-md transition-colors"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {entry.origin && entry.destination
                        ? `${entry.origin} → ${entry.destination}`
                        : `Taşıma #${entry.shipmentId.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(entry.earnedAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {/* Amount */}
                  <span className="text-[16px] font-bold text-emerald-600 whitespace-nowrap">
                    +₺{fmt(Number(entry.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
