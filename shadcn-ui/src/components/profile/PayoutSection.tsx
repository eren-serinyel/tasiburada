import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import { Save } from 'lucide-react';
import type { SectionProps } from './types';
import { API_BASE } from './helpers';

export default function PayoutSection({ user, refreshProfileStatus }: SectionProps) {
  const [payout, setPayout] = useState({ bank: '', iban: '', holder: '' });

  useEffect(() => {
    const fetchPayout = async () => {
      let hydratedFromBackend = false;

      try {
        const res = await apiClient(`${API_BASE}/carriers/me`);
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.success) {
          const earnings = json.data?.carrier?.earnings ?? json.data?.earnings;
          if (earnings) {
            setPayout({
              bank: earnings.bankName ?? '',
              iban: earnings.iban ?? '',
              holder: earnings.accountHolder ?? '',
            });
            hydratedFromBackend = true;
          }
        }
      } catch {}

      if (hydratedFromBackend) return;

      try {
        const pay = localStorage.getItem(`carrier_payout_${user.id}`);
        if (pay) setPayout(JSON.parse(pay));
      } catch {}
    };

    void fetchPayout();
  }, [user.id]);

  const isValidIban = (v: string) => /^TR\d{24}$/i.test((v || '').replace(/\s+/g, ''));

  const save = async () => {
    const bankName = payout.bank.trim();
    const accountHolder = payout.holder.trim();
    const iban = payout.iban.replace(/\s+/g, '').toUpperCase();

    if (!bankName) {
      toast.error('Banka adı zorunludur.');
      return;
    }
    if (!accountHolder) {
      toast.error('Hesap sahibi adı zorunludur.');
      return;
    }
    if (!isValidIban(iban)) {
      toast.error('IBAN TR ile başlamalı ve toplam 26 karakter olmalıdır.');
      return;
    }

    try {
      const response = await apiClient(`${API_BASE}/carriers/me/earnings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName, iban, accountHolder }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success || !json?.data?.id) {
        throw new Error(json?.message || 'Ödeme bilgileri kaydedilemedi.');
      }

      const savedPayout = { bank: bankName, iban, holder: accountHolder };
      setPayout(savedPayout);
      try { localStorage.setItem(`carrier_payout_${user.id}`, JSON.stringify(savedPayout)); } catch {}
      try { localStorage.removeItem(`fastRegPending_${user.id}`); localStorage.removeItem('profileCompletion'); } catch {}
      toast.success('Ödeme bilgileri kaydedildi.');
      await refreshProfileStatus?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ödeme bilgileri kaydedilemedi.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
      <h2 className="text-base font-bold text-slate-800">Ödeme Bilgileri</h2>
      <p className="text-sm text-slate-500 mt-1">Kazançlarınızın aktarılacağı banka hesabı.</p>
      <div className="h-px bg-slate-100 mt-4 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><Label>Banka Adı <span className="text-red-500">*</span></Label><Input className="mt-1" value={payout.bank} onChange={(e) => setPayout({ ...payout, bank: e.target.value })} /></div>
        <div>
          <Label>IBAN <span className="text-red-500">*</span></Label>
          <Input className="mt-1" placeholder="TR________________________" maxLength={32} value={payout.iban} onChange={(e) => setPayout({ ...payout, iban: e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, '') })} />
          {!isValidIban(payout.iban) && payout.iban && <div className="text-xs text-red-500 mt-1">IBAN TR ile başlamalı ve toplam 26 karakter olmalıdır.</div>}
        </div>
        <div className="md:col-span-2"><Label>Hesap Sahibi Adı / Ünvanı <span className="text-red-500">*</span></Label><Input className="mt-1" value={payout.holder} onChange={(e) => setPayout({ ...payout, holder: e.target.value })} /></div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button className="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg" onClick={save}><Save className="h-4 w-4 mr-2" />Taslağı Kaydet</Button>
      </div>
    </div>
  );
}
