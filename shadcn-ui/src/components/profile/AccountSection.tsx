import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import { setSessionUser } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { Camera, Save, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import type { SectionProps } from './types';
import { API_BASE, Section } from './helpers';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccountSection({ user, onUserUpdate }: SectionProps) {
  const { updateUser } = useAuth();
  const isCarrier = user.type === 'carrier';
  const [pictureUrl, setPictureUrl] = useState<string | null>(user.pictureUrl ?? null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: user.name || '', surname: user.surname || '', email: user.email || '', phone: user.phone || '' });
  const [customerProfile, setCustomerProfile] = useState({ city: '', district: '', addressLine1: '', addressLine2: '' });
  const [customerProfileInitial, setCustomerProfileInitial] = useState({ city: '', district: '', addressLine1: '', addressLine2: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch customer profile on mount
  useEffect(() => {
    if (isCarrier) return;
    (async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const res = await apiClient(`${API_BASE}/customers/profile`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success) throw new Error(json?.message || 'Profil bilgileri sunucudan alınamadı.');
        const data = json?.data || {};
        const updatedForm = { name: data.firstName ?? form.name, surname: data.lastName ?? form.surname, email: data.email ?? form.email, phone: data.phone ?? form.phone };
        const updatedAddr = { city: data.city ?? '', district: data.district ?? '', addressLine1: data.addressLine1 ?? '', addressLine2: data.addressLine2 ?? '' };
        setForm(updatedForm);
        setCustomerProfile(updatedAddr);
        setCustomerProfileInitial(updatedAddr);
        if (data.pictureUrl) setPictureUrl(data.pictureUrl);
      } catch (err: any) {
        const msg = err?.message || 'Profil bilgileri alınamadı.';
        setFetchError(msg);
        toast.error(msg);
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

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya çok büyük. Maksimum 5MB yükleyebilirsiniz.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Geçersiz dosya tipi. JPG, PNG veya WebP yükleyebilirsiniz.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append('picture', file);

      let newPictureUrl: string | null = null;

      if (isCarrier) {
        const res = await apiClient(`${API_BASE}/carriers/me/profile-picture`, { method: 'PUT', body: formData });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success) throw new Error(json?.message || 'Fotoğraf yüklenemedi.');
        newPictureUrl = json.pictureUrl ?? json.data?.pictureUrl ?? null;
      } else {
        const res = await apiClient(`${API_BASE}/customers/me/picture`, { method: 'POST', body: formData });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success) throw new Error(json?.message || 'Fotoğraf yüklenemedi.');
        newPictureUrl = json.data?.pictureUrl ?? json.pictureUrl ?? null;
      }

      if (newPictureUrl) {
        setPictureUrl(newPictureUrl);
        const updated = { ...user, pictureUrl: newPictureUrl };
        setSessionUser(updated);
        updateUser({ pictureUrl: newPictureUrl });
        onUserUpdate?.(updated);
      }
      toast.success('Profil fotoğrafı güncellendi.');
    } catch (err: any) {
      toast.error(err?.message || 'Fotoğraf yüklenemedi.');
    } finally {
      setIsUploadingPicture(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      const updated = { ...user, name: form.name, surname: form.surname, email: form.email, phone: form.phone, pictureUrl: pictureUrl ?? user.pictureUrl };
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
    <Section>
      <Card className="rounded-[32px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden bg-white/70 backdrop-blur-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black text-[#0F172A] tracking-tight">Hesap Bilgileri</CardTitle>
              <CardDescription className="text-slate-500 font-medium">
                {isCarrier ? 'Temel iletişim bilgilerinizi yönetin.' : 'Kişisel profil ve adres detaylarınızı güncelleyin.'}
              </CardDescription>
            </div>
            {dirty && !isSaving && (
              <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-none px-3 py-1 font-bold animate-pulse">
                Değişiklikler Kaydedilmedi
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-slate-50 border border-slate-100/50">
            <div className="relative group">
              <div className="w-24 h-24 rounded-[32px] bg-white shadow-md overflow-hidden border-4 border-white ring-1 ring-slate-200 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                {pictureUrl ? (
                  <img src={pictureUrl} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white">
                    <Camera className="w-8 h-8 opacity-80" />
                  </div>
                )}
                {isUploadingPicture && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-white shadow-lg rounded-2xl flex items-center justify-center text-blue-600 border border-slate-100 hover:bg-blue-600 hover:text-white transition-all active:scale-95"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center sm:text-left">
              <h4 className="font-bold text-[#0F172A] mb-1">Profil Fotoğrafı</h4>
              <p className="text-xs text-slate-500 mb-4 max-w-[200px]">En fazla 5MB boyutunda JPG, PNG veya WebP yükleyebilirsiniz.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-slate-200 font-bold text-xs h-9 px-4"
              >
                Fotoğrafı Değiştir
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePictureChange} />
          </div>

          {/* Form Content */}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 py-4">
                <div className="grid md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2"><div className="h-3 w-12 bg-slate-100 rounded" /><div className="h-12 w-full bg-slate-50 rounded-2xl animate-pulse" /></div>
                  ))}
                </div>
              </motion.div>
            ) : fetchError ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-3xl bg-red-50 border border-red-100 flex items-center gap-4 text-red-700">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <div>
                  <p className="font-bold">Veri bağlantısı kurulamadı</p>
                  <p className="text-xs opacity-80">{fetchError}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-6">
                <FormField label="Ad" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Adınız" />
                <FormField label="Soyad" value={form.surname} onChange={v => setForm(f => ({ ...f, surname: v }))} placeholder="Soyadınız" />
                <FormField label="E-posta" value={form.email} disabled />
                <FormField label="Telefon" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+90" />
                
                {!isCarrier && (
                  <>
                    <FormField label="Şehir" value={customerProfile.city} onChange={v => setCustomerProfile(f => ({ ...f, city: v }))} placeholder="Şehir seçin" />
                    <FormField label="İlçe" value={customerProfile.district} onChange={v => setCustomerProfile(f => ({ ...f, district: v }))} placeholder="İlçe seçin" />
                    <div className="md:col-span-2">
                       <FormField label="Adres Satırı 1" value={customerProfile.addressLine1} onChange={v => setCustomerProfile(f => ({ ...f, addressLine1: v }))} placeholder="Mahalle, Cadde, Sokak..." />
                    </div>
                    <div className="md:col-span-2">
                       <FormField label="Adres Satırı 2 (Opsiyonel)" value={customerProfile.addressLine2} onChange={v => setCustomerProfile(f => ({ ...f, addressLine2: v }))} placeholder="Daire, Kat, Kapı No..." />
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end pt-4 border-t border-slate-50">
            <Button 
              onClick={save} 
              disabled={!dirty || isSaving || isLoading} 
              className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
              {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}

function FormField({ label, value, onChange, placeholder, disabled }: { label: string, value: string, onChange?: (v: string) => void, placeholder?: string, disabled?: boolean }) {
  return (
    <div className="space-y-2 group">
      <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</Label>
      <Input 
        value={value} 
        onChange={e => onChange?.(e.target.value)} 
        placeholder={placeholder}
        disabled={disabled}
        className="h-12 px-4 rounded-2xl border-[#F1F5F9] bg-white focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all font-semibold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 shadow-sm"
      />
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return <div className={`inline-flex items-center rounded-full text-xs font-semibold ${className}`}>{children}</div>;
}
