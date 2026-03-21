import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Calendar, ArrowDownToLine, ArrowUpToLine } from 'lucide-react';
import { getSessionUser } from '@/lib/storage';

export default function Earnings() {
  const [payments, setPayments] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
    if (!u || u.type !== 'carrier') return;
    setUserId(u.id);
    const p = JSON.parse(localStorage.getItem('payments') || '[]');
    // Demo: tüm ödemeleri gösteriyoruz; ileride carrierId eşlemesi eklenebilir
    setPayments(p);
  }, []);

  const total = useMemo(() => payments.reduce((sum, p) => sum + (p.amount || 0), 0), [payments]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ödeme ve Kazançlar</h1>
        <p className="text-gray-600">Tamamlanan işlerden elde edilen kazançlarınız</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toplam</CardTitle>
          <CardDescription>Demo verisi</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-3xl font-bold text-green-600">{total}₺</div>
          <Button disabled><Wallet className="h-4 w-4 mr-2" /> Ödeme Talebi Oluştur (yakında)</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {payments.length === 0 && (
          <Card><CardContent className="py-10 text-center text-gray-600">Henüz ödeme bulunmuyor.</CardContent></Card>
        )}
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
