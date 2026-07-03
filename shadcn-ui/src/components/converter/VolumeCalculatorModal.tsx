import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
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
import ItemSelector from '@/components/converter/ItemSelector';
import {
  createConverterSession,
  estimateConverter,
  fetchConverterItems,
  type ConverterCatalogItem,
  type ConverterCustomItemInput,
  type ConverterCustomItemSizeClass,
  type ConverterMoveType,
  type ConverterPropertyType,
  type EstimateConverterResponse,
} from '@/lib/converterApi';
import type { ExtraServiceLoadType } from '@/lib/extraServices';
import { cn } from '@/lib/utils';

export interface VolumeCalculatorInitialValues {
  moveType?: ConverterMoveType;
  propertyType?: ConverterPropertyType;
}

export interface VolumeCalculatorDraftValues {
  moveType: ConverterMoveType;
  propertyType: ConverterPropertyType;
  selectedItems: Record<string, number>;
  customItems: ConverterCustomItemInput[];
  result: EstimateConverterResponse | null;
}

interface VolumeCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyEstimate: (result: EstimateConverterResponse) => void;
  loadType?: ExtraServiceLoadType | null;
  initialValues?: VolumeCalculatorInitialValues;
  draftValues?: VolumeCalculatorDraftValues | null;
  onDraftChange?: (draft: VolumeCalculatorDraftValues) => void;
  applyLabel?: string;
}

const VEHICLE_LABELS: Record<string, string> = {
  panelvan: 'Panelvan',
  short_chassis_van: 'Kısa şasi kamyonet',
  long_chassis_van: 'Uzun şasi kamyonet',
  small_truck: 'Küçük kamyon',
  large_truck: 'Büyük kamyon',
};

const VEHICLE_HINTS: Record<string, string> = {
  panelvan: '~4 m³ · stüdyo / az eşya',
  short_chassis_van: '~8 m³ · 1+1 ev',
  long_chassis_van: '~14 m³ · 2+1 ev',
  small_truck: '~22 m³ · 3+1 ev',
  large_truck: '22 m³+ · 4+1 ve üzeri',
};

const CONFIDENCE_LABELS: Record<'low' | 'medium' | 'high', string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};

const CONFIDENCE_CLASS: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-emerald-100 text-emerald-700',
};

const SIZE_CLASSES: Array<{
  value: ConverterCustomItemSizeClass;
  label: string;
  examples: string;
}> = [
  { value: 'small', label: 'Küçük (~0,2 m³)', examples: 'Kutu, sandalye, küçük masa' },
  { value: 'medium', label: 'Orta (~0,5 m³)', examples: 'Çekmeceli dolap, ofis koltuğu' },
  { value: 'large', label: 'Büyük (~1 m³)', examples: 'Yatak, tek gardrop, büyük masa' },
  { value: 'very_large', label: 'Çok büyük (~2 m³)', examples: 'Çift gardrop, piyano boyutu' },
];

const SIZE_CLASS_LABELS: Record<ConverterCustomItemSizeClass, string> = {
  small: 'Küçük',
  medium: 'Orta',
  large: 'Büyük',
  very_large: 'Çok büyük',
};

const MOVE_TYPE_LABELS: Record<ConverterMoveType, string> = {
  household: 'Ev Eşyası',
  partial_load: 'Parça Yük',
};

const PROPERTY_TYPE_LABELS: Record<ConverterPropertyType, string> = {
  studio: 'Stüdyo',
  '1+1': '1+1',
  '2+1': '2+1',
  '3+1': '3+1',
  '4+1_plus': '4+1+',
  unknown: 'Konut tipi bilinmiyor',
};

