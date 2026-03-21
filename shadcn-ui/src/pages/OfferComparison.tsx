import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, MessageCircle, Truck, CheckCircle, Clock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Offer, Carrier, Shipment } from '@/lib/types';
import { getSessionUser } from '@/lib/storage';
import { mockCarriers } from '@/lib/mockData';

export default function OfferComparison() {
  const [offers, setOffers] = useState<(Offer & { carrier: Carrier })[]>([]);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const { shipmentId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
  const user = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : {});
    if (!user.id || user.type !== 'customer') {
      navigate('/login');
      return;
    }

    // Load offers for this shipment
    const allOffers = JSON.parse(localStorage.getItem('offers') || '[]');
    const shipmentOffers = allOffers.filter((offer: Offer) => offer.shipmentId === shipmentId);
    
    // Enrich offers with carrier data
    const enrichedOffers = shipmentOffers.map((offer: Offer) => ({
      ...offer,
      carrier: mockCarriers.find(c => c.id === offer.carrierId) || mockCarriers[0]
    }));

    // Sort by price (lowest first)
    enrichedOffers.sort((a, b) => a.price - b.price);
    setOffers(enrichedOffers);

    // Load shipment data
    const allShipments = JSON.parse(localStorage.getItem('shipments') || '[]');
    const currentShipment = allShipments.find((s: Shipment) => s.id === shipmentId);
    setShipment(currentShipment);
  }, [shipmentId, navigate]);

  const handleAcceptOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    setIsAcceptDialogOpen(true);
  };

  const confirmAcceptOffer = () => {
    if (!selectedOffer) return;

    // Update offer status
    const allOffers = JSON.parse(localStorage.getItem('offers') || '[]');
    const updatedOffers = allOffers.map((offer: Offer) => {
      if (offer.id === selectedOffer.id) {
        return { ...offer, status: 'accepted' };
      } else if (offer.shipmentId === selectedOffer.shipmentId) {
        return { ...offer, status: 'rejected' };
      }
      return offer;
    });
    localStorage.setItem('offers', JSON.stringify(updatedOffers));

    // Update shipment status
    const allShipments = JSON.parse(localStorage.getItem('shipments') || '[]');
    const updatedShipments = allShipments.map((shipment: Shipment) => {
      if (shipment.id === selectedOffer.shipmentId) {
        return { 
          ...shipment, 
          status: 'accepted',
          carrierId: selectedOffer.carrierId,
          price: selectedOffer.price
        };
      }
      return shipment;
    });
    localStorage.setItem('shipments', JSON.stringify(updatedShipments));

    alert('Teklif kabul edildi! Ödeme adımına yönlendiriliyorsunuz.');
    navigate(`/payment/${selectedOffer.shipmentId}`);
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

  if (!shipment) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gelen Teklifler</h1>
        <p className="text-gray-600 mt-2">
          {shipment.origin.city} → {shipment.destination.city} taşıması için gelen teklifleri karşılaştırın
        </p>
      </div>

      {/* Shipment Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Taşıma Detayları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Rota:</span>
              <p>{shipment.origin.city} → {shipment.destination.city}</p>
            </div>
            <div>
              <span className="font-medium">Yük:</span>
              <p>{shipment.weight}kg - {shipment.loadType}</p>
            </div>
            <div>
              <span className="font-medium">Tarih:</span>
              <p>{new Date(shipment.requestedDate).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offers */}
      {offers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz teklif gelmedi</h3>
            <p className="text-gray-600">
              Nakliyeciler talebinizi inceliyor. Kısa süre içinde teklifler gelmeye başlayacak.
            </p>
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
                        {offer.carrier.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{offer.carrier.name} {offer.carrier.surname}</span>
                        {index === 0 && <Badge className="bg-green-100 text-green-800">En Uygun</Badge>}
                        <Badge className={getStatusColor(offer.status)}>
                          {getStatusText(offer.status)}
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{offer.carrier.rating}</span>
                          <span className="text-sm text-gray-500">({offer.carrier.reviewCount} değerlendirme)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600">{offer.price}₺</div>
                    <div className="text-sm text-gray-500">
                      {offer.price < shipment.price ? 
                        `${shipment.price - offer.price}₺ tasarruf` : 
                        `+${offer.price - shipment.price}₺`
                      }
                    </div>
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
                        <span className="text-sm">{offer.carrier.vehicle.type.toUpperCase()}</span>
                        <span className="text-sm text-gray-500">({offer.carrier.vehicle.capacity}kg)</span>
                      </div>
                      <p className="text-sm text-gray-600">{offer.carrier.vehicle.licensePlate}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700">Hizmet Bölgeleri:</span>
                      <p className="text-sm text-gray-600">{offer.carrier.serviceAreas.join(', ')}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {offer.message && (
                      <div>
                        <span className="font-medium text-gray-700">Nakliyeci Notu:</span>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mt-1">
                          "{offer.message}"
                        </p>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      {offer.status === 'pending' && (
                        <>
                          <Button 
                            onClick={() => handleAcceptOffer(offer)}
                            className="flex-1"
                          >
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

      {/* Accept Confirmation Dialog */}
      <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklifi Kabul Et</DialogTitle>
            <DialogDescription>
              {selectedOffer && (
                <>
                  {selectedOffer.carrier.name} {selectedOffer.carrier.surname} adlı nakliyecinin 
                  {selectedOffer.price}₺ tutarındaki teklifini kabul etmek istediğinizden emin misiniz?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsAcceptDialogOpen(false)} className="flex-1">
              İptal
            </Button>
            <Button onClick={confirmAcceptOffer} className="flex-1">
              Evet, Kabul Et
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}