import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';

const API_BASE = '/api/v1';

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

interface Shipment {
  id: string;
  origin: string;
  destination: string;
  status: string;
  price: number | null;
  shipmentDate: string | null;
  loadDetails: string | null;
  createdAt: string | null;
}

export default function Payments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient(`${API_BASE}/customers/shipments`);
        if (!res.ok) throw new Error('Taşımalar alınamadı');
        const data = await res.json();
        const all: Shipment[] = data.data ?? data.shipments ?? [];
        setShipments(all.filter(s => s.status === 'completed').reverse());
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-20 text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-20 text-red-500">{error}</div>
      </div>
    );
  }

  const total = shipments.reduce((sum, s) => sum + Number(s.price ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ödeme Geçmişi</h1>
        {shipments.length > 0 && (
          <div className="text-lg font-bold text-green-600">
            Toplam: {total.toLocaleString('tr-TR')}₺
          </div>
        )}
      </div>

      {shipments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Henüz tamamlanan taşıma bulunmuyor.</div>
      ) : (
        <div className="grid gap-4">
          {shipments.map(s => (
            <Card key={s.id}>
              <CardHeader className="flex-row items-center justify-between py-3">
                <div>
                  <CardTitle className="text-base">
                    {s.origin || '-'} → {s.destination || '-'}
                  </CardTitle>
                  {s.loadDetails && (
                    <p className="text-sm text-gray-500 mt-0.5">{s.loadDetails}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-100 text-green-800">Tamamlandı</Badge>
                  {s.price != null && (
                    <div className="text-xl font-bold text-green-600">
                      {Number(s.price).toLocaleString('tr-TR')}₺
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <p className="text-sm text-gray-500">
                  Taşıma tarihi: {formatDate(s.shipmentDate ?? s.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
