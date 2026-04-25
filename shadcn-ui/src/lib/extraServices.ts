export type ExtraServiceLoadType = 'HOME' | 'OFFICE' | 'PARTIAL' | 'STORAGE';
export type TransportType = 'evden-eve' | 'ofis-tasima' | 'parca' | 'depolama' | '';

export interface ExtraServiceOption {
  id: string;
  name: string;
  description?: string | null;
  loadType: ExtraServiceLoadType;
  isDefaultVisible: boolean;
  isRecommendedByConverter: boolean;
  sortOrder: number;
}

const TRANSPORT_TO_LOAD_TYPE: Record<Exclude<TransportType, ''>, ExtraServiceLoadType> = {
  'evden-eve': 'HOME',
  'ofis-tasima': 'OFFICE',
  parca: 'PARTIAL',
  depolama: 'STORAGE',
};

export function getExtraServiceLoadType(transportType: TransportType): ExtraServiceLoadType | null {
  return transportType ? TRANSPORT_TO_LOAD_TYPE[transportType] : null;
}

export function reconcileSelectedExtraServiceIds(
  selectedIds: string[],
  validOptions: ExtraServiceOption[],
): { keptIds: string[]; removedIds: string[] } {
  const validIds = new Set(validOptions.map((option) => option.id));
  const keptIds: string[] = [];
  const removedIds: string[] = [];

  for (const id of selectedIds) {
    if (validIds.has(id)) {
      keptIds.push(id);
    } else {
      removedIds.push(id);
    }
  }

  return { keptIds, removedIds };
}

export function mergeSuggestedExtraServiceIds(
  selectedIds: string[],
  suggestedIds: string[] | undefined,
  validOptions: ExtraServiceOption[],
): string[] {
  const validIds = new Set(validOptions.map((option) => option.id));
  const merged = new Set(selectedIds);

  for (const id of suggestedIds ?? []) {
    if (validIds.has(id)) {
      merged.add(id);
    }
  }

  return Array.from(merged);
}

export function mapSelectedExtraServiceNames(
  selectedIds: string[],
  validOptions: ExtraServiceOption[],
): string[] {
  const optionMap = new Map(validOptions.map((option) => [option.id, option.name]));
  return selectedIds.map((id) => optionMap.get(id)).filter(Boolean) as string[];
}
