import fs from 'node:fs';
import path from 'node:path';

describe('carrier card verification frontend contract', () => {
  const frontendFiles = [
    path.resolve(process.cwd(), 'shadcn-ui/src/components/carriers/CarrierCard.tsx'),
    path.resolve(process.cwd(), 'shadcn-ui/src/pages/CarrierList.tsx'),
  ];

  test('approval badge uses backend isVerified, not profile completion', () => {
    for (const filePath of frontendFiles) {
      const source = fs.readFileSync(filePath, 'utf8');

      expect(source).toContain('carrier.isVerified === true');
      expect(source).not.toMatch(/profileCompletion[^;\n]*>\s*70/);
      expect(source).not.toMatch(/isVerified\s*=\s*\(?carrier\.profileCompletion/);
    }
  });

  test('unreviewed carriers show new-company badge instead of fake rating', () => {
    for (const filePath of frontendFiles) {
      const source = fs.readFileSync(filePath, 'utf8');

      expect(source).toContain('reviewCount > 0');
      expect(source).toContain('Yeni firma');
    }
  });
});
