import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Package, Clock, Search, Filter, Send, Star } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Shipment, User, Carrier, LOAD_TYPES } from '@/lib/types';
import { getCarrierProfileTasks } from '@/lib/utils';
import { getSessionUser } from '@/lib/storage';
import { apiClient } from '@/lib/apiClient';
import { getCustomerShipmentDetailPath } from '@/lib/customerShipmentForm';

const API_BASE_URL = '/api/v1';
const ALL_FILTER_VALUE = '__all__';

type BackendShipment = {
  id: string;
  customerId?: string;
  origin?: string;
  destination?: string;
  originCity?: string;
  originDistrict?: string;
  destinationCity?: string;
  destinationDistrict?: string;
  loadDetails?: string;
  customerDisplayName?: string;
  transportType?: string;
  insuranceType?: string;
  hasElevator?: boolean;
  weight?: number | string | null;
  estimatedWeight?: number | string | null;
  shipmentDate?: string;
  createdAt?: string;
  status?: string;
  price?: number | string | null;
  offerCount?: number;
  shipmentCategory?: 'HOME_MOVE' | 'OFFICE_MOVE' | 'PARTIAL_ITEM' | 'STORAGE' | null;
  extraServices?: string[];
  originFloor?: number | null;
  destinationFloor?: number | null;
  originHasElevator?: boolean | null;
  destinationHasElevator?: boolean | null;
  dateFlexibility?: string | null;
  converter?: {
    converterEstimatedVolumeMin?: number | null;
    converterEstimatedVolumeMax?: number | null;
  } | null;
};

type ShipmentListItem = Shipment & {
  customerDisplayName: string;
  rawStatus: string;
  offerCount?: number;
  originDistrict?: string;
  destinationDistrict?: string;
  isAssured?: boolean;
  hasElevator?: boolean;
  extraServices?: string[];
  shipmentCategory?: BackendShipment['shipmentCategory'];
  converterEstimatedVolumeMin?: number | null;
  converterEstimatedVolumeMax?: number | null;
  estimatedWeight?: number;
  originFloor?: number | null;
  destinationFloor?: number | null;
};

const mapShipmentCategoryToLoadType = (shipmentCategory?: BackendShipment['shipmentCategory']): Shipment['loadType'] => {
  switch (shipmentCategory) {
    case 'HOME_MOVE':
      return 'ev-esyasi';
    case 'OFFICE_MOVE':
      return 'mobilya';
    case 'PARTIAL_ITEM':
      return 'hassas-yuk';
    case 'STORAGE':
      return 'mobilya';
    default:
      return 'ev-esyasi';
  }
};

const resolveLoadType = (shipment: BackendShipment): Shipment['loadType'] => {
  const raw = String(shipment.transportType || '').trim().toLowerCase();
  const transportTypeMap: Record<string, Shipment['loadType']> = {
    'evden-eve': 'ev-esyasi',
    'ofis-tasima': 'mobilya',
    'parca': 'hassas-yuk',
    'depolama': 'mobilya',
    'ev-esyasi': 'ev-esyasi',
    'beyaz-esya': 'beyaz-esya',
    'mobilya': 'mobilya',
    'makina': 'makina',
    'hassas-yuk': 'hassas-yuk',
    'gida': 'gida',
    'tekstil': 'tekstil',
  };

  return transportTypeMap[raw] || mapShipmentCategoryToLoadType(shipment.shipmentCategory);
};

const formatLoadSummary = (loadDetails?: string, weight?: number) => {
  const safeLoadDetails = loadDetails?.trim() || 'Yük bilgisi yok';
  return weight && weight > 0 ? `${safeLoadDetails}, ${weight} kg` : safeLoadDetails;
};

const normalizeStatus = (status?: string): Shipment['status'] => {
  switch (status) {
    case 'matched':
      return 'matched';
    case 'completed':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    case 'expired':
      return 'expired';
    case 'in_transit':
      return 'matched';
    case 'offer_received':
    case 'pending':
    default:
      return 'pending';
  }
};

