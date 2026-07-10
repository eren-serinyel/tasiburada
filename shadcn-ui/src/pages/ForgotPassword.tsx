import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState<'customer' | 'carrier'>('customer');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error('E-posta adresinizi girin.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), userType }),
      });
      const json = await response.json().catch(() => ({}));

      if (response.ok && json.success) {
        setSent(true);
        toast.success('Talep alindi');
      } else {
        toast.error(json.message || 'Sifre sifirlama talebi alinamadi.');
      }
    } catch {
      toast.error('Sunucuya baglanilamadi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <Card className="w-full max-w-md border-blue-100 shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-7 w-7 text-blue-700" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Sifremi Unuttum</CardTitle>
          <CardDescription>
            Hesabiniz kayitliyse sifre sifirlama baglantisini e-posta adresinize gonderecegiz.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                Bu e-posta kayitliysa bir sifre sifirlama baglantisi gonderildi. Gelen kutunuzu ve spam klasorunuzu kontrol edin.
              </div>
              <Button type="button" className="w-full" onClick={() => navigate('/giris')}>
                Giris Sayfasina Don
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-5">
              <div className="space-y-2">
                <Label>Hesap Turu</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={userType === 'customer' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setUserType('customer')}
                  >
                    Musteri
                  </Button>
                  <Button
                    type="button"
                    variant={userType === 'carrier' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setUserType('carrier')}
                  >
                    Nakliyeci
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Gonderiliyor...' : 'Sifirlama Baglantisi Gonder'}
              </Button>

              <button
                type="button"
                onClick={() => navigate('/giris')}
                className="mx-auto flex items-center gap-1 text-sm font-medium text-blue-700 transition-colors hover:text-blue-900 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Geri Don
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
