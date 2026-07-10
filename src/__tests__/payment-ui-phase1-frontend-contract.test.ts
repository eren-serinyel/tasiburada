import fs from 'fs';
import path from 'path';

const readFrontendFile = (relativePath: string) => fs.readFileSync(
  path.resolve(process.cwd(), 'shadcn-ui', 'src', relativePath),
  'utf8',
);

describe('Phase 1 payment UI contract', () => {
  test('payment page does not collect or submit payment credentials', () => {
    const source = readFrontendFile('pages/Payment.tsx');

    expect(source).toContain('Ödeme entegrasyonu yakında aktif olacak');
    expect(source).toContain('Taşıma detayına devam et');
    expect(source).not.toMatch(/<Input\b/);
    expect(source).not.toContain("apiClient('/api/v1/payments'");
    expect(source).not.toMatch(/\b(cardNumber|cardHolder|expiry|cvc|cvv)\b/i);
  });

  test('profile payment section has no card form and clears legacy browser data', () => {
    const source = readFrontendFile('components/profile/PaymentSection.tsx');

    expect(source).not.toMatch(/<Input\b/);
    expect(source).not.toContain('localStorage.setItem');
    expect(source).toContain('localStorage.removeItem');
    expect(source).toContain('Bu aşamada kart bilgisi kaydetmiyoruz.');
  });
});
