import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { validatePassword } from '@/utils/validatePassword';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const initialUserType = searchParams.get('userType') === 'carrier' ? 'carrier' : 'customer';
  const [userType, setUserType] = useState<'customer' | 'carrier'>(initialUserType);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const tokenMissing = useMemo(() => !token.trim(), [token]);

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (tokenMissing) {
      setError('Sifirlama baglantisi eksik veya gecersiz. Lutfen yeni bir baglanti isteyin.');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Sifreler eslesmiyor.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, userType }),
      });
      const json = await response.json().catch(() => ({}));

      if (response.ok && json.success) {
        setSuccess(true);
        toast.success('Sifreniz guncellendi');
        setTimeout(() => navigate('/giris'), 1200);
      } else {
        setError(json.message || 'Sifirlama baglantisi gecersiz veya suresi dolmus.');
      }
    } catch {
      setError('Sunucuya baglanilamadi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <Card className="w-full max-w-md border-blue-100 shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <KeyRound className="h-7 w-7 text-blue-700" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Yeni Sifre Belirle</CardTitle>
          <CardDescription>Yeni sifrenizi belirleyin ve giris sayfasindan devam edin.</CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                Sifreniz basariyla guncellendi. Giris sayfasina yonlendiriliyorsunuz.
              </div>
              <Button type="button" className="w-full" onClick={() => navigate('/giris')}>
                Giris Sayfasina Git
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {tokenMissing && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  Sifirlama baglantisi eksik. Lutfen yeniden sifre sifirlama talebi olusturun.
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  {error}
                </div>
              )}

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
                <Label htmlFor="newPassword">Yeni Sifre</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Yeni sifreniz"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Sifre Tekrar</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Yeni sifrenizi tekrar girin"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || tokenMissing}>
                {loading ? 'Guncelleniyor...' : 'Sifremi Guncelle'}
              </Button>

              <button
                type="button"
                onClick={() => navigate('/sifremi-unuttum')}
                className="mx-auto flex items-center gap-1 text-sm font-medium text-blue-700 transition-colors hover:text-blue-900 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Yeni Baglanti Iste
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
