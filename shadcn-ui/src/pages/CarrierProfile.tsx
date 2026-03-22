import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Star, Truck, MapPin, Package, MessageCircle, Phone, Mail, Calendar, Award } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Carrier } from '@/lib/types';
import { getCarrierExperienceYears, maskName, computeAverageFromCategories } from '@/lib/utils';
import { reviewsApi, type ReviewRecord } from '@/utils/mockDb';
import { getSessionUser } from '@/lib/storage';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function CarrierProfile() {
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const sessionUser = useMemo(() => getSessionUser(), []);
  const isCustomer = sessionUser && sessionUser.type === 'customer';
  const userFullName = sessionUser ? `${sessionUser.name} ${sessionUser.surname}` : '';
  const userId = sessionUser?.id;
  // Inline edit controls (tek yorum düzenleme aynı anda)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<Record<string, { yorum: string; dakiklik: number; iletisim: number; ozen: number; profesyonellik: number }>>({});

  // Form state for review
  const [form, setForm] = useState({
    dakiklik: 5,
    iletisim: 5,
    ozen: 5,
    profesyonellik: 5,
    yorum: '',
  });
  const { carrierId } = useParams();
  const navigate = useNavigate();

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
            verificationStatus: 'pending'
          } as Carrier;
          setCarrier(mapped);
        } else {
          navigate('/nakliyeciler');
          return;
        }

        const stored: ReviewRecord[] = reviewsApi.getByCarrier(String(carrierId));
        setReviews(stored.sort((a,b) => (a.tarih < b.tarih ? 1 : -1)));
      } catch {
        navigate('/nakliyeciler');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [carrierId, navigate]);

  // Hooks must be declared before any early return
  const overallStats = useMemo(() => {
    const baseAvg = carrier?.rating ?? 0;
    const active = reviews.filter(r => (r.status ?? 'aktif') === 'aktif');
    if (active.length === 0) return { avg: baseAvg, count: 0 };
    const avgs = active.map(r => computeAverageFromCategories({
      dakiklik: r.puanlar.dakiklik,
      iletisim: r.puanlar.iletisim,
      ozen: r.puanlar.ozen,
      profesyonellik: r.puanlar.profesyonellik,
    } as any));
    const avg = avgs.reduce((a,b)=>a+b,0) / avgs.length;
    return { avg: Number(avg.toFixed(1)), count: active.length };
  }, [reviews, carrier?.rating]);

  // hasUserReviewed: state tabanlı ve userId öncelikli
  const hasUserReviewed = useMemo(() => {
    if (!isCustomer || !carrier) return false;
    return reviews.some(r => (userId ? r.userId === userId : r.kullanici === userFullName));
  }, [carrier, isCustomer, userFullName, userId, reviews]);

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

  const getCategoryAverage = (category: keyof ReviewRecord['puanlar']) => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + (review.puanlar?.[category] || 0), 0);
    return sum / reviews.length;
  };

  const handleStarClick = (field: keyof typeof form, value: number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitReview = async () => {
    if (!carrier || !isCustomer) return;
    if (hasUserReviewed) return;
    if (!form.yorum.trim()) {
      toast({ title: 'Yorum gerekli', description: 'Lütfen kısa bir yorum yazın.' });
      return;
    }
    setSubmitting(true);
    try {
      const today = new Date();
      const rec: ReviewRecord = {
        id: 'rv_' + Date.now().toString(36),
        nakliyeciId: String(carrier.id),
        kullanici: userFullName,
        userId,
        puanlar: {
          dakiklik: form.dakiklik,
          iletisim: form.iletisim,
          ozen: form.ozen,
          profesyonellik: form.profesyonellik,
        },
        yorum: form.yorum.trim(),
        tarih: today.toISOString().slice(0,10),
      };
      reviewsApi.add(rec);
      // Refresh list
      const next = [rec, ...reviews];
      setReviews(next.sort((a,b)=> (a.tarih < b.tarih ? 1 : -1)));
      setForm({ dakiklik: 5, iletisim: 5, ozen: 5, profesyonellik: 5, yorum: '' });
      toast({ title: 'Teşekkürler', description: 'Yorumun kaydedildi.' });
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    {([
                      ['dakiklik', 'Dakiklik'] as const,
                      ['iletisim', 'İletişim'] as const,
                      ['ozen', 'Özen'] as const,
                      ['profesyonellik', 'Profesyonellik'] as const,
                    ]).map(([key,label]) => (
                      <div key={key}>
                        <Label className="text-xs text-gray-600">{label}</Label>
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: 5 }, (_, i) => i + 1).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => handleStarClick(key as any, v)}
                              className="focus:outline-none"
                            >
                              <Star className={`h-4 w-4 ${v <= (form as any)[key] ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3">
                    <Label className="text-xs text-gray-600">Yorum</Label>
                    <Textarea
                      placeholder="Deneyimini kısaca anlat..."
                      value={form.yorum}
                      onChange={(e) => setForm(f => ({ ...f, yorum: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleSubmitReview} disabled={submitting}>
                      {submitting ? 'Kaydediliyor...' : 'Gönder'}
                    </Button>
                    {/* toast kullanılmakta */}
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz değerlendirme bulunmuyor.</p>
              ) : (
                <div className="space-y-6">
                  {reviews.slice(0, 8).map((review) => {
                    const isOwn = isCustomer && ((userId ? review.userId === userId : review.kullanici === userFullName));
                    const isEditing = editingId === review.id;
                    const avg = computeAverageFromCategories({
                      dakiklik: review.puanlar.dakiklik,
                      iletisim: review.puanlar.iletisim,
                      ozen: review.puanlar.ozen,
                      profesyonellik: (review.puanlar as any).profesyonellik,
                    });
                    return (
                      <div key={review.id} className="border-b pb-4 last:border-b-0">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <div className="font-medium text-sm">{maskName(review.kullanici)}</div>
                            <div className="flex items-center space-x-1">
                              {renderStars(avg)}
                              <span className="text-xs text-gray-600 ml-1">{avg.toFixed(1)}/5</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">
                              {new Date(review.tarih).toLocaleDateString('tr-TR')}
                            </span>
                            {isOwn && !isEditing && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingId(review.id);
                                    setEditState(s => ({
                                      ...s,
                                      [review.id]: {
                                        yorum: review.yorum,
                                        dakiklik: review.puanlar.dakiklik,
                                        iletisim: review.puanlar.iletisim,
                                        ozen: review.puanlar.ozen,
                                        profesyonellik: (review.puanlar as any).profesyonellik,
                                      }
                                    }));
                                  }}
                                >Düzenle</Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => {
                                    if (confirm('Yorumu silmek istediğine emin misin?')) {
                                      reviewsApi.remove(review.id);
                                      setReviews(prev => prev.filter(r => r.id !== review.id));
                                      toast({ title: 'Silindi', description: 'Yorumun kaldırıldı.' });
                                    }
                                  }}
                                >Sil</Button>
                              </>
                            )}
                          </div>
                        </div>
                        {!isEditing ? (
                          <p className="text-gray-700 mb-3">"{review.yorum}"</p>
                        ) : (
                          <div className="mb-3 p-3 border rounded">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                              {([
                                ['dakiklik', 'Dakiklik'] as const,
                                ['iletisim', 'İletişim'] as const,
                                ['ozen', 'Özen'] as const,
                                ['profesyonellik', 'Profesyonellik'] as const,
                              ]).map(([key,label]) => (
                                <div key={key}>
                                  <Label className="text-xs text-gray-600">{label}</Label>
                                  <div className="flex items-center gap-1 mt-1">
                                    {Array.from({ length: 5 }, (_, i) => i + 1).map((v) => (
                                      <button
                                        key={v}
                                        type="button"
                                        onClick={() => setEditState(s => {
                                          const cur = s[review.id] || {
                                            yorum: review.yorum,
                                            dakiklik: review.puanlar.dakiklik,
                                            iletisim: review.puanlar.iletisim,
                                            ozen: review.puanlar.ozen,
                                            profesyonellik: (review.puanlar as any).profesyonellik,
                                          };
                                          return { ...s, [review.id]: { ...cur, [key]: v } };
                                        })}
                                        className="focus:outline-none"
                                      >
                                        <Star className={`h-4 w-4 ${v <= ((editState[review.id] as any)?.[key] ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <Textarea
                              value={editState[review.id]?.yorum ?? review.yorum}
                              onChange={(e) => setEditState(s => {
                                const cur = s[review.id] || {
                                  yorum: review.yorum,
                                  dakiklik: review.puanlar.dakiklik,
                                  iletisim: review.puanlar.iletisim,
                                  ozen: review.puanlar.ozen,
                                  profesyonellik: (review.puanlar as any).profesyonellik,
                                };
                                return { ...s, [review.id]: { ...cur, yorum: e.target.value } };
                              })}
                              rows={3}
                            />
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const payload = editState[review.id] || { yorum: review.yorum, dakiklik: review.puanlar.dakiklik, iletisim: review.puanlar.iletisim, ozen: review.puanlar.ozen, profesyonellik: (review.puanlar as any).profesyonellik };
                                  const updated = reviewsApi.update(review.id, {
                                    yorum: payload.yorum,
                                    puanlar: {
                                      dakiklik: payload.dakiklik,
                                      iletisim: payload.iletisim,
                                      ozen: payload.ozen,
                                      profesyonellik: payload.profesyonellik,
                                    },
                                  });
                                  if (updated) {
                                    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, ...updated } : r));
                                    setEditingId(null);
                                    toast({ title: 'Güncellendi', description: 'Yorumun güncellendi.' });
                                  }
                                }}
                              >Kaydet</Button>
                              <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>İptal</Button>
                            </div>
                          </div>
                        )}
                        {(review.status ?? 'aktif') === 'askida' && (
                          <div className="text-xs text-red-600 mb-2">⛔ Bu yorum inceleniyor.</div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div className="text-center">
                            <div className="font-medium">Dakiklik</div>
                            <div className="text-gray-600">{review.puanlar.dakiklik}/5</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">İletişim</div>
                            <div className="text-gray-600">{review.puanlar.iletisim}/5</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">Özen</div>
                            <div className="text-gray-600">{review.puanlar.ozen}/5</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">Profesyonellik</div>
                            <div className="text-gray-600">{(review.puanlar as any).profesyonellik}/5</div>
                          </div>
                        </div>
                        {/* Helpful (Faydalı) oylaması */}
                        <div className="flex items-center gap-3 mt-2">
                          {!isOwn && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const voteKey = `review_helpful_${review.id}_${userId || userFullName}`;
                                if (localStorage.getItem(voteKey)) {
                                  toast({ title: 'Zaten oy verdin', description: 'Bu yorumu daha önce faydalı buldun.' });
                                  return;
                                }
                                const nextVal = (review.helpful || 0) + 1;
                                const updated = reviewsApi.update(review.id, { helpful: nextVal });
                                if (updated) {
                                  setReviews(prev => prev.map(r => r.id === review.id ? { ...r, helpful: nextVal } : r));
                                  localStorage.setItem(voteKey, '1');
                                  toast({ title: 'Teşekkürler', description: 'Geri bildirimin alındı.' });
                                }
                              }}
                            >Faydalı</Button>
                          )}
                          {typeof review.helpful === 'number' && review.helpful > 0 && (
                            <span className="text-xs text-gray-500">{review.helpful} kişi bu yorumu faydalı buldu</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                
                {reviews.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Dakiklik</span>
                      <span className="font-medium">{getCategoryAverage('dakiklik').toFixed(1)}/5</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>İletişim</span>
                      <span className="font-medium">{getCategoryAverage('iletisim').toFixed(1)}/5</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Özenli Taşıma</span>
                      <span className="font-medium">{getCategoryAverage('ozen').toFixed(1)}/5</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Profesyonellik</span>
                      <span className="font-medium">{getCategoryAverage('profesyonellik').toFixed(1)}/5</span>
                    </div>
                  </div>
                )}
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