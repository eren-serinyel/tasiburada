import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Star, Truck, MapPin, Package, MessageCircle, Phone, Mail, Calendar, Award } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Carrier } from '@/lib/types';
import { getCarrierExperienceYears, maskName } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import { getSessionUser } from '@/lib/storage';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface ApiReview {
  id: string;
  carrierId: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export default function CarrierProfile() {
  const { carrierId } = useParams<{ carrierId: string }>();
  const navigate = useNavigate();
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const sessionUser = useMemo(() => getSessionUser(), []);
  const isCustomer = sessionUser && sessionUser.type === 'customer';
  const userId = sessionUser?.id;

  // Form state for review
  const [form, setForm] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!carrierId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/v1/carriers/${carrierId}`);
        const json = await res.json();
        if (res.ok && json?.success && json?.data?.carrier) {
          const c = json.data.carrier;
          const mapped: Carrier = {
            id: c.id,
            name: c.companyName || c.contactName || 'Nakliyeci',
            surname: '',
            email: c.email || '',
            phone: c.phone || '',
            city: c.city || '',
            type: 'carrier',
            createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
            vehicle: {
              id: '',
              type: 'kamyonet',
              capacity: 0,
              licensePlate: ''
            },
            serviceAreas: [],
            loadTypes: [],
            baseFee: 0,
            rating: Number(c.rating || 0),
            reviewCount: 0,
            isApproved: Boolean(c.isActive),
            verificationStatus: 'pending',
            documents: { license: '', src: '', kBelgesi: '' },
          } as unknown as Carrier;
          setCarrier(mapped);
        } else {
          navigate('/nakliyeciler');
          return;
        }

        const reviewRes = await fetch(`/api/v1/reviews/carrier/${carrierId}`);
        const reviewJson = await reviewRes.json();
        if (reviewRes.ok && reviewJson?.success && Array.isArray(reviewJson.data)) {
          setReviews(reviewJson.data);
        }
      } catch {
        navigate('/nakliyeciler');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [carrierId, navigate]);

  // Computed averages from API reviews
  const overallStats = useMemo(() => {
    const baseAvg = carrier?.rating ?? 0;
    if (reviews.length === 0) return { avg: baseAvg, count: 0 };
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return { avg: Number(avg.toFixed(1)), count: reviews.length };
  }, [reviews, carrier?.rating]);

  // hasUserReviewed: check if current customer already reviewed
  const hasUserReviewed = useMemo(() => {
    if (!isCustomer || !userId) return false;
    return reviews.some(r => r.customerId === userId);
  }, [reviews, isCustomer, userId]);

  if (loading || !carrier) {
    return <div>Yükleniyor...</div>;
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : i < rating 
            ? 'fill-yellow-200 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const handleSubmitReview = async () => {
    if (!carrier || !isCustomer) return;
    if (hasUserReviewed) return;
    if (!form.comment.trim()) {
      toast({ title: 'Yorum gerekli', description: 'Lütfen kısa bir yorum yazın.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient('/api/v1/reviews/by-carrier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrierId: String(carrier.id),
          rating: form.rating,
          comment: form.comment.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast({ title: 'Teşekkürler', description: 'Yorumunuz kaydedildi.' });
        setForm({ rating: 5, comment: '' });
        // Refresh reviews
        const reviewRes = await fetch(`/api/v1/reviews/carrier/${carrierId}`);
        const reviewJson = await reviewRes.json();
        if (reviewRes.ok && Array.isArray(reviewJson.data)) setReviews(reviewJson.data);
      } else {
        toast({ title: 'Hata', description: json?.message || 'Yorum gönderilemedi.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Hata', description: 'Bağlantı hatası.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="outline" onClick={() => navigate('/nakliyeciler')} className="mb-4">
          ← Nakliyecilere Dön
        </Button>
        <div className="flex items-start space-x-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={carrier.profilePhoto} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
              {carrier.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {carrier.name} {carrier.surname}
              </h1>
              {carrier.isApproved && (
                <Badge className="bg-green-100 text-green-800">Onaylanmış</Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center space-x-1">
                {renderStars(overallStats.avg)}
                <span className="font-medium ml-2">{overallStats.avg}</span>
                <span className="text-gray-500">({overallStats.count} değerlendirme)</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-gray-600">{getCarrierExperienceYears(carrier)} yıl deneyim</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-gray-600">{carrier.city}</span>
            </div>
            
            {carrier.badges && carrier.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {carrier.badges.map((badge, index) => (
                  <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                    <Award className="h-3 w-3 mr-1" />
                    {badge}
                  </Badge>
                ))}
              </div>
            )}
            
            <p className="text-gray-700">{carrier.description}</p>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button>
              <MessageCircle className="h-4 w-4 mr-2" />
              Mesaj Gönder
            </Button>
            <Button variant="outline">
              <Phone className="h-4 w-4 mr-2" />
              Ara
            </Button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Truck className="h-5 w-5" />
                <span>Araç Bilgileri</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  {carrier.vehicle.photo && (
                    <img 
                      src={carrier.vehicle.photo} 
                      alt="Araç" 
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Araç Türü:</span>
                      <p className="text-gray-700">{carrier.vehicle.type.toUpperCase()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Plaka:</span>
                      <p className="text-gray-700">{carrier.vehicle.licensePlate}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="font-medium">Taşıma Kapasitesi:</span>
                    <p className="text-2xl font-bold text-blue-600">{carrier.vehicle.capacity}kg</p>
                  </div>
                  
                  {carrier.vehicle.brand && carrier.vehicle.model && (
                    <div>
                      <span className="font-medium">Marka/Model:</span>
                      <p className="text-gray-700">{carrier.vehicle.brand} {carrier.vehicle.model}</p>
                    </div>
                  )}
                  
                  {carrier.vehicle.year && (
                    <div>
                      <span className="font-medium">Model Yılı:</span>
                      <p className="text-gray-700">{carrier.vehicle.year}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Areas & Load Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Hizmet Bilgileri</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <span className="font-medium mb-3 block">Hizmet Verdiği Bölgeler:</span>
                  <div className="flex flex-wrap gap-2">
                    {carrier.serviceAreas.map((area, index) => (
                      <Badge key={index} variant="outline">{area}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="font-medium mb-3 block">Taşıdığı Yük Türleri:</span>
                  <div className="flex flex-wrap gap-2">
                    {carrier.loadTypes.map((type, index) => (
                      <Badge key={index} variant="outline" className="bg-green-50 text-green-700">
                        <Package className="h-3 w-3 mr-1" />
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader>
              <CardTitle>Müşteri Değerlendirmeleri</CardTitle>
              <CardDescription>
                Son müşteri yorumları ve puanları
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Review form - only for customers who haven't reviewed */}
              {isCustomer && !hasUserReviewed && (
                <div className="mb-6 p-4 border rounded-md bg-gray-50">
                  <div className="font-medium mb-3">Değerlendir</div>
                  <div className="mb-3">
                    <Label className="text-xs text-gray-600">Puan</Label>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }, (_, i) => i + 1).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, rating: v }))}
                          className="focus:outline-none"
                        >
                          <Star className={`h-6 w-6 ${v <= form.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-gray-600">{form.rating}/5</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <Label className="text-xs text-gray-600">Yorum</Label>
                    <Textarea
                      placeholder="Deneyimini kısaca anlat..."
                      value={form.comment}
                      onChange={(e) => setForm(f => ({ ...f, comment: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSubmitReview} disabled={submitting}>
                    {submitting ? 'Kaydediliyor...' : 'Gönder'}
                  </Button>
                </div>
              )}
              {isCustomer && hasUserReviewed && (
                <div className="mb-4 p-3 border rounded bg-green-50 text-green-700 text-sm">
                  Bu nakliyeciye zaten yorum yaptınız.
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz değerlendirme bulunmuyor.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, 8).map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <div className="font-medium text-sm">
                            {maskName(`${review.customerFirstName} ${review.customerLastName}`)}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {renderStars(review.rating)}
                            <span className="text-xs text-gray-600 ml-1">{review.rating}/5</span>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700 text-sm mt-2">"{review.comment}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stats & Contact */}
        <div className="space-y-6">
          {/* Rating Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Puan Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">{overallStats.avg}</div>
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    {renderStars(overallStats.avg)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {overallStats.count} değerlendirme
                  </div>
                </div>
                
                <Separator />
                

              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>İletişim Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{carrier.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{carrier.phone}</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{carrier.city}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {new Date(carrier.createdAt).toLocaleDateString('tr-TR')} tarihinden beri üye
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>İstatistikler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Temel Ücret</span>
                <span className="font-medium">{carrier.baseFee}₺</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Deneyim</span>
                <span className="font-medium">{getCarrierExperienceYears(carrier)} yıl</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Hizmet Bölgesi</span>
                <span className="font-medium">{carrier.serviceAreas.length} şehir</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Yük Türü</span>
                <span className="font-medium">{carrier.loadTypes.length} kategori</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}