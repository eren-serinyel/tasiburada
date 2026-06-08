import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ItemSelector from '@/components/converter/ItemSelector';
import {
  createConverterSession,
  estimateConverter,
  fetchConverterItems,
  type ConverterCatalogItem,
  type ConverterMoveType,
  type ConverterPropertyType,
  type EstimateConverterResponse,
} from '@/lib/converterApi';
import type { ExtraServiceLoadType } from '@/lib/extraServices';

export interface VolumeCalculatorInitialValues {
  moveType?: ConverterMoveType;
  propertyType?: ConverterPropertyType;
  originFloor?: number;
  destinationFloor?: number;
  buildingElevator?: boolean;
}

interface VolumeCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyEstimate: (result: EstimateConverterResponse) => void;
  loadType?: ExtraServiceLoadType | null;
  initialValues?: VolumeCalculatorInitialValues;
  applyLabel?: string;
}

const VEHICLE_LABELS: Record<string, string> = {
  panelvan: 'Panelvan',
  short_chassis_van: 'Kısa şasi kamyonet',
  long_chassis_van: 'Uzun şasi kamyonet',
  small_truck: 'Küçük kamyon',
  large_truck: 'Büyük kamyon',
};

const CONFIDENCE_LABELS: Record<'low' | 'medium' | 'high', string> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
};

const CONFIDENCE_CLASS: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-emerald-100 text-emerald-700',
};

