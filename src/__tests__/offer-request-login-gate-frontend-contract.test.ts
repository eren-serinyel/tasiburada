import fs from 'node:fs';
import path from 'node:path';

describe('offer request login gate frontend contract', () => {
  const filePath = path.resolve(process.cwd(), 'shadcn-ui/src/components/OfferRequestForm.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  test('login gate helper keeps auth bypass and opens modal for unauthenticated users', () => {
    expect(source).toContain('const requireLoginForSelection = (message?: string) => {');
    expect(source).toContain('if (isAuthenticated || isLoggedIn) return true;');
    expect(source).toContain('if (!showLoginModal) {');
    expect(source).toContain('setShowLoginModal(true);');
  });

  test('critical step 2 selectors are protected by requireLoginForSelection', () => {
    const guardedPatterns = [
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('transportType', tc\.value\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('placeType', v\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('loadType', v\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('vehicleType', v\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('weightKg', e\.target\.value\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('floor', e\.target\.value\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('hasElevator', e\.target\.checked\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('insurance', v\);/,
      /if \(!requireLoginForSelection\(\)\) return;\s*handleChange\('timeWindow', v\);/,
      /onClick=\{\(\) => \{\s*if \(!requireLoginForSelection\(\)\) return;\s*setForm\(prev => \{/,
    ];

    for (const pattern of guardedPatterns) {
      expect(source).toMatch(pattern);
    }
  });
});
