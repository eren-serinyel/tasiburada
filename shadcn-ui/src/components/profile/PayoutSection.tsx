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
    try {
      const pay = localStorage.getItem(`carrier_payout_${user.id}`);
      if (pay) setPayout(JSON.parse(pay));
    } catch {}
  }, [user.id]);

  const isValidIban = (v: string) => /^TR\d{24}$/i.test((v || '').replace(/\s+/g, ''));

  const save = async () => {
    try {
      await apiClient(`${API_BASE}/carriers/profile/${user.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName: payout.bank || undefined, iban: payout.iban || undefined, accountHolder: payout.holder || undefined }),
      });
      try { localStorage.setItem(`carrier_payout_${user.id}`, JSON.stringify(payout)); } catch {}
      try { localStorage.removeItem(`fastRegPending_${user.id}`); localStorage.removeItem('profileCompletion'); } catch {}
      toast.success('Kazanç bilgileri kaydedildi.');
      await refreshProfileStatus?.();
    } catch {
      toast.error('Kazanç bilgileri kaydedilemedi.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
      <h2 className="text-base font-bold text-slate-800">Kazanç Bilgileri</h2>
      <p className="text-sm text-slate-500 mt-1">Kazançlarınızın aktarılacağı banka hesabı.</p>
      <div className="h-px bg-slate-100 mt-4 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><Label>Banka Adı</Label><Input className="mt-1" value={payout.bank} onChange={(e) => setPayout({ ...payout, bank: e.target.value })} /></div>
        <div>
          <Label>IBAN</Label>
          <Input className="mt-1" placeholder="TR________________________" value={payout.iban} onChange={(e) => setPayout({ ...payout, iban: e.target.value.toUpperCase() })} />
          {!isValidIban(payout.iban) && payout.iban && <div className="text-xs text-red-500 mt-1">Geçerli bir IBAN girin (TR ile başlayan 26 hane)</div>}
        </div>
        <div className="md:col-span-2"><Label>Hesap Sahibi Ünvanı</Label><Input className="mt-1" value={payout.holder} onChange={(e) => setPayout({ ...payout, holder: e.target.value })} /></div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button className="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg" onClick={save}><Save className="h-4 w-4 mr-2" />Taslağı Kaydet</Button>
      </div>
    </div>
  );
}