export default function VolumeCalculatorModal({
  open,
  onOpenChange,
  onApplyEstimate,
  loadType,
  initialValues,
  applyLabel = 'Forma Uygula',
}: VolumeCalculatorModalProps) {
  const [moveType, setMoveType] = useState<ConverterMoveType>('household');
  const [propertyType, setPropertyType] = useState<ConverterPropertyType>('2+1');
  const [originFloor, setOriginFloor] = useState<number>(0);
  const [destinationFloor, setDestinationFloor] = useState<number>(0);
  const [buildingElevator, setBuildingElevator] = useState(false);
  const [externalLift, setExternalLift] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [specialItems, setSpecialItems] = useState<string[]>([]);
  const [catalogItems, setCatalogItems] = useState<ConverterCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<EstimateConverterResponse | null>(null);

  const selectedItemEntries = useMemo(
    () => Object.entries(selectedItems).filter(([, quantity]) => quantity > 0),
    [selectedItems],
  );

  useEffect(() => {
    if (!open) return;

    setMoveType(initialValues?.moveType ?? 'household');
    setPropertyType(initialValues?.propertyType ?? '2+1');
    setOriginFloor(initialValues?.originFloor ?? 0);
    setDestinationFloor(initialValues?.destinationFloor ?? 0);
    setBuildingElevator(initialValues?.buildingElevator ?? false);
    setExternalLift(false);
    setResult(null);
    setErrorMessage('');
  }, [open, initialValues]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setCatalogLoading(true);
    setCatalogError('');
    fetchConverterItems()
      .then((items) => {
        if (cancelled) return;
        setCatalogItems(items);
        setSelectedItems((prev) => {
          const validCodes = new Set(items.map((item) => item.itemCode));
          return Object.fromEntries(Object.entries(prev).filter(([code]) => validCodes.has(code)));
        });
        setSpecialItems((prev) => {
          const validSpecialCodes = new Set(items.filter((item) => item.isSpecial).map((item) => item.itemCode));
          return prev.filter((code) => validSpecialCodes.has(code));
        });
      })
      .catch((error: any) => {
        if (cancelled) return;
        setCatalogItems([]);
        setSelectedItems({});
        setSpecialItems([]);
        setCatalogError(error?.message || 'Eşya katalogu alınamadı.');
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const specialCatalog = useMemo(
    () => catalogItems.filter((item) => item.isSpecial),
    [catalogItems],
  );

  const canCalculate = selectedItemEntries.length > 0 && !loading && !catalogLoading && !catalogError;

  const handleCalculate = async () => {
    if (selectedItemEntries.length === 0) {
      setErrorMessage('En az 1 eşya seçin');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setResult(null);

    try {
      const session = await createConverterSession();
      const estimate = await estimateConverter(session.sessionId, {
        moveType,
        propertyType,
        loadType: loadType ?? undefined,
        items: selectedItemEntries.map(([itemCode, quantity]) => ({ itemCode, quantity })),
        originFloor,
        destinationFloor,
        buildingElevator,
        externalLift,
        specialItems,
      });
      setResult(estimate);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Converter hesabı sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApplyEstimate(result);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Hacmi Hesapla</DialogTitle>
          <DialogDescription>
            Eşya listesine göre tahmini hacim ve araç önerisi alın.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Taşıma Tipi</Label>
              <Select value={moveType} onValueChange={(value) => setMoveType(value as ConverterMoveType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="household">Ev Eşyası</SelectItem>
                  <SelectItem value="partial_load">Parça Yük</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Konut Tipi</Label>
              <Select value={propertyType} onValueChange={(value) => setPropertyType(value as ConverterPropertyType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio">Stüdyo</SelectItem>
                  <SelectItem value="1+1">1+1</SelectItem>
                  <SelectItem value="2+1">2+1</SelectItem>
                  <SelectItem value="3+1">3+1</SelectItem>
                  <SelectItem value="4+1_plus">4+1+</SelectItem>
                  <SelectItem value="unknown">Bilinmiyor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Çıkış Katı</Label>
              <Input
                type="number"
                min={-5}
                max={100}
                value={originFloor}
                onChange={(e) => setOriginFloor(Number(e.target.value || 0))}
              />
            </div>

            <div className="space-y-2">
              <Label>Varış Katı</Label>
              <Input
                type="number"
                min={-5}
                max={100}
                value={destinationFloor}
                onChange={(e) => setDestinationFloor(Number(e.target.value || 0))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border border-slate-200 p-2 text-sm">
              <input
                type="checkbox"
                checked={buildingElevator}
                onChange={(e) => setBuildingElevator(e.target.checked)}
              />
              Bina asansörü var
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 p-2 text-sm">
              <input
                type="checkbox"
                checked={externalLift}
                onChange={(e) => setExternalLift(e.target.checked)}
              />
              Dış cephe asansörü kullanılacak
            </label>
          </div>

          <div className="space-y-2">
            <Label>Eşya Listesi ve Adet</Label>
            {catalogLoading ? (
              <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">Eşya kataloğu yükleniyor...</div>
            ) : catalogError ? (
              <Alert variant="destructive">
                <AlertDescription>{catalogError}</AlertDescription>
              </Alert>
            ) : catalogItems.length === 0 ? (
              <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">Aktif eşya kataloğu bulunamadı.</div>
            ) : (
              <ItemSelector
                items={catalogItems}
                selectedItems={selectedItems}
                onQuantityChange={(itemCode, quantity) => {
                  setSelectedItems((prev) => ({ ...prev, [itemCode]: quantity }));
                }}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Özel Eşyalar</Label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {specialCatalog.map((item) => {
                const checked = specialItems.includes(item.itemCode);
                return (
                  <label
                    key={item.itemCode}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSpecialItems((prev) => {
                          if (e.target.checked) return [...prev, item.itemCode];
                          return prev.filter((code) => code !== item.itemCode);
                        });
                      }}
                    />
                    {item.label}
                  </label>
                );
              })}
            </div>
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-2 rounded-md border border-sky-200 bg-sky-50 p-3">
              <div className="text-sm font-semibold text-slate-800">
                Tahmini hacim: {result.estimatedVolumeMin}-{result.estimatedVolumeMax} m³
              </div>
              <div className="text-sm text-slate-700">
                Tahmini ağırlık: {result.estimatedWeightKg} kg
              </div>
              <div className="text-sm text-slate-700">
                Önerilen araç: {VEHICLE_LABELS[result.recommendedVehicle] || result.recommendedVehicle}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-700">Güven seviyesi:</span>
                <Badge className={CONFIDENCE_CLASS[result.confidence]}>{CONFIDENCE_LABELS[result.confidence]}</Badge>
              </div>
              {result.warnings.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700">
                  {result.warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-slate-600">{result.summaryText}</p>
              <p className="text-xs font-medium text-slate-500">Bu ekran fiyat vermez. Fiyat için teklif alın.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
          <Button type="button" onClick={handleCalculate} disabled={!canCalculate}>
            {loading ? 'Hesaplanıyor...' : 'Hesapla'}
          </Button>
          <Button type="button" onClick={handleApply} disabled={!result || loading}>
            {applyLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
