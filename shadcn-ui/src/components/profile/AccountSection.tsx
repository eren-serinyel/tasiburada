import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import { setSessionUser } from '@/lib/storage';
import { Save } from 'lucide-react';
import type { SectionProps } from './types';
import { API_BASE } from './helpers';

export default function AccountSection({ user, onUserUpdate }: SectionProps) {
  const isCarrier = user.type === 'carrier';
  const [form, setForm] = useState({ name: user.name || '', surname: user.surname || '', email: user.email || '', phone: user.phone || '' });
  const [customerProfile, setCustomerProfile] = useState({ city: '', district: '', addressLine1: '', addressLine2: '' });
  const [customerProfileInitial, setCustomerProfileInitial] = useState({ city: '', district: '', addressLine1: '', addressLine2: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Fetch customer profile on mount
  useEffect(() => {
    if (isCarrier) return;
    (async () => {
      setIsLoading(true);
      try {
        const res = await apiClient(`${API_BASE}/customers/profile`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success) throw new Error(json?.message || 'Profil bilgileri alınamadı.');
        const data = json?.data || {};
        const updatedForm = { name: data.firstName ?? form.name, surname: data.lastName ?? form.surname, email: data.email ?? form.email, phone: data.phone ?? form.phone };
        const updatedAddr = { city: data.city ?? '', district: data.district ?? '', addressLine1: data.addressLine1 ?? '', addressLine2: data.addressLine2 ?? '' };
        setForm(updatedForm);
        setCustomerProfile(updatedAddr);
        setCustomerProfileInitial(updatedAddr);
      } catch (err: any) {
        toast.error(err?.message || 'Profil bilgileri alınamadı.');
      } finally {
        setIsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Dirty detection
  useEffect(() => {
    const baseDirty = form.name !== (user.name || '') || form.surname !== (user.surname || '') || form.email !== (user.email || '') || form.phone !== (user.phone || '');
    if (isCarrier) { setDirty(baseDirty); return; }
    const addrDirty = customerProfile.city !== customerProfileInitial.city || customerProfile.district !== customerProfileInitial.district || customerProfile.addressLine1 !== customerProfileInitial.addressLine1 || customerProfile.addressLine2 !== customerProfileInitial.addressLine2;
    setDirty(baseDirty || addrDirty);
  }, [form, user, customerProfile, customerProfileInitial, isCarrier]);

  const save = async () => {
    if (!dirty) { toast.info('Kaydedilecek değişiklik bulunamadı.'); return; }
    setIsSaving(true);
    try {
      const res = await apiClient(`${API_BASE}/customers/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.name, lastName: form.surname, phone: form.phone,
          city: customerProfile.city, district: customerProfile.district,
          addressLine1: customerProfile.addressLine1, addressLine2: customerProfile.addressLine2 || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Profil güncellenemedi.');
      const updated = { ...user, name: form.name, surname: form.surname, email: form.email, phone: form.phone };
      setSessionUser(updated);
      onUserUpdate?.(updated);
      setCustomerProfileInitial(customerProfile);
      setDirty(false);
      toast.success('Profil bilgileri güncellendi.');
    } catch (err: any) {
      toast.error(err?.message || 'Profil güncellenemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Hesap Bilgileri</CardTitle>
        <CardDescription>{isCarrier ? 'Temel iletişim bilgilerinizi güncelleyin.' : 'Profil ve adres bilgilerinizi güncelleyin.'}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && !isCarrier && <div className="mb-4 text-sm text-slate-500">Profil bilgileri yükleniyor...</div>}
        <div className="grid md:grid-cols-2 gap-6">
          <div><Label>Ad</Label><Input value={form.name} onChange={(e) => setForm(v => ({ ...v, name: e.target.value }))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="Adınız" /></div>
          <div><Label>Soyad</Label><Input value={form.surname} onChange={(e) => setForm(v => ({ ...v, surname: e.target.value }))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="Soyadınız" /></div>
          <div><Label>E-posta</Label><Input type="email" value={form.email} onChange={(e) => setForm(v => ({ ...v, email: e.target.value }))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="mail@ornek.com" /></div>
          <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm(v => ({ ...v, phone: e.target.value }))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="+905xx..." /></div>
          {!isCarrier && (
            <>
              <div><Label>Şehir</Label><Input value={customerProfile.city} onChange={(e) => setCustomerProfile(v => ({ ...v, city: e.target.value }))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="Şehir" /></div>
              <div><Label>İlçe</Label><Input value={customerProfile.district} onChange={(e) => setCustomerProfile(v => ({ ...v, district: e.target.value }))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="İlçe" /></div>
              <div className="md:col-span-2"><Label>Adres Satırı 1</Label><Input value={customerProfile.addressLine1} onChange={(e) => setCustomerProfile(v => ({ ...v, addressLine1: e.target.value }))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="Mahalle, Cadde/Sokak" /></div>
              <div className="md:col-span-2"><Label>Adres Satırı 2 (Opsiyonel)</Label><Input value={customerProfile.addressLine2} onChange={(e) => setCustomerProfile(v => ({ ...v, addressLine2: e.target.value }))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="Daire, kat, kapı no" /></div>
            </>
          )}
        </div>
        <div className="flex justify-end pt-6">
          <Button onClick={save} disabled={!dirty || isSaving} className="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60">
            <Save className="h-4 w-4 mr-2" /> {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
