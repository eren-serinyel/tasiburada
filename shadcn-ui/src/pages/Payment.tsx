import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Info, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/apiClient';

interface PaymentShipment {
  id: string;
  origin: string;
  destination: string;
  shipmentDate: string;
  price?: number | null;
  offers?: Array<{
    status: string;
    price?: number | null;
  }>;
  carrier?: {
    companyName?: string | null;
  } | null;
}

function formatPrice(value: number) {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 0 });
}

export default function Payment() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<PaymentShipment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShipment = async () => {
      if (!shipmentId) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient(`/api/v1/shipments/${shipmentId}`);
        const result = await response.json();
        setShipment(response.ok && result?.success ? result.data : null);
      } catch {
        setShipment(null);
      } finally {
        setLoading(false);
      }
    };

    fetchShipment();
  }, [shipmentId]);

  const agreedPrice = useMemo(() => {
    const acceptedOffer = shipment?.offers?.find((offer) => offer.status === 'accepted');
    return acceptedOffer?.price ?? shipment?.price ?? 0;
  }, [shipment]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="py-10 text-center text-gray-600">
            Taşıma bilgisi bulunamadı.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Anlaşma bilgisi</h1>
        <p className="mt-1 text-sm text-gray-500">Kabul edilen teklifinizin özeti</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[6fr,4fr] lg:items-start">
        <Card className="border-blue-200 bg-blue-50/60 shadow-none">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <div className="space-y-2">
                <h2 className="font-semibold text-gray-900">Ödeme entegrasyonu yakında aktif olacak</h2>
                <p className="text-sm leading-6 text-gray-700">
                  Şu an platform üzerinden anlaşma sağlanıyor. Bu aşamada kart veya ödeme bilgisi
                  istemiyoruz; taşıma sürecinizi ilan detayından takip edebilirsiniz.
                </p>
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
              onClick={() => navigate(`/ilan/${shipment.id}`)}
            >
              Taşıma detayına devam et
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="space-y-5 p-5">
            <h2 className="text-[15px] font-semibold text-gray-900">Anlaşma özeti</h2>

            <div className="space-y-2.5 rounded-lg bg-gray-50 p-3.5">
              <p className="font-semibold text-gray-900">
                {shipment.origin} → {shipment.destination}
              </p>
              <p className="text-[13px] text-gray-500">
                {new Date(shipment.shipmentDate).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              {shipment.carrier?.companyName && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">{shipment.carrier.companyName}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between border-t border-gray-100 pt-4">
              <span className="font-semibold text-gray-900">Anlaşılan tutar</span>
              <span className="font-bold text-gray-900">₺{formatPrice(agreedPrice)}</span>
            </div>

            <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-gray-500">Teklif kabulü tamamlandı</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
