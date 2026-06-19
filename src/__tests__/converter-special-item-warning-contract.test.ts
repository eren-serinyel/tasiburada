import fs from 'node:fs';
import path from 'node:path';

describe('converter special item warning contract', () => {
  const servicePath = path.resolve(process.cwd(), 'src/application/services/ConverterService.ts');

  test('special item vehicle upgrade warning names selected catalog items when possible', () => {
    const source = fs.readFileSync(servicePath, 'utf8');

    expect(source).toContain('requestedSpecialCodes');
    expect(source).toContain('specialLabels');
    expect(source).toContain('catalogMap.get(code)?.label');
    expect(source).toContain('gibi özel eşyalar için daha geniş araç önerildi');
    expect(source).toContain('Özel eşya seçildiği için daha geniş araç önerildi');
  });
});
