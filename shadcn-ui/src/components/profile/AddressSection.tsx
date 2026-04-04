import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { Plus, PencilLine, Trash2, Save } from 'lucide-react';
import type { SectionProps, Address } from './types';

export default function AddressSection({ user }: SectionProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);

  const openNew = () => { setEditing({ id: crypto.randomUUID(), title: '', line1: '', line2: '', district: '', city: '', postalCode: '', notes: '' }); setModalOpen(true); };
  const edit = (a: Address) => { setEditing(a); setModalOpen(true); };
  const remove = (id: string) => setAddresses(prev => prev.filter(a => a.id !== id));
  const saveAddr = () => {
    if (!editing) return;
    if (!editing.line1?.trim()) { toast.error('Adres Satırı 1 (Mahalle) zorunludur.'); return; }
    setAddresses(prev => { const i = prev.findIndex(x => x.id === editing.id); if (i >= 0) { const c = [...prev]; c[i] = editing; return c; } return [...prev, editing]; });
    setModalOpen(false);
  };
  const saveAll = () => {
    try { localStorage.setItem(`profile_addresses_${user.id}`, JSON.stringify(addresses)); } catch {}
    toast.success('Adresler kaydedildi.');
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div><div className="text-lg font-semibold text-slate-800">Adreslerim</div><div className="text-sm text-slate-500">Sadece manuel adres girişi desteklenir.</div></div>
        <Button onClick={openNew} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white"><Plus className="h-4 w-4 mr-2" /> Yeni Adres Ekle</Button>
      </div>
      <div className="space-y-4 max-w-5xl">
        {addresses.length === 0 && <Card className="rounded-2xl"><CardContent className="p-8 text-center text-slate-500">Henüz adres eklemediniz.</CardContent></Card>}
        {addresses.map((a, i) => (
          <Card key={a.id} className="bg-white rounded-2xl shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-800">Adres #{i + 1} — {a.title || 'Başlıksız'}</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => edit(a)}><PencilLine className="h-4 w-4 mr-1" />Düzenle</Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 mr-1" />Sil</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div><Label>Adres Başlığı</Label><div className="mt-1 text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">{a.title || '—'}</div></div>
              <div><Label>Adres Satırı 1</Label><div className="mt-1 text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">{a.line1}</div></div>
              <div><Label>Adres Satırı 2</Label><div className="mt-1 text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">{a.line2 || '—'}</div></div>
              <div><Label>İlçe</Label><div className="mt-1 text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">{a.district || '—'}</div></div>
              <div><Label>Şehir</Label><div className="mt-1 text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">{a.city || '—'}</div></div>
              <div><Label>Posta Kodu</Label><div className="mt-1 text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">{a.postalCode || '—'}</div></div>
              <div className="md:col-span-2"><Label>Ek Not</Label><div className="mt-1 text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">{a.notes || '—'}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-end pt-6">
        <Button onClick={saveAll} className="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Save className="h-4 w-4 mr-2" /> Tüm Değişiklikleri Kaydet</Button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Adres Düzenle</DialogTitle><DialogDescription>Bilgileri manuel doldurun. Konum alma özelliği kaldırıldı.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2"><Label>Adres Başlığı</Label><Input value={editing?.title || ''} onChange={(e) => setEditing(p => ({ ...(p as Address), title: e.target.value }))} className="mt-1" placeholder="Ev, Ofis..." /></div>
            <div className="md:col-span-2"><Label>Adres Satırı 1 (Mahalle)</Label><Input value={editing?.line1 || ''} onChange={(e) => setEditing(p => ({ ...(p as Address), line1: e.target.value }))} className="mt-1" placeholder="Mahalle" /></div>
            <div className="md:col-span-2"><Label>Adres Satırı 2 (Cadde/Sokak + No)</Label><Input value={editing?.line2 || ''} onChange={(e) => setEditing(p => ({ ...(p as Address), line2: e.target.value }))} className="mt-1" placeholder="Cadde / Sokak No" /></div>
            <div><Label>İlçe</Label><Input value={editing?.district || ''} onChange={(e) => setEditing(p => ({ ...(p as Address), district: e.target.value }))} className="mt-1" /></div>
            <div><Label>Şehir</Label><Input value={editing?.city || ''} onChange={(e) => setEditing(p => ({ ...(p as Address), city: e.target.value }))} className="mt-1" /></div>
            <div><Label>Posta Kodu</Label><Input value={editing?.postalCode || ''} onChange={(e) => setEditing(p => ({ ...(p as Address), postalCode: e.target.value }))} className="mt-1" /></div>
            <div className="md:col-span-2"><Label>Ek Not (opsiyonel)</Label><Input value={editing?.notes || ''} onChange={(e) => setEditing(p => ({ ...(p as Address), notes: e.target.value }))} className="mt-1" placeholder="Daire, kat, kapı, yakın nokta..." /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setModalOpen(false)}>İptal</Button><Button className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white" onClick={saveAddr}>Kaydet</Button></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
