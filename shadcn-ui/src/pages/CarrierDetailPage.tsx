import { type ReactNode, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import AuthModal from '@/components/AuthModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, MapPin, ShieldCheck, CheckCircle2, AlertTriangle, Star, Truck, MessageSquareText, ClipboardList } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn, formatPrice, formatDate } from '@/lib/utils';
import type { CarrierDetail, CarrierDetailDocument } from '@/lib/types';
import { getSessionUser } from '@/lib/storage';
import { apiClient } from '@/lib/apiClient';

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

  if (!carrierId) {
    return <Navigate to="/nakliyeciler" replace />;
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <DetailSkeleton />
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
    if (!canMessage) {
      return;
    }
    try {
      setStartingConversation(true);
      const conversationId = await startConversation(carrierId);
      navigate(`/mesajlar?conversationId=${encodeURIComponent(conversationId)}`);
    } finally {
      setStartingConversation(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="rounded-lg border bg-card/60 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/40">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-2 justify-start text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Geri dön
              </Button>

              <div className="flex items-center justify-start sm:justify-end">
                <Badge variant="secondary" className="font-medium">
                  Nakliyeci profili
                </Badge>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <div className="grid gap-6 lg:grid-cols-[1fr,340px] lg:items-start">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={data.pictureUrl ?? undefined} alt={data.companyName} />
                    <AvatarFallback className="bg-muted text-foreground font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 space-y-2">
                    {/* NOTE: Avoid <h1> because global CSS enforces gradient + sizing and breaks layout here */}
                    <p className="text-2xl font-semibold text-foreground leading-tight truncate">{data.companyName}</p>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {formatLocation(data.city, data.district)}
                      </span>
                      <span className="text-muted-foreground/60">•</span>
                      <span>{experienceText}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge className={cn('text-xs font-medium', profileBadgeClass(profilePercent))}>
                        Profil %{profilePercent}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-medium">
                        Başlangıç {startingPriceText}
                      </Badge>
                      {data.documentsApproved && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Belgeleri onaylı
                        </Badge>
                      )}
                      {successRatePercent >= 85 && (
                        <Badge className="bg-secondary text-secondary-foreground text-xs font-medium">
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Yüksek başarı
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                      <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      <span>{ratingValue.toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">({ratingCount} yorum)</span>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button onClick={handleOfferRequest} className="w-full sm:w-auto">
                      <ClipboardList className="h-4 w-4" />
                      Teklif iste
                    </Button>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full sm:w-auto">
                          <Button
                            variant="outline"
                            onClick={handleMessage}
                            disabled={!canMessage || startingConversation || !isCustomer || !isLoggedIn}
                            className="w-full sm:w-auto"
                          >
                            <MessageSquareText className="h-4 w-4" />
                            {startingConversation ? 'Açılıyor…' : 'Mesaj gönder'}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!canMessage && messageDisabledReason && (
                        <TooltipContent>
                          <p>{messageDisabledReason}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Profil tamamlanma</p>
                  <p className="text-sm text-muted-foreground">%{profilePercent}</p>
                </div>
                <div className="mt-3">
                  <Progress value={profilePercent} className="h-2 bg-background/50" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="general" className="space-y-4">
            <div className="sticky top-16 z-10 -mx-4 px-4 pt-2 pb-2 bg-muted/30 backdrop-blur supports-[backdrop-filter]:bg-muted/20">
              <TabsList className="w-full justify-start overflow-x-auto rounded-lg border bg-card shadow-sm">
                <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
                <TabsTrigger value="docs">Belgeler ve Kapasiteler</TabsTrigger>
                <TabsTrigger value="reviews">Yorumlar</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performans</CardTitle>
                  <CardDescription>Hızlı özet metrikler</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <StatBadge label="Tamamlanan İş" value={data.stats.completedShipments} />
                    <StatBadge label="İptaller" value={data.stats.cancelledShipments} muted />
                    <StatBadge label="Başarı" value={`${successRatePercent}%`} accent />
                    <StatBadge label="Teklifler" value={data.stats.totalOffers} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Genel Bilgiler</CardTitle>
                  <CardDescription>Firma özeti ve temel bilgiler</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InfoRow label="Telefon" value={<MaskedValue label="Teklif sonrası paylaşılır" />} />
                    <InfoRow label="E-posta" value={<MaskedValue label="Teklif sonrası paylaşılır" />} />
                    <InfoRow label="Vergi No" value={data.taxNumber || 'Belirtilmedi'} />
                    <InfoRow label="Kuruluş Yılı" value={data.foundedYear ? String(data.foundedYear) : 'Belirtilmedi'} />
                    <InfoRow label="Adres" value={data.address || 'Belirtilmedi'} />
                    <InfoRow label="Konum" value={formatLocation(data.city, data.district)} />
                  </dl>

                  <div className="rounded-xl border bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Hizmet Bölgeleri</p>
                    {serviceAreas.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Belirtilmiş hizmet bölgesi bulunmuyor.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {serviceAreas.map(area => (
                          <Badge key={area} variant="secondary" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="docs" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Belgeler</CardTitle>
                    <CardDescription>Durum göstergeleriyle evraklar</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Bu nakliyeci henüz herhangi bir belge yüklemedi.</p>
                    ) : (
                      <div className="space-y-3">
                        {documents.map(doc => (
                          <DocumentRow key={doc.id} document={doc} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Araç ve Kapasiteler</CardTitle>
                    <CardDescription>Tür, kapasite ve durum bilgileri</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {vehicles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Araç bilgisi paylaşılmadı.</p>
                    ) : (
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tür</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kapasite</th>
                                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Durum</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vehicles.map(vehicle => (
                              <tr key={vehicle.id} className="border-t">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                      <Truck className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium text-foreground">{vehicle.typeName}</span>
                                  </div>
                                </td>
                                  <td className="px-4 py-3 text-muted-foreground">
                                  {vehicle.capacityKg ? `${vehicle.capacityKg.toLocaleString('tr-TR')} kg` : 'Belirtilmedi'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Badge variant="secondary">Hazır</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Yorumlar</CardTitle>
                  <CardDescription>Gerçek müşterilerden geri bildirimler</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-muted/40 p-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Ortalama Puan</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        <span className="text-2xl font-semibold text-foreground">{ratingValue.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">({ratingCount} yorum)</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Profil durumu: <span className="font-medium">%{profilePercent}</span>
                    </div>
                  </div>

                  {isCustomer && !reviewSubmitted && (
                    <div className="rounded-xl border bg-card p-4 space-y-3">
                      <p className="text-sm font-medium text-foreground">Değerlendirme Yap</p>
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
                                'h-6 w-6 cursor-pointer transition-colors',
                                idx < reviewForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/40'
                              )}
                            />
                          </button>
                        ))}
                        <span className="text-sm text-muted-foreground ml-2">{reviewForm.rating}/5</span>
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
                    </div>
                  )}

                  {data.recentReviews.length === 0 ? (
                    <div className="rounded-xl border bg-card p-6">
                      <p className="text-sm text-foreground font-medium">Henüz yorum bulunmuyor</p>
                      <p className="text-sm text-muted-foreground mt-1">İlk taşıma tamamlandığında değerlendirmeler burada görünecek.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {data.recentReviews.map(review => (
                        <div key={review.id} className="rounded-xl border bg-card p-4">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground">{review.author}</p>
                            <span className="text-xs text-muted-foreground">{formatDate(new Date(review.createdAt))}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className={cn(
                                  'h-4 w-4',
                                  idx < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/40'
                                )}
                              />
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground mt-3">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

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

const profileBadgeClass = (percentage: number) => {
  if (percentage >= 80) return 'bg-emerald-100 text-emerald-700';
  if (percentage >= 50) return 'bg-amber-100 text-amber-700';
  return 'bg-muted text-muted-foreground';
};

const MaskedValue = ({ label }: { label: string }) => (
  <span className="inline-flex items-center gap-2">
    <span className="font-mono tracking-widest text-muted-foreground">••••••••</span>
    <span className="text-sm text-muted-foreground">{label}</span>
  </span>
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

const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-medium text-foreground mt-0.5">{value || 'Belirtilmedi'}</p>
  </div>
);

const StatBadge = ({ label, value, muted, accent }: { label: string; value: ReactNode; muted?: boolean; accent?: boolean }) => (
  <div className={cn('h-full rounded-xl border bg-background/60 p-4 text-center flex flex-col justify-center', muted && 'border-rose-100', accent && 'border-emerald-200')}>
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={cn('text-lg font-semibold', accent ? 'text-emerald-700' : muted ? 'text-rose-600' : 'text-foreground')}>
      {value}
    </p>
  </div>
);

const DetailSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-40" />
    </div>
    <Card className="p-6 space-y-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-2 w-full" />
    </Card>
    <div className="grid gap-6 lg:grid-cols-2">
      {[...Array(4)].map((_, idx) => (
        <Card key={idx} className="p-6 space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </Card>
      ))}
    </div>
  </div>
);
