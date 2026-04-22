import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight,
  Calendar,
  ChevronRight, 
  Clock3,
  Package,
  Building2,
  CircleCheck,
  CircleDashed,
  UserRound,
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { getUserType } from '@/lib/auth';
import { cn } from '@/lib/utils';

type ShipmentStatus = 'pending' | 'offer_received' | 'matched' | 'in_transit' | 'completed' | 'cancelled';

type ShipmentConverterSummary = {
  converterSessionId: string | null;
  converterAppliedAt: string | null;
  converterEstimatedVolumeMin: number | null;
  converterEstimatedVolumeMax: number | null;
  converterRecommendedVehicleCode: string | null;
  converterLastAppliedBy: string | null;
} | null;

type BackendShipment = {
  id: string;
  status: ShipmentStatus;
  origin?: string;
  destination?: string;
  loadDetails?: string;
  weight?: number | null;
  shipmentDate?: string;
  createdAt?: string;
  updatedAt?: string;
  price?: number | null;
  transportType?: string | null;
  insuranceType?: string | null;
  originFloor?: number | null;
  destinationFloor?: number | null;
  hasElevator?: boolean | null;
  originHasElevator?: boolean | null;
  destinationHasElevator?: boolean | null;
  extraServices?: string[];
  offerCount?: number;
  offers?: Array<{ id: string; status?: string; price?: number; offeredAt?: string }>;
  customer?: {
    firstName?: string;
    lastName?: string;
  };
  converter?: ShipmentConverterSummary;
};

