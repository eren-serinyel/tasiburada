import { useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { CONVERTER_CATEGORY_LABELS, CONVERTER_CATEGORY_ORDER } from '@/lib/converterCategories';
import type { ConverterCatalogItem } from '@/lib/converterApi';

interface ItemSelectorProps {
  items: ConverterCatalogItem[];
  selectedItems: Record<string, number>;
  onQuantityChange: (itemCode: string, quantity: number) => void;
}

const QUANTITY_LIMIT_BY_ITEM_CODE: Record<string, number> = {
  dining_chair: 30,
  office_chair: 30,
  nightstand: 20,
};
const QUANTITY_LIMIT_BY_CATEGORY: Record<string, number> = {
  box: 200,
  appliance: 6,
  special: 5,
};
const DEFAULT_CATALOG_ITEM_QUANTITY_LIMIT = 12;

const getCatalogItemQuantityLimit = (item: ConverterCatalogItem) => {
  return QUANTITY_LIMIT_BY_ITEM_CODE[item.itemCode]
    ?? QUANTITY_LIMIT_BY_CATEGORY[item.category]
    ?? DEFAULT_CATALOG_ITEM_QUANTITY_LIMIT;
};

export default function ItemSelector({ items, selectedItems, onQuantityChange }: ItemSelectorProps) {
  const itemsByCategory = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ConverterCatalogItem[]>);
  }, [items]);

  const orderedCategories = useMemo(() => {
    const knownCategories = CONVERTER_CATEGORY_ORDER.filter((category) => itemsByCategory[category]);
    const unknownCategories = Object.keys(itemsByCategory).filter(
      (category) => !CONVERTER_CATEGORY_ORDER.includes(category),
    );
    return [...knownCategories, ...unknownCategories];
  }, [itemsByCategory]);

  return (
    <Accordion type="multiple" defaultValue={['living_room', 'bedroom']} className="space-y-2">
      {orderedCategories.map((category) => {
        const categoryItems = itemsByCategory[category];
        const selectedQuantity = categoryItems.reduce((sum, item) => sum + (selectedItems[item.itemCode] || 0), 0);

        return (
          <AccordionItem key={category} value={category} className="rounded-md border border-slate-200 px-3">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <span>{CONVERTER_CATEGORY_LABELS[category] || category}</span>
                <span className="text-xs font-normal text-slate-500">
                  {categoryItems.length} eşya
                  {selectedQuantity > 0 && ` · ${selectedQuantity} adet seçili`}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {categoryItems.map((item) => {
                  const quantity = selectedItems[item.itemCode] || 0;
                  const quantityLimit = getCatalogItemQuantityLimit(item);
                  return (
                    <label
                      key={item.itemCode}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-800">{item.label}</div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={quantityLimit}
                        value={quantity === 0 ? '' : quantity}
                        placeholder="0"
                        onChange={(e) => {
                          const rawValue = e.target.value;
                          if (rawValue === '') {
                            onQuantityChange(item.itemCode, 0);
                            return;
                          }
                          const next = Number(rawValue);
                          const bounded = Number.isFinite(next)
                            ? Math.min(quantityLimit, Math.max(0, Math.floor(next)))
                            : 0;
                          onQuantityChange(item.itemCode, bounded);
                        }}
                        className="h-8 w-20"
                      />
                    </label>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
