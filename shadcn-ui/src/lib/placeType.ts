import type { ConverterPropertyType } from '@/lib/converterApi';

export function mapPlaceTypeToConverterPropertyType(placeType: string): ConverterPropertyType {
  const p = (placeType || '').toLocaleLowerCase('tr-TR');

  if (p.includes('1+1')) return '1+1';
  if (p.includes('2+1')) return '2+1';
  if (p.includes('3+1')) return '3+1';
  if (
    p.includes('4+1')
    || p.includes('5+1')
    || p.includes('5+2')
    || p.includes('dubleks')
    || p.includes('müstakil')
  ) {
    return '4+1_plus';
  }

  return 'unknown';
}
