import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CarrierEligibility } from '@/lib/customerOfferTrust';
import { getCarrierEligibilityWarning, isOfferAcceptDisabled, resolveCarrierEligibility } from '@/lib/customerOfferTrust';
import { cn } from '@/lib/utils';
import {
  BadgeCheck,
  Bookmark,
  CheckCircle2,
  Clock3,
  Eye,
  PackageCheck,
  AlertTriangle,
  ShieldCheck,
  Star,
  Truck,
  XCircle,
} from 'lucide-react';

export interface CustomerOfferCarrier {
  id: string;
  displayName?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  rating?: number;
  ratingCount?: number;
  completedShipments?: number;
  isVerified?: boolean;
  verifiedByAdmin?: boolean;
  isActive?: boolean;
  approvalState?: string | null;
  hasInsurance?: boolean;
  pictureUrl?: string | null;
  vehicleType?: string | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  vehicleCapacityKg?: number | null;
  vehicleCapacityM3?: number | null;
  averageResponseTimeMin?: number | null;
  localnessLabel?: string | null;
  latestReview?: { comment: string; rating: number } | null;
  latestPositiveReview?: { comment: string; rating: number } | null;
  activityCity?: string | null;
}

export interface CustomerOfferShipment {
  id: string;
  origin?: string;
  destination?: string;
  loadDetails?: string;
  weight?: number;
  shipmentDate?: string;
  status?: string;
}

export interface CustomerOffer {
  id: string;
  shipmentId: string;
  carrierId: string;
  carrier?: CustomerOfferCarrier | null;
  shipment?: CustomerOfferShipment;
  price: number;
  basePrice?: number | null;
  extraServicesTotal?: number | null;
  extraServicesBreakdown?: Array<{
    extraServiceId?: string;
    customServiceId?: string;
    name: string;
    price: number;
    source?: 'requested' | 'offered';
  }> | null;
  currency?: 'TRY' | string;
  message?: string;
  estimatedDuration?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'cancelled' | 'expired';
  offeredAt: string;
  validUntil?: string | Date | null;
  carrierEligibility?: CarrierEligibility;
  isLowestPrice?: boolean;
  isHighestRating?: boolean;
  isRecommended?: boolean;
  matchScore?: number;
  matchDetails?: {
    loadTypeCompatible: boolean;
    loadType?: string | null;
    extraServicesCovered: number;
    extraServicesTotal: number;
    missingExtraServices: string[];
  };
  extraServiceCompatibility?: {
    requestedCount: number;
    matchedCount: number;
    missing: string[];
    isFullyCompatible: boolean;
  };
  capacityFit?: {
    status: 'fit' | 'uncertain' | 'low_possible';
    shipmentWeightKg: number | null;
    shipmentVolumeM3: number | null;
    vehicleCapacityKg: number | null;
    vehicleCapacityM3: number | null;
  };
}

interface CustomerOfferCardProps {
  offer: CustomerOffer;
  bookmarked?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onAccept?: (offer: CustomerOffer) => void;
  onReject?: (offer: CustomerOffer) => void;
  onDetails?: (offer: CustomerOffer) => void;
  onBookmark?: (offer: CustomerOffer) => void;
}

export const getExtraServiceCompatibilityText = (offer: CustomerOffer): string | null => {
  if (!offer.extraServiceCompatibility || offer.extraServiceCompatibility.requestedCount === 0) {
    return null;
  }

  if (offer.extraServiceCompatibility.isFullyCompatible) {
    return 'Tum ek hizmetler karsilaniyor';
  }

  const missing = offer.extraServiceCompatibility.missing.slice(0, 2).join(', ');
  const suffix = offer.extraServiceCompatibility.missing.length > 2 ? '...' : '';
  return `Eksik ek hizmet: ${missing}${suffix}`;
};

