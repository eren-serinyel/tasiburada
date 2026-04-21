import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/apiClient';

const API_BASE = '/api/v1';

type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | string;
type PaymentMethod = 'credit_card' | 'bank_transfer' | 'cash' | string;

interface PaymentItem {
  id: string;
  shipmentId: string;
  amount: number | string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
  shipment?: {
    origin?: string | null;
    destination?: string | null;
    loadDetails?: string | null;
    shipmentDate?: string | null;
  } | null;
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatAmount = (amount: number | string): string =>
  Number(amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0 });

const methodLabel: Record<string, string> = {
  credit_card: 'Kart',
  bank_transfer: 'Havale/EFT',
  cash: 'Nakit',
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Bekliyor', className: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Tamamlandı', className: 'bg-green-100 text-green-800' },
  failed: { label: 'Başarısız', className: 'bg-red-100 text-red-800' },
  refunded: { label: 'İade', className: 'bg-slate-100 text-slate-700' },
};

export default function Payments() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient(`${API_BASE}/payments/my`);
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || 'Ödemeler alınamadı.');
        }
        setPayments(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        setError(e?.message || 'Ödemeler yüklenirken bağlantı hatası oluştu.');
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
        <div className="text-center py-20">
          <p className="text-red-600 font-medium">Ödemeler yüklenemedi</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
          <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
            Tekrar Dene
          </Button>
        </div>
      </div>
    );
  }

  const total = payments
    .filter((payment) => payment.status === 'completed')
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ödeme Geçmişi</h1>
        {payments.length > 0 && (
          <div className="text-lg font-bold text-green-600">
            Ödenen: {total.toLocaleString('tr-TR')} TL
          </div>
        )}
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Henüz ödeme kaydı bulunmuyor.</div>
      ) : (
        <div className="grid gap-4">
          {payments.map((payment) => {
            const status = statusConfig[payment.status] || { label: payment.status, className: 'bg-slate-100 text-slate-700' };
            const shipment = payment.shipment;
            return (
              <Card key={payment.id}>
                <CardHeader className="flex-row items-center justify-between py-3">
                  <div>
                    <CardTitle className="text-base">
                      {shipment?.origin || '-'} → {shipment?.destination || '-'}
                    </CardTitle>
                    {shipment?.loadDetails && (
                      <p className="text-sm text-gray-500 mt-0.5">{shipment.loadDetails}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={status.className}>{status.label}</Badge>
                    <div className="text-xl font-bold text-green-600">
                      {formatAmount(payment.amount)} TL
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3 space-y-1">
                  <p className="text-sm text-gray-500">
                    İşlem tarihi: {formatDate(payment.completedAt ?? payment.createdAt)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Yöntem: {methodLabel[payment.method] || payment.method}
                    {payment.transactionId ? ` · ${payment.transactionId}` : ''}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
