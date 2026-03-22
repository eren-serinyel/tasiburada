import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Package, Clock, Search, Filter, Send, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Shipment, User, Carrier, LOAD_TYPES } from '@/lib/types';
import { getCarrierProfileTasks } from '@/lib/utils';
import { getSessionUser } from '@/lib/storage';
import { apiClient } from '@/lib/apiClient';

const API_BASE_URL = '/api/v1';
const ALL_FILTER_VALUE = '__all__';

type BackendShipment = {
  id: string;
  customerId?: string;
  origin?: string;
  destination?: string;
  loadDetails?: string;
  weight?: number | string | null;
  shipmentDate?: string;
  createdAt?: string;
  status?: string;
  price?: number | string | null;
  offerCount?: number;
};

const normalizeStatus = (status?: string): Shipment['status'] => {
  switch (status) {
    case 'matched':
      return 'matched';
    case 'completed':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    case 'in_transit':
      return 'matched';
    case 'offer_received':
    case 'pending':
    default:
      return 'pending';
  }
};

const toUiShipment = (shipment: BackendShipment): Shipment => {
  const originText = shipment.origin || '';
  const destinationText = shipment.destination || '';

  return {
    id: shipment.id,
    customerId: shipment.customerId || '',
    origin: {
      address: originText,
      city: originText,
      lat: 0,
      lng: 0
    },
    destination: {
      address: destinationText,
      city: destinationText,
      lat: 0,
      lng: 0
    },
    loadType: 'ev-esyasi',
    weight: Number(shipment.weight || 0),
    date: shipment.shipmentDate ? new Date(shipment.shipmentDate) : new Date(),
    requestedDate: shipment.shipmentDate ? new Date(shipment.shipmentDate) : new Date(),
    distance: 0,
    description: shipment.loadDetails || '',
    status: normalizeStatus(shipment.status),
    price: Number(shipment.price || 0),
    createdAt: shipment.createdAt ? new Date(shipment.createdAt) : new Date()
  };
};

const detectUserType = (sessionUser: User | null): 'customer' | 'carrier' => {
  const savedType = localStorage.getItem('userType');
  if (savedType === 'customer' || savedType === 'carrier') {
    return savedType;
  }

  if (sessionUser?.type === 'customer' || sessionUser?.type === 'carrier') {
    return sessionUser.type;
  }

  const token = localStorage.getItem('authToken');
  if (!token) {
    return 'customer';
  }

  try {
    const payloadPart = token.split('.')[1] || '';
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = JSON.parse(atob(padded));
    if (decoded?.type === 'customer' || decoded?.type === 'carrier') {
      return decoded.type;
    }
  } catch {
    // Fall back to default
  }

  return 'customer';
};

export default function ShipmentList() {
  const [user, setUser] = useState<User | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState(ALL_FILTER_VALUE);
  const [selectedLoadType, setSelectedLoadType] = useState(ALL_FILTER_VALUE);
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER_VALUE);
  const navigate = useNavigate();

  useEffect(() => {
    const loadShipments = async () => {
      const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
      if (!u) {
        navigate('/giris');
        return;
      }

      setUser(u);
      setLoading(true);

      try {
        const userType = detectUserType(u);
        const endpoint = userType === 'carrier'
          ? `${API_BASE_URL}/shipments/pending`
          : `${API_BASE_URL}/shipments/my-shipments`;

        const response = await apiClient(endpoint);
        const json = await response.json();
        console.log('[ShipmentList] API raw shipment data:', json?.data);

        if (response.ok && json?.success && Array.isArray(json.data)) {
          const emptyFieldRows = (json.data as BackendShipment[]).filter(item => !item.origin || !item.destination || !item.status);
          if (emptyFieldRows.length > 0) {
            console.log(
              '[ShipmentList] Shipments with empty critical fields (origin/destination/status):',
              emptyFieldRows.map(item => ({
                id: item.id,
                origin: item.origin,
                destination: item.destination,
                status: item.status
              }))
            );
          }
          setShipments((json.data as BackendShipment[]).map(toUiShipment));
        } else {
          setShipments([]);
        }
      } catch {
        setShipments([]);
      } finally {
        setLoading(false);
      }
    };

    loadShipments();
  }, [navigate]);

  useEffect(() => {
    const filtered = shipments.filter(shipment => {
      const matchesSearch = shipment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           shipment.origin.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           shipment.destination.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCity = selectedCity === ALL_FILTER_VALUE || shipment.origin.city === selectedCity || shipment.destination.city === selectedCity;
      const matchesLoadType = selectedLoadType === ALL_FILTER_VALUE || shipment.loadType === selectedLoadType;
      const matchesStatus = statusFilter === ALL_FILTER_VALUE || shipment.status === statusFilter;
      
      return matchesSearch && matchesCity && matchesLoadType && matchesStatus;
    });

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setFilteredShipments(filtered);
  }, [shipments, searchTerm, selectedCity, selectedLoadType, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'matched': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'matched': return 'Eşleşti';
      case 'delivered': return 'Teslim Edildi';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  if (!user || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    );
  }

  const cities = Array.from(new Set([
    ...shipments.map(s => s.origin.city),
    ...shipments.map(s => s.destination.city)
  ])).filter(Boolean).sort();

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
          <Link to="/nakliyeciler">
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
                <SelectItem value={ALL_FILTER_VALUE}>Tüm şehirler</SelectItem>
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
                <SelectItem value={ALL_FILTER_VALUE}>Tüm yük türleri</SelectItem>
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
                  <SelectItem value={ALL_FILTER_VALUE}>Tüm durumlar</SelectItem>
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="matched">Eşleşti</SelectItem>
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
              Henüz ilan yok
            </h3>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredShipments.map((shipment) => {
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
                      </div>
                      <CardTitle className="text-lg">{shipment.description}</CardTitle>
                      <CardDescription className="mt-1">
                        {LOAD_TYPES[shipment.loadType]} • {shipment.weight}kg • {shipment.distance}km
                      </CardDescription>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">{shipment.price}₺</div>
                      <div className="text-sm text-gray-500">
                        {shipment.requestedDate ? new Date(shipment.requestedDate).toLocaleDateString('tr-TR') : '-'}
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
                          {shipment.status === 'pending' && (
                            <Button size="sm" variant="outline" disabled>
                              Teklif Bekleniyor
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {profileGate && !profileGate.isComplete ? (
                            <Button size="sm" variant="outline" onClick={() => navigate('/profilim')}>
                              Profilini tamamla
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" disabled>
                              <Send className="h-4 w-4 mr-2" />
                              Teklif Ver
                            </Button>
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