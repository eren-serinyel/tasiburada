export type ContactFilterSurfaceCount = {
  surface: string;
  count: number;
};

export type ContactFilterStats = {
  todayBlockedCount: number;
  highRiskCount: number;
  repeatedViolatorCount: number;
  unreviewedCount: number;
  topSurfaces: ContactFilterSurfaceCount[];
  actionDistribution: Array<{ action: string; count: number }>;
  severityDistribution: Array<{ severity: string; count: number }>;
  generatedAt: string;
  window: { dateFrom: string; dateTo: string };
};

export function normalizeContactFilterStats(raw?: Partial<ContactFilterStats> | null): ContactFilterStats {
  return {
    todayBlockedCount: Number(raw?.todayBlockedCount ?? 0),
    highRiskCount: Number(raw?.highRiskCount ?? 0),
    repeatedViolatorCount: Number(raw?.repeatedViolatorCount ?? 0),
    unreviewedCount: Number(raw?.unreviewedCount ?? 0),
    topSurfaces: Array.isArray(raw?.topSurfaces)
      ? raw!.topSurfaces.map((item) => ({
          surface: String(item.surface),
          count: Number(item.count ?? 0),
        }))
      : [],
    actionDistribution: Array.isArray(raw?.actionDistribution)
      ? raw!.actionDistribution.map((item) => ({
          action: String(item.action),
          count: Number(item.count ?? 0),
        }))
      : [],
    severityDistribution: Array.isArray(raw?.severityDistribution)
      ? raw!.severityDistribution.map((item) => ({
          severity: String(item.severity),
          count: Number(item.count ?? 0),
        }))
      : [],
    generatedAt: String(raw?.generatedAt ?? ''),
    window: {
      dateFrom: String(raw?.window?.dateFrom ?? ''),
      dateTo: String(raw?.window?.dateTo ?? ''),
    },
  };
}

export function buildContactFilterMetricCards(stats: ContactFilterStats): Array<{ label: string; value: number }> {
  return [
    { label: 'Bugun bloklanan', value: stats.todayBlockedCount },
    { label: 'Yuksek risk', value: stats.highRiskCount },
    { label: 'Tekrarlayan ihlalci', value: stats.repeatedViolatorCount },
    { label: 'Incelenmemis kayit', value: stats.unreviewedCount },
  ];
}

export function mapTopSurfaceLabels(
  topSurfaces: ContactFilterSurfaceCount[],
  labels: Record<string, string>,
): Array<{ surface: string; label: string; count: number }> {
  return topSurfaces.map((item) => ({
    surface: item.surface,
    label: labels[item.surface] ?? item.surface,
    count: item.count,
  }));
}
