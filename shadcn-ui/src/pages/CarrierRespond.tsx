import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { mockDb } from '@/utils/mockDb';
import { getSessionUser } from '@/lib/storage';

export default function CarrierRespond() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<any | null>(null);
  const [price, setPrice] = useState('');
  const [eta, setEta] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const reqs = JSON.parse(localStorage.getItem('offerRequests') || '[]');
    const found = reqs.find((r: any) => r.id === requestId);
    setRequest(found || null);
  }, [requestId]);

  const routeStr = useMemo(() => {
    if (!request?.form) return '-';
    const f = request.form;
    return `${f.originCity}${f.originDistrict ? ' ('+f.originDistrict+')' : ''} → ${f.destinationCity}${f.destinationDistrict ? ' ('+f.destinationDistrict+')' : ''}`;
  }, [request]);

  const submitOffer = () => {
    if (!request) return;
    const user = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
    const offerId = `offer_${Date.now()}`;
    mockDb.addOffer({
      id: offerId,
      shipmentId: request.id,
      carrierId: user?.id || request.carrierId,
      price: Number(price),
      message: note,
      estimatedDuration: Number(eta),
      status: 'pending',
      createdAt: new Date(),
    } as any);
    // müşteriye bildirim
    mockDb.addNotification({
      id: `n_${Date.now()}`,
      userId: request.customerId,
      title: 'Teklif Geldi',
      message: `${user?.name || 'Nakliyeci'} teklif gönderdi: ${price} TL, ${eta} saat` ,
      isRead: false,
      createdAt: new Date().toISOString(),
      actionUrl: `/offers/${request.id}`,
      relatedId: offerId,
      kind: 'info'
    });
    navigate('/notifications');
  };

  if (!request) return (
    <div className="max-w-3xl mx-auto p-6">
      <Card><CardContent className="py-10 text-center text-gray-600">Talep bulunamadı.</CardContent></Card>
    </div>
  );

  const f = request.form || {};

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Teklif Talebi</CardTitle>
          <CardDescription>Müşteri talep özeti</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>Rota:</strong> {routeStr}</div>
          <div><strong>Tarih:</strong> {f.date || '-'}</div>
          <div><strong>Taşıma Tipi:</strong> {f.transportType || '-'}</div>
          {f.placeType && <div><strong>Yer Türü:</strong> {f.placeType}</div>}
          <div><strong>Araç Tercihi:</strong> {f.vehicleType || '-'}</div>
          <div><strong>Ek Hizmetler:</strong> {Object.values(f.serviceOptions || {}).flat().join(', ') || '-'}</div>
          <div><strong>Not:</strong> {f.note || '-'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teklif Oluştur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm">Fiyat (TL)</label>
            <Input type="number" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Tahmini Süre (saat)</label>
            <Input type="number" value={eta} onChange={e => setEta(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Ek Not</label>
            <Textarea rows={3} value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>İptal</Button>
            <Button onClick={submitOffer}>Gönder</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
