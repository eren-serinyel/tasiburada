import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Truck, CheckCircle2, CreditCard, Clock } from 'lucide-react';
import { Shipment, User } from '@/lib/types';

export default function ShipmentDetail() {
  const { id } = useParams();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [customer, setCustomer] = useState<User | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const all: Shipment[] = JSON.parse(localStorage.getItem('shipments') || '[]');
    const s = all.find(x => x.id === id) || null;
    setShipment(s);
    try {
      const users: User[] = JSON.parse(localStorage.getItem('users') || '[]');
      const c = users.find(u => u.id === s?.customerId) || null;
      setCustomer(c);
    } catch {}
  }, [id]);

  const payment = useMemo(() => {
    const pays = JSON.parse(localStorage.getItem('payments') || '[]');
    return pays.find((p: any) => p.shipmentId === id);
  }, [id]);

  if (!shipment) return <div className="p-6">Yükleniyor…</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Taşıma Detayı</h1>
        <Badge>{shipment.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rota</CardTitle>
          <CardDescription>Başlangıç ve varış bilgileri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-green-600 mt-1" />
            <div>
              <div className="text-sm text-gray-600">Çıkış</div>
              <div className="font-medium">{shipment.origin.address}</div>
              <div className="text-sm text-gray-600">{shipment.origin.city}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-red-600 mt-1" />
            <div>
              <div className="text-sm text-gray-600">Varış</div>
              <div className="font-medium">{shipment.destination.address}</div>
              <div className="text-sm text-gray-600">{shipment.destination.city}</div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Truck className="h-4 w-4" /> Yük Tipi: {shipment.loadType} · Ağırlık: {shipment.weight} kg
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Durum Zaman Çizelgesi</CardTitle>
          <CardDescription>Süreç ilerlemesi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Timeline status={shipment.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ödeme</CardTitle>
          <CardDescription>Durum ve işlemler</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          {payment ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" /> Ödendi · {payment.amount}₺ · {new Date(payment.createdAt).toLocaleString('tr-TR')}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-5 w-5" /> Ödeme bekleniyor
            </div>
          )}
          {!payment && (
            <Button asChild>
              <Link to={`/odeme/${shipment.id}`}><CreditCard className="h-4 w-4 mr-1" /> Ödeme Yap</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Müşteri & Durum Yönetimi */}
      <Card>
        <CardHeader>
          <CardTitle>İş Yönetimi</CardTitle>
          <CardDescription>Müşteri bilgileri ve durum güncelleme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {customer ? (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Müşteri</div>
                <div className="font-medium">{customer.name} {customer.surname}</div>
                <div className="text-gray-600">{customer.phone}</div>
                <div className="text-gray-600">{customer.email}</div>
              </div>
              <div>
                <div className="text-gray-600">Ek Hizmetler</div>
                <div className="text-gray-800">—</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">Müşteri bilgisi bulunamadı.</div>
          )}
          <Separator />
          <div className="flex flex-wrap gap-2">
            <StatusActions shipment={shipment} onChange={(s)=>setShipment(s)} updating={updating} setUpdating={setUpdating} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Timeline({ status }: { status: Shipment['status'] }) {
  const steps: Array<{ key: Shipment['status'] | 'accepted' | 'in-transit', label: string }>
    = [
      { key: 'pending', label: 'Talep Oluşturuldu' },
      { key: 'matched', label: 'Teklif Verildi / Eşleşti' },
      { key: 'accepted', label: 'Teklif Kabul Edildi' },
      { key: 'in-transit', label: 'Yolda' },
      { key: 'delivered', label: 'Teslim Edildi' },
    ];

  const activeIndex = steps.findIndex(s => s.key === status || (status === 'matched' && s.key === 'accepted'));

  return (
    <div className="grid grid-cols-5 gap-2">
      {steps.map((s, idx) => (
        <div key={s.key} className={`p-3 rounded border text-center ${idx <= activeIndex ? 'bg-green-50 border-green-300' : ''}`}>
          <div className="text-sm font-medium">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function StatusActions({ shipment, onChange, updating, setUpdating }: { shipment: Shipment | null; onChange: (s: Shipment)=>void; updating: boolean; setUpdating: (b: boolean)=>void }) {
  if (!shipment) return null;
  const canComplete = shipment.status === 'matched';
  const update = (status: Shipment['status']) => {
    setUpdating(true);
    setTimeout(() => {
      const all: Shipment[] = JSON.parse(localStorage.getItem('shipments') || '[]');
      const upd = all.map(s => s.id === shipment.id ? { ...s, status } : s);
      localStorage.setItem('shipments', JSON.stringify(upd));
      const newS = upd.find(s => s.id === shipment.id)!;
      onChange(newS);
      setUpdating(false);
    }, 500);
  };
  return (
    <div className="flex gap-2">
      <Button disabled={!canComplete || updating} onClick={()=>update('delivered')}>Teslim Edildi</Button>
    </div>
  );
}
