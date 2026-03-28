import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, MessageCircle, Truck, CheckCircle, Clock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSessionUser } from '@/lib/storage';
import { apiClient } from '@/lib/apiClient';
import { toast } from '@/components/ui/sonner';

type OfferApi = {
  id: string;
  shipmentId: string;
  carrierId: string;
  price: number;
  status: 'pending' | 'accepted' | 'rejected';
  carrier?: {
    id: string;
    companyName?: string;
    contactName?: string;
    rating?: number;
  };
};

type ShipmentApi = {
  id: string;
  origin?: string;
  destination?: string;
  weight?: number;
  shipmentDate?: string;
  price?: number;
};

export default function OfferComparison() {
  const [offers, setOffers] = useState<OfferApi[]>([]);
  const [shipment, setShipment] = useState<ShipmentApi | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<OfferApi | null>(null);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { shipmentId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const user = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : {});
      if (!user.id || user.type !== 'customer') {
        navigate('/giris');
        return;
      }

      setLoading(true);
      try {
        const [offersRes, shipmentRes] = await Promise.all([
          apiClient('/api/v1/customers/offers'),
          shipmentId ? apiClient(`/api/v1/shipments/${shipmentId}`) : Promise.resolve(null as any)
        ]);

        const offersJson = await offersRes.json();
        const shipmentJson = shipmentRes ? await shipmentRes.json() : null;

        if (offersRes.ok && offersJson?.success && Array.isArray(offersJson.data)) {
          const data = (offersJson.data as OfferApi[])
            .filter(offer => !shipmentId || offer.shipmentId === shipmentId)
            .sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
          setOffers(data);
        } else {
          setOffers([]);
        }

        if (shipmentRes && shipmentRes.ok && shipmentJson?.success) {
          setShipment(shipmentJson.data as ShipmentApi);
        } else {
          setShipment(null);
        }
      } catch {
        setOffers([]);
        setShipment(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [shipmentId, navigate]);

  const handleAcceptOffer = (offer: OfferApi) => {
    setSelectedOffer(offer);
    setIsAcceptDialogOpen(true);
  };

  const confirmAcceptOffer = async () => {
    if (!selectedOffer) return;

    setIsAccepting(true);
    try {
      const res = await apiClient(`/api/v1/offers/${selectedOffer.id}/accept`, {
        method: 'PUT',
      });
      const json = await res.json();

      if (!res.ok || !json?.success) {
        toast.error(json?.message || 'Teklif kabul edilemedi.');
        return;
      }

      toast.success('Teklif kabul edildi. Ödeme adımına yönlendiriliyorsunuz.');
      setIsAcceptDialogOpen(false);
      navigate(`/odeme/${selectedOffer.shipmentId}`);
    } catch {
      toast.error('Teklif kabul edilirken bir hata oluştu.');
    } finally {
      setIsAccepting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return 'Kabul Edildi';
      case 'rejected': return 'Reddedildi';
      default: return 'Bekliyor';
    }
  };

  if (loading) {
    return <div className="text-center py-10">Yükleniyor...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gelen Teklifler</h1>
        <p className="text-gray-600 mt-2">
          {shipment ? `${shipment.origin || '-'} → ${shipment.destination || '-'} taşıması için gelen teklifleri karşılaştırın` : 'Teklifleri karşılaştırın'}
        </p>
      </div>

      {shipment && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Taşıma Detayları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Rota:</span>
                <p>{shipment.origin || '-'} → {shipment.destination || '-'}</p>
              </div>
              <div>
                <span className="font-medium">Yük:</span>
                <p>{shipment.weight || 0}kg</p>
              </div>
              <div>
                <span className="font-medium">Tarih:</span>
                <p>{shipment.shipmentDate ? new Date(shipment.shipmentDate).toLocaleDateString('tr-TR') : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {offers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz ilan yok</h3>
            <p className="text-gray-600">Bu taşıma için görüntülenecek teklif bulunamadı.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {offers.map((offer, index) => (
            <Card key={offer.id} className={`hover:shadow-lg transition-shadow ${index === 0 ? 'ring-2 ring-green-200' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {(offer.carrier?.companyName || 'N').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{offer.carrier?.companyName || offer.carrier?.contactName || 'Nakliyeci'}</span>
                        {index === 0 && <Badge className="bg-green-100 text-green-800">En Uygun</Badge>}
                        <Badge className={getStatusColor(offer.status)}>
                          {getStatusText(offer.status)}
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{Number(offer.carrier?.rating || 0).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600">{offer.price}₺</div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Araç Bilgileri:</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">-</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Hizmet Bölgeleri:</span>
                      <p className="text-sm text-gray-600">-</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      {offer.status === 'pending' && (
                        <>
                          <Button onClick={() => handleAcceptOffer(offer)} className="flex-1">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Kabul Et
                          </Button>
                          <Button variant="outline" size="sm">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {offer.status === 'accepted' && (
                        <Button disabled className="flex-1">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Kabul Edildi
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklifi Kabul Et</DialogTitle>
            <DialogDescription>
              {selectedOffer && (
                <>
                  {(selectedOffer.carrier?.companyName || selectedOffer.carrier?.contactName || 'Nakliyeci')} adlı nakliyecinin
                  {' '}{selectedOffer.price}₺ tutarındaki teklifini kabul etmek istediğinizden emin misiniz?
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsAcceptDialogOpen(false)} className="flex-1" disabled={isAccepting}>
              İptal
            </Button>
            <Button onClick={confirmAcceptOffer} className="flex-1" disabled={isAccepting}>
              {isAccepting ? 'İşleniyor...' : 'Evet, Kabul Et'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