const statusConfigs: Record<ShipmentStatus, { label: string; className: string }> = {
  pending: { label: 'Teklif Bekleniyor', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  offer_received: { label: 'Teklif Geldi', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  matched: { label: 'Eşleşti', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  in_transit: { label: 'Taşıma Başladı', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  completed: { label: 'Tamamlandı', className: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { label: 'İptal', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userType = getUserType();
  const [shipment, setShipment] = useState<BackendShipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    apiClient(`/api/v1/shipments/${id}`).then(r => r.json()).then(j => {
        if (j.success) {
          setShipment(j.data as BackendShipment);
          setError(null);
        } else {
          setError('İlan detayı alınamadı.');
        }
        setLoading(false);
    }).catch(() => {
      setError('İlan detayı yüklenirken bağlantı hatası oluştu.');
      setLoading(false);
    });
  }, [id]);

  const offerCount = useMemo(() => {
    if (typeof shipment?.offerCount === 'number') return shipment.offerCount;
    if (Array.isArray(shipment?.offers)) return shipment.offers.length;
    if (shipment?.status === 'offer_received') return 1;
    return 0;
  }, [shipment]);

  if (loading) {
    return <div className="p-16 text-center text-sm text-gray-500">Yükleniyor...</div>;
  }

  if (!shipment || error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-base font-medium text-gray-900">İlan detayı şu an görüntülenemiyor.</p>
            <p className="text-sm text-gray-500">{error || 'Bilinmeyen bir hata oluştu.'}</p>
            <Button variant="outline" asChild>
              <Link to="/ilanlar">İlanlara Dön</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfigs[shipment.status] || statusConfigs.pending;
  const routeTitle = `${formatRouteTitle(shipment.origin)} → ${formatRouteTitle(shipment.destination)}`;
  const heroMeta = [
    normalizeText(shipment.loadDetails),
    shipment.weight && shipment.weight > 0 ? `${shipment.weight} kg` : null,
    formatDate(shipment.shipmentDate),
  ].filter(Boolean) as string[];
  const serviceChips = buildServiceChips(shipment);
  const opsRows = buildOperationalRows(shipment);
  const processSteps = buildProcessSteps(shipment.status);
  const converterRows = buildConverterRows(shipment.converter);

  return (
    <div className="min-h-screen bg-gray-50/60 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
          <Link to="/ilanlar" className="hover:text-gray-600 transition-colors">İlanlar</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-500">İlan Detayı</span>
        </div>

        <Card className="border border-gray-200 shadow-sm bg-white mb-6">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Badge variant="secondary" className={cn('text-[11px] font-semibold border', status.className)}>
                  {status.label}
                </Badge>
                <span className="text-xs text-gray-500">#{shipment.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <span className="text-sm text-gray-500">Güncelleme: {formatDateTime(shipment.updatedAt || shipment.createdAt)}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">{routeTitle}</h1>
            {heroMeta.length > 0 && (
              <div className="mt-2 flex items-center flex-wrap gap-2 text-sm text-gray-600">
                {heroMeta.map((item, idx) => (
                  <span key={`${item}-${idx}`} className="inline-flex items-center gap-2">
                    {idx > 0 && <span className="text-gray-300">•</span>}
                    {item}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-900">Taşıma Genel Görünüm</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid md:grid-cols-2 gap-4">
                  <RouteBlock
                    label="Çıkış"
                    location={shipment.origin}
                    floor={shipment.originFloor}
                    elevator={shipment.originHasElevator ?? shipment.hasElevator ?? null}
                  />
                  <RouteBlock
                    label="Varış"
                    location={shipment.destination}
                    floor={shipment.destinationFloor}
                    elevator={shipment.destinationHasElevator ?? shipment.hasElevator ?? null}
                  />
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Taşıma Tarihi</span>
                  <span className="font-medium text-gray-900">{formatDate(shipment.shipmentDate)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <SummaryCard title="Yük Özeti" icon={<Package className="h-4 w-4 text-gray-500" />}>
                <DetailRow label="İçerik" value={normalizeText(shipment.loadDetails)} />
                <DetailRow label="Ağırlık" value={shipment.weight && shipment.weight > 0 ? `${shipment.weight} kg` : '-'} />
                <DetailRow label="Taşıma Tipi" value={normalizeText(shipment.transportType)} />
              </SummaryCard>

              <SummaryCard title="Hizmet Şartları" icon={<Building2 className="h-4 w-4 text-gray-500" />}>
                {serviceChips.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {serviceChips.map((chip) => (
                      <Badge key={chip} variant="secondary" className="bg-gray-100 text-gray-700 border border-gray-200">
                        {chip}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Ek hizmet bilgisi bulunmuyor.</p>
                )}
              </SummaryCard>
            </div>

            {converterRows.length > 0 && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-900">Converter Özeti</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2.5">
                  {converterRows.map((row) => (
                    <DetailRow key={row.label} label={row.label} value={row.value} />
                  ))}
                  <p className="text-xs text-gray-500 pt-1">
                    Bu sonuç tahminidir, nihai planlama taşıyıcı değerlendirmesiyle netleşebilir.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-900">Operasyonel Durum</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {opsRows.map((row) => (
                  <DetailRow key={row.label} label={row.label} value={row.value} />
                ))}
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-900">Süreç Özeti</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {processSteps.map((step) => (
                  <div key={step.label} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {step.done ? (
                        <CircleCheck className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                      <span className={cn('text-sm', step.done ? 'text-gray-900 font-medium' : 'text-gray-500')}>{step.label}</span>
                    </div>
                    <span className={cn('text-xs', step.done ? 'text-green-700' : 'text-gray-400')}>
                      {step.done ? 'Tamamlandı' : 'Bekliyor'}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <Card className="border border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-gray-100">
                <CardTitle className="text-base font-semibold text-gray-900">Teklif ve Karar</CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Bütçe</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {shipment.price && shipment.price > 0 ? `₺${shipment.price.toLocaleString('tr-TR')}` : 'Teklife Açık'}
                  </p>
                </div>

                <div className="space-y-2">
                  <DetailRow label="Durum" value={status.label} />
                  <DetailRow label="Teklif" value={offerCount > 0 ? `${offerCount} teklif geldi` : 'Henüz teklif yok'} />
                  <DetailRow label="Taşıma Tarihi" value={formatDate(shipment.shipmentDate)} />
                </div>

                {userType === 'carrier' && (
                  <Button onClick={() => navigate(`/nakliyeci/yanit/${shipment.id}`)} className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium">
                    Teklif Ver <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}

                <div className="rounded-lg border border-gray-200 p-3.5 bg-white">
                  <p className="text-xs text-gray-500 mb-2">İlan Sahibi</p>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center">
                      <UserRound className="h-4 w-4 text-gray-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {shipment.customer?.firstName || 'Müşteri'} {shipment.customer?.lastName || ''}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRouteTitle(value?: string) {
  const full = String(value || '').trim();
  if (!full) return '-';

  const parts = full.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
  return parts[0] || '-';
}

function normalizeText(value?: string | null) {
  const text = String(value || '').trim();
  return text || '-';
}

function formatDate(input?: string | null) {
  if (!input) return '-';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(input?: string | null) {
  if (!input) return '-';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatInsurance(value?: string | null) {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return '-';
  if (key === 'none') return 'Sigortasız';
  if (key === 'standard') return 'Standart Sigorta';
  if (key === 'comprehensive') return 'Kapsamlı Sigorta';
  return value || '-';
}

function formatVehicleCode(value?: string | null) {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return '-';
  const map: Record<string, string> = {
    panelvan: 'Panelvan',
    short_chassis_van: 'Kısa Şasi Van',
    long_chassis_van: 'Uzun Şasi Van',
    small_truck: 'Küçük Kamyon',
    large_truck: 'Büyük Kamyon',
  };
  return map[key] || value || '-';
}

function buildServiceChips(shipment: BackendShipment) {
  const chips: string[] = [];
  const hasElevator = shipment.originHasElevator ?? shipment.destinationHasElevator ?? shipment.hasElevator;

  if (typeof hasElevator === 'boolean') {
    chips.push(hasElevator ? 'Asansör Var' : 'Asansör Yok');
  }

  if (shipment.insuranceType) {
    chips.push(formatInsurance(shipment.insuranceType));
  }

  if (Array.isArray(shipment.extraServices)) {
    for (const item of shipment.extraServices) {
      const value = String(item || '').trim();
      if (value) chips.push(value);
      if (chips.length >= 6) break;
    }
  }

  return Array.from(new Set(chips));
}

function buildOperationalRows(shipment: BackendShipment) {
  return [
    { label: 'Taşıma Tipi', value: normalizeText(shipment.transportType) },
    {
      label: 'Kat Bilgisi',
      value: [
        typeof shipment.originFloor === 'number' ? `Çıkış ${shipment.originFloor}. Kat` : null,
        typeof shipment.destinationFloor === 'number' ? `Varış ${shipment.destinationFloor}. Kat` : null,
      ].filter(Boolean).join(' • ') || '-',
    },
    {
      label: 'Asansör',
      value: (() => {
        const hasElevator = shipment.originHasElevator ?? shipment.destinationHasElevator ?? shipment.hasElevator;
        if (typeof hasElevator !== 'boolean') return '-';
        return hasElevator ? 'Var' : 'Yok';
      })(),
    },
    { label: 'Sigorta', value: formatInsurance(shipment.insuranceType) },
  ];
}

function buildProcessSteps(status: ShipmentStatus) {
  const flow: Array<{ key: ShipmentStatus | 'draft'; label: string }> = [
    { key: 'draft', label: 'İlan Oluşturuldu' },
    { key: 'pending', label: 'Teklif Bekleniyor' },
    { key: 'offer_received', label: 'Teklif Alındı' },
    { key: 'matched', label: 'Eşleşme' },
    { key: 'in_transit', label: 'Taşıma Süreci' },
    { key: 'completed', label: 'Tamamlandı' },
  ];

  const order: Array<ShipmentStatus | 'draft'> = ['draft', 'pending', 'offer_received', 'matched', 'in_transit', 'completed'];
  const currentIndex = order.includes(status) ? order.indexOf(status) : 1;

  return flow
    .filter((step) => !(status === 'cancelled' && step.key === 'completed'))
    .map((step) => ({
      ...step,
      done: status === 'cancelled' ? step.key === 'draft' || step.key === 'pending' : order.indexOf(step.key) <= currentIndex,
    }));
}

function buildConverterRows(converter: ShipmentConverterSummary) {
  if (!converter) return [] as Array<{ label: string; value: string }>;

  const rows: Array<{ label: string; value: string }> = [];
  const hasVolume = typeof converter.converterEstimatedVolumeMin === 'number' || typeof converter.converterEstimatedVolumeMax === 'number';

  if (hasVolume) {
    rows.push({
      label: 'Hacim',
      value: `${converter.converterEstimatedVolumeMin ?? '-'} - ${converter.converterEstimatedVolumeMax ?? '-'} m³`,
    });
  }

  if (converter.converterRecommendedVehicleCode) {
    rows.push({
      label: 'Araç Önerisi',
      value: formatVehicleCode(converter.converterRecommendedVehicleCode),
    });
  }

  if (converter.converterAppliedAt) {
    rows.push({
      label: 'Uygulandı',
      value: formatDateTime(converter.converterAppliedAt),
    });
  }

  return rows;
}

function RouteBlock({
  label,
  location,
  floor,
  elevator,
}: {
  label: string;
  location?: string;
  floor?: number | null;
  elevator?: boolean | null;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900 break-words">{normalizeText(location)}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>{typeof floor === 'number' ? `${floor}. Kat` : 'Kat bilgisi yok'}</span>
        <span>{typeof elevator === 'boolean' ? (elevator ? 'Asansör Var' : 'Asansör Yok') : '-'}</span>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">{children}</CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}