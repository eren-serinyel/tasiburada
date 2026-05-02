const {
  normalizeContactFilterStats,
  buildContactFilterMetricCards,
  mapTopSurfaceLabels,
} = require('../../shadcn-ui/src/lib/contactFilterMetrics');

describe('admin contact filter metrics frontend contract', () => {
  test('metric cards stats response ile render edilecek veri modelini üretir', () => {
    const stats = normalizeContactFilterStats({
      todayBlockedCount: 11,
      highRiskCount: 7,
      repeatedViolatorCount: 2,
      unreviewedCount: 5,
      topSurfaces: [
        { surface: 'offer_message', count: 4 },
        { surface: 'shipment_note', count: 3 },
      ],
      actionDistribution: [{ action: 'blocked', count: 11 }],
      severityDistribution: [{ severity: 'high', count: 7 }],
      generatedAt: '2026-05-02T10:00:00.000Z',
      window: {
        dateFrom: '2026-04-25T00:00:00.000Z',
        dateTo: '2026-05-02T23:59:59.999Z',
      },
    });

    const cards = buildContactFilterMetricCards(stats);
    expect(cards).toEqual([
      { label: 'Bugun bloklanan', value: 11 },
      { label: 'Yuksek risk', value: 7 },
      { label: 'Tekrarlayan ihlalci', value: 2 },
      { label: 'Incelenmemis kayit', value: 5 },
    ]);
  });

  test('empty stats güvenli şekilde 0 değerleri üretmeli', () => {
    const stats = normalizeContactFilterStats(null);
    const cards = buildContactFilterMetricCards(stats);
    expect(cards.every((card: any) => card.value === 0)).toBe(true);
    expect(stats.topSurfaces).toEqual([]);
  });

  test('top surfaces label mapping sözleşmesi doğru çalışmalı', () => {
    const mapped = mapTopSurfaceLabels(
      [
        { surface: 'offer_message', count: 4 },
        { surface: 'review_comment', count: 2 },
      ],
      {
        offer_message: 'Teklif Mesajı',
        review_comment: 'Yorum',
      },
    );

    expect(mapped).toEqual([
      { surface: 'offer_message', label: 'Teklif Mesajı', count: 4 },
      { surface: 'review_comment', label: 'Yorum', count: 2 },
    ]);
  });

  test('frontend metric helper ham metin ve textHash alanı üretmemeli', () => {
    const stats = normalizeContactFilterStats({
      todayBlockedCount: 1,
      highRiskCount: 1,
      repeatedViolatorCount: 1,
      unreviewedCount: 1,
      topSurfaces: [],
      actionDistribution: [],
      severityDistribution: [],
    });

    const serialized = JSON.stringify(stats);
    expect(serialized.includes('rawText')).toBe(false);
    expect(serialized.includes('textHash')).toBe(false);
  });
});
