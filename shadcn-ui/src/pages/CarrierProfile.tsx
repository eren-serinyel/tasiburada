import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Star, Truck, MapPin, Package, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicCarrier } from '@/lib/types';
import { maskName } from '@/lib/utils';
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

type CapabilityLoadType = 'HOME' | 'OFFICE' | 'PARTIAL' | 'STORAGE';

interface ExtraServiceOption {
  id: string;
  name: string;
  description?: string | null;
  loadType: CapabilityLoadType;
}

interface CarrierExtraServiceCapability {
  extraServiceId: string;
  extraServiceName: string;
  loadType: CapabilityLoadType;
  isActive: boolean;
  priceMode?: 'NONE' | 'FIXED' | 'QUOTE';
  basePrice?: number | null;
}

interface CarrierCapabilityProfile {
  extraServices: CarrierExtraServiceCapability[];
}

const CAPABILITY_LOAD_TYPES: Array<{ value: CapabilityLoadType; label: string }> = [
  { value: 'HOME', label: 'Ev esyasi' },
  { value: 'OFFICE', label: 'Ofis' },
  { value: 'PARTIAL', label: 'Parca yuk' },
  { value: 'STORAGE', label: 'Depolama' },
];

export default function CarrierProfile() {
  const { carrierId } = useParams<{ carrierId: string }>();
  const navigate = useNavigate();
  const [carrier, setCarrier] = useState<PublicCarrier | null>(null);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const sessionUser = useMemo(() => getSessionUser(), []);
  const isCustomer = sessionUser && sessionUser.type === 'customer';
  const isOwnCarrierProfile = Boolean(sessionUser?.type === 'carrier' && carrierId && String(sessionUser.id) === String(carrierId));
  const userId = sessionUser?.id;

  // Form state for new review
  const [form, setForm] = useState({ rating: 5, comment: '' });
  // Edit state
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [capabilityLoadType, setCapabilityLoadType] = useState<CapabilityLoadType>('HOME');
  const [capabilities, setCapabilities] = useState<CarrierCapabilityProfile | null>(null);
  const [extraServiceOptions, setExtraServiceOptions] = useState<ExtraServiceOption[]>([]);
  const [capabilityLoading, setCapabilityLoading] = useState(false);
  const [capabilitySavingId, setCapabilitySavingId] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      if (!carrierId) {
        setLoading(false);
        return;
      }

      try {
        const res = await apiClient(`/api/v1/carriers/${carrierId}`);
        const json = await res.json();
        if (res.ok && json?.success && json?.data?.carrier) {
          setCarrier(json.data.carrier as PublicCarrier);
        } else {
          navigate('/nakliyeciler');
          return;
        }

        const reviewRes = await apiClient(`/api/v1/reviews/carrier/${carrierId}`);
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

  useEffect(() => {
    if (!isOwnCarrierProfile) return;

    const fetchCapabilityData = async () => {
      setCapabilityLoading(true);
      try {
        const [capabilityRes, servicesRes] = await Promise.all([
          apiClient('/api/v1/carriers/me/capabilities'),
          apiClient(`/api/v1/extra-services?loadType=${capabilityLoadType}`),
        ]);
        const capabilityJson = await capabilityRes.json();
        const servicesJson = await servicesRes.json();

        if (capabilityRes.ok && capabilityJson?.success) {
          setCapabilities(capabilityJson.data);
        }
        if (servicesRes.ok && servicesJson?.success && Array.isArray(servicesJson.data)) {
          setExtraServiceOptions(servicesJson.data);
        }
      } catch {
        toast({ title: 'Hata', description: 'Ek hizmet bilgileri alinamadi.', variant: 'destructive' });
      } finally {
        setCapabilityLoading(false);
      }
    };

    fetchCapabilityData();
  }, [isOwnCarrierProfile, capabilityLoadType, toast]);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    for (const option of extraServiceOptions) {
      const capability = capabilities?.extraServices?.find(
        item => item.extraServiceId === option.id && item.loadType === capabilityLoadType
      );
      nextDrafts[option.id] = capability?.priceMode === 'FIXED' && capability.basePrice != null
        ? String(Number(capability.basePrice))
        : '';
    }
    setPriceDrafts(nextDrafts);
  }, [capabilities, extraServiceOptions, capabilityLoadType]);

  // Computed averages from API reviews
  const overallStats = useMemo(() => {
    const baseAvg = carrier?.rating ?? 0;
    if (reviews.length === 0) return { avg: baseAvg, count: 0 };
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return { avg: Number(avg.toFixed(1)), count: reviews.length };
  }, [reviews, carrier?.rating]);

  // hasUserReviewed: check if current customer already reviewed
  const myReview = useMemo(() => {
    if (!isCustomer || !userId) return null;
    return reviews.find(r => r.customerId === userId) ?? null;
  }, [reviews, isCustomer, userId]);
  const hasUserReviewed = Boolean(myReview);

  // Initialise edit form when myReview loads
  useEffect(() => {
    if (myReview) {
      setEditRating(myReview.rating);
      setEditComment(myReview.comment ?? '');
    }
  }, [myReview?.id]);  // only re-init when the review id changes

  const handleUpdateReview = async () => {
    if (!myReview) return;
    if (!editComment.trim()) {
      toast({ title: 'Yorum gerekli', description: 'Lütfen bir yorum yazın.' });
      return;
    }
    setEditSaving(true);
    try {
      const res = await apiClient(`/api/v1/reviews/${myReview.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: editRating, comment: editComment.trim() }),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast({ title: 'Güncellendi', description: 'Yorumunuz güncellendi.' });
        setReviews(prev => prev.map(r =>
          r.id === myReview.id ? { ...r, rating: editRating, comment: editComment.trim() } : r
        ));
      } else {
        toast({ title: 'Hata', description: json?.message || 'Güncellenemedi.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Hata', description: 'Bağlantı hatası.', variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!myReview) return;
    setDeleteLoading(true);
    try {
      const res = await apiClient(`/api/v1/reviews/${myReview.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast({ title: 'Silindi', description: 'Yorumunuz silindi.' });
        setReviews(prev => prev.filter(r => r.id !== myReview.id));
        setDeleteDialogOpen(false);
      } else {
        toast({ title: 'Hata', description: json?.message || 'Silinemedi.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Hata', description: 'Bağlantı hatası.', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveCapabilityPrice = async (service: ExtraServiceOption) => {
    const rawPrice = priceDrafts[service.id]?.trim();
    const price = rawPrice ? Number(rawPrice) : NaN;
    const existing = capabilities?.extraServices?.find(
      item => item.extraServiceId === service.id && item.loadType === capabilityLoadType
    );

    if (!rawPrice && !existing) {
      toast({ title: 'Fiyat gerekli', description: 'Ek hizmet eklemek icin sabit fiyat girin.' });
      return;
    }

    const payload = rawPrice
      ? {
          action: 'add_extra_service',
          extraServiceId: service.id,
          loadType: capabilityLoadType,
          priceMode: 'FIXED',
          basePrice: price,
        }
      : {
          action: 'remove_extra_service',
          extraServiceId: service.id,
          loadType: capabilityLoadType,
        };

    if (rawPrice && (!Number.isFinite(price) || price < 0)) {
      toast({ title: 'Gecersiz fiyat', description: 'Lutfen 0 veya daha buyuk bir fiyat girin.', variant: 'destructive' });
      return;
    }

    setCapabilitySavingId(service.id);
    try {
      const res = await apiClient('/api/v1/carriers/me/capabilities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setCapabilities(json.data);
        toast({ title: 'Kaydedildi', description: rawPrice ? 'Ek hizmet fiyati guncellendi.' : 'Ek hizmet kaldirildi.' });
      } else {
        toast({ title: 'Hata', description: json?.message || json?.error?.details || 'Kaydedilemedi.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Hata', description: 'Baglanti hatasi.', variant: 'destructive' });
    } finally {
      setCapabilitySavingId(null);
    }
  };

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
        const reviewRes = await apiClient(`/api/v1/reviews/carrier/${carrierId}`);
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
            <AvatarImage src={carrier.pictureUrl ?? undefined} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
              {carrier.companyName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {carrier.companyName}
              </h1>
              {carrier.isVerified && (
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
              <span className="text-gray-600">
                {carrier.experienceYears !== null
                  ? `${carrier.experienceYears} yıl deneyim`
                  : 'Deneyim bilgisi belirtilmemiş'}
              </span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-gray-600">
                {[carrier.city, carrier.district].filter(Boolean).join(' / ') || 'Konum belirtilmemiş'}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button>
              <MessageCircle className="h-4 w-4 mr-2" />
              Mesaj Gönder
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
              {carrier.vehicles.length === 0 ? (
                <p className="text-sm text-gray-500">Araç özeti henüz paylaşılmamış.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {carrier.vehicles.map(vehicle => (
                    <div key={vehicle.id} className="rounded-lg border p-4">
                      <p className="font-medium text-gray-900">{vehicle.typeName}</p>
                      <p className="text-sm text-gray-600">
                        {vehicle.capacityKg ? `${vehicle.capacityKg} kg kapasite` : 'Kapasite belirtilmemiş'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
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
                  <span className="font-medium mb-3 block">Hizmet Türleri:</span>
                  <div className="flex flex-wrap gap-2">
                    {carrier.serviceTypes.map(serviceType => (
                      <Badge key={serviceType} variant="outline" className="bg-green-50 text-green-700">
                        <Package className="h-3 w-3 mr-1" />
                        {serviceType}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isOwnCarrierProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Ek Hizmetlerim</CardTitle>
                <CardDescription>
                  Musterinin istedigi ek hizmetler teklif fiyatiniza otomatik eklenir.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-600">Yuk tipi</Label>
                  <select
                    value={capabilityLoadType}
                    onChange={(event) => setCapabilityLoadType(event.target.value as CapabilityLoadType)}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm md:w-64"
                  >
                    {CAPABILITY_LOAD_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {capabilityLoading ? (
                  <p className="text-sm text-gray-500">Ek hizmetler yukleniyor...</p>
                ) : extraServiceOptions.length === 0 ? (
                  <p className="rounded-md border bg-gray-50 p-3 text-sm text-gray-500">
                    Bu yuk tipi icin tanimli ek hizmet bulunmuyor.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {extraServiceOptions.map((service) => {
                      const capability = capabilities?.extraServices?.find(
                        item => item.extraServiceId === service.id && item.loadType === capabilityLoadType
                      );
                      const isEnabled = Boolean(capability?.isActive && capability.priceMode === 'FIXED');

                      return (
                        <div key={service.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_160px_auto] md:items-center">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm">{service.name}</span>
                              {isEnabled && <Badge variant="outline" className="bg-green-50 text-green-700">Aktif</Badge>}
                            </div>
                            {service.description && (
                              <p className="mt-1 text-xs text-gray-500">{service.description}</p>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Sabit fiyat (TL)</Label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={priceDrafts[service.id] ?? ''}
                              onChange={(event) => setPriceDrafts(prev => ({ ...prev, [service.id]: event.target.value }))}
                              placeholder="Orn. 750"
                              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            variant={priceDrafts[service.id]?.trim() ? 'default' : 'outline'}
                            disabled={capabilitySavingId === service.id}
                            onClick={() => handleSaveCapabilityPrice(service)}
                          >
                            {capabilitySavingId === service.id
                              ? 'Kaydediliyor...'
                              : priceDrafts[service.id]?.trim()
                                ? 'Kaydet'
                                : 'Kaldir'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
              {isCustomer && hasUserReviewed && myReview && (
                <div className="mb-6 p-4 border rounded-md bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm">Yorumunuzu Düzenleyin</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7 px-2"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Sil
                    </Button>
                  </div>
                  <div className="mb-3">
                    <Label className="text-xs text-gray-600">Puan</Label>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }, (_, i) => i + 1).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setEditRating(v)}
                          className="focus:outline-none"
                        >
                          <Star className={`h-6 w-6 ${v <= editRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-gray-600">{editRating}/5</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <Label className="text-xs text-gray-600">Yorum</Label>
                    <Textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleUpdateReview} disabled={editSaving} size="sm">
                    <Pencil className="h-4 w-4 mr-1" />
                    {editSaving ? 'Kaydediliyor...' : 'Güncelle'}
                  </Button>
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

              {/* Delete confirmation dialog */}
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Yorumu Sil</AlertDialogTitle>
                    <AlertDialogDescription>
                      Yorumunuz kalıcı olarak silinecek. Emin misiniz?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteLoading}>İptal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteReview}
                      disabled={deleteLoading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteLoading ? 'Siliniyor...' : 'Evet, Sil'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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

          {/* Public location */}
          <Card>
            <CardHeader>
              <CardTitle>Faaliyet Bölgesi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {[carrier.city, carrier.district].filter(Boolean).join(' / ') || 'Belirtilmedi'}
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
                <span className="text-sm text-gray-600">Başlangıç Fiyatı</span>
                <span className="font-medium">
                  {carrier.startingPrice !== null ? `${carrier.startingPrice}₺` : 'Görüşülür'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Deneyim</span>
                <span className="font-medium">
                  {carrier.experienceYears !== null ? `${carrier.experienceYears} yıl` : 'Belirtilmedi'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Hizmet Bölgesi</span>
                <span className="font-medium">{carrier.serviceAreas.length} şehir</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Hizmet Türü</span>
                <span className="font-medium">{carrier.serviceTypes.length} kategori</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