export default function VolumeCalculatorModal({
  open,
  onOpenChange,
  onApplyEstimate,
  loadType,
  initialValues,
  draftValues,
  onDraftChange,
  applyLabel = 'Bu bilgileri talebime ekle',
}: VolumeCalculatorModalProps) {
  const [moveType, setMoveType] = useState<ConverterMoveType>('household');
  const [propertyType, setPropertyType] = useState<ConverterPropertyType>('2+1');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [customItems, setCustomItems] = useState<ConverterCustomItemInput[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customSizeClass, setCustomSizeClass] = useState<ConverterCustomItemSizeClass | null>(null);
  const [customQty, setCustomQty] = useState(0);
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
  const hasAnySelection = useMemo(
    () => selectedItemEntries.length > 0 || customItems.length > 0,
    [selectedItemEntries, customItems],
  );

  useEffect(() => {
    if (!open) return;

    setMoveType(draftValues?.moveType ?? initialValues?.moveType ?? 'household');
    setPropertyType(draftValues?.propertyType ?? initialValues?.propertyType ?? '2+1');
    setSelectedItems(draftValues?.selectedItems ?? {});
    setCustomItems(draftValues?.customItems ?? []);
    setShowCustomForm(false);
    setCustomName('');
    setCustomSizeClass(null);
    setCustomQty(0);
    setResult(draftValues?.result ?? null);
    setErrorMessage('');
    // Hydrate only when the dialog opens; parent draft updates should not reset edits in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !onDraftChange) return;
    onDraftChange({ moveType, propertyType, selectedItems, customItems, result });
  }, [customItems, moveType, onDraftChange, open, propertyType, result, selectedItems]);

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
      })
      .catch((error: any) => {
        if (cancelled) return;
        setCatalogItems([]);
        setSelectedItems({});
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
  const selectedSpecialItemCodes = useMemo(
    () => specialCatalog
      .filter((item) => (selectedItems[item.itemCode] ?? 0) > 0)
      .map((item) => item.itemCode),
    [selectedItems, specialCatalog],
  );
  const selectedSpecialLabels = useMemo(
    () => specialCatalog
      .filter((item) => selectedSpecialItemCodes.includes(item.itemCode))
      .map((item) => item.label),
    [selectedSpecialItemCodes, specialCatalog],
  );

  const resetCustomForm = () => {
    setCustomName('');
    setCustomSizeClass(null);
    setCustomQty(0);
  };

  const cancelCustomForm = () => {
    resetCustomForm();
    setShowCustomForm(false);
  };

  const addCustomItem = () => {
    const name = customName.trim();
    if (!name || name.length < 2 || name.length > 50 || !customSizeClass || customQty < 1 || customItems.length >= 5) {
      return;
    }

    setCustomItems((prev) => [
      ...prev,
      {
        name,
        sizeClass: customSizeClass,
        quantity: customQty,
      },
    ]);
    resetCustomForm();
    setShowCustomForm(false);
  };

  const removeCustomItem = (indexToRemove: number) => {
    setCustomItems((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const canCalculate = hasAnySelection && !loading && !catalogLoading && !catalogError;

  const handleCalculate = async () => {
    if (!hasAnySelection) {
      setErrorMessage('Hesaplamak için en az bir eşya seçin.');
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
        specialItems: selectedSpecialItemCodes,
        customItems,
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

        <div className="space-y-6">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            {MOVE_TYPE_LABELS[moveType]} · {PROPERTY_TYPE_LABELS[propertyType]} için tahmin
          </div>

          <div className="space-y-3">
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

          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <Label>Diğer Eşyalar</Label>
              <span className="text-xs text-slate-500">Listede yoksa buradan ekleyin (en fazla 5)</span>
            </div>

            {customItems.length > 0 && (
              <div className="space-y-1.5">
                {customItems.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
                  >
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="font-medium text-slate-800">{item.name}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        ({SIZE_CLASS_LABELS[item.sizeClass]}, {item.quantity} adet)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomItem(index)}
                      aria-label={`${item.name} eşyasını kaldır`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {showCustomForm && (
              <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
                <div className="space-y-2">
                  <Label htmlFor="custom-name">Eşya adı</Label>
                  <Input
                    id="custom-name"
                    placeholder="Örn. Antika dolap, vintage masa..."
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Boyut</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SIZE_CLASSES.map((sizeClass) => (
                      <button
                        key={sizeClass.value}
                        type="button"
                        onClick={() => setCustomSizeClass(sizeClass.value)}
                        className={cn(
                          'rounded-md border p-2 text-left text-sm transition',
                          customSizeClass === sizeClass.value
                            ? 'border-sky-500 bg-sky-50'
                            : 'border-slate-200 hover:bg-slate-50',
                        )}
                      >
                        <div className="font-medium text-slate-800">{sizeClass.label}</div>
                        <div className="text-xs text-slate-500">{sizeClass.examples}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-qty">Adet</Label>
                  <Input
                    id="custom-qty"
                    type="number"
                    min={1}
                    max={50}
                    value={customQty === 0 ? '' : customQty}
                    placeholder="1"
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      if (rawValue === '') {
                        setCustomQty(0);
                        return;
                      }
                      const next = Number(rawValue);
                      setCustomQty(Number.isFinite(next) ? Math.min(50, Math.max(1, next)) : 0);
                    }}
                    className="w-24"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={cancelCustomForm}>
                    İptal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addCustomItem}
                    disabled={!customName.trim() || customName.trim().length < 2 || !customSizeClass || customQty < 1}
                  >
                    Ekle
                  </Button>
                </div>
              </div>
            )}

            {customItems.length < 5 && !showCustomForm && (
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCustomForm(true)} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Diğer eşya ekle
              </Button>
            )}
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {!hasAnySelection && (
            <p className="text-sm text-slate-500">Hesaplamak için en az bir eşya seçin.</p>
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
                <span className="font-medium">Önerilen araç:</span> {VEHICLE_LABELS[result.recommendedVehicle] || result.recommendedVehicle}
                {VEHICLE_HINTS[result.recommendedVehicle] && (
                  <span className="ml-1 text-xs text-slate-500">({VEHICLE_HINTS[result.recommendedVehicle]})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-700">Güven seviyesi:</span>
                <Badge className={CONFIDENCE_CLASS[result.confidence]}>{CONFIDENCE_LABELS[result.confidence]}</Badge>
              </div>
              {(result.confidence === 'medium' || result.confidence === 'low') && (
                <p className="text-xs text-slate-500">
                  Kat ve asansör bilgisi forma yansıtıldığında tahmin daha doğru olacak.
                </p>
              )}
              {selectedSpecialLabels.length > 0 && (
                <p className="text-xs text-amber-700">
                  {selectedSpecialLabels[0]} gibi özel eşyalar için daha geniş araç önerilmiş olabilir.
                </p>
              )}
              {result.warnings.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700">
                  {result.warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-slate-600">{result.summaryText}</p>
              <p className="text-xs text-slate-500">
                Ağırlık kabaca tahmindir; kitap, beyaz eşya veya yoğun/ağır eşyalar varsa açıklama alanında belirtin.
              </p>
              <p className="text-xs text-slate-500">
                "{applyLabel}" dediğinizde tahmini ağırlık, önerilen araç tercihi ve eşya özeti talebinize eklenir.
              </p>
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
