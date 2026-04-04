import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { ArrowLeft, Mail, KeyRound } from 'lucide-react';

const validatePassword = (password: string): string => {
  if (!password) return 'Şifre gerekli';
  if (password.length < 8) return 'Şifre en az 8 karakter olmalı';
  if (password.length > 50) return 'Şifre en fazla 50 karakter olabilir';
  if (!/(?=.*[A-Z])/.test(password)) return 'Şifre en az bir büyük harf içermeli';
  if (!/(?=.*[0-9])/.test(password)) return 'Şifre en az bir rakam içermeli';
  return '';
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState<'customer' | 'carrier'>('customer');
  const [step, setStep] = useState<1 | 2>(1);
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 2
  const [tokenInput, setTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast('E-posta adresi gerekli.', { description: 'Lütfen e-posta adresinizi girin.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userType }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setResetToken(json.resetToken);
        setStep(2);
        toast('Kod gönderildi', { description: 'E-posta adresinizi kontrol edin.' });
      } else {
        toast.error(json.message || 'Bir hata oluştu.');
      }
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      toast.error(pwdError);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput, newPassword, userType }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast('Şifre sıfırlandı', { description: 'Yeni şifrenizle giriş yapabilirsiniz.' });
        navigate('/giris');
      } else {
        toast.error(json.message || 'Bir hata oluştu.');
      }
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-2">
            {step === 1 ? <Mail className="h-7 w-7 text-blue-600" /> : <KeyRound className="h-7 w-7 text-blue-600" />}
          </div>
          <CardTitle className="text-2xl font-bold">Şifremi Unuttum</CardTitle>
          <CardDescription>
            {step === 1
              ? 'E-posta adresinize sıfırlama kodu göndereceğiz.'
              : 'Sıfırlama kodunuzu ve yeni şifrenizi girin.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleRequestReset} className="space-y-5">
              {/* User type selection */}
              <div className="space-y-2">
                <Label>Hesap Türü</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={userType === 'customer' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setUserType('customer')}
                  >
                    Müşteri
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
                  placeholder="E-posta adresiniz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Gönderiliyor...' : 'Kod Gönder'}
              </Button>

              <button
                type="button"
                onClick={() => navigate('/giris')}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline mx-auto"
              >
                <ArrowLeft className="h-4 w-4" /> Geri Dön
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* Show the token for dev purposes */}
              {resetToken && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  <span className="font-semibold">DEV:</span> Sıfırlama kodunuz: <code className="font-mono font-bold">{resetToken}</code>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="token">Sıfırlama Kodu</Label>
                <Input
                  id="token"
                  placeholder="Sıfırlama kodu (6 hane)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Yeni Şifre</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Yeni şifreniz"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Yeni şifrenizi tekrar girin"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sıfırlanıyor...' : 'Şifremi Sıfırla'}
              </Button>

              <button
                type="button"
                onClick={() => navigate('/giris')}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline mx-auto"
              >
                <ArrowLeft className="h-4 w-4" /> Geri Dön
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
