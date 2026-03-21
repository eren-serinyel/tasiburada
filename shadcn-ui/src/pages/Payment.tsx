import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Landmark, Wallet, ShieldCheck } from 'lucide-react';
import { Shipment, Offer, Notification } from '@/lib/types';

export default function Payment() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [acceptedOffer, setAcceptedOffer] = useState<Offer | null>(null);
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [iban, setIban] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const sAll: Shipment[] = JSON.parse(localStorage.getItem('shipments') || '[]');
    const s = sAll.find(s => s.id === shipmentId) || null;
    setShipment(s);
    const offers: Offer[] = JSON.parse(localStorage.getItem('offers') || '[]');
    const acc = offers.find(o => o.shipmentId === shipmentId && o.status === 'accepted') || null;
    setAcceptedOffer(acc);
  }, [shipmentId]);

  const total = useMemo(() => acceptedOffer?.price || shipment?.price || 0, [acceptedOffer, shipment]);

  const pay = (method: 'card'|'iban'|'wallet') => {
    if (!shipment) return;
    setPaying(true);
    setTimeout(() => {
      // persist payment record
      const payments = JSON.parse(localStorage.getItem('payments') || '[]');
      payments.push({ id: `pay_${Date.now()}`, shipmentId: shipment.id, amount: total, method, createdAt: new Date().toISOString(), status: 'paid' });
      localStorage.setItem('payments', JSON.stringify(payments));
      // update shipment status
      const all = JSON.parse(localStorage.getItem('shipments') || '[]');
  const upd = all.map((x: Shipment) => x.id === shipment.id ? { ...x, status: 'matched' } : x);
      localStorage.setItem('shipments', JSON.stringify(upd));
      // notify
      const notifs: Notification[] = JSON.parse(localStorage.getItem('notifications') || '[]');
      notifs.push({ id: `notif_${Date.now()}`, userId: shipment.customerId, type: 'offer_accepted', title: 'Ödeme Alındı', message: `Taşıma için ${total}₺ ödemeniz alındı.`, isRead: false, createdAt: new Date(), relatedId: shipment.id });
      localStorage.setItem('notifications', JSON.stringify(notifs));
      setPaying(false);
      alert('Ödeme başarılı! Taşıma süreci başlatıldı.');
      navigate(`/shipment/${shipment.id}`);
    }, 800);
  };

  if (!shipment) return <div>Yükleniyor...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Ödeme</CardTitle>
          <CardDescription>Güvenli ödeme ile işinizi başlatalım</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ShieldCheck className="h-4 w-4 text-green-600" /> 3D Secure simülasyonu, veriler localStorage'a kaydedilir.
          </div>
          <div className="rounded border p-3 bg-gray-50 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{shipment.origin.city} → {shipment.destination.city}</div>
                <div className="text-gray-600">Tutar</div>
              </div>
              <div className="text-2xl font-bold text-green-600">{total}₺</div>
            </div>
          </div>

          <Tabs defaultValue="card">
            <TabsList>
              <TabsTrigger value="card"><CreditCard className="h-4 w-4 mr-1" /> Kart</TabsTrigger>
              <TabsTrigger value="iban"><Landmark className="h-4 w-4 mr-1" /> IBAN</TabsTrigger>
              <TabsTrigger value="wallet"><Wallet className="h-4 w-4 mr-1" /> Cüzdan</TabsTrigger>
            </TabsList>
            <TabsContent value="card" className="space-y-4">
              <div>
                <Label>Kart Numarası</Label>
                <Input value={card.number} onChange={e=>setCard({...card, number: e.target.value})} placeholder="1234 5678 9012 3456" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SKT (AA/YY)</Label>
                  <Input value={card.expiry} onChange={e=>setCard({...card, expiry: e.target.value})} placeholder="12/28" />
                </div>
                <div>
                  <Label>CVC</Label>
                  <Input value={card.cvc} onChange={e=>setCard({...card, cvc: e.target.value})} placeholder="123" />
                </div>
              </div>
              <div>
                <Label>İsim Soyisim</Label>
                <Input value={card.name} onChange={e=>setCard({...card, name: e.target.value})} placeholder="Ad Soyad" />
              </div>
              <Button disabled={paying} onClick={()=>pay('card')} className="w-full">
                {paying ? 'Ödeniyor…' : 'Kart ile Öde'}
              </Button>
            </TabsContent>
            <TabsContent value="iban" className="space-y-4">
              <div>
                <Label>IBAN</Label>
                <Input value={iban} onChange={e=>setIban(e.target.value)} placeholder="TR.." />
              </div>
              <Button disabled={paying || iban.length < 10} onClick={()=>pay('iban')} className="w-full">IBAN ile Öde</Button>
            </TabsContent>
            <TabsContent value="wallet" className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">Cüzdan Bakiyesi</div>
                <Badge className="bg-blue-100 text-blue-800">0₺</Badge>
              </div>
              <Button disabled className="w-full">Yakında</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
