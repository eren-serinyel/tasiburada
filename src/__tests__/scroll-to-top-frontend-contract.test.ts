import fs from 'fs';
import path from 'path';

describe('ScrollToTop frontend contract', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'shadcn-ui/src/components/ScrollToTop.tsx'),
    'utf8',
  );

  test('route scroll reset is not retriggered by unrelated location state object changes', () => {
    expect(source).toContain('const scrollTarget = (state as any)?.scrollTo;');
    expect(source).toContain('const previousResetLocationRef = useRef');
    expect(source).toContain('if (isSameResetLocation) return;');
    expect(source).toContain('const hasScrollTarget = Boolean(scrollTarget);');
    expect(source).toContain('}, [pathname, scrollTarget]);');
    expect(source).not.toContain('}, [pathname, state]);');
  });
});
