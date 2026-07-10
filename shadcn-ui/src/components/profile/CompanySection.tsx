import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import { Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SectionProps } from './types';
import { API_BASE } from './helpers';

interface CompanySectionProps extends SectionProps {
  onCompanyNameChange?: (name: string) => void;
}

export default function CompanySection({ user, refreshProfileStatus, onCompanyNameChange }: CompanySectionProps) {
  const [company, setCompany] = useState({
    email: user.email || '', name: '', type: '', taxNumber: '', year: '',
  });

  // Load drafts + backend prefill
  useEffect(() => {
    // Restore localStorage draft
    try {
      const c = localStorage.getItem(`carrier_company_${user.id}`);
      if (c) {
        const parsed = JSON.parse(c);
        setCompany(prev => ({
          ...prev,
          email: parsed.email || prev.email,
          name: parsed.name || prev.name,
          type: parsed.type || prev.type,
          taxNumber: parsed.taxNumber || prev.taxNumber,
          year: parsed.year || prev.year,
        }));
        onCompanyNameChange?.(parsed.name || '');
      }
    } catch {}

    // Prefill from backend
    (async () => {
      try {
        const res = await apiClient(`${API_BASE}/carriers/me`);
        const json = await res.json();
        if (!res.ok || !json?.success || !json?.data) return;
        const carrierData = json.data?.carrier;
        if (!carrierData) return;
        setCompany(prev => {
          const next = {
            ...prev,
            email: carrierData.email || prev.email,
            name: carrierData.companyName || prev.name,
            taxNumber: carrierData.taxNumber || prev.taxNumber,
            year: carrierData.foundedYear ? String(carrierData.foundedYear) : prev.year,
          };
          onCompanyNameChange?.(next.name);
          try { localStorage.setItem(`carrier_company_${user.id}`, JSON.stringify(next)); } catch {}
          return next;
        });
      } catch {}
    })();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const persistDrafts = () => {
    try { localStorage.setItem(`carrier_company_${user.id}`, JSON.stringify(company)); } catch {}
    try { localStorage.removeItem(`fastRegPending_${user.id}`); localStorage.removeItem('profileCompletion'); } catch {}
  };

  const save = async () => {
    try {
      const response = await apiClient(`${API_BASE}/carriers/me/company-info`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: company.name || undefined, taxNumber: company.taxNumber || undefined,
          email: company.email || undefined, foundedYear: company.year ? Number(company.year) : undefined,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || 'Firma bilgileri kaydedilemedi.');
      }
      persistDrafts();
      onCompanyNameChange?.(company.name);
      toast.success('Firma bilgileri kaydedildi.');
      await refreshProfileStatus?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Firma bilgileri kaydedilemedi.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
      <h2 className="text-base font-bold text-slate-800">Firma Bilgileri</h2>
      <p className="text-sm text-slate-500 mt-1">Firma kartınızda gösterilecek temel bilgiler.</p>
      <div className="h-px bg-slate-100 mt-4 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><Label>E-posta (kayıtlı)</Label><Input className="mt-1" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} placeholder="ornek@firma.com" /></div>
        <div><Label>Firma Adı / Ünvanı</Label><Input className="mt-1" value={company.name} onChange={(e) => { setCompany({ ...company, name: e.target.value }); onCompanyNameChange?.(e.target.value); }} placeholder="Örn. ABC Lojistik A.Ş." /></div>
        <div>
          <Label>Şirket Türü</Label>
          <Select value={company.type} onValueChange={(v) => setCompany({ ...company, type: v })}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
            <SelectContent>{['Şahıs', 'Limited', 'A.Ş.', 'Kooperatif'].map(x => (<SelectItem key={x} value={x}>{x}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div><Label>Vergi Numarası</Label><Input className="mt-1" inputMode="numeric" maxLength={10} value={company.taxNumber} onChange={(e) => setCompany({ ...company, taxNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10 haneli" /></div>
        <div>
          <Label>Kuruluş Yılı</Label>
          <Select value={company.year} onValueChange={(v) => setCompany({ ...company, year: v })}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Yıl seçiniz" /></SelectTrigger>
            <SelectContent>{Array.from({ length: new Date().getFullYear() - 1990 + 1 }, (_, i) => 1990 + i).reverse().map(y => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={save} className="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Save className="h-4 w-4 mr-2" />Taslağı Kaydet</Button>
      </div>
    </div>
  );
}
