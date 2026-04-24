import { Input } from '@/components/ui/input';
import type { ConverterCatalogItem } from '@/lib/itemCatalog';

interface ItemSelectorProps {
  items: ConverterCatalogItem[];
  selectedItems: Record<string, number>;
  onQuantityChange: (itemCode: string, quantity: number) => void;
}

export default function ItemSelector({ items, selectedItems, onQuantityChange }: ItemSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-auto pr-1 md:grid-cols-2">
      {items.map((item) => {
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
  );
}
