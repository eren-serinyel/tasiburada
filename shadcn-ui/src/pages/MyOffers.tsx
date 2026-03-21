import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockDb } from '@/utils/mockDb';
import { getSessionUser } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';

export default function MyOffers() {
  const [offers, setOffers] = useState<any[]>([]);
  const navigate = useNavigate();
  const user = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);

  useEffect(() => {
    const list = mockDb.getAllOffers();
    // offerRequests ile eşleştirip bu müşterinin taleplerine gelenleri filtrele
    const reqs = JSON.parse(localStorage.getItem('offerRequests') || '[]');
    const myReqIds = new Set((reqs || []).filter((r: any) => r.customerId === (user?.id || 'c1')).map((r: any) => r.id));
    const mine = list.filter((o: any) => myReqIds.has(o.shipmentId));
    setOffers(mine);
  }, []);

  const decide = (offerId: string, accept: boolean) => {
    const upd = mockDb.updateOffer(offerId, { status: accept ? 'accepted' : 'rejected' } as any);
    // ilgili carrier’ı bulmak için offerRequests üzerinden eşleşme
    const allReqs = JSON.parse(localStorage.getItem('offerRequests') || '[]');
    const req = allReqs.find((r: any) => r.id === upd?.shipmentId);
    const carrierId = upd?.carrierId;
    if (carrierId) {
      mockDb.addNotification({
        id: `n_${Date.now()}`,
        userId: carrierId,
        title: accept ? 'Teklifiniz Kabul Edildi' : 'Teklifiniz Reddedildi',
        message: `${user?.name || 'Müşteri'} teklifinizi ${accept ? 'kabul etti' : 'reddetti'}.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedId: offerId,
        actionUrl: '/carrier/offers',
        kind: 'decision'
      });
    }
    // listeyi güncelle
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: upd?.status } : o));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Gelen Tekliflerim</h1>
      {offers.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-600">Henüz teklif yok.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {offers.map(o => (
            <Card key={o.id}>
              <CardHeader>
                <CardTitle>Teklif #{o.id.split('_').pop()}</CardTitle>
                <CardDescription>{new Date(o.createdAt).toLocaleString('tr-TR')}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm">
                  <div><strong>Fiyat:</strong> {o.price} TL</div>
                  {o.estimatedDuration && <div><strong>Tahmini Süre:</strong> {o.estimatedDuration} saat</div>}
                  {o.message && <div className="text-gray-600">{o.message}</div>}
                  <div><strong>Durum:</strong> {o.status}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => decide(o.id, false)} disabled={o.status !== 'pending'}>Reddet</Button>
                  <Button onClick={() => decide(o.id, true)} disabled={o.status !== 'pending'}>Kabul Et</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="pt-2"><Button variant="outline" onClick={() => navigate('/notifications')}>Bildirimlere Dön</Button></div>
    </div>
  );
}