export const getCapacityDecisionText = (offer: CustomerOffer): string => {
  if (!offer.capacityFit || offer.capacityFit.status === 'uncertain') {
    return 'Kapasite bilgisi belirsiz';
  }

  if (offer.capacityFit.status === 'fit') {
    return 'Arac kapasitesi uygun';
  }

  return 'Kapasite dusuk olabilir';
};

export const getOfferDecisionSignals = (offer: CustomerOffer): string[] => {
  const signals: string[] = [];

  if (offer.isLowestPrice) signals.push('En dusuk fiyat');
  if (offer.isHighestRating) signals.push('Yuksek puanli tasiyici');

  if (offer.extraServiceCompatibility?.requestedCount && offer.extraServiceCompatibility.isFullyCompatible) {
    signals.push('Ek hizmetler uyumlu');
  }

  if ((offer.estimatedDuration || 0) > 0 && (offer.estimatedDuration || 0) <= 24) {
    signals.push('Hizli teslimat');
  }

  return signals;
};

const fmtPrice = (n: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const initials = (name?: string | null): string =>
  (name || 'N')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'N';

const durationLabel = (hours?: number): string => {
  if (!hours) return 'Sure belirtilmedi';
  if (hours < 24) return `${hours} saat`;
  const days = Math.ceil(hours / 24);
  return `${days} gun`;
};

const redactUiText = (text?: string | null): string | undefined => {
  if (!text?.trim()) return undefined;
  const patterns = [
    /(?:\+?90|0)?[\s().-]*5\d{2}[\s().-]*\d{3}[\s().-]*\d{2}[\s().-]*\d{2}/giu,
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/giu,
    /\b(?:https?:\/\/|www\.|wa\.me\/|t\.me\/|[a-z0-9-]+\.(?:com|net|org|com\.tr|info|co|io)(?:\/\S*)?)/giu,
    /\b(whatsapp|watsapp|wp|wa\.me|telegram|telgraf)\b/giu,
  ];
  const hasSensitive = patterns.some((pattern) => pattern.test(text));
  if (!hasSensitive) return text;
  return 'Icerik guvenlik nedeniyle gizlendi.';
};

const statusLabel: Record<string, string> = {
  pending: 'Yeni',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
  withdrawn: 'Geri Cekildi',
  cancelled: 'Iptal',
  expired: 'Suresi Doldu',
};

const validUntilLabel = (value?: string | Date | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const loadTypeLabel = (loadType?: string | null): string => {
  const labels: Record<string, string> = {
    HOME: 'ev esyasi',
    OFFICE: 'ofis',
    PARTIAL: 'parca yuk',
    STORAGE: 'depolama',
  };

  return loadType ? labels[loadType] || loadType : 'bu yuk tipi';
};

const getMatchBadge = (score?: number) => {
  const normalized = Math.max(0, Math.min(100, Number(score ?? 0)));
  if (normalized === 100) {
    return {
      label: 'Tam uyumlu',
      className: 'gap-1 border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: <CheckCircle2 className="h-3 w-3" />,
    };
  }

  if (normalized >= 67) {
    return {
      label: `Kismi uyum (${normalized}%)`,
      className: 'gap-1 border-amber-200 bg-amber-50 text-amber-700',
      icon: <AlertTriangle className="h-3 w-3" />,
    };
  }

  return {
    label: `Dusuk uyum (${normalized}%)`,
    className: 'gap-1 border-rose-200 bg-rose-50 text-rose-700',
    icon: <XCircle className="h-3 w-3" />,
  };
};

export function CustomerOfferCard({
  offer,
  bookmarked = false,
  disabled = false,
  compact = false,
  onAccept,
  onReject,
  onDetails,
  onBookmark,
}: CustomerOfferCardProps) {
  const carrier = offer.carrier;
  const carrierName = carrier?.displayName || carrier?.companyName || carrier?.contactName || 'Nakliyeci';
  const rating = Number(carrier?.rating || 0);
  const review = carrier?.latestPositiveReview || carrier?.latestReview;
  const vehicleTitle = [carrier?.vehicleBrand, carrier?.vehicleModel].filter(Boolean).join(' ') || carrier?.vehicleType || 'Arac belirtilmedi';
  const capacityText = carrier?.vehicleCapacityKg
    ? `${Math.round(Number(carrier.vehicleCapacityKg) / 100) / 10} ton`
    : carrier?.vehicleCapacityM3
      ? `${carrier.vehicleCapacityM3} m3`
      : 'Kapasite yok';
  const safeOfferMessage = redactUiText(offer.message);
  const safeReviewComment = redactUiText(review?.comment);
  const compatibilityBadge = getExtraServiceCompatibilityText(offer);
  const capacityBadge = getCapacityDecisionText(offer);
  const decisionSignals = getOfferDecisionSignals(offer);
  const carrierEligibility = resolveCarrierEligibility(offer);
  const eligibilityWarning = getCarrierEligibilityWarning(offer);
  const acceptDisabled = isOfferAcceptDisabled(offer, disabled);
  const matchBadge = getMatchBadge(offer.matchScore);
  const validityLabel = validUntilLabel(offer.validUntil);
  const hasPriceBreakdown = Boolean(
    offer.extraServicesBreakdown?.length && Number(offer.extraServicesTotal || 0) > 0
  );
  const missingExtraServices = offer.matchDetails?.missingExtraServices ?? [];
  const matchWarnings = [
    ...(offer.matchDetails && !offer.matchDetails.loadTypeCompatible
      ? [`Bu tasiyici ${loadTypeLabel(offer.matchDetails.loadType)} tasima yapmiyor`]
      : []),
    ...(missingExtraServices.length
      ? [`Eksik ek hizmetler: ${missingExtraServices.join(', ')}`]
      : []),
  ];

  return (
    <article
      className={cn(
        'relative rounded-lg border bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md',
        offer.isRecommended && offer.status === 'pending' ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200',
        offer.status !== 'pending' && 'opacity-80'
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {carrier?.pictureUrl ? (
            <img src={carrier.pictureUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
              {initials(carrierName)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-semibold text-slate-950">{carrierName}</h3>
              {carrier?.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-blue-600" />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {rating > 0 ? rating.toFixed(1) : 'Yeni'}
                {carrier?.ratingCount ? ` (${carrier.ratingCount})` : ''}
              </span>
              <span>{rating > 0 ? `${rating.toFixed(1)} puan` : 'Puan yok'} • {carrier?.ratingCount ?? 0} yorum</span>
              <span>{carrier?.completedShipments ?? 0} is</span>
              {carrier?.localnessLabel && <span>{carrier.localnessLabel}</span>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {onBookmark && (
            <button
              type="button"
              onClick={() => onBookmark(offer)}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={bookmarked ? 'Kaydedildi' : 'Kaydet'}
            >
              <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-blue-600 text-blue-600')} />
            </button>
          )}
          <Badge variant={offer.status === 'pending' ? 'secondary' : 'outline'} className="text-[11px]">
            {statusLabel[offer.status] || offer.status}
          </Badge>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge variant="outline" className={matchBadge.className}>
          {matchBadge.icon}
          {matchBadge.label}
        </Badge>
        {offer.isRecommended && offer.status === 'pending' && (
          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">Onerilen</Badge>
        )}
        {offer.status === 'expired' && (
          <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-600">Suresi doldu</Badge>
        )}
        {offer.isLowestPrice && offer.status === 'pending' && (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">En uygun</Badge>
        )}
        {offer.isHighestRating && offer.status === 'pending' && (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">En yuksek puan</Badge>
        )}
        {!carrierEligibility.isEligible && (
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">Tasiyici artik uygun degil</Badge>
        )}
        {!carrierEligibility.isEligible && (
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">{carrierEligibility.label}</Badge>
        )}
        {carrier?.isVerified && (
          <Badge className="gap-1 bg-blue-100 text-blue-800 hover:bg-blue-100"><ShieldCheck className="h-3 w-3" /> Dogrulanmis Tasiyici</Badge>
        )}
        {carrier?.hasInsurance && (
          <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><PackageCheck className="h-3 w-3" /> Sigorta Mevcut</Badge>
        )}
        {compatibilityBadge && (
          <Badge
            variant="outline"
            className={offer.extraServiceCompatibility?.isFullyCompatible
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'}
          >
            {compatibilityBadge}
          </Badge>
        )}
        <Badge
          variant="outline"
          className={offer.capacityFit?.status === 'fit'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : offer.capacityFit?.status === 'low_possible'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-slate-200 bg-slate-50 text-slate-600'}
        >
          {capacityBadge}
        </Badge>
      </div>

      {decisionSignals.length > 0 && (
        <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Neden bu teklif?</p>
          <p className="mt-1 text-xs text-slate-700">{decisionSignals.join(' • ')}</p>
        </div>
      )}

      {matchWarnings.length > 0 && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2.5">
          {matchWarnings.map((warning) => (
            <p key={warning} className="text-xs leading-5 text-amber-800">{warning}</p>
          ))}
        </div>
      )}

      {eligibilityWarning && (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">{eligibilityWarning.title}</p>
          <p className="mt-1 text-xs text-rose-800">{eligibilityWarning.detail}</p>
        </div>
      )}

      <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-2')}>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Teklif</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">₺{fmtPrice(Number(offer.price))}</p>
          {hasPriceBreakdown && (
            <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
              <div className="flex items-center justify-between gap-2">
                <span>Tasima bedeli</span>
                <span className="font-medium text-slate-800">₺{fmtPrice(Number(offer.basePrice ?? offer.price))}</span>
              </div>
              {offer.extraServicesBreakdown!.map((item) => (
                <div key={`${item.extraServiceId ?? item.customServiceId}-${item.name}`} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    + {item.name}
                    {item.source === 'offered' && (
                      <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 align-middle text-[10px] font-bold text-blue-600">
                        Nakliyeci önerisi
                      </span>
                    )}
                  </span>
                  <span className="font-medium text-slate-800">₺{fmtPrice(Number(item.price))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Arac</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">{vehicleTitle}</p>
          <p className="text-xs text-slate-500">{capacityText}</p>
        </div>
      </div>

      {safeOfferMessage && (
        <p className="mt-3 line-clamp-2 rounded-md border-l-2 border-slate-200 pl-3 text-sm leading-6 text-slate-600">
          {safeOfferMessage}
        </p>
      )}

      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5" />
          Teslim: {durationLabel(offer.estimatedDuration)}
        </span>
        {validityLabel && (
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            Son geçerlilik: {validityLabel}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5" />
          {carrier?.isActive ? 'Aktif tasiyici' : 'Tasiyici durumu belirsiz'}
        </span>
      </div>

      {safeReviewComment && (
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div className="mb-1 flex items-center gap-1 text-amber-500">
            {Array.from({ length: Math.max(1, Math.min(5, review.rating)) }).map((_, index) => (
              <Star key={index} className="h-3 w-3 fill-current" />
            ))}
          </div>
          <p className="line-clamp-2 text-xs leading-5 text-slate-600">"{safeReviewComment}"</p>
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-500">
        Tasiyiciyla iletisim ve odeme sureclerini platform uzerinden surdurun.
      </p>

      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => onDetails?.(offer)}>
          <Eye className="mr-1.5 h-4 w-4" />
          Detay
        </Button>
        {offer.status === 'pending' ? (
          <>
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              disabled={disabled}
              onClick={() => onReject?.(offer)}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Reddet
            </Button>
            <Button className="flex-1 bg-blue-600 text-white hover:bg-blue-700" disabled={acceptDisabled} onClick={() => onAccept?.(offer)}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Kabul
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}
