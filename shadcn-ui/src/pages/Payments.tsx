import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Payments() {
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const p = JSON.parse(localStorage.getItem('payments') || '[]');
    setPayments(p.reverse());
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Ödeme Geçmişi</h1>
      {payments.length === 0 && (
        <div className="text-gray-600">Henüz ödeme yok.</div>
      )}
      <div className="grid gap-4">
        {payments.map(p => (
          <Card key={p.id}>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Taşıma #{p.shipmentId}</CardTitle>
                <CardDescription>{new Date(p.createdAt).toLocaleString('tr-TR')}</CardDescription>
              </div>
              <Badge className="bg-green-100 text-green-800">{p.status}</Badge>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Yöntem: {p.method}</div>
              <div className="text-xl font-bold">{p.amount}₺</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
