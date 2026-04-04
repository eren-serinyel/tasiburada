import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { Plus, Trash2, Save } from 'lucide-react';
import type { SectionProps, CardItem } from './types';

export default function PaymentSection({ user }: SectionProps) {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<CardItem>({ id: '', holder: '', number: '', expiry: '' });

  const openNew = () => { setDraft({ id: crypto.randomUUID(), holder: `${user.name} ${user.surname}`, number: '', expiry: '' }); setModalOpen(true); };
  const remove = (id: string) => setCards(prev => prev.filter(c => c.id !== id));
  const saveCard = () => {
    if (!draft.number || !/\d{2}\/\d{2}/.test(draft.expiry)) { toast.error('Kart numarası ve son kullanım tarihini girin.'); return; }
    setCards(prev => [...prev, draft]);
    setModalOpen(false);
  };
  const saveAll = () => {
    try { localStorage.setItem(`profile_cards_${user.id}`, JSON.stringify(cards)); } catch {}
    toast.success('Kartlar kaydedildi.');
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div><div className="text-lg font-semibold text-slate-800">Kayıtlı Kartlar</div><div className="text-sm text-slate-500">Kart bilgileri yerel olarak saklanır.</div></div>
        <Button onClick={openNew} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white"><Plus className="h-4 w-4 mr-2" /> Yeni Kart</Button>
      </div>
      {cards.length === 0 ? (
        <Card className="rounded-2xl"><CardContent className="p-10 text-center text-slate-500">Henüz kayıtlı kartınız yok.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {cards.map(c => (
            <div key={c.id} className="relative">
              <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-lg">
                <div className="flex items-center justify-between text-sm opacity-80"><span>VISA</span><span>{c.expiry}</span></div>
                <div className="mt-6 text-xl tracking-widest">{c.number}</div>
                <div className="mt-4 text-sm opacity-80 flex items-center justify-between"><span>Kart Sahibi</span><span>{c.holder}</span></div>
              </div>
              <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 mr-1" />Sil</Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end pt-6">
        <Button onClick={saveAll} className="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Save className="h-4 w-4 mr-2" /> Değişiklikleri Kaydet</Button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Yeni Kart</DialogTitle><DialogDescription>Basit bir kart kaydı ekleyin.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Kart Sahibi</Label><Input value={draft.holder} onChange={(e) => setDraft(v => ({ ...v, holder: e.target.value }))} className="mt-1" /></div>
            <div><Label>Kart Numarası</Label><Input value={draft.number} onChange={(e) => setDraft(v => ({ ...v, number: e.target.value }))} placeholder="**** **** **** 1234" className="mt-1" /></div>
            <div><Label>SKT</Label><Input value={draft.expiry} onChange={(e) => setDraft(v => ({ ...v, expiry: e.target.value }))} placeholder="MM/YY" className="mt-1" /></div>
            <div className="flex justify-end gap-2 pt-1"><Button variant="outline" onClick={() => setModalOpen(false)}>İptal</Button><Button className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white" onClick={saveCard}>Ekle</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
