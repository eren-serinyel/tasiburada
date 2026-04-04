import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { adminApiClient, getAdminRole, getAdminId } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader, EmptyState, ErrorState } from '@/components/admin/shared';
import { Plus, ShieldCheck, Users, MoreHorizontal, Pencil, KeyRound, Trash2, Eye, EyeOff } from 'lucide-react';
import { validatePassword } from '@/utils/validatePassword';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Admin {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: 'admin' | 'superadmin';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminManagement() {
  const currentRole = getAdminRole();
  const currentAdminId = getAdminId();

  // Superadmin guard
  if (currentRole !== 'superadmin') return <Navigate to="/admin/panel" replace />;

  return <AdminManagementContent currentAdminId={currentAdminId} />;
}

function AdminManagementContent({ currentAdminId }: { currentAdminId: string | null }) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Add / Edit modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'admin' as 'admin' | 'superadmin', firstName: '', lastName: '' });
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const [formLoading, setFormLoading] = useState(false);

  // Delete — stores id + email for dialog
  const [deleteConfirmAdmin, setDeleteConfirmAdmin] = useState<{ id: string; email: string } | null>(null);

  // Password reset modal
  const [pwResetModal, setPwResetModal] = useState({ open: false, adminId: '', adminEmail: '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwResetErrors, setPwResetErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [pwResetLoading, setPwResetLoading] = useState(false);

  const limit = 20;

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await adminApiClient(`/admin/admins?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (data.success) {
        setAdmins(data.data?.admins ?? []);
        setTotalPages(data.data?.pagination?.totalPages ?? 1);
      } else {
        setError(true);
      }
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  // ── Toggle active ─────────────────────────────────────────────────

  const handleToggleActive = async (admin: Admin) => {
    try {
      const res = await adminApiClient(`/admin/admins/${admin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !admin.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Admin güncellendi');
        fetchAdmins();
      } else {
        toast.error(data.message || 'İşlem başarısız. Tekrar deneyin.');
      }
    } catch {
      toast.error('İşlem başarısız. Tekrar deneyin.');
    }
  };

  // ── Open add / edit modal ─────────────────────────────────────────

  const openAddModal = () => {
    setEditingAdmin(null);
    setFormData({ email: '', password: '', role: 'admin', firstName: '', lastName: '' });
    setFormErrors({});
    setShowAddModal(true);
  };

  const openEditModal = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({ email: admin.email, password: '', role: admin.role, firstName: admin.firstName ?? '', lastName: admin.lastName ?? '' });
    setFormErrors({});
    setShowAddModal(true);
  };

  // ── Form validation ───────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!editingAdmin) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) errors.email = 'Geçerli bir e-posta girin';
      if (formData.password.length < 8) errors.password = 'Şifre en az 8 karakter olmalı';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit add / edit ─────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setFormLoading(true);
    try {
      if (editingAdmin) {
        const res = await adminApiClient(`/admin/admins/${editingAdmin.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: formData.role, firstName: formData.firstName || undefined, lastName: formData.lastName || undefined }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Admin güncellendi');
          setShowAddModal(false);
          fetchAdmins();
        } else {
          toast.error(data.message || 'İşlem başarısız. Tekrar deneyin.');
        }
      } else {
        const res = await adminApiClient('/admin/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password, role: formData.role, firstName: formData.firstName || undefined, lastName: formData.lastName || undefined }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Admin hesabı oluşturuldu');
          setShowAddModal(false);
          fetchAdmins();
        } else {
          toast.error(data.message || 'İşlem başarısız. Tekrar deneyin.');
        }
      }
    } catch {
      toast.error('İşlem başarısız. Tekrar deneyin.');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteConfirmAdmin) return;
    try {
      const res = await adminApiClient(`/admin/admins/${deleteConfirmAdmin.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Admin silindi');
        setAdmins((prev) => prev.filter((a) => a.id !== deleteConfirmAdmin.id));
        setDeleteConfirmAdmin(null);
      } else {
        toast.error(data.message || 'İşlem başarısız. Tekrar deneyin.');
      }
    } catch {
      toast.error('İşlem başarısız. Tekrar deneyin.');
    }
  };

  // ── Password reset ────────────────────────────────────────────────

  const handlePasswordReset = (adminId: string, adminEmail: string) => {
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPw(false);
    setShowConfirmPw(false);
    setPwResetErrors({});
    setPwResetModal({ open: true, adminId, adminEmail });
  };

  const executePwReset = async () => {
    const errors: { newPassword?: string; confirmPassword?: string } = {};
    const pwError = validatePassword(newPassword);
    if (pwError) errors.newPassword = pwError;
    if (!confirmPassword) errors.confirmPassword = 'Şifre tekrarı gereklidir';
    else if (newPassword !== confirmPassword) errors.confirmPassword = 'Şifreler uyuşmuyor';
    if (Object.keys(errors).length > 0) { setPwResetErrors(errors); return; }
    setPwResetLoading(true);
    try {
      const res = await adminApiClient(`/admin/admins/${pwResetModal.adminId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Şifre sıfırlandı');
        setPwResetModal({ open: false, adminId: '', adminEmail: '' });
      } else {
        toast.error(data.message || 'İşlem başarısız. Tekrar deneyin.');
      }
    } catch {
      toast.error('İşlem başarısız. Tekrar deneyin.');
    } finally {
      setPwResetLoading(false);
    }
  };

  const isSelf = (id: string) => id === currentAdminId;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Admin Yönetimi" description={`${admins.length} admin kullanıcı`} />
        <Button onClick={openAddModal} size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-3.5 w-3.5" /> Yeni Admin Ekle
        </Button>
      </div>

      {error ? (
        <ErrorState onRetry={fetchAdmins} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-600 text-xs">E-posta</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Ad Soyad</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Rol</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Durum</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Son Giriş</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Kayıt Tarihi</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 bg-slate-200 rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState icon={Users} title="Henüz admin bulunmuyor" description="Yeni admin ekleyerek başlayın." className="py-10" actionLabel="Yeni Admin Ekle" onAction={openAddModal} />
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((a) => (
                  <TableRow key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="text-sm text-slate-700 font-medium">{a.email}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {a.firstName || a.lastName
                        ? `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim()
                        : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${
                        a.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        {a.role === 'superadmin' ? 'Süper Admin' : 'Admin'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={a.isActive}
                        onCheckedChange={() => handleToggleActive(a)}
                        disabled={isSelf(a.id)}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {a.lastLogin
                        ? new Date(a.lastLogin).toLocaleDateString('tr-TR')
                        : <span className="text-slate-400">Hiç giriş yapılmadı</span>
                      }
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(a.createdAt).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(a)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePasswordReset(a.id, a.email)}>
                            <KeyRound className="h-3.5 w-3.5 mr-2" /> Şifre Sıfırla
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirmAdmin({ id: a.id, email: a.email })}
                            disabled={isSelf(a.id)}
                            className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            {isSelf(a.id) ? 'Kendinizi devre dışı bırakamazsınız' : 'Devre Dışı Bırak'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Önceki</Button>
              <span className="text-xs text-slate-600">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sonraki</Button>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAdmin ? 'Admin Düzenle' : 'Yeni Admin Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">E-posta</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                disabled={!!editingAdmin}
                placeholder="admin@tasiburada.com"
                className="mt-1"
              />
              {formErrors.email && <p className="text-xs text-rose-500 mt-1">{formErrors.email}</p>}
            </div>
            {!editingAdmin && (
              <div>
                <Label className="text-xs">Şifre</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                  placeholder="En az 8 karakter"
                  className="mt-1"
                />
                {formErrors.password && <p className="text-xs text-rose-500 mt-1">{formErrors.password}</p>}
              </div>
            )}
            <div>
              <Label className="text-xs">Rol</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData((f) => ({ ...f, role: v as 'admin' | 'superadmin' }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Süper Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ad (opsiyonel)</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Örn. Ahmet"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Soyad (opsiyonel)</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Örn. Yılmaz"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Vazgeç</Button>
            <Button onClick={handleSubmit} disabled={formLoading}>
              {formLoading ? 'İşleniyor...' : editingAdmin ? 'Kaydet' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirmAdmin} onOpenChange={() => setDeleteConfirmAdmin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Admini Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteConfirmAdmin?.email}</strong> adlı admin hesabı silinecek. Bu işlem geri alınabilir (soft delete).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Password Reset Modal */}
      <Dialog open={pwResetModal.open} onOpenChange={(open) => {
        if (!open) setPwResetModal({ open: false, adminId: '', adminEmail: '' });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şifre Sıfırla — {pwResetModal.adminEmail}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Yeni Şifre</Label>
              <div className="relative mt-1">
                <Input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPwResetErrors((prev) => ({ ...prev, newPassword: undefined })); }}
                  placeholder="En az 8 karakter, büyük harf ve rakam"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwResetErrors.newPassword && <p className="text-xs text-rose-500 mt-1">{pwResetErrors.newPassword}</p>}
            </div>
            <div>
              <Label className="text-xs">Şifre Tekrar</Label>
              <div className="relative mt-1">
                <Input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPwResetErrors((prev) => ({ ...prev, confirmPassword: undefined })); }}
                  placeholder="Şifreyi tekrar girin"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwResetErrors.confirmPassword && <p className="text-xs text-rose-500 mt-1">{pwResetErrors.confirmPassword}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwResetModal({ open: false, adminId: '', adminEmail: '' })}>Vazgeç</Button>
            <Button onClick={executePwReset} disabled={pwResetLoading}>
              {pwResetLoading ? 'Kaydediliyor...' : 'Sıfırla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
