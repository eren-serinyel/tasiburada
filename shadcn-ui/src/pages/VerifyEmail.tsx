import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { MailCheck } from 'lucide-react';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const emailParam = searchParams.get('email') || '';
  const userTypeParam = (searchParams.get('userType') || 'customer') as 'customer' | 'carrier';

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput || tokenInput.length < 6) {
      toast.error('Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput, userType: userTypeParam }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast('E-posta doğrulandı', { description: 'Artık giriş yapabilirsiniz.' });
        navigate('/giris');
      } else {
        toast.error(json.message || 'Geçersiz veya süresi dolmuş kod.');
      }
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!emailParam) {
      toast.error('E-posta adresi bulunamadı. Lütfen tekrar kayıt olun.');
      return;
    }
    setResending(true);
    try {
      const res = await fetch(`/api/v1/auth/resend-verification?email=${encodeURIComponent(emailParam)}&userType=${userTypeParam}`);
      const json = await res.json();
      if (res.ok && json.success) {
        toast('Yeni kod oluşturuldu', {
          description: json.verificationToken
            ? `DEV — Kodunuz: ${json.verificationToken}`
            : 'E-posta adresinizi kontrol edin.',
        });
      } else {
        toast.error(json.message || 'Kod gönderilemedi.');
      }
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-2">
            <MailCheck className="h-7 w-7 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">E-posta Adresinizi Doğrulayın</CardTitle>
          <CardDescription>
            Kayıt olduğunuzda gösterilen 6 haneli kodu girin.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="verifyToken">Doğrulama Kodu</Label>
              <Input
                id="verifyToken"
                placeholder="6 haneli kod"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Doğrulanıyor...' : 'Doğrula'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                {resending ? 'Gönderiliyor...' : 'Kodu Tekrar Gönder'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/giris')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 hover:underline mx-auto"
            >
              Giriş sayfasına dön
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
