const LEGACY_MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ['â†’', '→'],
  ['â‡’', '→'],
  ['â‡', '→'],
  ['Ã‡', 'Ç'],
  ['Ã§', 'ç'],
  ['Ã–', 'Ö'],
  ['Ã¶', 'ö'],
  ['Ãœ', 'Ü'],
  ['Ã¼', 'ü'],
  ['Ä°', 'İ'],
  ['Ä±', 'ı'],
  ['Äž', 'Ğ'],
  ['ÄŸ', 'ğ'],
  ['Åž', 'Ş'],
  ['ÅŸ', 'ş'],
  ['Â·', '·'],
  ['Â³', '³'],
  ['â‚º', '₺'],
  ['â€œ', '"'],
  ['â€�', '"'],
  ['â€™', "'"],
  ['â€“', '-'],
  ['â€”', '-'],
];

export function repairLegacyMojibake(value?: string | null): string {
  let text = value ?? '';
  if (!/[ÃÂâÄÅ]/u.test(text)) return text;

  for (const [broken, fixed] of LEGACY_MOJIBAKE_REPLACEMENTS) {
    text = text.split(broken).join(fixed);
  }

  return text;
}