const getCustomerNextStep = (shipment: ShipmentListItem): string => {
  const offerCount = shipment.offerCount ?? 0;

  switch (shipment.rawStatus || shipment.status) {
    case 'pending':
      return offerCount > 0
        ? 'Teklifleri karsilastirin ve en uygun tasiyiciyi secin.'
        : 'Teklif gelmesini bekleyin veya ilan detayini guncelleyin.';
    case 'offer_received':
      return 'Teklifleri karsilastirin ve kabul etmeden once detaylari inceleyin.';
    case 'matched':
      return 'Secilen tasiyici ile sureci platform uzerinden ilerletin.';
    case 'in_transit':
      return 'Tasima durumunu takip edin, sureci platform icinden yonetin.';
    case 'completed':
      return 'Surec tamamlandi. Dilerseniz benzer bir ilan yeniden olusturabilirsiniz.';
    case 'cancelled':
      return 'Ihtiyaciniz devam ediyorsa yeni bir ilan olusturabilirsiniz.';
    case 'expired':
      return 'Bu ilanin tasima tarihi gecti. Yeni tarih ile yeniden ilan olusturabilirsiniz.';
    default:
      return 'Ilan detaylarini kontrol ederek bir sonraki adimi belirleyin.';
  }
};

const toUiShipment = (shipment: BackendShipment): ShipmentListItem => {
  const originText = shipment.origin || '';
  const destinationText = shipment.destination || '';

  const originCity = shipment.originCity || originText.split(',')[0] || '';
  const destinationCity = shipment.destinationCity || destinationText.split(',')[0] || '';

  return {
    id: shipment.id,
    customerId: shipment.customerId || '',
    origin: {
      address: originText,
      city: originCity,
      lat: 0,
      lng: 0
    },
    destination: {
      address: destinationText,
      city: destinationCity,
      lat: 0,
      lng: 0
    },
    loadType: resolveLoadType(shipment),
    weight: Number(shipment.weight || 0),
    date: shipment.shipmentDate ? new Date(shipment.shipmentDate) : new Date(),
    requestedDate: shipment.shipmentDate ? new Date(shipment.shipmentDate) : new Date(),
    distance: 0,
    description: shipment.loadDetails || '',
    status: normalizeStatus(shipment.status),
    rawStatus: shipment.status || 'pending',
    offerCount: Number(shipment.offerCount || 0),
    price: Number(shipment.price || 0),
    originDistrict: shipment.originDistrict,
    destinationDistrict: shipment.destinationDistrict,
    isAssured: String(shipment.insuranceType || '').trim().toLowerCase() !== 'none' && Boolean(shipment.insuranceType),
    hasElevator: Boolean(shipment.hasElevator || shipment.originHasElevator || shipment.destinationHasElevator),
    extraServices: Array.isArray(shipment.extraServices) ? shipment.extraServices : [],
    shipmentCategory: shipment.shipmentCategory,
    converterEstimatedVolumeMin: shipment.converter?.converterEstimatedVolumeMin ?? null,
    converterEstimatedVolumeMax: shipment.converter?.converterEstimatedVolumeMax ?? null,
    estimatedWeight: Number(shipment.estimatedWeight || 0),
    originFloor: shipment.originFloor ?? null,
    destinationFloor: shipment.destinationFloor ?? null,
    createdAt: shipment.createdAt ? new Date(shipment.createdAt) : new Date(),
    customerDisplayName: shipment.customerDisplayName || 'Müşteri'
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
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<ShipmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState(ALL_FILTER_VALUE);
  const [selectedLoadType, setSelectedLoadType] = useState(ALL_FILTER_VALUE);
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || ALL_FILTER_VALUE);
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
      setError(null);

      try {
        const userType = detectUserType(u);
        const endpoint = userType === 'carrier'
          ? `${API_BASE_URL}/shipments/pending`
          : `${API_BASE_URL}/shipments/my-shipments`;

        const response = await apiClient(endpoint);
        const json = await response.json();

        if (response.ok && json?.success && Array.isArray(json.data)) {
          setShipments((json.data as BackendShipment[]).map(toUiShipment));
        } else {
          setShipments([]);
          setError(json?.message || 'Taşıma talepleri alınamadı.');
        }
      } catch {
        setShipments([]);
        setError('Taşıma talepleri yüklenirken bağlantı hatası oluştu.');
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
      const matchesStatus = statusFilter === ALL_FILTER_VALUE || shipment.status === statusFilter || shipment.rawStatus === statusFilter;
      
      return matchesSearch && matchesCity && matchesLoadType && matchesStatus;
    });

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setFilteredShipments(filtered);
  }, [shipments, searchTerm, selectedCity, selectedLoadType, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'offer_received': return 'bg-blue-100 text-blue-800';
      case 'matched': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'offer_received': return 'Teklif Geldi';
      case 'matched': return 'Eşleşti';
      case 'in_transit': return 'Tasiniyor';
      case 'delivered': return 'Teslim Edildi';
      case 'completed': return 'Tamamlandi';
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
          <Link to="/teklif-talebi">
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
                  <SelectItem value="offer_received">Teklif Geldi</SelectItem>
                  <SelectItem value="matched">Eşleşti</SelectItem>
                  <SelectItem value="in_transit">Taşınıyor</SelectItem>
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

      {error ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Talepler yüklenemedi</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Tekrar Dene</Button>
          </CardContent>
        </Card>
      ) : filteredShipments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Henüz ilan yok
            </h3>
            {user.type === 'customer' && (
              <Link to="/teklif-talebi">
                <Button variant="outline">İlk talebinizi oluşturun</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredShipments.map((shipment) => {
            const statusKey = shipment.rawStatus || shipment.status;
            return (
              <Card key={shipment.id} className="hover:shadow-md transition-shadow border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(statusKey)} font-semibold text-[10px] uppercase tracking-wider`}>
                        {getStatusText(statusKey)}
                      </Badge>
                      {user.type === 'customer' && (
                        <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600">
                          {shipment.offerCount ?? 0} teklif
                        </Badge>
                      )}
                      <span className="text-[11px] text-gray-400 font-mono">#{shipment.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                       <Clock className="h-3 w-3" />
                       {shipment.requestedDate ? new Date(shipment.requestedDate).toLocaleDateString('tr-TR') : '-'}
                    </div>
                  </div>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 text-base">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <span className="font-bold text-gray-900">
                          {shipment.origin.city}{shipment.originDistrict ? `, ${shipment.originDistrict}` : ''} 
                          <span className="mx-2 text-gray-300">→</span> 
                          {shipment.destination.city}{shipment.destinationDistrict ? `, ${shipment.destinationDistrict}` : ''}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-gray-700">
                        <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {LOAD_TYPES[shipment.loadType]}</span>
                        {shipment.weight > 0 && <span className="text-gray-300">|</span>}
                        {shipment.weight > 0 && <span>{shipment.weight} kg</span>}
                        {!shipment.weight && shipment.estimatedWeight && shipment.estimatedWeight > 0 && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>Tahmini {shipment.estimatedWeight} kg</span>
                          </>
                        )}
                        {shipment.converterEstimatedVolumeMin != null && shipment.converterEstimatedVolumeMax != null && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span>{shipment.converterEstimatedVolumeMin}-{shipment.converterEstimatedVolumeMax} m³</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="text-xl font-black text-gray-900">{shipment.price > 0 ? `${shipment.price}₺` : 'Teklif Al'}</div>
                       <div className="text-[10px] text-gray-400 font-medium">{shipment.customerDisplayName}*</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                   <div className="flex items-center gap-2 mb-4">
                      {shipment.rawStatus === 'pending' && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-100 text-[10px]">Yeni İlan</Badge>}
                      {shipment.isAssured && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">Sigortalı</Badge>}
                      {shipment.hasElevator && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 text-[10px]">Asansörlü</Badge>}
                      {(shipment.originFloor || shipment.destinationFloor) && (
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                          Kat: {shipment.originFloor ?? 0} → {shipment.destinationFloor ?? 0}
                        </Badge>
                      )}
                      {shipment.extraServices && shipment.extraServices.length > 0 && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px]">
                          +{shipment.extraServices.length} Ek Hizmet
                        </Badge>
                      )}
                   </div>

                  {user.type === 'customer' && (
                    <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sonraki adim</p>
                      <p className="mt-1 text-xs text-slate-700">{getCustomerNextStep(shipment)}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2 pt-3 border-t">
                    <div className="text-xs text-gray-400">
                      İlan: {new Date(shipment.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {user.type === 'customer' ? (
                        <>
                           <Button size="sm" variant="ghost" onClick={() => navigate(getCustomerShipmentDetailPath(shipment.id))}>Detaylar</Button>
                          {shipment.status === 'pending' && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">Teklif Bekleniyor</Badge>
                          )}
                        </>
                      ) : (
                        <>
                          {profileGate && !profileGate.isComplete ? (
                            <Button size="sm" variant="outline" onClick={() => navigate('/profilim')}>
                              Profilini tamamla
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/nakliyeci/yanit/${shipment.id}`)}>
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
