import { useEffect } from 'react';
import { CreditCard, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { SectionProps } from './types';

export default function PaymentSection({ user }: SectionProps) {
  useEffect(() => {
    // Remove card data that older versions of this screen stored in the browser.
    localStorage.removeItem(`profile_cards_${user.id}`);
  }, [user.id]);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-lg font-semibold text-slate-800">Ödeme bilgileri</div>
        <div className="text-sm text-slate-500">Bu aşamada kart bilgisi kaydetmiyoruz.</div>
      </div>

      <Card className="rounded-2xl border-blue-200 bg-blue-50/60 shadow-none">
        <CardContent className="flex items-start gap-3 p-6">
          <div className="rounded-full bg-blue-100 p-2 text-blue-700">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Info className="h-4 w-4 text-blue-600" />
              Ödeme entegrasyonu yakında aktif olacak
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Şu an platform üzerinden anlaşma sağlanıyor. Kart numarası, son kullanma tarihi veya
              güvenlik kodu talep edilmez ve tarayıcıda saklanmaz.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
