import { containsContactInfo } from '../utils/security';

describe('containsContactInfo Utility', () => {
  test('should detect Turkish phone numbers', () => {
    expect(containsContactInfo('Bana 0532 123 45 67 numaradan ulaşın')).toBe(true);
    expect(containsContactInfo('Numaram 5321234567')).toBe(true);
    expect(containsContactInfo('+90 532 123 45 67')).toBe(true);
  });

  test('should detect generic phone numbers', () => {
    expect(containsContactInfo('Call me at 555-0199')).toBe(true);
    expect(containsContactInfo('My number: (555) 123-4567')).toBe(true);
  });

  test('should detect email addresses', () => {
    expect(containsContactInfo('test@example.com ile iletişime geçin')).toBe(true);
    expect(containsContactInfo('E-posta: user.name@domain.com.tr')).toBe(true);
  });

  test('should detect URLs/Links', () => {
    expect(containsContactInfo('Visit google.com')).toBe(true);
    expect(containsContactInfo('Check my site: https://mysite.com/profile')).toBe(true);
    expect(containsContactInfo('www.website.net')).toBe(true);
  });

  test('should return false for clean text', () => {
    expect(containsContactInfo('Evden eve nakliye hizmeti istiyorum.')).toBe(false);
    expect(containsContactInfo('3 oda 1 salon eşya taşınacak.')).toBe(false);
    expect(containsContactInfo('Asansörlü taşıma gereklidir.')).toBe(false);
  });
});
