import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';
import { User as UserType } from '@/lib/types';
import { getSessionUser, setSessionUser } from '@/lib/storage';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { User, Bell, Lock, Save, Image as ImageIcon, Building2, MapPin, FileBadge, Wallet2, Send } from 'lucide-react';

import {
  AccountSection, SecuritySection, CompanySection, OperationsSection,
  DocumentSection, PayoutSection, AddressSection, PaymentSection,
  NotificationSection, Section, gradientBg, useInitials,
} from '@/components/profile';
import type { SidebarKey } from '@/components/profile';

const API_BASE_URL = '/api/v1';

export default function Profile() {
  const [active, setActive] = useState<SidebarKey>('account');
  const [user, setUser] = useState<UserType | null>(null);
  const [profileCompletion, setProfileCompletion] = useState<number>(0);
  const [isProfileStatusLoading, setIsProfileStatusLoading] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'draft' | 'pending' | 'approved' | 'rejected'>('draft');
  const [companyName, setCompanyName] = useState('');

  // Photo state
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [dirtyPhoto, setDirtyPhoto] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoPreviewUrlRef = useRef<string | null>(null);

  const isCarrier = user?.type === 'carrier';
  const initials = useInitials(user?.name, user?.surname);

  const headerDisplayName = useMemo(() => {
    if (isCarrier && companyName) return companyName;
    return `${user?.name || ''} ${user?.surname || ''}`.trim();
  }, [isCarrier, companyName, user?.name, user?.surname]);

  const headerInitials = useMemo(() => {
    if (isCarrier && companyName) {
      const parts = companyName.trim().split(/\s+/);
      return `${(parts[0] || '').charAt(0)}${(parts[1] || '').charAt(0)}`.toUpperCase();
    }
    return initials;
  }, [isCarrier, companyName, initials]);

  // Profile status (carrier)
  const fetchProfileStatus = useCallback(async () => {
    if (!user || user.type !== 'carrier') return;
    setIsProfileStatusLoading(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/carriers/me/profile-status`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      const json = await res.json();
      const pct = Number(json?.data?.overallPercentage);
      setProfileCompletion(Math.max(0, Math.min(100, Math.round(Number.isFinite(pct) ? pct : 0))));
    } catch {} finally { setIsProfileStatusLoading(false); }
  }, [user]);

  const refreshProfileStatus = useCallback(async () => {
    if (!user || user.type !== 'carrier') return;
    setIsProfileStatusLoading(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/carriers/me/profile-status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' } });
      const json = await res.json();
      const pct = Number(json?.data?.overallPercentage);
      setProfileCompletion(Math.max(0, Math.min(100, Math.round(Number.isFinite(pct) ? pct : 0))));
    } catch { await fetchProfileStatus(); } finally { setIsProfileStatusLoading(false); }
  }, [fetchProfileStatus, user]);

  // Init
  useEffect(() => {
    const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) as UserType : null);
    if (!u) return;
    setUser(u);
    if (u.pictureUrl) { setPhoto(u.pictureUrl); } else {
      try { setPhoto(localStorage.getItem(`profile_photo_${u.id}`) || null); } catch { setPhoto(null); }
    }
    setDirtyPhoto(false);
    if (u.type === 'carrier') {
      setActive('company');
      try { const c = localStorage.getItem(`carrier_company_${u.id}`); if (c) { const p = JSON.parse(c); setCompanyName(p.name || ''); } } catch {}
      try { const a = localStorage.getItem(`carrier_approval_${u.id}`) as any; if (a) setApprovalStatus(a); } catch {}
    }
  }, []);

  // Fetch photo + company name from backend for carrier
  useEffect(() => {
    if (!user || user.type !== 'carrier') return;
    (async () => {
      try {
        const res = await apiClient(`${API_BASE_URL}/carriers/${user.id}`);
        const json = await res.json();
        if (!res.ok || !json?.success || !json?.data?.carrier) return;
        const c = json.data.carrier;
        const backendPhoto = c.pictureUrl ?? null;
        setPhoto(backendPhoto); setDirtyPhoto(false);
        if (c.companyName) setCompanyName(c.companyName);
        if (user.pictureUrl !== backendPhoto) {
          const updated = { ...user, pictureUrl: backendPhoto };
          setUser(updated); setSessionUser(updated);
        }
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => { if (user?.type === 'carrier') fetchProfileStatus(); }, [fetchProfileStatus, user?.id, user?.type]);

  // Fetch customer photo from backend on mount
  useEffect(() => {
    if (!user || user.type !== 'customer') return;
    (async () => {
      try {
        const res = await apiClient(`${API_BASE_URL}/customers/profile`);
        const json = await res.json();
        if (!res.ok || !json?.success || !json?.data) return;
        const backendPhoto = json.data.pictureUrl ?? null;
        if (backendPhoto) {
          setPhoto(backendPhoto); setDirtyPhoto(false);
          if (user.pictureUrl !== backendPhoto) {
            const updated = { ...user, pictureUrl: backendPhoto };
            setUser(updated); setSessionUser(updated);
          }
        }
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Photo actions
  const triggerPhotoPick = () => fileInputRef.current?.click();
  const onPhotoSelected: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (photoPreviewUrlRef.current) { URL.revokeObjectURL(photoPreviewUrlRef.current); photoPreviewUrlRef.current = null; }
    const url = URL.createObjectURL(file);
    photoPreviewUrlRef.current = url;
    setPhoto(url); setPhotoFile(file); setDirtyPhoto(true);
  };
  useEffect(() => { return () => { if (photoPreviewUrlRef.current) URL.revokeObjectURL(photoPreviewUrlRef.current); }; }, []);

  const savePhoto = async () => {
    if (!user || !photoFile) return;
    setIsSavingPhoto(true);
    try {
      const fd = new FormData(); fd.append('picture', photoFile);
      const token = localStorage.getItem('authToken');
      const endpoint = isCarrier
        ? '/api/v1/carriers/me/profile-picture'
        : '/api/v1/customers/me/picture';
      const method = isCarrier ? 'PUT' : 'POST';
      const res = await fetch(endpoint, { method, headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Profil fotoğrafı kaydedilemedi.');
      const savedUrl = json?.data?.pictureUrl ?? json?.pictureUrl ?? photo;
      const updated = { ...user, pictureUrl: savedUrl };
      setUser(updated); setSessionUser(updated); setPhoto(savedUrl); setPhotoFile(null); setDirtyPhoto(false);
      if (photoPreviewUrlRef.current) { URL.revokeObjectURL(photoPreviewUrlRef.current); photoPreviewUrlRef.current = null; }
      try { localStorage.setItem(`profile_photo_${user.id}`, savedUrl); } catch {}
      toast.success('Profil fotoğrafı kaydedildi.');
    } catch (err: any) { toast.error(err?.message || 'Fotoğraf kaydedilemedi.'); } finally { setIsSavingPhoto(false); }
  };

  // Approval
  const submitForApproval = () => {
    if (!user) return;
    if (profileCompletion < 100) { toast.error('Lütfen tüm bölümleri tamamlayın.'); return; }
    try { localStorage.setItem(`carrier_approval_${user.id}`, 'pending'); setApprovalStatus('pending'); } catch {}
    try { localStorage.removeItem(`fastRegPending_${user.id}`); localStorage.removeItem('profileCompletion'); } catch {}
    toast.success('Profiliniz onaya gönderildi.');
  };

  const handleUserUpdate = (u: UserType) => { setUser(u); };

  // Sidebar Item
  const Item = ({ id, label, icon: Icon }: { id: SidebarKey; label: string; icon: any }) => (
    <button onClick={() => setActive(id)} className={cn(
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 border-l-[3px]',
      active === id ? 'bg-blue-50/80 text-blue-600 font-semibold border-blue-600' : 'text-slate-600 hover:bg-slate-50 border-transparent',
    )}>
      <Icon className="h-4 w-4 flex-shrink-0" /> {label}
    </button>
  );

  if (!user) return (<div className="min-h-screen flex items-center justify-center" style={gradientBg}><div className="text-center text-slate-700">Giriş yapmanız gerekiyor.</div></div>);

  return (
    <div className="min-h-screen" style={gradientBg}>
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-8">

          {/* Sidebar */}
          <aside className="lg:sticky h-fit" style={{ top: '5rem' }}>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex flex-col items-center pt-7 pb-5 px-5">
                <div className="relative group cursor-pointer" onClick={triggerPhotoPick}>
                  <Avatar className="w-14 h-14 ring-2 ring-white shadow">
                    {photo ? <AvatarImage src={photo} alt="Profil fotoğrafı" /> : null}
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-semibold">{headerInitials}</AvatarFallback>
                  </Avatar>
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageIcon className="h-4 w-4 text-white" />
                  </span>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoSelected} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800 text-center leading-tight truncate max-w-full">{headerDisplayName}</p>
                <p className="text-xs text-slate-500 truncate max-w-full">{user.email}</p>
                {dirtyPhoto && (
                  <Button size="sm" onClick={savePhoto} disabled={isSavingPhoto} className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 rounded-lg">
                    <Save className="h-3 w-3 mr-1.5" />{isSavingPhoto ? 'Kaydediliyor…' : 'Fotoğrafı Kaydet'}
                  </Button>
                )}
                {isCarrier && (
                  <div className="w-full mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">Profil Tamamlanma</span>
                      <span className="text-[11px] font-semibold text-slate-600">{isProfileStatusLoading ? '…' : `%${profileCompletion}`}</span>
                    </div>
                    <Progress value={profileCompletion} className="h-1" />
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 mx-4" />
              <nav className="px-3 py-3 space-y-0.5">
                {isCarrier ? (
                  <>
                    <Item id="company" label="Firma Bilgileri" icon={Building2} />
                    <Item id="operations" label="Faaliyet Bilgileri" icon={MapPin} />
                    <Item id="documents" label="Belgeler" icon={FileBadge} />
                    <Item id="payouts" label="Kazanç Bilgileri" icon={Wallet2} />
                    <Item id="security" label="Güvenlik" icon={Lock} />
                    <Item id="notifications" label="Bildirimler" icon={Bell} />
                  </>
                ) : (
                  <>
                    <Item id="account" label="Hesap Bilgileri" icon={User} />
                    <Item id="security" label="Güvenlik" icon={Lock} />
                  </>
                )}
              </nav>
              {isCarrier && (
                <>
                  <div className="border-t border-slate-100 mx-4" />
                  <div className="px-4 py-4">
                    <Button onClick={submitForApproval} disabled={approvalStatus === 'pending' || profileCompletion < 100}
                      className={cn('w-full text-xs h-9 rounded-lg bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow hover:shadow-md',
                        (approvalStatus === 'pending' || profileCompletion < 100) && 'opacity-60 cursor-not-allowed')}>
                      <Send className="h-3.5 w-3.5 mr-1.5" />{approvalStatus === 'pending' ? 'Onay Beklemede' : 'Onaya Gönder'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* Content */}
          <div className="space-y-6 min-w-0">
            <AnimatePresence mode="wait">
              {isCarrier && active === 'company' && <Section key="company"><CompanySection user={user} refreshProfileStatus={refreshProfileStatus} onCompanyNameChange={setCompanyName} /></Section>}
              {isCarrier && active === 'operations' && <Section key="operations"><OperationsSection user={user} refreshProfileStatus={refreshProfileStatus} /></Section>}
              {isCarrier && active === 'documents' && <Section key="documents"><DocumentSection user={user} refreshProfileStatus={refreshProfileStatus} /></Section>}
              {isCarrier && active === 'payouts' && <Section key="payouts"><PayoutSection user={user} refreshProfileStatus={refreshProfileStatus} /></Section>}
              {active === 'account' && <Section key="account"><AccountSection user={user} onUserUpdate={handleUserUpdate} /></Section>}
              {active === 'addresses' && <Section key="addresses"><AddressSection user={user} /></Section>}
              {active === 'payments' && <Section key="payments"><PaymentSection user={user} /></Section>}
              {active === 'security' && <Section key="security"><SecuritySection user={user} /></Section>}
              {active === 'notifications' && <Section key="notifications"><NotificationSection user={user} /></Section>}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
