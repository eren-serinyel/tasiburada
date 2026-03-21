import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Package, Calendar, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LOAD_TYPES, LoadType } from '@/lib/types';
import { calculateDistance, calculatePrice } from '@/lib/mockData';
import { getSessionUser } from '@/lib/storage';

export default function CreateShipment() {
  const [formData, setFormData] = useState({
    originAddress: '',
    originCity: '',
    destinationAddress: '',
    destinationCity: '',
    loadType: '',
    weight: '',
    description: '',
    requestedDate: ''
  });
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
  const user = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : {});
    if (!user.id) {
      alert('Lütfen giriş yapın');
      return;
    }

    // Calculate distance and price
    const mockDistance = calculateDistance(
      { address: formData.originAddress, lat: 40, lng: 29, city: formData.originCity },
      { address: formData.destinationAddress, lat: 40, lng: 29, city: formData.destinationCity }
    );
    
    const mockPrice = calculatePrice(
      mockDistance,
      parseInt(formData.weight),
      'kamyonet', // Default vehicle type for calculation
      150 // Default base fee
    );

    const newShipment = {
      id: Date.now().toString(),
      customerId: user.id,
      origin: {
        address: formData.originAddress,
        lat: 40.0 + Math.random(), // Mock coordinates
        lng: 29.0 + Math.random(),
        city: formData.originCity
      },
      destination: {
        address: formData.destinationAddress,
        lat: 40.0 + Math.random(),
        lng: 29.0 + Math.random(),
        city: formData.destinationCity
      },
      loadType: formData.loadType as LoadType,
      weight: parseInt(formData.weight),
      description: formData.description,
      requestedDate: new Date(formData.requestedDate),
      price: mockPrice,
      distance: mockDistance,
      status: 'pending' as const,
      createdAt: new Date()
    };

    // Save to localStorage (in real app would save to backend)
    const existingShipments = JSON.parse(localStorage.getItem('shipments') || '[]');
    existingShipments.push(newShipment);
    localStorage.setItem('shipments', JSON.stringify(existingShipments));

    alert('Taşıma talebiniz başarıyla oluşturuldu!');
    navigate('/dashboard');
  };

  const handleCalculatePrice = () => {
    if (!formData.originCity || !formData.destinationCity || !formData.weight) {
      alert('Lütfen şehirler ve ağırlık bilgisini girin');
      return;
    }

    const mockDistance = calculateDistance(
      { address: formData.originAddress, lat: 40, lng: 29, city: formData.originCity },
      { address: formData.destinationAddress, lat: 40, lng: 29, city: formData.destinationCity }
    );
    
    const mockPrice = calculatePrice(
      mockDistance,
      parseInt(formData.weight),
      'kamyonet',
      150
    );

    setDistance(mockDistance);
    setCalculatedPrice(mockPrice);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Reset calculations when key fields change
    if (['originCity', 'destinationCity', 'weight'].includes(field)) {
      setCalculatedPrice(null);
      setDistance(null);
    }
  };

  const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Taşıma Talebi Oluştur</h1>
        <p className="text-gray-600 mt-2">
          Taşıma ihtiyacınızı detaylarıyla birlikte girin
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Route Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Rota Bilgileri</span>
            </CardTitle>
            <CardDescription>
              Yükün alınacağı ve teslim edileceği adresleri girin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="originCity">Çıkış Şehri</Label>
                <Select value={formData.originCity} onValueChange={(value) => handleChange('originCity', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Şehir seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="destinationCity">Varış Şehri</Label>
                <Select value={formData.destinationCity} onValueChange={(value) => handleChange('destinationCity', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Şehir seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="originAddress">Çıkış Adresi</Label>
              <Input
                id="originAddress"
                value={formData.originAddress}
                onChange={(e) => handleChange('originAddress', e.target.value)}
                placeholder="Detaylı adres bilgisi"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="destinationAddress">Varış Adresi</Label>
              <Input
                id="destinationAddress"
                value={formData.destinationAddress}
                onChange={(e) => handleChange('destinationAddress', e.target.value)}
                placeholder="Detaylı adres bilgisi"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Load Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Yük Bilgileri</span>
            </CardTitle>
            <CardDescription>
              Taşınacak yükün detaylarını girin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="loadType">Yük Türü</Label>
                <Select value={formData.loadType} onValueChange={(value) => handleChange('loadType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Yük türünü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOAD_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="weight">Ağırlık (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  placeholder="Yaklaşık ağırlık"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Yük hakkında detaylı bilgi (boyutlar, özel gereksinimler vb.)"
                rows={3}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Date and Price */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Tarih ve Fiyat</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="requestedDate">Taşıma Tarihi</Label>
              <Input
                id="requestedDate"
                type="date"
                value={formData.requestedDate}
                onChange={(e) => handleChange('requestedDate', e.target.value)}
                min={(function(){ const d=new Date(); d.setDate(d.getDate()+30); return d.toISOString().split('T')[0]; })()}
                required
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <Button type="button" variant="outline" onClick={handleCalculatePrice}>
                <Calculator className="h-4 w-4 mr-2" />
                Fiyat Hesapla
              </Button>
              
              {calculatedPrice && distance && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Mesafe:</span> {distance}km |{' '}
                  <span className="font-medium">Tahmini Fiyat:</span> {calculatedPrice}₺
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
            İptal
          </Button>
          <Button type="submit" size="lg">
            Taşıma Talebini Oluştur
          </Button>
        </div>
      </form>
    </div>
  );
}