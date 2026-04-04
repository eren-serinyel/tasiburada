import { type ReactNode, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import AuthModal from '@/components/AuthModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ChevronLeft, MapPin, ShieldCheck, CheckCircle2, AlertTriangle, Star, Truck,
  MessageSquareText, ClipboardList, Phone, Mail, Calendar, Award,
  TrendingUp, Package, BadgeCheck, Lock
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn, formatPrice, formatDate } from '@/lib/utils';
import type { CarrierDetail, CarrierDetailDocument, CarrierDetailReview } from '@/lib/types';
import { getSessionUser } from '@/lib/storage';
import { apiClient } from '@/lib/apiClient';

/* ─── API helpers ─── */

const API_BASE_URL = '/api/v1';

const fetchCarrierDetail = async (carrierId: string, signal?: AbortSignal): Promise<CarrierDetail> => {
  const response = await apiClient(`${API_BASE_URL}/carriers/${carrierId}/detail`, {
    signal,
    headers: { accept: 'application/json' }
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.success === false || !json?.data) {
    throw new Error(json?.message || 'Nakliyeci detayı getirilemedi.');
  }
  return json.data as CarrierDetail;
};

type MessagingEligibility = {
  canMessage: boolean;
  reason?: string;
  conversationId?: string | null;
};

const fetchEligibility = async (carrierId: string, signal?: AbortSignal): Promise<MessagingEligibility> => {
  const response = await apiClient(`${API_BASE_URL}/conversations/eligibility/${carrierId}`, {
    signal,
    headers: { accept: 'application/json' }
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.success === false || !json?.data) {
    return { canMessage: false, reason: json?.message || 'Teklif gerekli.' };
  }
  return json.data as MessagingEligibility;
};

const startConversation = async (carrierId: string): Promise<string> => {
  const response = await apiClient(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ carrierId })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.success === false || !json?.data?.id) {
    throw new Error(json?.message || 'Konuşma başlatılamadı.');
  }
  return String(json.data.id);
};

/* ─── Component ─── */

