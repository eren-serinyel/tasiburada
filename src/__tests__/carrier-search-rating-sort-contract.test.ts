import fs from 'node:fs';
import path from 'node:path';

describe('carrier search rating sort contract', () => {
  const repositoryPath = path.resolve(process.cwd(), 'src/infrastructure/repositories/CarrierRepository.ts');

  test('default rating sort prioritizes carriers with real reviews', () => {
    const source = fs.readFileSync(repositoryPath, 'utf8');

    expect(source).toContain('reviewSummary.reviewCount');
    expect(source).toContain('CASE WHEN COALESCE(reviewSummary.reviewCount, 0) > 0');
    expect(source).toContain("'hasReviewsForSort'");
    expect(source).toContain("qb.orderBy('hasReviewsForSort', 'ASC')");
    expect(source).toContain("qb.addOrderBy('carrier.rating', 'DESC')");
  });
});
