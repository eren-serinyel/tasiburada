import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, Star, Briefcase } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const API_BASE = '/api/v1';

interface EarningEntry {
  id: string;
  shipmentId: string;
  amount: number;
  earnedAt: string;
}

interface Stats {
  totalEarnings: number;
  completedJobs: number;
  activeJobs: number;
  rating: number;
  totalReviews: number;
}

export default function Earnings() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<EarningEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center py-20 text-gray-500">Yükleniyor...</div>
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
      <div>
        <h1 className="text-2xl font-semibold">Ödeme ve Kazançlar</h1>
        <p className="text-gray-600">Tamamlanan işlerden elde edilen kazançlarınız</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Toplam Kazanç</p>
                <p className="text-2xl font-bold text-green-600">
                  {Number(stats?.totalEarnings ?? 0).toLocaleString('tr-TR')}₺
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Tamamlanan İş</p>
                <p className="text-2xl font-bold">{stats?.completedJobs ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Aktif İş</p>
                <p className="text-2xl font-bold">{stats?.activeJobs ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500">Puan</p>
                <p className="text-2xl font-bold">
                  {Number(stats?.rating ?? 0).toFixed(1)}
                  <span className="text-sm font-normal text-gray-500 ml-1">({stats?.totalReviews ?? 0})</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Kazanç Geçmişi</h2>
        <div className="grid gap-3">
          {history.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-gray-500">
                Henüz tamamlanmış iş bulunmuyor.
              </CardContent>
            </Card>
          ) : (
            history.map(entry => (
              <Card key={entry.id}>
                <CardHeader className="flex-row items-center justify-between py-3">
                  <div>
                    <CardTitle className="text-base">Taşıma #{entry.shipmentId.slice(0, 8)}</CardTitle>
                    <CardDescription>
                      {new Date(entry.earnedAt).toLocaleString('tr-TR')}
                    </CardDescription>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    +{Number(entry.amount).toLocaleString('tr-TR')}₺
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