const CarrierDetailPage = () => {
  const { carrierId } = useParams<{ carrierId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const sessionUser = useMemo(() => getSessionUser(), []);
  const isLoggedIn = Boolean(sessionUser);
  const isCustomer = sessionUser?.type === 'customer';
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalText, setAuthModalText] = useState<{ title: string; description?: string }>({
    title: 'Giriş yapmanız gerekiyor',
    description: 'Devam etmek için giriş yapın veya hesap oluşturun.'
  });
  const [startingConversation, setStartingConversation] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmitReview = async () => {
    if (!carrierId || !isCustomer) return;
    if (!reviewForm.comment.trim()) {
      toast({ title: 'Yorum gerekli', description: 'Lütfen bir yorum yazın.' });
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await apiClient('/api/v1/reviews/by-carrier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrierId, rating: reviewForm.rating, comment: reviewForm.comment.trim() }),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast({ title: 'Teşekkürler!', description: 'Yorumunuz kaydedildi.' });
        setReviewSubmitted(true);
        queryClient.invalidateQueries({ queryKey: ['carrier-detail', carrierId] });
      } else {
        toast({ title: 'Hata', description: json?.message || 'Yorum gönderilemedi.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Hata', description: 'Bağlantı hatası.', variant: 'destructive' });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['carrier-detail', carrierId],
    queryFn: ({ signal }) => fetchCarrierDetail(carrierId!, signal),
    enabled: Boolean(carrierId)
  });

  const { data: eligibility } = useQuery({
    queryKey: ['carrier-eligibility', carrierId],
    queryFn: ({ signal }) => fetchEligibility(carrierId!, signal),
    enabled: Boolean(carrierId && isLoggedIn && isCustomer)
  });

  /* ─── Rating distribution (computed from reviews) ─── */
  const ratingDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    if (data?.recentReviews) {
      data.recentReviews.forEach(r => {
        const idx = Math.max(0, Math.min(4, Math.round(r.rating) - 1));
        dist[idx]++;
      });
    }
    return dist;
  }, [data?.recentReviews]);

  /* ─── Trust badges from documents ─── */
  const trustBadges = useMemo(() => {
    if (!data) return [];
    const badges: { label: string; verified: boolean }[] = [];
    const authDoc = data.documents.find(d => d.type === 'AUTHORIZATION_CERT');
    badges.push({ label: 'Yetki Belgeli', verified: authDoc?.isApproved ?? false });
    const vehicleDoc = data.documents.find(d => d.type === 'VEHICLE_LICENSE');
    badges.push({ label: 'Araç Belgeli', verified: vehicleDoc?.isApproved ?? false });
    const insuranceDoc = data.documents.find(d => d.type === 'INSURANCE_POLICY');
    badges.push({ label: 'Sigortalı', verified: insuranceDoc?.isApproved ?? false });
    return badges;
  }, [data]);

  /* ─── Guards ─── */

  if (!carrierId) {
    return <Navigate to="/nakliyeciler" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Detay yüklenemedi</AlertTitle>
          <AlertDescription>{(error as Error)?.message || 'Nakliyeci bilgileri alınırken hata oluştu.'}</AlertDescription>
        </Alert>
        <Button className="mt-6" variant="outline" onClick={() => navigate('/nakliyeciler')}>
          Listeye dön
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Alert>
          <AlertTitle>Nakliyeci bulunamadı</AlertTitle>
          <AlertDescription>Talep edilen nakliyeci kaydı mevcut değil veya silinmiş olabilir.</AlertDescription>
        </Alert>
        <Button className="mt-6" variant="outline" onClick={() => navigate('/nakliyeciler')}>
          Listeye dön
        </Button>
      </div>
    );
  }

  /* ─── Derived values ─── */

  const profilePercent = clampPercentage(data.profile.overallPercentage ?? 0);
  const ratingValue = Number(data.rating.average ?? 0);
  const ratingCount = Number(data.rating.count ?? 0);
  const initials = buildInitials(data.companyName);
  const successRatePercent = normalizeSuccessRate(data.stats.successRate);
  const experienceText = data.experienceYears !== null
    ? `${data.experienceYears} yıl deneyim`
    : 'Deneyim bilgisi paylaşılmadı';
  const serviceAreas = data.serviceAreas?.length ? data.serviceAreas : [];
  const vehicles = data.vehicles ?? [];
  const documents = data.documents ?? [];
  const startingPriceText = typeof data.startingPrice === 'number'
    ? formatPrice(data.startingPrice)
    : 'Belirtilmedi';

  /* ─── Handlers ─── */

  const onRequireLogin = (title: string, description?: string) => {
    setAuthModalText({ title, description });
    setAuthModalOpen(true);
  };

  const handleOfferRequest = () => {
    if (!isLoggedIn) {
      onRequireLogin('Teklif istemek için giriş yapın', 'Teklif oluşturduktan sonra nakliyeciyle güvenli şekilde iletişime geçebilirsiniz.');
      return;
    }
    if (!isCustomer) {
      onRequireLogin('Sadece müşteri hesabı', 'Teklif istemek için müşteri hesabıyla giriş yapmalısınız.');
      return;
    }
    navigate(`/teklif-talebi?carrierId=${encodeURIComponent(carrierId)}`);
  };

  const canMessage = Boolean(eligibility?.canMessage);
  const messageDisabledReason = !isLoggedIn
    ? 'Giriş yaptıktan sonra kullanılabilir.'
    : !isCustomer
      ? 'Sadece müşteri hesabı mesajlaşabilir.'
      : canMessage
        ? ''
        : 'Teklif oluşturduktan sonra aktif olur.';

  const handleMessage = async () => {
    if (!isLoggedIn) {
      onRequireLogin('Mesaj göndermek için giriş yapın', 'Güvenli iletişim, teklif süreciyle birlikte açılır.');
      return;
    }
    if (!isCustomer) {
      onRequireLogin('Sadece müşteri hesabı', 'Mesajlaşma müşteri hesabı üzerinden ilerler.');
      return;
    }
    if (!canMessage) return;

    try {
      setStartingConversation(true);
      const conversationId = await startConversation(carrierId);
      navigate(`/mesajlar?conversationId=${encodeURIComponent(conversationId)}`);
    } finally {
      setStartingConversation(false);
    }
  };

  /* ─── Render ─── */

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-muted/30">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Geri dön
            </Button>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-medium">Nakliyeci Profili</span>
          </div>
        </div>

        {/* ── Hero Section ── */}
        <div
          className="relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0B1629 0%, #1E3A5F 100%)' }}
        >
          {/* Decorative circles */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/[0.03] rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="max-w-7xl mx-auto px-4 py-10 relative z-10">
            <div className="grid gap-8 lg:grid-cols-[1fr,auto] lg:items-center">
              {/* Left: avatar + info */}
              <div className="flex items-start gap-5">
                <div className="relative flex-shrink-0">
                  <Avatar className="h-[72px] w-[72px] ring-2 ring-white/20">
                    <AvatarImage src={data.pictureUrl ?? undefined} alt={data.companyName} />
                    <AvatarFallback className="bg-white/10 text-white text-xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {data.documentsApproved && (
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className="text-[1.75rem] font-[800] leading-tight truncate"
                      style={{ color: '#fff' }}
                    >
                      {data.companyName}
                    </span>
                    {data.documentsApproved && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                        <BadgeCheck className="h-3 w-3 mr-1" /> Onaylı
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {formatLocation(data.city, data.district)}
                    </span>
                    <span className="text-white/30">•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {experienceText}
                    </span>
                  </div>

                  {serviceAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {serviceAreas.slice(0, 6).map(area => (
                        <Badge
                          key={area}
                          className="bg-white/10 text-white/80 border-white/10 text-xs font-normal hover:bg-white/15"
                        >
                          {area}
                        </Badge>
                      ))}
                      {serviceAreas.length > 6 && (
                        <Badge className="bg-white/10 text-white/60 border-white/10 text-xs">
                          +{serviceAreas.length - 6}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: 2×2 metrics grid */}
              <div className="grid grid-cols-2 gap-3 lg:w-[280px]">
                <MetricCard
                  icon={<Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
                  label="Puan"
                  value={ratingValue.toFixed(1)}
                />
                <MetricCard
                  icon={<MessageSquareText className="h-4 w-4 text-blue-400" />}
                  label="Yorum"
                  value={String(ratingCount)}
                />
                <MetricCard
                  icon={<Package className="h-4 w-4 text-emerald-400" />}
                  label="Tamamlanan"
                  value={String(data.stats.completedShipments)}
                />
                <MetricCard
                  icon={<TrendingUp className="h-4 w-4 text-purple-400" />}
                  label="Başarı"
                  value={`%${successRatePercent}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content (tabs + sidebar) ── */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
            {/* Left column: Tabs */}
            <div>
              <Tabs defaultValue="about" className="space-y-5">
                <TabsList className="w-full justify-start bg-card border rounded-lg shadow-sm">
                  <TabsTrigger value="about">Hakkında</TabsTrigger>
                  <TabsTrigger value="vehicles">Araçlar</TabsTrigger>
                  <TabsTrigger value="reviews">Yorumlar</TabsTrigger>
                </TabsList>

                {/* ── Hakkında ── */}
                <TabsContent value="about" className="space-y-5">
                  {/* Performance stats */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Performans Özeti</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <StatCard label="Tamamlanan" value={data.stats.completedShipments} color="emerald" />
                        <StatCard label="İptaller" value={data.stats.cancelledShipments} color="rose" />
                        <StatCard label="Başarı Oranı" value={`%${successRatePercent}`} color="blue" />
                        <StatCard label="Toplam Teklif" value={data.stats.totalOffers} color="amber" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Service areas */}
                  {serviceAreas.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Hizmet Bölgeleri</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {serviceAreas.map(area => (
                            <Badge key={area} variant="secondary" className="text-xs px-3 py-1.5">
                              <MapPin className="h-3 w-3 mr-1.5" />
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Company info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Firma Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InfoItem label="Konum" value={formatLocation(data.city, data.district)} icon={<MapPin className="h-4 w-4" />} />
                        <InfoItem label="Deneyim" value={experienceText} icon={<Calendar className="h-4 w-4" />} />
                        <InfoItem label="Kuruluş Yılı" value={data.foundedYear ? String(data.foundedYear) : 'Belirtilmedi'} icon={<Award className="h-4 w-4" />} />
                        <InfoItem label="Vergi No" value={data.taxNumber || 'Belirtilmedi'} icon={<ClipboardList className="h-4 w-4" />} />
                        <InfoItem label="Başlangıç Fiyat" value={startingPriceText} icon={<TrendingUp className="h-4 w-4" />} />
                        <InfoItem label="Adres" value={data.address || 'Belirtilmedi'} icon={<MapPin className="h-4 w-4" />} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Documents */}
                  {documents.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Belgeler</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2.5">
                          {documents.map(doc => (
                            <DocumentRow key={doc.id} document={doc} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ── Araçlar ── */}
                <TabsContent value="vehicles" className="space-y-5">
                  {vehicles.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Truck className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-sm font-medium text-foreground">Araç bilgisi paylaşılmadı</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Nakliyeci henüz araç bilgisi eklememiştir.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {vehicles.map(vehicle => (
                        <Card key={vehicle.id} className="overflow-hidden">
                          <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                                <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground truncate">{vehicle.typeName}</p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {vehicle.capacityKg
                                    ? `${vehicle.capacityKg.toLocaleString('tr-TR')} kg kapasite`
                                    : 'Kapasite belirtilmedi'}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-xs flex-shrink-0">Aktif</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── Yorumlar ── */}
                <TabsContent value="reviews" className="space-y-5">
                  {/* Rating overview with bars */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
                        {/* Big number */}
                        <div className="flex flex-col items-center justify-center sm:pr-6 sm:border-r">
                          <span className="text-[3rem] font-bold leading-none text-foreground">
                            {ratingValue.toFixed(1)}
                          </span>
                          <div className="flex items-center gap-0.5 mt-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  'h-4 w-4',
                                  i < Math.round(ratingValue) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'
                                )}
                              />
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{ratingCount} yorum</p>
                        </div>

                        {/* 5→1 star bars */}
                        <div className="flex-1 space-y-2">
                          {[5, 4, 3, 2, 1].map(star => {
                            const count = ratingDistribution[star - 1];
                            const percent = ratingCount > 0 ? (count / ratingCount) * 100 : 0;
                            return (
                              <div key={star} className="flex items-center gap-2.5">
                                <span className="text-sm text-muted-foreground w-3 text-right">{star}</span>
                                <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                                <div className="flex-1">
                                  <Progress value={percent} className="h-2" />
                                </div>
                                <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Review form */}
                  {isCustomer && !reviewSubmitted && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Değerlendirme Yap</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setReviewForm(f => ({ ...f, rating: idx + 1 }))}
                              className="focus:outline-none"
                            >
                              <Star
                                className={cn(
                                  'h-7 w-7 cursor-pointer transition-colors',
                                  idx < reviewForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'
                                )}
                              />
                            </button>
                          ))}
                          <span className="text-sm text-muted-foreground ml-3">{reviewForm.rating}/5</span>
                        </div>
                        <Textarea
                          placeholder="Deneyiminizi kısaca anlatın..."
                          value={reviewForm.comment}
                          onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                          rows={3}
                        />
                        <Button onClick={handleSubmitReview} disabled={reviewSubmitting} size="sm">
                          {reviewSubmitting ? 'Kaydediliyor...' : 'Gönder'}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Review list */}
                  {data.recentReviews.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Star className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-sm font-medium text-foreground">Henüz yorum bulunmuyor</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          İlk taşıma tamamlandığında değerlendirmeler burada görünecek.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {data.recentReviews.map(review => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* ── Right sidebar ── */}
            <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              {/* CTA card */}
              <Card className="border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
                <CardContent className="p-5 space-y-3">
                  <Button onClick={handleOfferRequest} className="w-full h-11 text-base font-semibold" size="lg">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Teklif İste
                  </Button>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block">
                        <Button
                          variant="outline"
                          onClick={handleMessage}
                          disabled={!canMessage || startingConversation || !isCustomer || !isLoggedIn}
                          className="w-full"
                        >
                          <MessageSquareText className="h-4 w-4 mr-2" />
                          {startingConversation ? 'Açılıyor…' : 'Mesaj Gönder'}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canMessage && messageDisabledReason && (
                      <TooltipContent><p>{messageDisabledReason}</p></TooltipContent>
                    )}
                  </Tooltip>

                  <p className="text-xs text-center text-muted-foreground">
                    Başlangıç fiyatı:{' '}
                    <span className="font-semibold text-foreground">{startingPriceText}</span>
                  </p>
                </CardContent>
              </Card>

              {/* Contact card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">İletişim</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Telefon</p>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm tracking-wider text-muted-foreground">•••• •••</span>
                        <Lock className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">E-posta</p>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm tracking-wider text-muted-foreground">••••@••••</span>
                        <Lock className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    Teklif sonrası paylaşılır
                  </p>
                </CardContent>
              </Card>

              {/* Trust badges */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Güven Rozetleri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {trustBadges.map(badge => (
                    <div
                      key={badge.label}
                      className={cn(
                        'flex items-center gap-3 rounded-lg p-2.5',
                        badge.verified ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-muted/50'
                      )}
                    >
                      <div
                        className={cn(
                          'h-7 w-7 rounded-full flex items-center justify-center',
                          badge.verified ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-muted'
                        )}
                      >
                        {badge.verified
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          : <ShieldCheck className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <p
                        className={cn(
                          'text-sm font-medium',
                          badge.verified ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'
                        )}
                      >
                        {badge.label}
                      </p>
                    </div>
                  ))}

                  {/* Profile completion */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Profil Tamamlanma</span>
                      <span className="font-medium">%{profilePercent}</span>
                    </div>
                    <Progress value={profilePercent} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Mobile fixed bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t shadow-lg lg:hidden z-50">
          <Button onClick={handleOfferRequest} className="w-full h-12 text-base font-semibold" size="lg">
            <ClipboardList className="h-5 w-5 mr-2" />
            Teklif İste
          </Button>
        </div>
        {/* Spacer for mobile bottom CTA */}
        <div className="h-20 lg:hidden" />

        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          title={authModalText.title}
          description={authModalText.description}
          actions={[
            {
              label: 'Giriş yap',
              onClick: () => navigate(`/giris?redirect=${encodeURIComponent(location.pathname + location.search)}`),
              variant: 'default'
            },
            { label: 'Kapat', onClick: () => setAuthModalOpen(false), variant: 'outline' }
          ]}
        />
      </div>
    </TooltipProvider>
  );
};

export default CarrierDetailPage;

/* ─── Utility functions ─── */

const formatLocation = (city?: string | null, district?: string | null) => {
  if (city && district) return `${city} · ${district}`;
  if (city) return city;
  return 'Konum belirtilmedi';
};

const buildInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? 'N';
  const second = parts[1]?.[0] ?? '';
  return `${first}${second}`.toUpperCase();
};

const clampPercentage = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const normalizeSuccessRate = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  const normalized = value > 1 ? value : value * 100;
  return clampPercentage(normalized);
};

const documentLabel = (type: string): string => {
  const map: Record<string, string> = {
    AUTHORIZATION_CERT: 'Yetki belgesi',
    SRC_CERT: 'SRC belgesi',
    VEHICLE_LICENSE: 'Ruhsat',
    TAX_PLATE: 'Vergi levhası',
    INSURANCE_POLICY: 'Sigorta poliçesi'
  };
  return map[type] || type;
};

const friendlyStatus = (status: string): string => {
  const map: Record<string, string> = {
    APPROVED: 'Onaylı',
    PENDING: 'Beklemede',
    REJECTED: 'Reddedildi'
  };
  return map[status] || status;
};

/* ─── Sub-components ─── */

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-xl bg-white/10 backdrop-blur border border-white/10 p-3.5 text-center">
    <div className="flex items-center justify-center gap-1.5 mb-1">
      {icon}
      <span className="text-xl font-bold text-white">{value}</span>
    </div>
    <p className="text-xs text-white/60">{label}</p>
  </div>
);

const StatCard = ({
  label,
  value,
  color
}: {
  label: string;
  value: string | number;
  color: 'emerald' | 'rose' | 'blue' | 'amber';
}) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  };
  return (
    <div className={cn('rounded-xl p-4 text-center', colorMap[color])}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-70">{label}</p>
    </div>
  );
};

const InfoItem = ({ label, value, icon }: { label: string; value: string; icon: ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
      <span className="text-muted-foreground">{icon}</span>
    </div>
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  </div>
);

const DocumentRow = ({ document }: { document: CarrierDetailDocument }) => {
  const isApproved = document.isApproved;
  const Icon = isApproved ? CheckCircle2 : document.isRequired ? AlertTriangle : ShieldCheck;
  const iconClass = isApproved
    ? 'text-emerald-500'
    : document.isRequired
      ? 'text-amber-500'
      : 'text-muted-foreground';

  return (
    <div className="flex items-center justify-between rounded-lg border bg-background/60 p-3">
      <div className="flex items-center gap-3">
        <Icon className={cn('h-5 w-5', iconClass)} />
        <div>
          <p className="font-medium text-foreground">{documentLabel(document.type)}</p>
          <p className="text-xs text-muted-foreground">{document.isRequired ? 'Zorunlu belge' : 'İsteğe bağlı belge'}</p>
        </div>
      </div>
      <Badge variant={isApproved ? 'secondary' : 'outline'} className="text-xs">
        {friendlyStatus(document.status)}
      </Badge>
    </div>
  );
};

const ReviewCard = ({ review }: { review: CarrierDetailReview }) => {
  const initials = review.author
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-foreground">{review.author}</p>
              <span className="text-xs text-muted-foreground">{formatDate(new Date(review.createdAt))}</span>
            </div>
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-3.5 w-3.5',
                    i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'
                  )}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{review.comment}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DetailSkeleton = () => (
  <div className="space-y-6">
    {/* Hero skeleton */}
    <div className="rounded-xl bg-muted/40 p-8">
      <div className="flex items-start gap-5">
        <Skeleton className="h-[72px] w-[72px] rounded-full" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>
    {/* Tab skeleton */}
    <Skeleton className="h-10 w-72 rounded-lg" />
    <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
      <div className="space-y-4">
        {[...Array(3)].map((_, idx) => (
          <Card key={idx} className="p-6 space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  </div>
);
