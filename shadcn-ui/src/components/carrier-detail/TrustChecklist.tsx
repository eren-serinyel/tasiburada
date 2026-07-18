import { useMemo } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CarrierDetail } from '@/lib/types';

interface TrustChecklistProps {
  data: CarrierDetail;
}

export default function TrustChecklist({ data }: TrustChecklistProps) {
  const checklist = useMemo(() => [
    {
      label: 'Şirket bilgileri',
      verified: Boolean(data.companyName),
      description: 'Firma adı kayıtlı',
    },
    {
      label: 'Faaliyet bölgesi',
      verified: Boolean(data.city),
      description: 'Faaliyet ili paylaşılmış',
    },
    {
      label: 'Hizmet bölgeleri',
      verified: data.serviceAreas.length > 0,
      description: 'Hizmet bölgeleri paylaşılmış',
    },
    {
      label: 'Araç özeti',
      verified: data.vehicles.length > 0,
      description: 'Araç özeti paylaşılmış',
    },
    {
      label: 'Yönetim onayı',
      verified: data.isVerified,
      description: 'Yönetim incelemesi tamamlandı',
    },
  ], [data]);

  return (
    <Card className="hidden lg:block">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Kontrol Edilen Bilgiler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checklist.map(item => (
          <div key={item.label} className="flex items-start gap-3">
            {item.verified ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
            )}

            <div className="min-w-0">
              <p className={cn(
                'text-sm font-medium',
                item.verified ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {item.label}
              </p>
              {item.verified && (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
