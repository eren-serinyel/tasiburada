import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, PencilLine, Trash2, Star, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { CITIES_TR, getDistrictsForCity } from '@/lib/locations';
import type { SectionProps } from './types';

interface CustomerAddress {
  id: number;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  isDefault: boolean;
}

type FormData = {
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  isDefault: boolean;
};

const EMPTY_FORM: FormData = {
  label: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  district: '',
  isDefault: false,
};

export default function AddressSection({ user: _user }: SectionProps) {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [districts, setDistricts] = useState<string[]>([]);
  const { toast } = useToast();

  const loadAddresses = async () => {
    try {
      const res = await apiClient('/api/v1/customers/me/addresses');
      const data = await res.json();
      if (res.ok && data.success) {
        setAddresses(data.data ?? []);
      }
    } catch {
      toast({ title: 'Hata', description: 'Adresler yÃ¼klenemedi.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAddresses(); }, []);

  useEffect(() => {
    if (form.city) {
      getDistrictsForCity(form.city).then(setDistricts);
    } else {
      setDistricts([]);
    }
  }, [form.city]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (a: CustomerAddress) => {
    setEditingId(a.id);
    setForm({
      label: a.label ?? '',
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2 ?? '',
      city: a.city,
      district: a.district,
      isDefault: a.isDefault,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.addressLine1.trim()) {
      toast({ title: 'Hata', description: 'Adres SatÄ±rÄ± 1 zorunludur.', variant: 'destructive' });
      return;
    }
    if (!form.city) {
      toast({ title: 'Hata', description: 'Åehir seÃ§imi zorunludur.', variant: 'destructive' });
      return;
    }
    if (!form.district) {
      toast({ title: 'Hata', description: 'Ä°lÃ§e seÃ§imi zorunludur.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const body = {
        label: form.label || null,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || null,
        city: form.city,
        district: form.district,
        isDefault: form.isDefault,
      };

      let res: Response;
      if (editingId !== null) {
        res = await apiClient(`/api/v1/customers/me/addresses/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await apiClient('/api/v1/customers/me/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: editingId ? 'Adres gÃ¼ncellendi.' : 'Adres eklendi.' });
        setModalOpen(false);
        await loadAddresses();
      } else {
        toast({ title: 'Hata', description: data.message || 'Ä°ÅŸlem baÅŸarÄ±sÄ±z.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'BaÄŸlantÄ± hatasÄ±', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiClient(`/api/v1/customers/me/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Adres silindi.' });
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      } else {
        toast({ title: 'Hata', description: 'Adres silinemedi.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'BaÄŸlantÄ± hatasÄ±', variant: 'destructive' });
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const res = await apiClient(`/api/v1/customers/me/addresses/${id}/default`, { method: 'PUT' });
      if (res.ok) {
        toast({ title: 'VarsayÄ±lan adres gÃ¼ncellendi.' });
        await loadAddresses();
      }
    } catch {
      toast({ title: 'BaÄŸlantÄ± hatasÄ±', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-lg font-semibold text-slate-800">Adreslerim</div>
          <div className="text-sm text-slate-500">KayÄ±tlÄ± teslimat adreslerinizi yÃ¶netin.</div>
        </div>
        <Button onClick={openNew} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
          <Plus className="h-4 w-4 mr-2" /> Yeni Adres Ekle
        </Button>
      </div>

      <div className="space-y-4 max-w-5xl">
        {loading && (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Adresler yÃ¼kleniyor...
            </CardContent>
          </Card>
        )}
        {!loading && addresses.length === 0 && (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center text-slate-500">HenÃ¼z adres eklemediniz.</CardContent>
          </Card>
        )}
        {addresses.map((a) => (
          <Card key={a.id} className="bg-white rounded-2xl shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-slate-800">{a.label || 'Adres'}</CardTitle>
                  {a.isDefault && <Badge className="bg-green-100 text-green-700 border-green-300">VarsayÄ±lan</Badge>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!a.isDefault && (
                    <Button size="sm" variant="outline" onClick={() => handleSetDefault(a.id)}>
                      <Star className="h-4 w-4 mr-1" /> VarsayÄ±lan Yap
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                    <PencilLine className="h-4 w-4 mr-1" /> DÃ¼zenle
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4 mr-1" /> Sil
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Adresi sil</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bu adresi kalÄ±cÄ± olarak silmek istediÄŸinizden emin misiniz?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Ä°ptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(a.id)}>Sil</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Adres:</span>{' '}
                <span className="text-slate-800">{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}</span>
              </div>
              <div>
                <span className="text-slate-500">Konum:</span>{' '}
                <span className="text-slate-800">{a.district}, {a.city}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Adresi DÃ¼zenle' : 'Yeni Adres Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-2">
            <div className="md:col-span-2">
              <Label>Adres Etiketi (opsiyonel)</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                className="mt-1"
                placeholder="Ev, Ofis, Depo..."
              />
            </div>
            <div className="md:col-span-2">
              <Label>Adres SatÄ±rÄ± 1 *</Label>
              <Input
                value={form.addressLine1}
                onChange={(e) => setForm((p) => ({ ...p, addressLine1: e.target.value }))}
                className="mt-1"
                placeholder="Mahalle / Sokak No"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Adres SatÄ±rÄ± 2 (opsiyonel)</Label>
              <Input
                value={form.addressLine2}
                onChange={(e) => setForm((p) => ({ ...p, addressLine2: e.target.value }))}
                className="mt-1"
                placeholder="Daire, kat, kapÄ±..."
              />
            </div>
            <div>
              <Label>Åehir *</Label>
              <Select
                value={form.city}
                onValueChange={(v) => setForm((p) => ({ ...p, city: v, district: '' }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Åehir seÃ§in" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {CITIES_TR.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ä°lÃ§e *</Label>
              <Select
                value={form.district}
                onValueChange={(v) => setForm((p) => ({ ...p, district: v }))}
                disabled={!form.city}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Ä°lÃ§e seÃ§in" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))}
              />
              <label htmlFor="isDefault" className="text-sm text-slate-700">VarsayÄ±lan adres olarak ayarla</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Ä°ptal</Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Kaydediliyor...</> : 'Kaydet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
