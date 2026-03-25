import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Truck, CheckCircle2, CreditCard, Clock, Send } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { toast } from '@/components/ui/sonner';
import { APP_CONFIG } from '@/lib/config';

const API_BASE_URL = '/api/v1';

interface BackendShipment {
  id: string;
  origin: string;
  destination: string;
  loadDetails: string;
  transportType?: string;
  weight?: number;
  status: string;
  price?: number;
  shipmentDate: string;
  createdAt: string;
  customerId: string;
  carrierId?: string | null;
  customer?: { firstName: string; lastName: string; phone?: string; email?: string };
  extraServices?: string[];
}

const statusLabel = (st: string) => ({
  pending: 'Bekliyor',
  offer_received: 'Teklif Geldi',
  matched: 'Eşleşti',
  in_transit: 'Yolda',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
} as Record<string,string>)[st] || st;

const statusColor = (st: string) => ({
  pending: 'bg-yellow-100 text-yellow-800',
  offer_received: 'bg-orange-100 text-orange-800',
  matched: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
} as Record<string,string>)[st] || 'bg-gray-100 text-gray-800';

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userType = typeof window !== 'undefined' ? localStorage.getItem(APP_CONFIG.userTypeKey) : null;
  const [shipment, setShipment] = useState<BackendShipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchShipment = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/shipments/${id}`);
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
  }, [id]);

  useEffect(() => { fetchShipment(); }, [fetchShipment]);

  const handleComplete = async () => {
    if (!shipment) return;
    setUpdating(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/shipments/${shipment.id}/complete`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Taşıma tamamlandı olarak işaretlendi.');
        setShipment(prev => prev ? { ...prev, status: 'completed' } : prev);
      } else {
        toast.error(json?.message || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!shipment) return;
    setUpdating(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/shipments/${shipment.id}/cancel`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Taşıma iptal edildi.');
        setShipment(prev => prev ? { ...prev, status: 'cancelled' } : prev);
      } else {
        toast.error(json?.message || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setUpdating(false);
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
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-600">
        İlan bulunamadı.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Taşıma Detayı</h1>
        <Badge className={statusColor(shipment.status)}>{statusLabel(shipment.status)}</Badge>
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
              <div className="font-medium">{shipment.origin}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-red-600 mt-1" />
            <div>
              <div className="text-sm text-gray-600">Varış</div>
              <div className="font-medium">{shipment.destination}</div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Truck className="h-4 w-4" /> {shipment.loadDetails} {shipment.weight ? `· ${shipment.weight} kg` : ''}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Durum Zaman Çizelgesi</CardTitle>
          <CardDescription>Süreç ilerlemesi</CardDescription>
        </CardHeader>
        <CardContent>
          <Timeline status={shipment.status} />
        </CardContent>
      </Card>

      {shipment.price != null && shipment.price > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ödeme</CardTitle>
            <CardDescription>Durum ve işlemler</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {shipment.status === 'completed' ? (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" /> Tamamlandı · {shipment.price}₺
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-5 w-5" /> Ödeme bekleniyor · {shipment.price}₺
              </div>
            )}
            {shipment.status === 'matched' && (
              <Button asChild>
                <Link to={`/odeme/${shipment.id}`}><CreditCard className="h-4 w-4 mr-1" /> Ödeme Yap</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer / Management */}
      <Card>
        <CardHeader>
          <CardTitle>İş Yönetimi</CardTitle>
          <CardDescription>Detay bilgiler ve durum güncelleme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {shipment.customer ? (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Müşteri</div>
                <div className="font-medium">{shipment.customer.firstName} {shipment.customer.lastName}</div>
                {shipment.customer.phone && <div className="text-gray-600">{shipment.customer.phone}</div>}
                {shipment.customer.email && <div className="text-gray-600">{shipment.customer.email}</div>}
              </div>
              <div>
                <div className="text-gray-600">Tarih</div>
                <div className="font-medium">{new Date(shipment.shipmentDate).toLocaleDateString('tr-TR')}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Tarih:</span> {new Date(shipment.shipmentDate).toLocaleDateString('tr-TR')}
            </div>
          )}
          <Separator />
          <div className="flex flex-wrap gap-2">
            {shipment.status === 'in_transit' && (
              <Button disabled={updating} onClick={handleComplete}>Teslim Edildi</Button>
            )}
            {(shipment.status === 'pending' || shipment.status === 'offer_received') && userType === 'carrier' && (
              <Button onClick={() => navigate(`/nakliyeci/yanit/${shipment.id}`)}>
                <Send className="h-4 w-4 mr-2" />Teklif Ver
              </Button>
            )}
            {(shipment.status === 'pending' || shipment.status === 'offer_received') && (
              <Button variant="destructive" disabled={updating} onClick={handleCancel}>İptal Et</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Timeline({ status }: { status: string }) {
  const steps = [
    { key: 'pending', label: 'Talep Oluşturuldu' },
    { key: 'offer_received', label: 'Teklif Geldi' },
    { key: 'matched', label: 'Eşleşti' },
    { key: 'in_transit', label: 'Yolda' },
    { key: 'completed', label: 'Teslim Edildi' },
  ];

  const statusOrder = ['pending', 'offer_received', 'matched', 'in_transit', 'completed'];
  const activeIndex = statusOrder.indexOf(status);

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
