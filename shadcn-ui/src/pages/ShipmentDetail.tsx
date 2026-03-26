import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Truck, CheckCircle2, CreditCard, Clock, Send, Play, XCircle } from 'lucide-react';
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

  const handleStart = async () => {
    if (!shipment) return;
    setUpdating(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/shipments/${shipment.id}/start`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Taşıma başlatıldı!');
        await fetchShipment();
      } else {
        toast.error(json?.message || 'İşlem başarısız.');
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setUpdating(false);
    }
  };

  const handleComplete = async () => {
    if (!shipment) return;
    setUpdating(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/shipments/${shipment.id}/complete`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Taşıma tamamlandı!');
        await fetchShipment();
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
    const confirmed = window.confirm('İlanı iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.');
    if (!confirmed) return;
    setUpdating(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/shipments/${shipment.id}/cancel`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Taşıma iptal edildi.');
        navigate('/ilanlarim');
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
          <Timeline status={shipment.status} createdAt={shipment.createdAt} />
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
            {/* Nakliyeci butonları */}
            {userType === 'carrier' && shipment.status === 'matched' && (
              <Button disabled={updating} onClick={handleStart} className="bg-blue-600 hover:bg-blue-700">
                <Play className="h-4 w-4 mr-2" />Taşımayı Başlat
              </Button>
            )}
            {userType === 'carrier' && shipment.status === 'in_transit' && (
              <Button disabled={updating} onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />Teslim Edildi
              </Button>
            )}
            {(shipment.status === 'pending' || shipment.status === 'offer_received') && userType === 'carrier' && (
              <Button onClick={() => navigate(`/nakliyeci/yanit/${shipment.id}`)}>
                <Send className="h-4 w-4 mr-2" />Teklif Ver
              </Button>
            )}
            {/* Müşteri butonları */}
            {userType === 'customer' && (shipment.status === 'pending' || shipment.status === 'matched') && (
              <Button variant="destructive" disabled={updating} onClick={handleCancel}>
                <XCircle className="h-4 w-4 mr-2" />İptal Et
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Timeline({ status, createdAt }: { status: string; createdAt: string }) {
  const isCancelled = status === 'cancelled';

  const steps = [
    {
      key: 'pending',
      label: 'İlan Oluşturuldu',
      date: createdAt,
      done: true,
    },
    {
      key: 'offer_received',
      label: 'Teklif Alındı',
      date: null,
      done: !isCancelled && ['offer_received', 'matched', 'in_transit', 'completed'].includes(status),
    },
    {
      key: 'matched',
      label: 'Nakliyeci Seçildi',
      date: null,
      done: !isCancelled && ['matched', 'in_transit', 'completed'].includes(status),
    },
    {
      key: 'in_transit',
      label: 'Taşıma Başladı',
      date: null,
      done: !isCancelled && ['in_transit', 'completed'].includes(status),
    },
    {
      key: 'completed',
      label: 'Teslim Edildi',
      date: null,
      done: !isCancelled && status === 'completed',
    },
  ];

  // Index of the last done step (= current active step)
  const activeIndex = steps.reduce((last, s, i) => (s.done ? i : last), -1);

  return (
    <div className="relative pl-8">
      {/* Vertical connector line */}
      <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {steps.map((step, idx) => {
          const isCurrent = idx === activeIndex && !isCancelled;
          const isDone = step.done;

          return (
            <div key={step.key} className="relative flex items-start gap-4">
              {/* Circle indicator */}
              <div
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  isCancelled && idx === 0
                    ? 'border-red-500 bg-red-100'
                    : isDone
                    ? 'border-green-500 bg-green-500'
                    : isCurrent
                    ? 'border-blue-500 bg-blue-500 animate-pulse'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {isDone && !isCancelled && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                {isCancelled && idx === 0 && <XCircle className="h-3.5 w-3.5 text-red-500" />}
              </div>

              {/* Step label + date */}
              <div
                className={`flex-1 pt-0.5 ${
                  isCurrent
                    ? 'font-semibold text-blue-700'
                    : isDone
                    ? 'text-gray-800'
                    : 'text-gray-400'
                }`}
              >
                <div className="text-sm">{step.label}</div>
                {step.date && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(step.date).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                )}
                {isCancelled && idx === 0 && (
                  <div className="text-xs text-red-500 mt-0.5">Taşıma iptal edildi</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
