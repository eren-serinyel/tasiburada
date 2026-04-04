import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Circle } from 'lucide-react';
import { getSessionUser } from '@/lib/storage';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

type ProfileSections = {
  companyInfoCompleted: boolean;
  activityInfoCompleted: boolean;
  documentsCompleted: boolean;
  earningsCompleted: boolean;
};

const SECTION_LIST: { key: keyof ProfileSections; label: string }[] = [
  { key: 'companyInfoCompleted', label: 'Firma Bilgileri' },
  { key: 'activityInfoCompleted', label: 'Faaliyet Bilgileri' },
  { key: 'documentsCompleted', label: 'Belgeler' },
  { key: 'earningsCompleted', label: 'Ã–deme Bilgileri' },
];

export default function ProfileComplete() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion] = useState(0);
  const [sections, setSections] = useState<ProfileSections>({
    companyInfoCompleted: false,
    activityInfoCompleted: false,
    documentsCompleted: false,
    earningsCompleted: false,
  });

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!sessionUser || sessionUser.type !== 'carrier') {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await apiClient('/api/v1/carriers/me/profile-status');
        const json = await res.json();
        if (res.ok && json?.success && json.data) {
          const pct = Math.max(0, Math.min(100, Math.round(Number(json.data.overallPercentage) || 0)));
          setCompletion(pct);
          if (json.data.sections) setSections(json.data.sections);
        } else {
          toast({ title: 'Hata', description: 'Profil durumu yÃ¼klenemedi.', variant: 'destructive' });
        }
      } catch {
        toast({ title: 'Hata', description: 'Sunucuya baÄŸlanÄ±lamadÄ±.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoProfile = () => {
    if (!sections.companyInfoCompleted) navigate('/profilim?tab=firma');
    else if (!sections.activityInfoCompleted) navigate('/profilim?tab=faaliyet');
    else if (!sections.documentsCompleted) navigate('/profilim?tab=belgeler');
    else if (!sections.earningsCompleted) navigate('/profilim?tab=odeme');
    else navigate('/nakliyeci/panel');
  };

  if (loading) {
    return (
      <section className="min-h-[70vh] flex items-start justify-center px-6 py-16 bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <Card className="w-full max-w-2xl shadow-xl border-0">
          <CardHeader>
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-80 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-3 w-full" />
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
            <Skeleton className="h-12 w-full rounded-lg mt-4" />
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="min-h-[70vh] flex items-start justify-center px-6 py-16 bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <Card className="w-full max-w-2xl shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-2xl">
            {completion === 100 ? 'Profiliniz TamamlandÄ± ğŸ‰' : 'Profilinizi TamamlayÄ±n'}
          </CardTitle>
          <CardDescription>
            {completion === 100
              ? 'TÃ¼m bÃ¶lÃ¼mleri tamamladÄ±nÄ±z. ArtÄ±k mÃ¼ÅŸterilerden teklif alabilirsiniz.'
              : 'Eksik bÃ¶lÃ¼mleri tamamlayarak mÃ¼ÅŸterilere gÃ¶rÃ¼nÃ¼rlÃ¼ÄŸÃ¼nÃ¼zÃ¼ artÄ±rabilirsiniz.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-muted-foreground">Profil Tamamlanma</span>
              <span className="font-semibold">%{completion}</span>
            </div>
            <Progress value={completion} className="h-2" />
          </div>

          <div className="space-y-2">
            {SECTION_LIST.map(s => (
              <div
                key={s.key}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  sections[s.key] ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                {sections[s.key] ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                )}
                <span className={`text-sm font-medium ${sections[s.key] ? 'text-green-800' : 'text-gray-600'}`}>
                  {s.label}
                </span>
                {sections[s.key] && (
                  <span className="ml-auto text-xs text-green-600 font-medium">TamamlandÄ±</span>
                )}
              </div>
            ))}
          </div>

          <Button className="w-full h-12" onClick={handleGoProfile}>
            {completion === 100 ? 'Panele Git' : 'Profili Tamamlamaya Git'}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
