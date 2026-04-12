/**
 * Platform güvenlik ve anti-bypass yardımcı fonksiyonları.
 */

/**
 * Metin içerisinde telefon numarası, e-posta veya web sitesi gibi iletişim
 * bilgilerini tespit etmek için regex örüntülerini kontrol eder.
 * @param text Kontrol edilecek metin
 * @returns İletişim bilgisi varsa true, yoksa false
 */
export function containsContactInfo(text: string): boolean {
  if (!text) return false;

  // Telefon numarası tespiti (TR ve uluslararası formatlar)
  const phonePattern = /(?:\+?90|0)?\s?[1-9]\d{2}\s?\d{3}\s?\d{2}\s?\d{2}/;
  const genericPhonePattern = /(\+?\d{1,4}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{3}[-.\s]\d{4}/;
  
  // E-posta tespiti
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  
  // Web sitesi/Link tespiti (Temel)
  const urlPattern = /(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?/;

  return (
    phonePattern.test(text) || 
    genericPhonePattern.test(text) || 
    emailPattern.test(text) ||
    urlPattern.test(text)
  );
}
