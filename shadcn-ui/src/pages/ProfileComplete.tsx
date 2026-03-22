import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';
import { getSessionUser, setSessionUser } from '@/lib/storage';

export default function ProfileComplete() {
  const navigate = useNavigate();
  const API_BASE_URL = '/api/v1';
  const initialCompletion = (() => {
    const sessionUser = getSessionUser();
    if (sessionUser?.profileCompletion !== undefined) {
      return Number(sessionUser.profileCompletion) || 0;
    }
    const stored = localStorage.getItem('profileCompletion');
    return stored ? Number(stored) : 20;
  })();
  const [completion, setCompletion] = useState<number>(initialCompletion);

  const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!sessionUser || sessionUser.type !== 'carrier') return;
    let ignore = false;

    const fetchCompletion = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/carriers/${sessionUser.id}`, {
          headers: authHeaders()
        });
        const json = await res.json();
        if (!res.ok || !json?.success) return;
        const percent = Number(
          json.data?.carrier?.profileCompletion ??
          json.data?.status?.overallPercentage ??
          json.data?.carrier?.profileStatus?.overallPercentage
        );
        if (!ignore && Number.isFinite(percent)) {
          const clamped = Math.max(0, Math.min(100, Math.round(percent)));
          setCompletion(clamped);
          localStorage.setItem('profileCompletion', String(clamped));
          const updatedUser = { ...sessionUser, profileCompletion: clamped };
          setSessionUser(updatedUser);
        }
      } catch {}
    };

    fetchCompletion();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    // Sayfaya ilk gelişte bilgilendirici toast
    toast.success('Hesabınız oluşturuldu', {
      description: `Profiliniz %${completion} tamamlandı. Devam etmek için temel bilgileri doldurun.`,
    } as any);
  }, [completion]);

  return (
    <section className="min-h-[70vh] flex items-start justify-center px-6 py-16 bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <Card className="w-full max-w-2xl shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-2xl">Profilinizi Tamamlayın</CardTitle>
          <CardDescription>
            Hızlı kayıt tamamlandı. Şimdi profil bilgilerinizi ekleyerek müşterilere görünürlüğünüzü artırabilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span>Profil Tamamlanma</span>
              <span>%{completion}</span>
            </div>
            <Progress value={completion} />
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Şirket bilgileri ve evrakları eklendiğinde puanınız artar.</p>
            <p>• Araç ve hizmet bilgilerinizi doldurmak teklif alma şansınızı yükseltir.</p>
          </div>
          <div className="pt-2">
            <Button className="w-full h-12" onClick={() => navigate('/profilim')}>Profili Tamamlamaya Git</Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
