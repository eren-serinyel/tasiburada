import { useEffect, useState, useCallback } from 'react';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader, EmptyState, ErrorState } from '@/components/admin/shared';
import { Plus, Pencil, Trash2, ShieldCheck, Users } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export default function AdminManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'superadmin'>('admin');
  const [creating, setCreating] = useState(false);

  // edit dialog
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'superadmin'>('admin');
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await adminApiClient('/admin/admins');
      const data = await res.json();
      if (data.success) {
        setAdmins(data.data?.admins ?? []);
      } else {
        setError(true);
      }
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleCreate = async () => {
    if (!newEmail || !newPassword) return;
    setCreating(true);
    try {
      const res = await adminApiClient('/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Admin oluşturuldu.');
        setShowCreate(false);
        setNewEmail('');
        setNewPassword('');
        setNewRole('admin');
        fetchAdmins();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (admin: AdminUser) => {
    setEditAdmin(admin);
    setEditRole(admin.role);
    setEditActive(admin.isActive);
  };

  const handleEdit = async () => {
    if (!editAdmin) return;
    setSaving(true);
    try {
      const res = await adminApiClient(`/admin/admins/${editAdmin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, isActive: editActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Admin güncellendi.');
        setEditAdmin(null);
        fetchAdmins();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('İşlem başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (adminId: string) => {
    try {
      const res = await adminApiClient(`/admin/admins/${adminId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Admin silindi.');
        fetchAdmins();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Silme işlemi başarısız.');
    }
  };

  const roleLabel = (r: string) => r === 'superadmin' ? 'Süper Admin' : 'Admin';

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Admin Yönetimi" description={`${admins.length} admin kullanıcı`} />
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Yeni Admin
        </Button>
      </div>

      {error ? (
        <ErrorState onRetry={fetchAdmins} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-600">E-posta</TableHead>
                <TableHead className="font-semibold text-slate-600">Rol</TableHead>
                <TableHead className="font-semibold text-slate-600">Durum</TableHead>
                <TableHead className="font-semibold text-slate-600">Son Giriş</TableHead>
                <TableHead className="font-semibold text-slate-600">Kayıt Tarihi</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 bg-slate-200 rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState icon={Users} title="Admin bulunamadı" description="Henüz admin kaydı yok." className="py-10" />
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((a) => (
                  <TableRow key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="text-sm text-slate-700 font-medium">{a.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${a.role === 'superadmin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        {roleLabel(a.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {a.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {a.lastLogin ? format(new Date(a.lastLogin), 'dd MMM yyyy HH:mm', { locale: tr }) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(a.createdAt), 'dd MMM yyyy', { locale: tr })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => openEdit(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Admini Sil</AlertDialogTitle>
                              <AlertDialogDescription>{a.email} admin hesabını silmek istediğinizden emin misiniz?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(a.id)} className="bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Admin Oluştur</DialogTitle>
            <DialogDescription>Yeni bir admin hesabı oluşturun</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">E-posta</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="admin@tasiburada.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Şifre</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="En az 6 karakter" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Rol</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as 'admin' | 'superadmin')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Süper Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Vazgeç</Button>
            <Button onClick={handleCreate} disabled={creating || !newEmail || !newPassword}>
              {creating ? 'Oluşturuluyor...' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editAdmin} onOpenChange={() => setEditAdmin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Düzenle</DialogTitle>
            <DialogDescription>{editAdmin?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Rol</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as 'admin' | 'superadmin')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Süper Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700">Aktif</p>
                <p className="text-xs text-slate-400">Pasif adminler giriş yapamaz</p>
              </div>
              <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAdmin(null)}>Vazgeç</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
