import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Offer, Shipment, User } from '@/lib/types';
import { getSessionUser } from '@/lib/storage';
import { MapPin, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';

export default function CarrierOffers() {
  const [user, setUser] = useState<User | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [shipments, setShipments] = useState<Record<string, Shipment>>({});
  const [edit, setEdit] = useState<{ id: string; price: string } | null>(null);
  const [confirm, setConfirm] = useState<{ id: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
    if (!u || u.type !== 'carrier') { navigate('/login'); return; }
    setUser(u);
    const allOffers: Offer[] = JSON.parse(localStorage.getItem('offers') || '[]');
    const myOffers = allOffers.map((o: any) => ({
      ...o,
      status: (o.status === 'accepted' || o.status === 'rejected' ? o.status : 'pending') as 'pending'|'accepted'|'rejected'
    })).filter((o: Offer) => o.carrierId === u.id);
    setOffers(myOffers);
    const allShipments: Shipment[] = JSON.parse(localStorage.getItem('shipments') || '[]');
    const map: Record<string, Shipment> = {};
    allShipments.forEach(s => { map[s.id] = s; });
    setShipments(map);
  }, [navigate]);

  const handleUpdate = () => {
    if (!edit) return;
    const all: Offer[] = JSON.parse(localStorage.getItem('offers') || '[]');
  const upd = all.map((o: any) => o.id === edit.id ? { ...o, price: Number(edit.price) } : { ...o, status: (o.status === 'accepted' || o.status === 'rejected' ? o.status : 'pending') });
    localStorage.setItem('offers', JSON.stringify(upd));
    setOffers(upd.filter(o => o.carrierId === user!.id));
    setEdit(null);
  };

  const handleCancel = () => {
    if (!confirm) return;
    const all: Offer[] = JSON.parse(localStorage.getItem('offers') || '[]');
    const upd = all.map((o: any) => o.id === confirm.id 
      ? { ...o, status: 'rejected' as 'pending'|'accepted'|'rejected' } 
      : { ...o, status: (o.status === 'accepted' || o.status === 'rejected' ? o.status : 'pending') as 'pending'|'accepted'|'rejected' }
    );
    localStorage.setItem('offers', JSON.stringify(upd));
    setOffers(upd.filter(o => o.carrierId === user!.id));
    setConfirm(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Teklif Yönetimi</h1>
        <p className="text-gray-600">Verdiğiniz teklifleri görüntüleyin, güncelleyin veya iptal edin.</p>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-600">Henüz teklif vermediniz.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map(o => {
            const s = shipments[o.shipmentId];
            return (
              <Card key={o.id} className="hover:shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" /> {s ? `${s.origin.city} → ${s.destination.city}` : o.shipmentId}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${o.status==='pending'?'bg-yellow-100 text-yellow-800':o.status==='accepted'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{o.status}</Badge>
                      <div className="text-xl font-bold text-green-600">{o.price}₺</div>
                    </div>
                  </CardTitle>
                  <CardDescription>Oluşturma: {new Date(o.createdAt).toLocaleString('tr-TR')}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEdit({ id: o.id, price: String(o.price) })}><Pencil className="h-4 w-4 mr-1" /> Güncelle</Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirm({ id: o.id })}><Trash2 className="h-4 w-4 mr-1" /> İptal Et</Button>
                  {o.status === 'accepted' && s && (
                    <Button size="sm" onClick={() => navigate(`/shipment/${s.id}`)}><CheckCircle2 className="h-4 w-4 mr-1" /> İşi Aç</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!edit} onOpenChange={(open)=>!open && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklif Güncelle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Yeni Fiyat</Label>
            <Input value={edit?.price || ''} onChange={(e)=>setEdit(prev=>prev?{...prev, price: e.target.value}:prev)} type="number" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setEdit(null)}><XCircle className="h-4 w-4 mr-1" /> Vazgeç</Button>
              <Button onClick={handleUpdate}><CheckCircle2 className="h-4 w-4 mr-1" /> Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!confirm} onOpenChange={(open)=>!open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklifi İptal Et</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Bu teklifi iptal etmek istediğinize emin misiniz?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setConfirm(null)}><XCircle className="h-4 w-4 mr-1" /> Vazgeç</Button>
              <Button onClick={handleCancel}><Trash2 className="h-4 w-4 mr-1" /> İptal Et</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
