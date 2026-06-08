import { useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import type { ConverterCatalogItem } from '@/lib/converterApi';

interface ItemSelectorProps {
  items: ConverterCatalogItem[];
  selectedItems: Record<string, number>;
  onQuantityChange: (itemCode: string, quantity: number) => void;
}

export default function ItemSelector({ items, selectedItems, onQuantityChange }: ItemSelectorProps) {
  const itemsByCategory = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ConverterCatalogItem[]>);
  }, [items]);

  return (
    <Accordion type="multiple" defaultValue={['living_room', 'bedroom']} className="rounded-md border border-slate-200">
      {Object.entries(itemsByCategory).map(([category, categoryItems]) => {
        const selectedCount = categoryItems.filter((item) => (selectedItems[item.itemCode] || 0) > 0).length;

        return (
          <AccordionItem key={category} value={category} className="px-3">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2">
                <span>{category}</span>
                <span className="text-xs font-normal text-slate-500">
                  ({categoryItems.length} esya, {selectedCount} secili)
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {categoryItems.map((item) => {
                  const quantity = selectedItems[item.itemCode] || 0;
                  return (
                    <label
                      key={item.itemCode}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-800">{item.label}</div>
                        <div className="text-xs text-slate-500">{item.itemCode}</div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={999}
                        value={quantity}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          onQuantityChange(item.itemCode, Number.isFinite(next) ? Math.max(0, next) : 0);
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
