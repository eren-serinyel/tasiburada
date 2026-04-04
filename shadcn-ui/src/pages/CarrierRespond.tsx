import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/apiClient';
import { toast } from '@/components/ui/sonner';

const API_BASE_URL = '/api/v1';

interface BackendShipment {
  id: string;
  origin: string;
  destination: string;
  loadDetails: string;
  transportType?: string;
  weight?: number;
  status: string;
  shipmentDate: string;
  extraServices?: string[];
  note?: string;
}

export default function CarrierRespond() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<BackendShipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [price, setPrice] = useState('');
  const [eta, setEta] = useState('');
  const [note, setNote] = useState('');
  const [priceError, setPriceError] = useState('');

  useEffect(() => {
    if (!requestId) return;
    (async () => {
      try {
        const res = await apiClient(`${API_BASE_URL}/shipments/${requestId}`);
        const json = await res.json();
        if (res.ok && json?.success && json.data) {
          setShipment(json.data);
        } else {
          toast.error('Taşıma talebi bulunamadı.');
        }
      } catch {
        toast.error('Veri yüklenirken hata oluştu.');
      } finally {
        setLoading(false);
      }
    })();
  }, [requestId]);

  const submitOffer = async () => {
    if (!shipment || !price) return;
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Geçerli bir fiyat giriniz.');
      return;
    }
    if (priceNum < 100) {
      toast.error('Minimum teklif tutarı ₺100 olmalıdır.');
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        shipmentId: shipment.id,
        price: Number(price),
      };
      if (note.trim()) body.message = note.trim();
      if (eta) body.estimatedDuration = Number(eta);

      const res = await apiClient(`${API_BASE_URL}/offers/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Teklif başarıyla gönderildi!');
        navigate('/nakliyeci/teklifler');
      } else {
        toast.error(json?.message || 'Teklif gönderilemedi.');
      }
    } catch {
      toast.error('Teklif gönderilirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto p-6">
      <Card><CardContent className="py-10 text-center text-gray-600">Yükleniyor...</CardContent></Card>
    </div>
  );

  if (!shipment) return (
    <div className="max-w-3xl mx-auto p-6">
      <Card><CardContent className="py-10 text-center text-gray-600">Talep bulunamadı.</CardContent></Card>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Teklif Talebi</CardTitle>
          <CardDescription>Müşteri talep özeti</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>Rota:</strong> {shipment.origin} → {shipment.destination}</div>
          <div><strong>Tarih:</strong> {shipment.shipmentDate ? new Date(shipment.shipmentDate).toLocaleDateString('tr-TR') : '-'}</div>
          <div><strong>Taşıma Tipi:</strong> {shipment.transportType || '-'}</div>
          <div><strong>Yük Detayı:</strong> {shipment.loadDetails || '-'}</div>
          {shipment.weight && <div><strong>Ağırlık:</strong> {shipment.weight} kg</div>}
          {shipment.extraServices?.length ? <div><strong>Ek Hizmetler:</strong> {shipment.extraServices.join(', ')}</div> : null}
          {shipment.note && <div><strong>Not:</strong> {shipment.note}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teklif Oluştur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm">Fiyat (TL)</label>
            <Input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              onBlur={() => {
                const v = parseFloat(price);
                if (!price || isNaN(v) || v <= 0) setPriceError("Teklif fiyatı 0 TL'den büyük olmalıdır");
                else if (v < 100) setPriceError('Minimum teklif tutarı ₺100\'dir');
                else setPriceError('');
              }}
            />
            {priceError && <p className="text-sm text-red-500 mt-1">{priceError}</p>}
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
            <Button onClick={submitOffer} disabled={submitting || !price}>
              {submitting ? 'Gönderiliyor...' : 'Gönder'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
