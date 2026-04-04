import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CreditCard, Building2, Lock, Loader2, HelpCircle, CheckCircle2, User } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';

interface PaymentShipment {
  id: string;
  origin: string;
  destination: string;
  shipmentDate: string;
  status: string;
  price?: number | null;
  carrier?: {
    id: string;
    companyName?: string | null;
  } | null;
}

type PaymentMethod = 'card' | 'transfer';

/* ── helpers ── */
function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '/' + digits.slice(2);
}

function detectCardBrand(num: string): string | null {
  const d = num.replace(/\D/g, '');
  if (d.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'Amex';
  return null;
}

function formatPrice(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0 });
}

/* ── bank transfer info ── */
const BANK_INFO = {
  bankName: 'Ziraat Bankası',
  iban: 'TR00 0001 0000 0000 0000 0000 00',
  accountName: 'Taşıburada Teknoloji A.Ş.',
};

export default function Payment() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<PaymentShipment | null>(null);
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoice, setInvoice] = useState({ fullName: '', address: '', taxNo: '' });
  const [showCvvTip, setShowCvvTip] = useState(false);

  useEffect(() => {
    const fetchShipment = async () => {
      if (!shipmentId) {
        setShipment(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await apiClient(`/api/v1/shipments/${shipmentId}`);
        const json = await res.json();

        if (res.ok && json?.success && json.data) {
          setShipment(json.data);
        } else {
          setShipment(null);
        }
      } catch {
        setShipment(null);
      } finally {
        setLoading(false);
      }
    };

    fetchShipment();
  }, [shipmentId]);

  const total = shipment?.price ?? 0;
  const serviceFee = useMemo(() => Math.round(total * 0.9), [total]);
  const insurance = useMemo(() => total - serviceFee, [total, serviceFee]);
  const cardBrand = detectCardBrand(card.number);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!shipment) return;

    if (method === 'card') {
      if (!card.number.trim() || !card.name.trim() || !card.expiry.trim() || !card.cvc.trim()) {
        toast.error('Kart bilgilerini eksiksiz girin.');
        return;
      }
    }

    setPaying(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      toast.success('Ödeme başarıyla alındı.');
      navigate('/ilanlarim');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="py-10 text-center text-gray-600">
            Ödeme bilgisi bulunamadı.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ödeme</h1>
        <p className="flex items-center gap-1.5 text-[13px] text-gray-500 mt-1">
          <Lock className="h-3.5 w-3.5" /> Güvenli SSL ödeme
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[6fr,4fr] gap-8 items-start">
        {/* ════ SOL: ÖDEME FORMU ════ */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* BÖLÜM 1: Ödeme Yöntemi */}
          <div>
            <h2 className="text-[15px] font-semibold text-gray-800 mb-3">Ödeme Yöntemi</h2>
            <div className="grid grid-cols-2 gap-3">
              <MethodCard
                active={method === 'card'}
                onClick={() => setMethod('card')}
                icon={<CreditCard className="h-5 w-5" />}
                label="Kredi / Banka Kartı"
                badges={['Visa', 'MC']}
              />
              <MethodCard
                active={method === 'transfer'}
                onClick={() => setMethod('transfer')}
                icon={<Building2 className="h-5 w-5" />}
                label="Havale / EFT"
              />
            </div>
          </div>

          {/* BÖLÜM 2: Kart Bilgileri veya Havale */}
          {method === 'card' ? (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-[14px] font-semibold text-gray-800">
                <CreditCard className="h-4 w-4 text-blue-600" /> Kart Bilgileri
              </h3>

              {/* Card number */}
              <div>
                <Label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Kart Numarası</Label>
                <div className="relative">
                  <Input
                    value={card.number}
                    onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    className="h-11 border-gray-200 pr-20 focus:border-blue-600 focus:ring-blue-600/20"
                  />
                  {cardBrand && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {cardBrand}
                    </span>
                  )}
                </div>
              </div>

              {/* Expiry + CVV */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Son Kullanma</Label>
                  <Input
                    value={card.expiry}
                    onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                    placeholder="AA/YY"
                    maxLength={5}
                    className="h-11 border-gray-200 focus:border-blue-600 focus:ring-blue-600/20"
                  />
                </div>
                <div>
                  <Label className="text-[13px] font-medium text-gray-700 mb-1.5 block">CVV</Label>
                  <div className="relative">
                    <Input
                      type="password"
                      value={card.cvc}
                      onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                      placeholder="•••"
                      maxLength={3}
                      className="h-11 pr-9 border-gray-200 focus:border-blue-600 focus:ring-blue-600/20"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onMouseEnter={() => setShowCvvTip(true)}
                      onMouseLeave={() => setShowCvvTip(false)}
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                    {showCvvTip && (
                      <div className="absolute right-0 top-full mt-1 z-10 bg-gray-800 text-white text-xs rounded-md px-3 py-2 whitespace-nowrap shadow-lg">
                        Kartınızın arkasındaki 3 haneli kod
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card holder name */}
              <div>
                <Label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Kart Üzerindeki İsim</Label>
                <Input
                  value={card.name}
                  onChange={(e) => setCard({ ...card, name: e.target.value })}
                  placeholder="Ad Soyad"
                  className="h-11 border-gray-200 focus:border-blue-600 focus:ring-blue-600/20"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-[14px] font-semibold text-gray-800">
                <Building2 className="h-4 w-4 text-blue-600" /> Havale / EFT Bilgileri
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Banka</span>
                  <span className="font-medium text-gray-900">{BANK_INFO.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IBAN</span>
                  <span className="font-medium text-gray-900 font-mono text-xs">{BANK_INFO.iban}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hesap Adı</span>
                  <span className="font-medium text-gray-900">{BANK_INFO.accountName}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-3">
                <span className="text-amber-600 mt-0.5 text-sm">⚠</span>
                <p className="text-[13px] text-amber-700">
                  Açıklama kısmına sipariş numaranızı (<span className="font-semibold">#{shipment.id.slice(0, 8)}</span>) belirtiniz.
                </p>
              </div>
            </div>
          )}

          {/* BÖLÜM 3: Fatura Bilgileri */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-gray-800">Fatura Bilgisi Ekle</span>
              <Switch checked={showInvoice} onCheckedChange={setShowInvoice} />
            </div>
            {showInvoice && (
              <div className="space-y-3 pt-1">
                <div>
                  <Label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Ad Soyad</Label>
                  <Input
                    value={invoice.fullName}
                    onChange={(e) => setInvoice({ ...invoice, fullName: e.target.value })}
                    placeholder="Fatura ad soyad"
                    className="h-11 border-gray-200 focus:border-blue-600 focus:ring-blue-600/20"
                  />
                </div>
                <div>
                  <Label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Adres</Label>
                  <Input
                    value={invoice.address}
                    onChange={(e) => setInvoice({ ...invoice, address: e.target.value })}
                    placeholder="Fatura adresi"
                    className="h-11 border-gray-200 focus:border-blue-600 focus:ring-blue-600/20"
                  />
                </div>
                <div>
                  <Label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Vergi No</Label>
                  <Input
                    value={invoice.taxNo}
                    onChange={(e) => setInvoice({ ...invoice, taxNo: e.target.value })}
                    placeholder="Vergi numarası (opsiyonel)"
                    className="h-11 border-gray-200 focus:border-blue-600 focus:ring-blue-600/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Güvenlik notu */}
          <div className="flex items-center gap-2.5 bg-emerald-50 rounded-lg px-4 py-3">
            <Lock className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span className="text-[13px] text-emerald-700">256-bit SSL şifreleme ile korunmaktadır</span>
          </div>

          {/* Ödeme Yap butonu */}
          <Button
            type="submit"
            disabled={paying || total <= 0}
            className="w-full h-[50px] bg-blue-600 hover:bg-blue-700 text-[16px] font-bold rounded-lg transition-colors"
          >
            {paying ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> İşleniyor...
              </span>
            ) : (
              `₺${formatPrice(total)} Öde`
            )}
          </Button>
        </form>

        {/* ════ SAĞ: SİPARİŞ ÖZETİ ════ */}
        <div className="lg:sticky lg:top-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-5 space-y-5">
              <h2 className="text-[15px] font-semibold text-gray-900">Sipariş Özeti</h2>

              {/* İlan bilgisi */}
              <div className="bg-gray-50 rounded-lg p-3.5 space-y-2.5">
                <p className="font-semibold text-gray-900">
                  {shipment.origin} → {shipment.destination}
                </p>
                <p className="text-[13px] text-gray-500">
                  {new Date(shipment.shipmentDate).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                {shipment.carrier?.companyName && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-700">{shipment.carrier.companyName}</span>
                  </div>
                )}
              </div>

              {/* Fiyat detayı */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Hizmet bedeli</span>
                  <span className="text-gray-700">₺{formatPrice(serviceFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sigorta</span>
                  <span className="text-gray-700">₺{formatPrice(insurance)}</span>
                </div>
                <div className="border-t border-gray-100 pt-2.5 flex justify-between">
                  <span className="text-[17px] font-bold text-gray-900">Toplam</span>
                  <span className="text-[17px] font-bold text-gray-900">₺{formatPrice(total)}</span>
                </div>
              </div>

              {/* Güven rozetleri */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">Para iadesi garantisi</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">7/24 destek</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function MethodCard({
  active,
  onClick,
  icon,
  label,
  badges,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badges?: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors cursor-pointer ${
        active
          ? 'border-blue-600 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {/* Radio circle */}
      <span
        className={`flex-shrink-0 h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center ${
          active ? 'border-blue-600' : 'border-gray-300'
        }`}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
      </span>
      <span className={`flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-500'}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-800 block">{label}</span>
        {badges && (
          <span className="flex gap-1.5 mt-1">
            {badges.map((b) => (
              <span key={b} className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {b}
              </span>
            ))}
          </span>
        )}
      </div>
    </button>
  );
}
