import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Package, Clock, Search, Filter, Truck, Send, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Shipment, User, Carrier, Offer, LOAD_TYPES } from '@/lib/types';
import { getCarrierProfileTasks } from '@/lib/utils';
import { mockShipments } from '@/lib/mockData';
import { getSessionUser } from '@/lib/storage';

export default function ShipmentList() {
  const [user, setUser] = useState<User | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedLoadType, setSelectedLoadType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
    if (!u) {
      navigate('/login');
      return;
    }
    const userData = u;
    setUser(u);
    
    // Load shipments based on user type
    const allShipments = JSON.parse(localStorage.getItem('shipments') || '[]');
    const combinedShipments = [...allShipments, ...mockShipments];
    
    if (userData.type === 'customer') {
      // For customers, show their own shipments
      const userShipments = combinedShipments.filter(s => s.customerId === userData.id);
      setShipments(userShipments);
    } else {
      // For carriers, show available shipments they can bid on
      const carrier = userData as Carrier;
      const availableShipments = combinedShipments.filter(shipment => {
        // Check if carrier can handle this shipment
        const canHandle = carrier.serviceAreas.includes(shipment.origin.city) &&
                         carrier.serviceAreas.includes(shipment.destination.city) &&
                         carrier.loadTypes.includes(shipment.loadType) &&
                         carrier.vehicle.capacity >= shipment.weight;
        
        return shipment.status === 'pending' && canHandle;
      });
      setShipments(availableShipments);
    }
    
    // Load offers
    const allOffers = JSON.parse(localStorage.getItem('offers') || '[]');
    setOffers(allOffers);
  }, [navigate]);

  useEffect(() => {
    const filtered = shipments.filter(shipment => {
      const matchesSearch = shipment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           shipment.origin.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           shipment.destination.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCity = !selectedCity || shipment.origin.city === selectedCity || shipment.destination.city === selectedCity;
      const matchesLoadType = !selectedLoadType || shipment.loadType === selectedLoadType;
      const matchesStatus = !statusFilter || shipment.status === statusFilter;
      
      return matchesSearch && matchesCity && matchesLoadType && matchesStatus;
    });

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setFilteredShipments(filtered);
  }, [shipments, searchTerm, selectedCity, selectedLoadType, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'in-transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'accepted': return 'Kabul Edildi';
      case 'in-transit': return 'Yolda';
      case 'delivered': return 'Teslim Edildi';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const hasUserOffered = (shipmentId: string) => {
    if (!user || user.type !== 'carrier') return false;
    return offers.some(offer => offer.shipmentId === shipmentId && offer.carrierId === user.id);
  };

  const getUserOffer = (shipmentId: string) => {
    if (!user || user.type !== 'carrier') return null;
    return offers.find(offer => offer.shipmentId === shipmentId && offer.carrierId === user.id);
  };

  const getShipmentOfferCount = (shipmentId: string) => {
    return offers.filter(offer => offer.shipmentId === shipmentId).length;
  };

  if (!user) {
    return <div>Yükleniyor...</div>;
  }

  const cities = Array.from(new Set([
    ...shipments.map(s => s.origin.city),
    ...shipments.map(s => s.destination.city)
  ])).sort();

  const profileGate = user && user.type === 'carrier' ? getCarrierProfileTasks(user as Carrier) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {user.type === 'customer' ? 'Taşıma Talepleriniz' : 'Mevcut İşler'}
        </h1>
        <p className="text-gray-600 mt-2">
          {user.type === 'customer' 
            ? 'Oluşturduğunuz taşıma taleplerini yönetin'
            : 'Size uygun taşıma işlerine teklif verin'
          }
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        {user.type === 'customer' ? (
          <Link to="/create-shipment">
            <Button size="lg">
              <Package className="h-4 w-4 mr-2" />
              Yeni Taşıma Talebi
            </Button>
          </Link>
        ) : (
          <Link to="/carriers">
            <Button variant="outline" size="lg">
              <Star className="h-4 w-4 mr-2" />
              Diğer Nakliyecileri Görüntüle
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtreler</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Açıklama veya şehir ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="Şehir seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tüm şehirler</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedLoadType} onValueChange={setSelectedLoadType}>
              <SelectTrigger>
                <SelectValue placeholder="Yük türü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tüm yük türleri</SelectItem>
                {Object.entries(LOAD_TYPES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {user.type === 'customer' && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tüm durumlar</SelectItem>
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="accepted">Kabul Edildi</SelectItem>
                  <SelectItem value="in-transit">Yolda</SelectItem>
                  <SelectItem value="delivered">Teslim Edildi</SelectItem>
                  <SelectItem value="cancelled">İptal Edildi</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-600">
          {filteredShipments.length} {user.type === 'customer' ? 'talep' : 'iş'} bulundu
        </p>
      </div>

      {filteredShipments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {user.type === 'customer' ? 'Taşıma talebiniz yok' : 'Uygun iş bulunamadı'}
            </h3>
            <p className="text-gray-600">
              {user.type === 'customer' 
                ? 'İlk taşıma talebinizi oluşturun.'
                : 'Arama kriterlerinizi değiştirerek tekrar deneyin.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredShipments.map((shipment) => {
            const userOffer = getUserOffer(shipment.id);
            const offerCount = getShipmentOfferCount(shipment.id);
            
            return (
              <Card key={shipment.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {shipment.origin.city} → {shipment.destination.city}
                        </span>
                        <Badge className={getStatusColor(shipment.status)}>
                          {getStatusText(shipment.status)}
                        </Badge>
                        {user.type === 'customer' && offerCount > 0 && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {offerCount} Teklif
                          </Badge>
                        )}
                        {user.type === 'carrier' && userOffer && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Teklif Verildi
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{shipment.description}</CardTitle>
                      <CardDescription className="mt-1">
                        {LOAD_TYPES[shipment.loadType]} • {shipment.weight}kg • {shipment.distance}km
                      </CardDescription>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">{shipment.price}₺</div>
                      <div className="text-sm text-gray-500">
                        {new Date(shipment.requestedDate).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Çıkış:</span>
                        <p className="text-sm text-gray-600">{shipment.origin.address}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Varış:</span>
                        <p className="text-sm text-gray-600">{shipment.destination.address}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {shipment.specialRequirements && shipment.specialRequirements.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Özel Gereksinimler:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {shipment.specialRequirements.map((req, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{req}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Oluşturulma: {new Date(shipment.createdAt).toLocaleDateString('tr-TR')}</span>
                        {shipment.estimatedDuration && (
                          <span>Tahmini süre: {shipment.estimatedDuration} saat</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {new Date(shipment.createdAt).toLocaleDateString('tr-TR')} tarihinde oluşturuldu
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {user.type === 'customer' ? (
                        <>
                          {offerCount > 0 && (
                            <Link to={`/offers/${shipment.id}`}>
                              <Button size="sm">
                                Teklifleri Görüntüle ({offerCount})
                              </Button>
                            </Link>
                          )}
                          {shipment.status === 'pending' && offerCount === 0 && (
                            <Button size="sm" variant="outline" disabled>
                              Teklif Bekleniyor
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {userOffer ? (
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                {userOffer.price}₺ teklif verildi
                              </Badge>
                              <Badge className={getStatusColor(userOffer.status)}>
                                {userOffer.status === 'pending' ? 'Bekliyor' : 
                                 userOffer.status === 'accepted' ? 'Kabul Edildi' : 'Reddedildi'}
                              </Badge>
                            </div>
                          ) : (
                            profileGate && !profileGate.isComplete ? (
                              <Button size="sm" variant="outline" onClick={() => navigate('/profile')}>
                                Profilini tamamla
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                <Send className="h-4 w-4 mr-2" />
                                Teklif Ver
                              </Button>
                            )
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}