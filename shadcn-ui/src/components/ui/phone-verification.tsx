import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, RefreshCw, Smartphone } from 'lucide-react';

interface PhoneVerificationProps {
  phoneNumber: string;
  onVerified: (verified: boolean) => void;
  onResend?: () => void;
}

export default function PhoneVerification({ phoneNumber, onVerified, onResend }: PhoneVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(120); // 2 dakika
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Tek karakter izin ver
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Otomatik sonraki input'a geç
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Otomatik önceki input'a geç (backspace)
    if (!value && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Lütfen 6 haneli kodu eksiksiz girin');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Demo için basit kontrol (gerçekte backend'den gelecek)
    if (otpCode === '123456' || otpCode === '000000') {
      setIsVerified(true);
      onVerified(true);
    } else {
      setError('Doğrulama kodu hatalı. Demo için: 123456 veya 000000');
    }

    setIsLoading(false);
  };

  const handleResend = async () => {
    setIsLoading(true);
    setCanResend(false);
    setTimeLeft(120);
    setError('');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    alert(`Yeni doğrulama kodu ${phoneNumber} numarasına gönderildi`);
    onResend?.();
    setIsLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isVerified) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-green-700">Telefon Doğrulandı!</h3>
          <p className="text-sm text-gray-600">Kayıt işlemine devam edebilirsiniz.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Smartphone className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold">Telefon Doğrulama</h3>
        <p className="text-sm text-gray-600">
          <span className="font-medium">{phoneNumber}</span> numarasına gönderilen 6 haneli kodu girin
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Doğrulama Kodu</Label>
          <div className="flex justify-center space-x-2 mt-2">
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-lg font-semibold border-2 focus:border-blue-500"
                disabled={isLoading}
              />
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleVerify}
          disabled={isLoading || otp.join('').length !== 6}
          className="w-full h-12"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Doğrulanıyor...
            </>
          ) : (
            'Doğrula'
          )}
        </Button>

        <div className="text-center text-sm">
          {canResend ? (
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={isLoading}
              className="text-blue-600 hover:text-blue-700"
            >
              Yeni kod gönder
            </Button>
          ) : (
            <span className="text-gray-500">
              Yeni kod gönderme: {formatTime(timeLeft)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}