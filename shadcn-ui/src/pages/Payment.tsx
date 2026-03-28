import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';

interface PaymentShipment {
  id: string;
  origin: string;
  destination: string;
  shipmentDate: string;
  status: string;
  price?: number | null;
  carrier?: {
    id: string;
    companyName?: string | null;
  } | null;
}

export default function Payment() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<PaymentShipment | null>(null);
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const fetchShipment = async () => {
      if (!shipmentId) {
        setShipment(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await apiClient(`/api/v1/shipments/${shipmentId}`);
        const json = await res.json();

        if (res.ok && json?.success && json.data) {
          setShipment(json.data);
        } else {
          setShipment(null);
        }
      } catch {
        setShipment(null);
      } finally {
        setLoading(false);
      }
    };

    fetchShipment();
  }, [shipmentId]);

  const total = shipment?.price ?? 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!shipment) return;

    if (!card.number.trim() || !card.name.trim() || !card.expiry.trim() || !card.cvc.trim()) {
      toast.error('Kart bilgilerini eksiksiz girin.');
      return;
    }

    setPaying(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      toast.success('Ödeme başarıyla alındı.');
      navigate('/ilanlarim');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="py-10 text-center text-gray-600">
            Ödeme bilgisi bulunamadı.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Ödeme</CardTitle>
          <CardDescription>Taşıma için ödeme özetini kontrol edip işlemi tamamlayın</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ShieldCheck className="h-4 w-4 text-green-600" /> Kart bilgileriniz yalnızca bu işlem akışı için kullanılır.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded border p-4 bg-gray-50 text-sm space-y-3">
              <div>
                <div className="text-gray-600">Rota</div>
                <div className="font-medium">{shipment.origin} → {shipment.destination}</div>
              </div>
              <div>
                <div className="text-gray-600">Nakliyeci</div>
                <div className="font-medium">{shipment.carrier?.companyName || 'Atanmış nakliyeci yok'}</div>
              </div>
              <div>
                <div className="text-gray-600">Taşıma Tarihi</div>
                <div className="font-medium">{new Date(shipment.shipmentDate).toLocaleDateString('tr-TR')}</div>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-gray-600">Durum</span>
                <Badge className="bg-blue-100 text-blue-800">{shipment.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Toplam</span>
                <span className="text-2xl font-bold text-green-600">{total} ₺</span>
              </div>
            </div>

            <form className="space-y-4 rounded border p-4" onSubmit={handleSubmit}>
              <div className="flex items-center gap-2 font-medium text-gray-900">
                <CreditCard className="h-4 w-4 text-blue-600" /> Kart Bilgileri
              </div>
              <div>
                <Label>Kart Numarası</Label>
                <Input value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} placeholder="1234 5678 9012 3456" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SKT (AA/YY)</Label>
                  <Input value={card.expiry} onChange={e => setCard({ ...card, expiry: e.target.value })} placeholder="12/28" />
                </div>
                <div>
                  <Label>CVC</Label>
                  <Input value={card.cvc} onChange={e => setCard({ ...card, cvc: e.target.value })} placeholder="123" />
                </div>
              </div>
              <div>
                <Label>İsim Soyisim</Label>
                <Input value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} placeholder="Ad Soyad" />
              </div>
              <Button type="submit" disabled={paying || total <= 0} className="w-full">
                {paying ? 'Ödeniyor…' : 'Kart ile Öde'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
