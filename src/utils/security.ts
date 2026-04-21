/**
 * Platform security and anti-bypass helpers.
 *
 * Phase 1-B policy is strict: public listing, offer and in-platform message
 * surfaces must not carry direct contact information.
 */

export type ContactRule =
  | 'phone'
  | 'email'
  | 'url'
  | 'direct_contact_keyword'
  | 'messaging_app_keyword'
  | 'turkish_digit_words';

export interface ContactInfoAnalysis {
  hasContactInfo: boolean;
  rules: ContactRule[];
  normalizedText: string;
}

const TURKISH_DIGIT_WORDS: Record<string, string> = {
  sifir: '0',
  sıfır: '0',
  bir: '1',
  iki: '2',
  uc: '3',
  üç: '3',
  dort: '4',
  dört: '4',
  bes: '5',
  beş: '5',
  alti: '6',
  altı: '6',
  yedi: '7',
  sekiz: '8',
  dokuz: '9',
};

function normalizeContactText(text: string): string {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase('tr-TR')
    .replace(/[０-９]/g, char => String(char.charCodeAt(0) - 0xff10))
    .replace(/[^\S\r\n]+/g, ' ')
    .trim();
}

function replaceTurkishDigitWords(text: string): string {
  return text.replace(/\b(sifir|sıfır|bir|iki|uc|üç|dort|dört|bes|beş|alti|altı|yedi|sekiz|dokuz)\b/giu, match => {
    const normalized = match.toLocaleLowerCase('tr-TR');
    return TURKISH_DIGIT_WORDS[normalized] ?? match;
  });
}

function pushRule(rules: ContactRule[], rule: ContactRule): void {
  if (!rules.includes(rule)) {
    rules.push(rule);
  }
}

export function analyzeContactInfo(text: string): ContactInfoAnalysis {
  const normalizedText = normalizeContactText(text || '');
  const digitWordNormalized = replaceTurkishDigitWords(normalizedText);
  const compact = digitWordNormalized.replace(/[^\d+@a-zçğıöşü.]/giu, '');
  const rules: ContactRule[] = [];

  const turkishPhonePattern = /(?:\+?90|0)?[\s().-]*5\d{2}[\s().-]*\d{3}[\s().-]*\d{2}[\s().-]*\d{2}/u;
  const compactTurkishPhonePattern = /(?:\+?90|0)?5\d{9}/u;
  const genericPhonePattern = /(?:\+?\d{1,4}[\s().-]*)?(?:\d[\s().-]*){10,14}/u;
  const shortPhonePattern = /\b\d{3}[-.\s]\d{4}\b/u;
  const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/iu;
  const urlPattern = /\b(?:https?:\/\/|www\.|wa\.me\/|t\.me\/|[a-z0-9-]+\.(?:com|net|org|com\.tr|info|co|io)(?:\/\S*)?)/iu;
  const messagingKeywordPattern = /\b(whatsapp|watsapp|wp|wa\.me|telegram|telgraf)\b/iu;
  const directContactKeywordPattern = /\b(direkt|doğrudan|disarida|dışarıda|disardan|dışardan|elden|arayin|arayın|numara|telefon)\b/iu;

  if (
    turkishPhonePattern.test(normalizedText) ||
    genericPhonePattern.test(normalizedText) ||
    shortPhonePattern.test(normalizedText) ||
    compactTurkishPhonePattern.test(compact)
  ) {
    pushRule(rules, 'phone');
  }

  if (emailPattern.test(normalizedText)) pushRule(rules, 'email');
  if (urlPattern.test(normalizedText)) pushRule(rules, 'url');
  if (messagingKeywordPattern.test(normalizedText)) pushRule(rules, 'messaging_app_keyword');
  if (directContactKeywordPattern.test(normalizedText)) pushRule(rules, 'direct_contact_keyword');

  const digitWordDigits = digitWordNormalized.replace(/\D/g, '');
  const originalDigits = normalizedText.replace(/\D/g, '');
  if (digitWordDigits.length >= 10 && digitWordDigits.length > originalDigits.length) {
    pushRule(rules, 'turkish_digit_words');
    pushRule(rules, 'phone');
  }

  return {
    hasContactInfo: rules.length > 0,
    rules,
    normalizedText,
  };
}

export function containsContactInfo(text: string): boolean {
  return analyzeContactInfo(text).hasContactInfo;
}
