import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { toast } from '@/components/ui/sonner';

const API_BASE_URL = '/api/v1';

interface BackendOffer {
  id: string;
  shipmentId: string;
  carrierId: string;
  carrier?: { companyName?: string; contactName?: string; rating?: number };
  shipment?: { origin?: string; destination?: string; loadDetails?: string };
  price: number;
  message?: string;
  estimatedDuration?: number;
  status: 'pending' | 'accepted' | 'rejected';
  offeredAt: string;
}

const statusLabel: Record<string, string> = {
  pending: 'Bekliyor',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
};

export default function MyOffers() {
  const [offers, setOffers] = useState<BackendOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchOffers = async () => {
    try {
      const res = await apiClient(`${API_BASE_URL}/customers/offers`);
      const json = await res.json();
      if (res.ok && json?.success) {
        setOffers(json.data || []);
      }
    } catch {
      toast.error('Teklifler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOffers(); }, []);

  const decide = async (offerId: string, accept: boolean) => {
    setDecidingId(offerId);
    try {
      const action = accept ? 'accept' : 'reject';
      const res = await apiClient(`${API_BASE_URL}/offers/${offerId}/${action}`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success(accept ? 'Teklif kabul edildi!' : 'Teklif reddedildi.');
        await fetchOffers();
      } else {
        toast.error(json?.message || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem sırasında hata oluştu.');
    } finally {
      setDecidingId(null);
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto p-6">
      <Card><CardContent className="py-10 text-center text-gray-600">Yükleniyor...</CardContent></Card>
    </div>
  );

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
                <CardTitle className="text-base">
                  {o.carrier?.companyName || o.carrier?.contactName || 'Nakliyeci'}
                  {o.carrier?.rating ? ` ⭐ ${o.carrier.rating}` : ''}
                </CardTitle>
                <CardDescription>
                  {o.shipment ? `${o.shipment.origin} → ${o.shipment.destination}` : ''}
                  {' · '}
                  {new Date(o.offeredAt).toLocaleString('tr-TR')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm space-y-0.5">
                  <div><strong>Fiyat:</strong> {o.price} TL</div>
                  {o.estimatedDuration && <div><strong>Tahmini Süre:</strong> {o.estimatedDuration} saat</div>}
                  {o.message && <div className="text-gray-600">{o.message}</div>}
                  <div><strong>Durum:</strong> {statusLabel[o.status] || o.status}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => decide(o.id, false)}
                    disabled={o.status !== 'pending' || decidingId === o.id}
                  >Reddet</Button>
                  <Button
                    onClick={() => decide(o.id, true)}
                    disabled={o.status !== 'pending' || decidingId === o.id}
                  >Kabul Et</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="pt-2">
        <Button variant="outline" onClick={() => navigate('/gecmis')}>Taşımalarıma Dön</Button>
      </div>
    </div>
  );
}
