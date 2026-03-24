import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';
import { User as UserType } from '@/lib/types';
import { getSessionUser, setSessionUser } from '@/lib/storage';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { User, Shield, CreditCard, Bell, Home, Lock, Save, Image as ImageIcon, Plus, PencilLine, Trash2, ChevronDown, Building2, MapPin, FileBadge, Wallet2, Send, Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MultiSelect from '@/components/ui/multi-select';
import FileUpload from '@/components/ui/file-upload';
import { CITIES_TR } from '@/lib/locations';
const API_BASE_URL = '/api/v1';

type VehicleType = { id: number; name: string; defaultCapacityKg: number; defaultCapacityM3: number };

// Types
type SidebarKey = 'account' | 'addresses' | 'payments' | 'security' | 'notifications' | 'company' | 'operations' | 'documents' | 'payouts';
type Address = { id: string; title: string; line1: string; line2?: string; district?: string; city?: string; postalCode?: string; notes?: string };
type CardItem = { id: string; holder: string; number: string; expiry: string };

// Notifications types
type ChannelKey = 'email' | 'sms' | 'app' | 'browser';
type Channels = Record<ChannelKey, boolean>;
type NotifItem = { id: string; title: string; description?: string; enabled: boolean; channels: Channels };
type NotifGroup = { id: string; title: string; description?: string; items: NotifItem[] };
type NotifState = {
  groups: NotifGroup[];
  extras: {
    quietMode: boolean; // sadece güvenlik açık kalsın
    timeWindow: { start: string; end: string }; // 09:00-22:00
    dailySummary: boolean; // günde 1 kez e-posta özeti
    smsLimit: number; // günde en fazla X SMS
  };
};

// Small helpers
const Section = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className={className}>
    {children}
  </motion.div>
);
const gradientBg = { background: 'linear-gradient(to bottom right, #F9FAFB, #EFF6FF)' };

// Default notification structure (generic)
const defaultChannels = (): Channels => ({ email: true, sms: false, app: true, browser: true });
const defaultNotif = (): NotifState => ({
  groups: [
    {
      id: 'offers-ops',
      title: 'Teklif ve İşlem Bildirimleri',
      description: 'Teklif, taşıma ve ödeme süreçleri.',
      items: [
        { id: 'offers.new', title: 'Yeni Teklif Bildirimi', description: 'Yeni teklif aldığınızda bilgilendirme.', enabled: true, channels: defaultChannels() },
        { id: 'shipment.updates', title: 'Taşıma Güncellemeleri', description: 'Nakliyat süreci değişimlerinde bilgi.', enabled: true, channels: defaultChannels() },
        { id: 'payment.status', title: 'Ödeme Onayı / Reddedilmesi', description: 'Ödeme durumu değişimleri.', enabled: true, channels: defaultChannels() },
      ],
    },
    {
      id: 'marketing',
      title: 'Kampanyalar ve Tanıtımlar',
      description: 'Fırsatlar, iş birlikleri ve özetler.',
      items: [
        { id: 'marketing.campaigns', title: 'Kampanya Bildirimleri', description: 'Yeni kampanyalar, indirim fırsatları.', enabled: false, channels: defaultChannels() },
        { id: 'marketing.partners', title: 'Partner İş Birlikleri', description: 'Sponsorlu kampanyalar ve markalı duyurular.', enabled: false, channels: defaultChannels() },
        { id: 'marketing.weekly', title: 'Haftalık Özetler', description: 'E-posta ile kısa rapor özeti.', enabled: true, channels: { ...defaultChannels(), app: false, browser: false } },
      ],
    },
    {
      id: 'security',
      title: 'Güvenlik Bildirimleri',
      description: 'Hesabınız için kritik güvenlik uyarıları.',
      items: [
        { id: 'security.login', title: 'Giriş Denemesi Uyarısı', description: 'Bilinmeyen girişlerde uyarı.', enabled: true, channels: { email: true, sms: true, app: true, browser: true } },
        { id: 'security.password', title: 'Şifre Değişikliği Bildirimi', description: 'Şifre değişiminde bilgilendirme.', enabled: true, channels: { email: true, sms: false, app: true, browser: true } },
        { id: 'security.2fa', title: 'İki Aşamalı Doğrulama Hatırlatması', description: '2FA etkin değilse hatırlatma.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
      ],
    },
    {
      id: 'in-app',
      title: 'Uygulama İçi Bildirimler',
      description: 'Platform içindeki etkileşimler.',
      items: [
        { id: 'app.message', title: 'Yeni Mesaj Geldiğinde', description: 'Sohbette yeni mesaj.', enabled: true, channels: { email: false, sms: false, app: true, browser: true } },
        { id: 'app.review', title: 'Nakliyeci Yorum Bıraktığında', description: 'Yeni yorum bildirimi.', enabled: true, channels: defaultChannels() },
        { id: 'app.feedback', title: 'İş Tamamlandıktan Sonra Geri Bildirim Hatırlatması', description: 'Tamamlanan işler için hatırlatma.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
      ],
    },
  ],
  extras: { quietMode: false, timeWindow: { start: '09:00', end: '22:00' }, dailySummary: false, smsLimit: 3 },
});

// Carrier-specific default notification structure (matches the provided spec)
const defaultCarrierNotif = (): NotifState => ({
  groups: [
    {
      id: 'process',
      title: 'Teklif ve Taşıma Süreci',
      description: 'Nakliyeciye özel teklif, rota ve ödeme akışı bildirimleri.',
      items: [
        { id: 'offer.received', title: 'Yeni Teklif Alındı', description: 'Müşteriden gelen yeni taşıma teklifi.', enabled: true, channels: { email: true, sms: true, app: true, browser: true } },
        { id: 'offer.accepted', title: 'Teklif Kabul Edildi', description: 'Teklifiniz müşteri tarafından kabul edildi.', enabled: true, channels: { email: true, sms: false, app: true, browser: true } },
        { id: 'shipment.schedule.update', title: 'Yeni Rota / Tarih Güncellemesi', description: 'Tarih veya adres değişikliği olduğunda.', enabled: true, channels: { email: true, sms: false, app: true, browser: true } },
        { id: 'shipment.lifecycle', title: 'İş Başladı / Tamamlandı', description: 'Taşıma başlangıç ve tamamlanma bildirimleri.', enabled: true, channels: { email: false, sms: false, app: true, browser: true } },
        { id: 'payment.approved.transfered', title: 'Ödeme Onayı / Aktarım Tamamlandı', description: 'Ödeme onaylandığında veya kazanç hesabına aktarıldığında.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
      ],
    },
    {
      id: 'reviews',
      title: 'Değerlendirme ve Geri Bildirim',
      description: 'Müşteri değerlendirmeleri ve kritik geri bildirim uyarıları.',
      items: [
        { id: 'review.new', title: 'Yeni Değerlendirme Alındı', description: 'Taşıma sonrası puanlama/yorum.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
        { id: 'review.negative', title: 'Olumsuz Yorum Uyarısı', description: 'Düşük puan veya olumsuz yorumda uyarı.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
      ],
    },
    {
      id: 'security',
      title: 'Güvenlik Bildirimleri',
      description: 'Hesap, ödeme ve erişimle ilgili güvenlik uyarıları.',
      items: [
        { id: 'security.login', title: 'Bilinmeyen Giriş Denemesi', description: 'Farklı cihaz/IP giriş uyarısı.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
        { id: 'security.password', title: 'Şifre Değişikliği Bildirimi', description: 'Şifreniz değiştiğinde bilgilendirme.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
        { id: 'security.2fa', title: 'İki Aşamalı Doğrulama Hatırlatması', description: '2FA devre dışıysa etkinleştirme önerisi.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
      ],
    },
    {
      id: 'system',
      title: 'Sistem Duyuruları',
      description: 'Platform güncellemeleri ve nakliyeciye özel kampanyalar.',
      items: [
        { id: 'system.campaigns', title: 'Yeni Kampanyalar / Premium Fırsatlar', description: 'Komisyon indirimleri, özel üyelikler.', enabled: false, channels: { email: true, sms: false, app: true, browser: false } },
        { id: 'system.updates', title: 'Platform Güncellemeleri', description: 'Yeni özellikler, bakım veya duyurular.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
      ],
    },
  ],
  extras: { quietMode: false, timeWindow: { start: '08:00', end: '22:00' }, dailySummary: false, smsLimit: 3 },
});

// Migration from old boolean shape {offers,campaigns,status,security}
const migrateOldNotif = (oldObj: any): NotifState => {
  const base = defaultNotif();
  try {
    const map: Record<string, boolean> = oldObj || {};
    // Rough mapping
    const on = (k: string) => Boolean(map[k]);
    for (const g of base.groups) {
      for (const it of g.items) {
        if (it.id.startsWith('offers.')) it.enabled = on('offers');
        if (it.id.startsWith('marketing.')) it.enabled = on('campaigns');
        if (it.id.startsWith('security.')) it.enabled = on('security');
        if (it.id === 'shipment.updates' || it.id === 'payment.status') it.enabled = on('status');
      }
    }
  } catch {}
  return base;
};
const useInitials = (name?: string, surname?: string) => useMemo(() => `${(name||'').charAt(0)}${(surname||'').charAt(0)}`.toUpperCase(), [name, surname]);

export default function Profile() {
  // State
  const [active, setActive] = useState<SidebarKey>('account');
  const [user, setUser] = useState<UserType | null>(null);
  const [profileCompletion, setProfileCompletion] = useState<number>(0);
  const [isProfileStatusLoading, setIsProfileStatusLoading] = useState(false);
  const [form, setForm] = useState({ name: '', surname: '', email: '', phone: '' });
  const [customerProfileForm, setCustomerProfileForm] = useState({ city: '', district: '', addressLine1: '', addressLine2: '' });
  const [customerProfileInitial, setCustomerProfileInitial] = useState({ city: '', district: '', addressLine1: '', addressLine2: '' });
  const [isCustomerProfileLoading, setIsCustomerProfileLoading] = useState(false);
  const [isCustomerProfileSaving, setIsCustomerProfileSaving] = useState(false);
  const [isCustomerPasswordSaving, setIsCustomerPasswordSaving] = useState(false);
  // Photo state
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [dirtyPhoto, setDirtyPhoto] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoPreviewUrlRef = useRef<string | null>(null);
  // Carrier-specific states
  const isCarrier = user?.type === 'carrier';
  const [company, setCompany] = useState({
    email: '',
    name: '',
    type: '',
    taxNumber: '',
    year: '',
    services: [] as string[],
    vehicleType: '', // legacy single-select (migrate to array)
    vehicleTypes: [] as string[],
    // Çoklu araç türü için kapasite (kg) haritası; key: araç adı ("Kamyon" vb.)
    vehicleCapacities: {} as Record<string, string>
  });
  const [ops, setOps] = useState({
    address1: '',
    address2: '',
    district: '',
    city: '',
    serviceAreas: [] as string[],
    mapLat: '',
    mapLng: '',
    scopes: [] as string[]
  });
  const [docs, setDocs] = useState({
    kYetki: [] as File[],
    src: [] as File[],
    ruhsat: [] as File[],
    vergi: [] as File[],
    sigorta: [] as File[]
  });
  const [payout, setPayout] = useState({ bank: '', iban: '', holder: '' });
  const [approvalStatus, setApprovalStatus] = useState<'draft' | 'pending' | 'approved' | 'rejected'>('draft');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrModalOpen, setAddrModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardDraft, setCardDraft] = useState<CardItem>({ id: '', holder: '', number: '', expiry: '' });
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showNewPwdRepeat, setShowNewPwdRepeat] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [suspiciousAlerts, setSuspiciousAlerts] = useState(false);
  const [securityDefaults, setSecurityDefaults] = useState({ twoFactorEnabled: false, suspiciousLoginAlertsEnabled: false });
  const [notif, setNotif] = useState<NotifState>(defaultNotif());
  // Kategori (grup) bazlı aç/kapa durumu
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() => (
    Object.fromEntries(defaultNotif().groups.map(g => [g.id, true]))
  ));

  const fetchProfileStatus = useCallback(async () => {
    if (!user || user.type !== 'carrier') return;
    setIsProfileStatusLoading(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/carriers/me/profile-status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      const percentRaw = json?.data?.overallPercentage;
      const percent = Number.isFinite(Number(percentRaw)) ? Number(percentRaw) : 0;
      setProfileCompletion(Math.max(0, Math.min(100, Math.round(percent))));
    } catch {
      // keep last known value
    } finally {
      setIsProfileStatusLoading(false);
    }
  }, [user]);

  const refreshProfileStatus = useCallback(async () => {
    if (!user || user.type !== 'carrier') return;
    setIsProfileStatusLoading(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/carriers/me/profile-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      const percentRaw = json?.data?.overallPercentage;
      const percent = Number.isFinite(Number(percentRaw)) ? Number(percentRaw) : 0;
      setProfileCompletion(Math.max(0, Math.min(100, Math.round(percent))));
    } catch {
      await fetchProfileStatus();
    } finally {
      setIsProfileStatusLoading(false);
    }
  }, [fetchProfileStatus, user]);

  // Lookup: Araç türleri
  const [vehicleTypesList, setVehicleTypesList] = useState<VehicleType[]>([]);
  const nameToId = useMemo(() => Object.fromEntries(vehicleTypesList.map(v => [v.name, v.id])), [vehicleTypesList]);

  // Dirty flags
  const [dirtyAccount, setDirtyAccount] = useState(false);
  const [dirtyAddresses, setDirtyAddresses] = useState(false);
  const [dirtyPayments, setDirtyPayments] = useState(false);
  const [dirtySecurity, setDirtySecurity] = useState(false);
  const [dirtyNotifications, setDirtyNotifications] = useState(false);
  
  // Master data
  const [serviceTypeOptions, setServiceTypeOptions] = useState<{id: string, name: string}[]>([]);
  const [scopeOptions, setScopeOptions] = useState<{id: string, name: string}[]>([]); 

  // Init
  useEffect(() => {
    // Fetch master data
    apiClient(`${API_BASE_URL}/service-types`).then(r => r.json()).then(d => {
        if (d.success) setServiceTypeOptions(d.data);
    }).catch(() => {});
    
    apiClient(`${API_BASE_URL}/scope-of-works`).then(r => r.json()).then(d => {
         if (d.success) setScopeOptions(d.data);
    }).catch(() => {});

    const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) as UserType : null);
    if (!u) return;
    setUser(u);
    setForm({ name: u.name || '', surname: u.surname || '', email: u.email || '', phone: u.phone || '' });
    if (u.pictureUrl) {
      setPhoto(u.pictureUrl);
      setDirtyPhoto(false);
    } else {
      try {
        const cached = localStorage.getItem(`profile_photo_${u.id}`);
        setPhoto(cached || null);
      } catch {
        setPhoto(null);
      }
      setDirtyPhoto(false);
    }
    // Load drafts only for carrier side
    if (u.type === 'carrier') {
      try {
        const c = localStorage.getItem(`carrier_company_${u.id}`);
        if (c) {
          const parsed = JSON.parse(c);
          // migrate: if only vehicleType exists, map to vehicleTypes array
          if (parsed && !parsed.vehicleTypes) {
            parsed.vehicleTypes = parsed.vehicleType ? [parsed.vehicleType] : [];
          }
          // migrate: tekil vehicleCapacity -> ilk seçili türe ata
          if (parsed && parsed.vehicleCapacity && (!parsed.vehicleCapacities || Object.keys(parsed.vehicleCapacities||{}).length===0)) {
            const first = (parsed.vehicleTypes && parsed.vehicleTypes[0]) || parsed.vehicleType;
            if (first) {
              parsed.vehicleCapacities = { [first]: String(parsed.vehicleCapacity) };
            }
          }
          setCompany(parsed);
        }
        const o = localStorage.getItem(`carrier_ops_${u.id}`); if (o) setOps(JSON.parse(o));
        const pay = localStorage.getItem(`carrier_payout_${u.id}`); if (pay) setPayout(JSON.parse(pay));
        const appr = localStorage.getItem(`carrier_approval_${u.id}`) as any; if (appr) setApprovalStatus(appr);
        const docsFlags = localStorage.getItem(`carrier_docs_flags_${u.id}`);
        if (docsFlags) {
          // Only restore counts, cannot restore File objects; leave arrays empty
        }
      } catch {}

      try {
        const raw = localStorage.getItem(`profile_notif_${u.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const carrierGroupIds = new Set(['process','reviews','security','system']);
          const ok = parsed?.groups && Array.isArray(parsed.groups) && parsed.groups.every((g: any) => carrierGroupIds.has(g.id));
          if (ok) {
            setNotif(parsed);
            setGroupOpen(Object.fromEntries(parsed.groups.map((g: any) => [g.id, true])));
          } else {
            const dn = defaultCarrierNotif();
            setNotif(dn);
            setGroupOpen(Object.fromEntries(dn.groups.map(g => [g.id, true])));
          }
        } else {
          const dn = defaultCarrierNotif();
          setNotif(dn);
          setGroupOpen(Object.fromEntries(dn.groups.map(g => [g.id, true])));
        }
      } catch {}
    } else {
      const dn = defaultNotif();
      setNotif(dn);
      setGroupOpen(Object.fromEntries(dn.groups.map(g => [g.id, true])));
      setAddresses([]);
      setCards([]);
    }
  }, []);

  useEffect(() => {
    if (!user || user.type === 'carrier') return;

    const fetchCustomerProfile = async () => {
      setIsCustomerProfileLoading(true);
      try {
        const res = await apiClient(`${API_BASE_URL}/customers/profile`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || 'Profil bilgileri alınamadı.');
        }

        const data = json?.data || {};
        const updatedForm = {
          name: data.firstName ?? form.name,
          surname: data.lastName ?? form.surname,
          email: data.email ?? form.email,
          phone: data.phone ?? form.phone
        };
        const updatedCustomerProfile = {
          city: data.city ?? '',
          district: data.district ?? '',
          addressLine1: data.addressLine1 ?? '',
          addressLine2: data.addressLine2 ?? ''
        };

        setForm(updatedForm);
        setCustomerProfileForm(updatedCustomerProfile);
        setCustomerProfileInitial(updatedCustomerProfile);

        const updatedUser = {
          ...user,
          name: updatedForm.name,
          surname: updatedForm.surname,
          phone: updatedForm.phone,
          email: updatedForm.email
        };
        setUser(updatedUser);
        setSessionUser(updatedUser);
      } catch (error: any) {
        toast.error(error?.message || 'Profil bilgileri alınamadı.');
      } finally {
        setIsCustomerProfileLoading(false);
      }
    };

    fetchCustomerProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.type]);

  // Fetch vehicle types for dynamic mapping
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient(`${API_BASE_URL}/vehicle-types`);
        const json = await res.json();
        if (res.ok && json?.success && Array.isArray(json.data)) setVehicleTypesList(json.data);
      } catch {}
    })();
  }, []);

  // Set default tab for carrier
  useEffect(() => {
    if (user?.type === 'carrier') setActive('company');
  }, [user]);

  // Load carrier profile completion on entry
  useEffect(() => {
    if (user?.type !== 'carrier') return;
    fetchProfileStatus();
  }, [fetchProfileStatus, user?.id, user?.type]);

  // If company email is empty, seed from session user
  useEffect(() => {
    if (user?.type === 'carrier' && user?.email && !company.email) {
      setCompany((prev)=> ({ ...prev, email: user.email }));
    }
  }, [user?.email, user?.type]);

  // Fetch carrier profile from backend to prefill drafts on first load
  useEffect(() => {
    if (!user || user.type !== 'carrier') return;
    (async () => {
      try {
        const res = await apiClient(`${API_BASE_URL}/carriers/${user.id}`);
        const json = await res.json();
        if (!res.ok || !json?.success || !json?.data) return;
        const carrierData = json.data?.carrier;
        if (!carrierData) return;
        const backendPhoto = carrierData.pictureUrl ?? null;
        setPhoto(backendPhoto);
        setDirtyPhoto(false);
        if (user && user.pictureUrl !== backendPhoto) {
          const updatedUser = { ...user, pictureUrl: backendPhoto };
          setUser(updatedUser);
          setSessionUser(updatedUser);
        }
        const activity = json.data?.activity;
        const securitySettings = carrierData.securitySettings || json.data?.securitySettings;

        const resolveServiceNames = (): string[] => {
          const fromTopLevel = Array.isArray(json.data?.serviceTypes)
            ? json.data.serviceTypes
                .map((item: any) => item?.serviceType?.name || item?.name)
                .filter(Boolean)
            : null;
          if (fromTopLevel?.length) return fromTopLevel;

          const fromCarrier = Array.isArray((carrierData as any)?.serviceTypeLinks)
            ? (carrierData as any).serviceTypeLinks
                .map((link: any) => link?.serviceType?.name || link?.name)
                .filter(Boolean)
            : null;
          if (fromCarrier?.length) return fromCarrier;

          return company.services;
        };

        const vehicleSource = (() => {
          if (Array.isArray(json.data?.vehicleTypes) && json.data.vehicleTypes.length) {
            return json.data.vehicleTypes;
          }
          if (Array.isArray((carrierData as any)?.vehicleTypeLinks) && (carrierData as any).vehicleTypeLinks.length) {
            return (carrierData as any).vehicleTypeLinks;
          }
          return null;
        })();

        const vehicleEntries = (vehicleSource || [])
          .map((entry: any) => {
            const name = entry?.vehicleType?.name || entry?.name || entry?.vehicleTypeName;
            if (!name) return null;
            const capacityValue = entry?.capacityKg ?? entry?.capacity ?? null;
            return { name, capacityValue };
          })
          .filter(Boolean) as Array<{ name: string; capacityValue: number | string | null }>; 

        const vehicleNamesFromBackend = vehicleEntries.map(item => item.name);
        const backendCapacities = vehicleEntries.reduce((acc, item) => {
          if (!item.name) return acc;
          const numeric = item.capacityValue === null || item.capacityValue === undefined ? undefined : Number(item.capacityValue);
          if (numeric !== undefined && Number.isFinite(numeric)) {
            acc[item.name] = String(numeric);
          }
          return acc;
        }, {} as Record<string, string>);

        const newCompany = {
          email: carrierData.email || company.email,
          name: carrierData.companyName || company.name,
          type: company.type,
          taxNumber: carrierData.taxNumber || company.taxNumber,
          year: company.year,
          services: resolveServiceNames(),
          vehicleType: vehicleNamesFromBackend.length ? vehicleNamesFromBackend[0] : ((company.vehicleTypes && company.vehicleTypes[0]) || company.vehicleType),
          vehicleTypes: vehicleNamesFromBackend.length ? vehicleNamesFromBackend : company.vehicleTypes,
          vehicleCapacities: vehicleNamesFromBackend.length
            ? { ...(company.vehicleCapacities || {}), ...backendCapacities }
            : company.vehicleCapacities
        };
        const newOps = {
          address1: activity?.address || ops.address1,
          address2: ops.address2,
          district: activity?.district || ops.district,
          city: activity?.city || ops.city,
          serviceAreas: activity?.serviceAreas || ops.serviceAreas,
          mapLat: ops.mapLat,
          mapLng: ops.mapLng
        };
        setCompany(newCompany);
        setOps(newOps);
        if (securitySettings) {
          const normalizedSecurity = {
            twoFactorEnabled: Boolean(securitySettings.twoFactorEnabled),
            suspiciousLoginAlertsEnabled: Boolean(securitySettings.suspiciousLoginAlertsEnabled)
          };
          setTwoFA(normalizedSecurity.twoFactorEnabled);
          setSuspiciousAlerts(normalizedSecurity.suspiciousLoginAlertsEnabled);
          setSecurityDefaults(normalizedSecurity);
        }
        try {
          localStorage.setItem(`carrier_company_${user.id}`, JSON.stringify(newCompany));
          localStorage.setItem(`carrier_ops_${user.id}`, JSON.stringify(newOps));
        } catch {}
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Prefill capacities from backend vehicles list
  useEffect(() => {
    if (!user || user.type !== 'carrier') return;
    (async () => {
      try {
        const res = await apiClient(`${API_BASE_URL}/carriers/${user.id}/vehicles`);
        const json = await res.json();
        if (!res.ok || !json?.success || !Array.isArray(json.data)) return;
        const capacities: Record<string, string> = {};
        for (const v of json.data) {
          const name: string = v.vehicleTypeName || '';
          if (!name) continue;
          capacities[name] = String(v.capacityKg ?? '');
        }
        if (Object.keys(capacities).length > 0) {
          setCompany(prev => ({ ...prev, vehicleCapacities: { ...(prev.vehicleCapacities || {}), ...capacities } }));
          try { if (user) localStorage.setItem(`carrier_company_${user.id}`, JSON.stringify({ ...company, vehicleCapacities: { ...(company.vehicleCapacities || {}), ...capacities } })); } catch {}
        }
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Derived dirty states
  useEffect(() => {
    if (!user) return;
    const baseDirty = form.name !== (user.name||'') || form.surname !== (user.surname||'') || form.email !== (user.email||'') || form.phone !== (user.phone||'');
    if (user.type === 'carrier') {
      setDirtyAccount(baseDirty);
      return;
    }

    const customerAddressDirty =
      customerProfileForm.city !== customerProfileInitial.city ||
      customerProfileForm.district !== customerProfileInitial.district ||
      customerProfileForm.addressLine1 !== customerProfileInitial.addressLine1 ||
      customerProfileForm.addressLine2 !== customerProfileInitial.addressLine2;

    setDirtyAccount(baseDirty || customerAddressDirty);
  }, [form, user, customerProfileForm, customerProfileInitial]);
  useEffect(() => setDirtyAddresses(true), [addresses]);
  useEffect(() => setDirtyPayments(true), [cards]);
  useEffect(() => {
    if (!user) return;
    if (user.type !== 'carrier') {
      setDirtySecurity(Boolean(currentPwd || newPwd || newPwd2));
      return;
    }

    setDirtySecurity(Boolean(
      currentPwd ||
      newPwd ||
      newPwd2 ||
      twoFA !== securityDefaults.twoFactorEnabled ||
      suspiciousAlerts !== securityDefaults.suspiciousLoginAlertsEnabled
    ));
  }, [user, currentPwd, newPwd, newPwd2, twoFA, suspiciousAlerts, securityDefaults]);
  useEffect(() => setDirtyNotifications(true), [notif]);

  // Actions
  const saveAll = async () => {
    if (!user) return;

    if (user.type !== 'carrier') {
      if (dirtyAccount) {
        setIsCustomerProfileSaving(true);
        try {
          const res = await apiClient(`${API_BASE_URL}/customers/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: form.name,
              lastName: form.surname,
              phone: form.phone,
              city: customerProfileForm.city,
              district: customerProfileForm.district,
              addressLine1: customerProfileForm.addressLine1,
              addressLine2: customerProfileForm.addressLine2 || undefined
            })
          });

          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json?.success) {
            throw new Error(json?.message || 'Profil güncellenemedi.');
          }

          const updated: UserType = { ...user, name: form.name, surname: form.surname, email: form.email, phone: form.phone };
          setSessionUser(updated);
          setUser(updated);
          setCustomerProfileInitial(customerProfileForm);
          setDirtyAccount(false);
          toast.success('Profil bilgileri güncellendi.');
        } catch (error: any) {
          toast.error(error?.message || 'Profil güncellenemedi.');
          return;
        } finally {
          setIsCustomerProfileSaving(false);
        }
      }

      if (dirtySecurity) {
        if (newPwd !== newPwd2) {
          toast.error('Şifreler eşleşmiyor.');
          return;
        }
        if (!currentPwd || !newPwd) {
          toast.error('Mevcut şifre ve yeni şifre zorunludur.');
          return;
        }

        setIsCustomerPasswordSaving(true);
        try {
          const res = await apiClient(`${API_BASE_URL}/customers/change-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentPassword: currentPwd,
              newPassword: newPwd
            })
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json?.success) {
            throw new Error(json?.message || 'Şifre güncellenemedi.');
          }

          setCurrentPwd('');
          setNewPwd('');
          setNewPwd2('');
          setDirtySecurity(false);
          toast.success('Şifreniz güncellendi.');
        } catch (error: any) {
          toast.error(error?.message || 'Şifre güncellenemedi.');
          return;
        } finally {
          setIsCustomerPasswordSaving(false);
        }
      }

      if (!dirtyAccount && !dirtySecurity) {
        toast.info('Kaydedilecek değişiklik bulunamadı.');
      }
      return;
    }

    if (dirtySecurity) {
      if ((newPwd || newPwd2) && newPwd !== newPwd2) {
        toast.error('Şifreler eşleşmiyor.');
        return;
      }
      if ((newPwd || newPwd2) && !currentPwd) {
        toast.error('Mevcut şifrenizi girin.');
        return;
      }
      try {
        const res = await apiClient(`${API_BASE_URL}/carriers/${user.id}/security`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            twoFactorEnabled: twoFA,
            suspiciousLoginAlertsEnabled: suspiciousAlerts,
            currentPassword: currentPwd || undefined,
            newPassword: newPwd ? newPwd : undefined
          })
        });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || 'Güvenlik ayarları güncellenemedi.');
        }
        setSecurityDefaults({
          twoFactorEnabled: twoFA,
          suspiciousLoginAlertsEnabled: suspiciousAlerts
        });
        setCurrentPwd('');
        setNewPwd('');
        setNewPwd2('');
      } catch (error: any) {
        toast.error(error?.message || 'Güvenlik ayarları kaydedilemedi.');
        return;
      }
    }

    const updated: UserType = { ...user, name: form.name, surname: form.surname, email: form.email, phone: form.phone };
    setSessionUser(updated);
    setUser(updated);
    try { localStorage.setItem(`profile_addresses_${user.id}`, JSON.stringify(addresses)); } catch {}
    try { localStorage.setItem(`profile_cards_${user.id}`, JSON.stringify(cards)); } catch {}
    try { localStorage.setItem(`profile_notif_${user.id}`, JSON.stringify(notif)); } catch {}
    setDirtyAccount(false);
    setDirtyAddresses(false);
    setDirtyPayments(false);
    setDirtySecurity(false);
    setDirtyNotifications(false);
    toast.success('Bilgiler başarıyla güncellendi.');
  };

  // Photo actions
  const triggerPhotoPick = () => fileInputRef.current?.click();
  const onPhotoSelected: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
      photoPreviewUrlRef.current = null;
    }

    const previewUrl = URL.createObjectURL(file);
    photoPreviewUrlRef.current = previewUrl;
    setPhoto(previewUrl);
    setPhotoFile(file);
    setDirtyPhoto(true);
  };

  useEffect(() => {
    return () => {
      if (photoPreviewUrlRef.current) {
        URL.revokeObjectURL(photoPreviewUrlRef.current);
      }
    };
  }, []);

  const savePhoto = async () => {
    if (!user || !photoFile) return;
    setIsSavingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('picture', photoFile);

      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/v1/carriers/me/profile-picture', {
        method: 'PUT',
        headers: token
          ? {
              Authorization: `Bearer ${token}`
            }
          : undefined,
        body: formData
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Profil fotoğrafı kaydedilemedi.');
      }

      const savedUrl = json?.data?.pictureUrl ?? json?.pictureUrl ?? photo;
      const updatedUser = { ...user, pictureUrl: savedUrl };
      setUser(updatedUser);
      setSessionUser(updatedUser);
      setPhoto(savedUrl);
      setPhotoFile(null);
      setDirtyPhoto(false);

      if (photoPreviewUrlRef.current) {
        URL.revokeObjectURL(photoPreviewUrlRef.current);
        photoPreviewUrlRef.current = null;
      }

      try { localStorage.setItem(`profile_photo_${user.id}`, savedUrl); } catch {}
      toast.success('Profil fotoğrafı kaydedildi.');
    } catch (error: any) {
      toast.error(error?.message || 'Fotoğraf kaydedilemedi.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // Carrier draft save helpers
  const persistCarrierDrafts = () => {
    if (!user) return;
    try { localStorage.setItem(`carrier_company_${user.id}`, JSON.stringify(company)); } catch {}
    try { localStorage.setItem(`carrier_ops_${user.id}`, JSON.stringify(ops)); } catch {}
    try { localStorage.setItem(`carrier_payout_${user.id}`, JSON.stringify(payout)); } catch {}
    // Hızlı kayıt bayrağını temizle -> gerçek yüzde hesaplansın
    try { localStorage.removeItem(`fastRegPending_${user.id}`); localStorage.removeItem('profileCompletion'); } catch {}
  };

  const parseCapacityValue = (value: string | number | undefined) => {
    if (value === null || value === undefined || value === '') return undefined;
    const normalized = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '.'));
    if (!Number.isFinite(normalized) || normalized <= 0) return undefined;
    return normalized;
  };

  const mockFilePath = (file?: File | null) => {
    if (!file?.name) return '';
    return `/uploads/${file.name.replace(/\s+/g, '_')}`;
  };

  const buildDocumentPayload = () => {
    const payload: { type: string; fileUrl: string }[] = [];
    const pushSingle = (type: string, files?: File[]) => {
      if (!files || files.length === 0) return;
      const url = mockFilePath(files[0]);
      if (url) payload.push({ type, fileUrl: url });
    };

    pushSingle('AUTHORIZATION_CERT', docs.kYetki);
    pushSingle('SRC_CERT', docs.src);
    pushSingle('TAX_PLATE', docs.vergi);
    pushSingle('INSURANCE_POLICY', docs.sigorta);

    if (docs.ruhsat?.length) {
      docs.ruhsat.forEach(file => {
        const url = mockFilePath(file);
        if (url) payload.push({ type: 'VEHICLE_LICENSE', fileUrl: url });
      });
    }

    return payload;
  };

  // Company save + vehicles update
  const persistCompanyAndVehicles = async () => {
    if (!user || user.type !== 'carrier') return persistCarrierDrafts();

    // Build selectedVehicles from UI selections
    const selectedVehicles = (company.vehicleTypes || []).map((name: string) => ({
      vehicleTypeId: nameToId[name],
      customCapacity: parseCapacityValue((company.vehicleCapacities || {})[name]),
    })).filter(v => !!v.vehicleTypeId);

    const capacityOverrides = (company.vehicleTypes || []).reduce((acc, name) => {
      const parsed = parseCapacityValue((company.vehicleCapacities || {})[name]);
      if (parsed !== undefined) acc[name] = parsed;
      return acc;
    }, {} as Record<string, number>);

    try {
      // Save company-level fields
      await apiClient(`${API_BASE_URL}/carriers/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: company.name || undefined,
          taxNumber: company.taxNumber || undefined,
          email: company.email || undefined,
          foundedYear: company.year ? Number(company.year) : undefined,
          vehicleTypeNames: company.vehicleTypes || [],
          vehicleTypeCapacities: Object.keys(capacityOverrides).length ? capacityOverrides : undefined,
          serviceTypeNames: company.services || [],
          scopeOfWorkNames: company.scopes || [],
        }),
      });

      // Save vehicles to backend (only if we have a mapping)
      if (selectedVehicles.length > 0) {
        await apiClient(`${API_BASE_URL}/carriers/${user.id}/vehicles`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedVehicles }),
        });
      }
    } catch {}

    // Always persist drafts locally too
    persistCarrierDrafts();
    toast.success('Firma bilgileri ve araç kapasiteleri kaydedildi.');
    await refreshProfileStatus();
  };

  const saveDocumentsDraft = async () => {
    if (!user) return;
    const documentsPayload = buildDocumentPayload();
    try {
      const res = await apiClient(`${API_BASE_URL}/carriers/${user.id}/documents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: documentsPayload })
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Belge kaydı başarısız');
      }
      toast.success(json?.allRequiredHaveDoc ? 'Tüm belgeler kaydedildi.' : 'Belgeler taslak olarak kaydedildi.');
      await refreshProfileStatus();
    } catch {
      toast.error('Belgeler kaydedilemedi.');
    }
  };

  const isValidIban = (v: string) => /^TR\d{24}$/i.test((v || '').replace(/\s+/g, ''));
  const validCompany = useMemo(() => (
    Boolean(
      company.name && company.type &&
      company.taxNumber && company.taxNumber.replace(/\D/g,'').length===10 &&
      company.year &&
      ((company.vehicleTypes && company.vehicleTypes.length>0) || company.vehicleType) &&
      // Her seçili tür için kapasite (kg) > 0
      (company.vehicleTypes || (company.vehicleType ? [company.vehicleType] : [])).every((t:string)=> Number((company.vehicleCapacities||{})[t])>0) &&
      company.services.length>0
    )
  ), [company]);
  const validOps = useMemo(() => (
    Boolean(ops.city && ops.district && ops.address1)
  ), [ops]);
  const validDocs = useMemo(() => (
    docs.kYetki.length>0 && docs.src.length>0 && docs.ruhsat.length>0 && docs.vergi.length>0
  ), [docs]);
  const validPayout = useMemo(() => (
    Boolean(payout.bank && isValidIban(payout.iban) && payout.holder)
  ), [payout]);

  const canSubmitForApproval = isCarrier && validCompany && validOps && validDocs && validPayout;

  const submitForApproval = () => {
    if (!user) return;
    if (!canSubmitForApproval) { toast.error('Lütfen zorunlu alanları tamamlayın.'); return; }
    persistCarrierDrafts();
    try { localStorage.setItem(`carrier_docs_flags_${user.id}`, JSON.stringify({ kYetki: docs.kYetki.length, src: docs.src.length, ruhsat: docs.ruhsat.length, vergi: docs.vergi.length, sigorta: docs.sigorta.length })); } catch {}
    try { localStorage.setItem(`carrier_approval_${user.id}`, 'pending'); setApprovalStatus('pending'); } catch {}
    try { localStorage.removeItem(`fastRegPending_${user.id}`); localStorage.removeItem('profileCompletion'); } catch {}
    toast.success('Profiliniz onaya gönderildi.');
  };

  const openNewAddress = () => { setEditingAddress({ id: crypto.randomUUID(), title: '', line1: '', line2: '', district: '', city: '', postalCode: '', notes: '' }); setAddrModalOpen(true); };
  const editAddress = (a: Address) => { setEditingAddress(a); setAddrModalOpen(true); };
  const removeAddress = (id: string) => setAddresses(prev => prev.filter(a => a.id !== id));
  const saveAddress = () => { if (!editingAddress) return; if (!editingAddress.line1?.trim()) { toast.error('Adres Satırı 1 (Mahalle) zorunludur.'); return; } setAddresses(prev => { const i = prev.findIndex(x=>x.id===editingAddress.id); if (i>=0){ const c=[...prev]; c[i]=editingAddress; return c;} return [...prev, editingAddress]; }); setAddrModalOpen(false); };

  const openNewCard = () => { setCardDraft({ id: crypto.randomUUID(), holder: user ? `${user.name} ${user.surname}` : '', number: '', expiry: '' }); setCardModalOpen(true); };
  const saveCard = () => { if (!cardDraft.number || !/\d{2}\/\d{2}/.test(cardDraft.expiry)) { toast.error('Kart numarası ve son kullanım tarihini girin.'); return; } setCards(prev => [...prev, cardDraft]); setCardModalOpen(false); };
  const removeCard = (id: string) => setCards(prev => prev.filter(c => c.id !== id));

  const initials = useInitials(user?.name, user?.surname);
  const headerDisplayName = useMemo(() => {
    if (isCarrier && company?.name) return company.name;
    return `${user?.name || ''} ${user?.surname || ''}`.trim();
  }, [isCarrier, company?.name, user?.name, user?.surname]);
  const headerInitials = useMemo(() => {
    if (isCarrier && company?.name) {
      const parts = company.name.trim().split(/\s+/);
      return `${(parts[0]||'').charAt(0)}${(parts[1]||'').charAt(0)}`.toUpperCase();
    }
    return initials;
  }, [isCarrier, company?.name, initials]);

  const Item = ({ id, label, icon: Icon }: { id: SidebarKey; label: string; icon: any }) => (
    <button onClick={() => setActive(id)} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 transition-all duration-200', active === id ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] font-medium' : 'hover:bg-[rgba(0,0,0,0.03)]')}>
      <Icon className="h-4 w-4"/> {label}
    </button>
  );

  if (!user) return (<div className="min-h-screen flex items-center justify-center" style={gradientBg}><div className="text-center text-slate-700">Giriş yapmanız gerekiyor.</div></div>);

  return (
    <div className="min-h-screen" style={gradientBg}>
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        {/* Header */}
        <div className="rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] backdrop-blur-md bg-white/70 border border-slate-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              <Avatar className="w-20 h-20 md:w-24 md:h-24 rounded-full shadow-md">
                {photo ? (
                  <AvatarImage src={photo} alt="Profil fotoğrafı" />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-2xl font-semibold">{headerInitials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xl md:text-2xl font-semibold text-slate-800">{headerDisplayName}</div>
                <div className="text-slate-500 text-sm md:text-base">{user.email}</div>
                <div className="mt-3 flex items-center gap-3">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoSelected} />
                  <Button variant="outline" className="hover:bg-slate-100" onClick={triggerPhotoPick}>
                    <ImageIcon className="h-4 w-4 mr-2"/> Fotoğrafı Güncelle
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-start md:items-center gap-3">
              <Button
                onClick={savePhoto}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md hover:shadow-lg"
                disabled={!dirtyPhoto || isSavingPhoto}
              >
                <Save className="h-4 w-4 mr-2"/> {isSavingPhoto ? 'Kaydediliyor...' : 'Fotoğrafı Kaydet'}
              </Button>
              {isCarrier && (
                <Button onClick={submitForApproval} disabled={!canSubmitForApproval || approvalStatus==='pending'} className={cn('bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-md hover:shadow-lg', (approvalStatus==='pending' || !canSubmitForApproval) && 'opacity-60 cursor-not-allowed')}>
                  <Send className="h-4 w-4 mr-2"/> {approvalStatus==='pending' ? 'Onay Beklemede' : 'Onaya Gönder'}
                </Button>
              )}
            </div>
          </div>

          {isCarrier && (
            <div className="mt-5 flex items-center gap-3">
              <Progress value={profileCompletion} className="h-2" />
              <span className="text-sm text-slate-600 whitespace-nowrap">
                {isProfileStatusLoading ? 'Güncelleniyor...' : `%${profileCompletion} tamamlandı`}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6 md:gap-8">
          {/* Sidebar */}
          <div className="lg:sticky h-fit" style={{ top: '5rem' }}>
            <div className="w-full bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
              <div className="font-medium text-slate-700 mb-3">Ayarlar</div>
              <div className="space-y-1">
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
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {isCarrier && active==='company' && (
                <Section key="company">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                    <div className="font-semibold text-slate-800 tracking-tight text-[18px] mb-4">Firma Bilgileri</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>E-posta (kayıtlı)</Label>
                        <Input className="mt-1" value={company.email} onChange={(e)=>setCompany({...company, email: e.target.value})} placeholder="ornek@firma.com" />
                      </div>
                      <div>
                        <Label>Firma Adı / Ünvanı</Label>
                        <Input className="mt-1" value={company.name} onChange={(e)=>setCompany({...company, name: e.target.value})} placeholder="Örn. ABC Lojistik A.Ş." />
                      </div>
                      <div>
                        <Label>Şirket Türü</Label>
                        <Select value={company.type} onValueChange={(v)=>setCompany({...company, type: v})}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Seçiniz"/></SelectTrigger>
                          <SelectContent>
                            {['Şahıs','Limited','A.Ş.','Kooperatif'].map(x=> (<SelectItem key={x} value={x}>{x}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Vergi Numarası</Label>
                        <Input className="mt-1" inputMode="numeric" maxLength={10} value={company.taxNumber} onChange={(e)=>setCompany({...company, taxNumber: e.target.value.replace(/\D/g,'').slice(0,10)})} placeholder="10 haneli" />
                      </div>
                      <div>
                        <Label>Kuruluş Yılı</Label>
                        <Select value={company.year} onValueChange={(v)=>setCompany({...company, year: v})}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Yıl seçiniz"/></SelectTrigger>
                          <SelectContent>
                            {Array.from({length: (new Date().getFullYear()-1990+1)}, (_,i)=>1990+i).reverse().map(y=> (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Hizmet Türü</Label>
                        <MultiSelect
                          label=" "
                          placeholder="Seçiniz"
                          options={serviceTypeOptions.length ? serviceTypeOptions.map(x=>x.name) : ["Şehir içi","Şehirler arası","Parsiyel","Ofis taşıma","Ev taşıma","Eşya depolama"]}
                          selectedValues={company.services}
                          onSelectionChange={(vals)=>setCompany({...company, services: vals})}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Çalışma Kapsamı</Label>
                         <MultiSelect
                          label=" "
                          placeholder="Seçiniz"
                          options={scopeOptions.length ? scopeOptions.map(x=>x.name) : ["Şehir İçi", "Şehirler Arası"]}
                          selectedValues={company.scopes || []}
                          onSelectionChange={(vals)=>setCompany({...company, scopes: vals})}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Araç Türü</Label>
                        <MultiSelect
                          label=" "
                          placeholder="Seçiniz"
                          options={vehicleTypesList.map(v => v.name)}
                          selectedValues={company.vehicleTypes && company.vehicleTypes.length ? company.vehicleTypes : (company.vehicleType ? [company.vehicleType] : [])}
                          onSelectionChange={(vals)=>{
                            // Seçimde olmayanların kapasitesini temizle
                            const keep = new Set(vals);
                            const nextCaps: Record<string,string> = {};
                            Object.entries(company.vehicleCapacities||{}).forEach(([k,v])=>{ if (keep.has(k)) nextCaps[k]=v; });
                            setCompany({...company, vehicleTypes: vals, vehicleType: vals[0] || '', vehicleCapacities: nextCaps});
                          }}
                        />
                        {(company.vehicleTypes && company.vehicleTypes.length>0) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            {company.vehicleTypes.map((t)=> (
                              <div key={t}>
                                <Label>{t} Kapasite (kg)</Label>
                                <Input
                                  className="mt-1"
                                  inputMode="numeric"
                                  value={(company.vehicleCapacities||{})[t] || ''}
                                  onChange={(e)=>{
                                    const v = e.target.value.replace(/\D/g,'');
                                    setCompany(prev=> ({...prev, vehicleCapacities: { ...(prev.vehicleCapacities||{}), [t]: v }}));
                                  }}
                                  placeholder="Örn. 3500"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-slate-500">Bu bilgiler firma kartınızda gösterilir ve admin doğrulamasında ilk değerlendirme alanıdır.</div>
                    <div className="mt-4 text-right"><Button variant="outline" onClick={persistCompanyAndVehicles}>Taslağı Kaydet</Button></div>
                  </div>
                </Section>
              )}
              {isCarrier && active==='operations' && (
                <Section key="operations">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                    <div className="font-semibold text-slate-800 tracking-tight text-[18px] mb-4">Faaliyet Bilgileri</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Şehir</Label>
                        <Select value={ops.city} onValueChange={(v)=>setOps({...ops, city: v})}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Seçiniz"/></SelectTrigger>
                          <SelectContent>
                            {CITIES_TR.map(c=> (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>İlçe</Label>
                        <Input className="mt-1" value={ops.district} onChange={(e)=>setOps({...ops, district: e.target.value})} />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Adres</Label>
                        <Input className="mt-1" value={ops.address1} onChange={(e)=>setOps({...ops, address1: e.target.value})} placeholder="Mahalle, Cadde/Sokak No" />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Hizmet Verdiğiniz Bölgeler</Label>
                        <MultiSelect label=" " placeholder="İl/ilçe seçin" options={CITIES_TR} selectedValues={ops.serviceAreas} onSelectionChange={(vals)=>setOps({...ops, serviceAreas: vals})} />
                      </div>
                      {/* Harita konumu alanları devre dışı bırakıldı */}
                    </div>
                    <div className="mt-4 text-sm text-slate-500">Bu bilgiler yakın konumdaki müşterilerle eşleşmenizi sağlar.</div>
                    <div className="mt-4 text-right"><Button variant="outline" onClick={async ()=>{
                      if (!user) return;
                      try {
                        await apiClient(`${API_BASE_URL}/carriers/${user.id}/activity`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            city: ops.city || undefined,
                            district: ops.district || undefined,
                            address: ops.address1 || undefined,
                            serviceAreas: ops.serviceAreas || undefined,
                          }),
                        });
                        persistCarrierDrafts();
                        toast.success('Faaliyet bilgileri kaydedildi.');
                        await refreshProfileStatus();
                      } catch {
                        toast.error('Faaliyet bilgileri kaydedilemedi.');
                      }
                    }}>Taslağı Kaydet</Button></div>
                  </div>
                </Section>
              )}
              {isCarrier && active==='documents' && (
                <Section key="documents">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                    <div className="font-semibold text-slate-800 tracking-tight text-[18px] mb-4">Belgeler</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FileUpload label="K Yetki Belgesi (K1/K2)" required onUpload={(files)=>setDocs(prev=>({...prev, kYetki: files}))} uploadedFiles={docs.kYetki} />
                      <FileUpload label="SRC Belgesi" required onUpload={(files)=>setDocs(prev=>({...prev, src: files}))} uploadedFiles={docs.src} />
                      <FileUpload label="Araç Ruhsatı (en az 1)" required onUpload={(files)=>setDocs(prev=>({...prev, ruhsat: files}))} uploadedFiles={docs.ruhsat} multiple />
                      <FileUpload label="Vergi Levhası" required onUpload={(files)=>setDocs(prev=>({...prev, vergi: files}))} uploadedFiles={docs.vergi} />
                      <FileUpload label="Sigorta Poliçesi (opsiyonel)" onUpload={(files)=>setDocs(prev=>({...prev, sigorta: files}))} uploadedFiles={docs.sigorta} />
                    </div>
                    <div className="mt-4 text-sm text-slate-500">Belgeler PDF/JPG/PNG olarak yüklenebilir. Admin tarafından doğrulanacaktır.</div>
                      <div className="mt-4 text-right">
                        <Button variant="outline" onClick={saveDocumentsDraft}>Taslağı Kaydet</Button>
                      </div>
                  </div>
                </Section>
              )}
              {isCarrier && active==='payouts' && (
                <Section key="payouts">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                    <div className="font-semibold text-slate-800 tracking-tight text-[18px] mb-4">Kazanç Bilgileri</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Banka Adı</Label>
                        <Input className="mt-1" value={payout.bank} onChange={(e)=>setPayout({...payout, bank: e.target.value})} />
                      </div>
                      <div>
                        <Label>IBAN</Label>
                        <Input className="mt-1" placeholder="TR________________________" value={payout.iban} onChange={(e)=>setPayout({...payout, iban: e.target.value.toUpperCase()})} />
                        {!isValidIban(payout.iban) && payout.iban && (<div className="text-xs text-red-500 mt-1">Geçerli bir IBAN girin (TR ile başlayan 26 hane)</div>)}
                      </div>
                      <div className="md:col-span-2">
                        <Label>Hesap Sahibi Ünvanı</Label>
                        <Input className="mt-1" value={payout.holder} onChange={(e)=>setPayout({...payout, holder: e.target.value})} />
                      </div>
                    </div>
                    <div className="mt-4 text-right"><Button variant="outline" onClick={async ()=>{
                      if (!user) return;
                      try {
                        await apiClient(`${API_BASE_URL}/carriers/profile/${user.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            bankName: payout.bank || undefined,
                            iban: payout.iban || undefined,
                            accountHolder: payout.holder || undefined,
                          }),
                        });
                        persistCarrierDrafts();
                        toast.success('Kazanç bilgileri kaydedildi.');
                        await refreshProfileStatus();
                      } catch {
                        toast.error('Kazanç bilgileri kaydedilemedi.');
                      }
                    }}>Taslağı Kaydet</Button></div>
                  </div>
                </Section>
              )}
              {active==='account' && (
                <Section key="account">
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle>Hesap Bilgileri</CardTitle>
                      <CardDescription>
                        {isCarrier ? 'Temel iletişim bilgilerinizi güncelleyin.' : 'Profil ve adres bilgilerinizi güncelleyin.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isCustomerProfileLoading && !isCarrier && (
                        <div className="mb-4 text-sm text-slate-500">Profil bilgileri yükleniyor...</div>
                      )}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div><Label>Ad</Label><Input value={form.name} onChange={(e)=>setForm(v=>({...v, name:e.target.value}))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="Adınız"/></div>
                        <div><Label>Soyad</Label><Input value={form.surname} onChange={(e)=>setForm(v=>({...v, surname:e.target.value}))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="Soyadınız"/></div>
                        <div><Label>E-posta</Label><Input type="email" value={form.email} onChange={(e)=>setForm(v=>({...v, email:e.target.value}))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="mail@ornek.com"/></div>
                        <div><Label>Telefon</Label><Input value={form.phone} onChange={(e)=>setForm(v=>({...v, phone:e.target.value}))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="+905xx..."/></div>
                        {!isCarrier && (
                          <>
                            <div><Label>Şehir</Label><Input value={customerProfileForm.city} onChange={(e)=>setCustomerProfileForm(v=>({...v, city:e.target.value}))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="Şehir"/></div>
                            <div><Label>İlçe</Label><Input value={customerProfileForm.district} onChange={(e)=>setCustomerProfileForm(v=>({...v, district:e.target.value}))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="İlçe"/></div>
                            <div className="md:col-span-2"><Label>Adres Satırı 1</Label><Input value={customerProfileForm.addressLine1} onChange={(e)=>setCustomerProfileForm(v=>({...v, addressLine1:e.target.value}))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="Mahalle, Cadde/Sokak"/></div>
                            <div className="md:col-span-2"><Label>Adres Satırı 2 (Opsiyonel)</Label><Input value={customerProfileForm.addressLine2} onChange={(e)=>setCustomerProfileForm(v=>({...v, addressLine2:e.target.value}))} className="mt-1 border border-slate-200 rounded-lg bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 placeholder:text-slate-400" placeholder="Daire, kat, kapı no"/></div>
                          </>
                        )}
                      </div>
                      <div className="sticky bottom-0 pt-6"><Button onClick={saveAll} disabled={!dirtyAccount || isCustomerProfileSaving} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md hover:shadow-lg disabled:opacity-60"><Save className="h-4 w-4 mr-2"/> {isCustomerProfileSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</Button></div>
                    </CardContent>
                  </Card>
                </Section>
              )}

              {active==='addresses' && (
                <Section key="addresses">
                  <div className="flex items-center justify-between mb-3"><div><div className="text-lg font-semibold text-slate-800">Adreslerim</div><div className="text-sm text-slate-500">Sadece manuel adres girişi desteklenir.</div></div><Button onClick={openNewAddress} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white"><Plus className="h-4 w-4 mr-2"/> Yeni Adres Ekle</Button></div>
                  <div className="space-y-4 max-w-5xl">
                    {addresses.length===0 && (<Card className="rounded-2xl"><CardContent className="p-8 text-center text-slate-500">Henüz adres eklemediniz.</CardContent></Card>)}
                    {addresses.map((a,i)=> (
                      <Card key={a.id} className="bg-white rounded-2xl shadow-md">
                        <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-slate-800">Adres #{i+1} — {a.title || 'Başlıksız'}</CardTitle><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>editAddress(a)}><PencilLine className="h-4 w-4 mr-1"/>Düzenle</Button><Button size="sm" variant="destructive" onClick={()=>removeAddress(a.id)}><Trash2 className="h-4 w-4 mr-1"/>Sil</Button></div></div></CardHeader>
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
                  <div className="sticky bottom-0 pt-6"><Button onClick={saveAll} disabled={!dirtyAddresses} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white disabled:opacity-60"><Save className="h-4 w-4 mr-2"/> Tüm Değişiklikleri Kaydet</Button></div>

                  <Dialog open={addrModalOpen} onOpenChange={setAddrModalOpen}>
                    <DialogContent className="sm:max-w-xl">
                      <DialogHeader><DialogTitle>Adres Düzenle</DialogTitle><DialogDescription>Bilgileri manuel doldurun. Konum alma özelliği kaldırıldı.</DialogDescription></DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2"><Label>Adres Başlığı</Label><Input value={editingAddress?.title||''} onChange={(e)=>setEditingAddress(p=>({...(p as Address), title:e.target.value}))} className="mt-1" placeholder="Ev, Ofis..."/></div>
                        <div className="md:col-span-2"><Label>Adres Satırı 1 (Mahalle)</Label><Input value={editingAddress?.line1||''} onChange={(e)=>setEditingAddress(p=>({...(p as Address), line1:e.target.value}))} className="mt-1" placeholder="Mahalle"/></div>
                        <div className="md:col-span-2"><Label>Adres Satırı 2 (Cadde/Sokak + No)</Label><Input value={editingAddress?.line2||''} onChange={(e)=>setEditingAddress(p=>({...(p as Address), line2:e.target.value}))} className="mt-1" placeholder="Cadde / Sokak No"/></div>
                        <div><Label>İlçe</Label><Input value={editingAddress?.district||''} onChange={(e)=>setEditingAddress(p=>({...(p as Address), district:e.target.value}))} className="mt-1"/></div>
                        <div><Label>Şehir</Label><Input value={editingAddress?.city||''} onChange={(e)=>setEditingAddress(p=>({...(p as Address), city:e.target.value}))} className="mt-1"/></div>
                        <div><Label>Posta Kodu</Label><Input value={editingAddress?.postalCode||''} onChange={(e)=>setEditingAddress(p=>({...(p as Address), postalCode:e.target.value}))} className="mt-1"/></div>
                        <div className="md:col-span-2"><Label>Ek Not (opsiyonel)</Label><Input value={editingAddress?.notes||''} onChange={(e)=>setEditingAddress(p=>({...(p as Address), notes:e.target.value}))} className="mt-1" placeholder="Daire, kat, kapı, yakın nokta..."/></div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setAddrModalOpen(false)}>İptal</Button><Button className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white" onClick={saveAddress}>Kaydet</Button></div>
                    </DialogContent>
                  </Dialog>
                </Section>
              )}

              {active==='payments' && (
                <Section key="payments">
                  <div className="flex items-center justify-between mb-3"><div><div className="text-lg font-semibold text-slate-800">Kayıtlı Kartlar</div><div className="text-sm text-slate-500">Kart bilgileri yerel olarak saklanır.</div></div><Button onClick={openNewCard} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white"><Plus className="h-4 w-4 mr-2"/> Yeni Kart</Button></div>
                  {cards.length===0 ? (
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
                          <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={()=>removeCard(c.id)}><Trash2 className="h-4 w-4 mr-1"/>Sil</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="sticky bottom-0 pt-6"><Button onClick={saveAll} disabled={!dirtyPayments} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white disabled:opacity-60"><Save className="h-4 w-4 mr-2"/> Değişiklikleri Kaydet</Button></div>

                  <Dialog open={cardModalOpen} onOpenChange={setCardModalOpen}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader><DialogTitle>Yeni Kart</DialogTitle><DialogDescription>Basit bir kart kaydı ekleyin.</DialogDescription></DialogHeader>
                      <div className="space-y-4">
                        <div><Label>Kart Sahibi</Label><Input value={cardDraft.holder} onChange={(e)=>setCardDraft(v=>({...v, holder:e.target.value}))} className="mt-1"/></div>
                        <div><Label>Kart Numarası</Label><Input value={cardDraft.number} onChange={(e)=>setCardDraft(v=>({...v, number:e.target.value}))} placeholder="**** **** **** 1234" className="mt-1"/></div>
                        <div><Label>SKT</Label><Input value={cardDraft.expiry} onChange={(e)=>setCardDraft(v=>({...v, expiry:e.target.value}))} placeholder="MM/YY" className="mt-1"/></div>
                        <div className="flex justify-end gap-2 pt-1"><Button variant="outline" onClick={()=>setCardModalOpen(false)}>İptal</Button><Button className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white" onClick={saveCard}>Ekle</Button></div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </Section>
              )}

              {active==='security' && (
                <Section key="security">
                  <Card className="rounded-2xl">
                    <CardHeader><CardTitle>Güvenlik</CardTitle><CardDescription>Şifrenizi güncelleyin ve iki aşamalı doğrulamayı yönetin.</CardDescription></CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-6">
                        <div>
                          <Label>Mevcut Şifre</Label>
                          <div className="relative mt-1 mb-3">
                            <Input type={showCurrentPwd ? 'text' : 'password'} value={currentPwd} onChange={(e)=>setCurrentPwd(e.target.value)} className="pr-12" placeholder="*******" />
                            <button type="button" aria-label="Mevcut şifreyi göster" className="absolute inset-y-0 right-2 flex items-center text-slate-500" onClick={()=>setShowCurrentPwd(prev=>!prev)}>
                              {showCurrentPwd ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label>Yeni Şifre</Label>
                          <div className="relative mt-1 mb-3">
                            <Input type={showNewPwd ? 'text' : 'password'} value={newPwd} onChange={(e)=>setNewPwd(e.target.value)} className="pr-12" placeholder="En az 6 karakter" />
                            <button type="button" aria-label="Yeni şifreyi göster" className="absolute inset-y-0 right-2 flex items-center text-slate-500" onClick={()=>setShowNewPwd(prev=>!prev)}>
                              {showNewPwd ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label>Yeni Şifre Tekrar</Label>
                          <div className="relative mt-1 mb-3">
                            <Input type={showNewPwdRepeat ? 'text' : 'password'} value={newPwd2} onChange={(e)=>setNewPwd2(e.target.value)} className="pr-12" />
                            <button type="button" aria-label="Yeni şifre tekrarı göster" className="absolute inset-y-0 right-2 flex items-center text-slate-500" onClick={()=>setShowNewPwdRepeat(prev=>!prev)}>
                              {showNewPwdRepeat ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-xl flex items-center justify-between">
                          <div><div className="font-medium text-slate-800 flex items-center gap-2"><Shield className="h-4 w-4"/> İki Aşamalı Doğrulama (2FA)</div><div className="text-sm text-slate-600">Hesabınızı SMS veya Authenticator ile koruyabilirsiniz.</div></div>
                          <Switch checked={twoFA} onCheckedChange={(v)=>setTwoFA(Boolean(v))}/>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
                          <div><div className="font-medium text-slate-800">Şüpheli Giriş Uyarıları</div><div className="text-sm text-slate-600">Farklı cihaz/IP giriş denemelerinde e-posta al.</div></div>
                          <Switch checked={suspiciousAlerts} onCheckedChange={(v)=>setSuspiciousAlerts(Boolean(v))}/>
                        </div>
                      </div>
                      <div className="sticky bottom-0 pt-6"><Button onClick={saveAll} disabled={!dirtySecurity || isCustomerPasswordSaving} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white disabled:opacity-60"><Save className="h-4 w-4 mr-2"/> {isCustomerPasswordSaving ? 'Güncelleniyor...' : 'Güncelle'}</Button></div>
                    </CardContent>
                  </Card>
                </Section>
              )}

              {active==='notifications' && (
                <Section key="notifications">
                  {/* Bildirimler: minimal, sade ve profesyonel görünüm; mantık aynı */}
                  <div className="space-y-8 bg-gradient-to-b from-[#F9FAFB] to-[#EFF6FF] p-6 md:p-8 rounded-2xl">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <h2 className="text-[18px] font-semibold text-slate-800">Bildirim Tercihleri</h2>
                        <p className="text-[14px] text-slate-500 mt-1">Hangi bildirimleri hangi kanallardan almak istediğinizi seçin.</p>
                      </div>
                      <Button variant="outline" className="rounded-lg px-4 py-2 text-sm font-medium border border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                        onClick={() => {
                          setNotif(prev => ({
                            ...prev,
                            groups: prev.groups.map(g => (
                              g.id === 'security'
                                ? g
                                : ({ ...g, items: g.items.map(i => ({ ...i, enabled: false })) })
                            ))
                          }));
                          toast.success('Güvenlik hariç tüm bildirimler devre dışı bırakıldı.');
                        }}
                      >Tümünü Devre Dışı Bırak (Güvenlik hariç)</Button>
                    </div>
                    {notif.groups.map((group, gi) => {
                      const isOpen = groupOpen[group.id] ?? true;
                      return (
                        <div key={group.id} className={cn('border border-slate-200 rounded-xl overflow-hidden', gi>0 && 'mt-8')}>
                          {/* Grup başlığı */}
                          <button
                            type="button"
                            onClick={() => setGroupOpen(m => ({ ...m, [group.id]: !isOpen }))}
                            className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
                          >
                            <div className="font-semibold text-[16px] text-slate-800">{group.title}</div>
                            <ChevronDown className={cn('h-4 w-4 text-slate-500 transition-transform', isOpen ? 'rotate-180' : 'rotate-0')} />
                          </button>
                          {/* Grup açıklaması */}
                          <div className="px-5 py-2 text-sm text-slate-500 border-b border-slate-200">{group.description}</div>

                          {/* Grup içerik */}
                          <div className={cn('transition-all duration-300 ease-out overflow-hidden', isOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0')}
                          >
                            <div className="divide-y divide-slate-200">
                              {group.items.map((it) => {
                                const quietBlocked = notif.extras.quietMode && group.id !== 'security';
                                const disabled = !it.enabled || quietBlocked;
                                return (
                                  <div key={it.id} className="px-5 py-4">
                                    <div className="flex items-start justify-between gap-6">
                                      <div className="flex-1">
                                        <div className="font-medium text-slate-700">{it.title}</div>
                                        {it.description && <div className="text-sm text-slate-500 mt-1">{it.description}</div>}
                                      </div>
                                      <Switch
                                        className="w-[44px] h-[24px] data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-500 data-[state=unchecked]:bg-slate-300 transition-all ease-in-out duration-200"
                                        checked={it.enabled}
                                        disabled={quietBlocked}
                                        onCheckedChange={(v)=>{
                                          setNotif(prev => ({
                                            ...prev,
                                            groups: prev.groups.map(g => g.id===group.id ? ({
                                              ...g,
                                              items: g.items.map(x => x.id===it.id ? ({...x, enabled: Boolean(v)}) : x)
                                            }) : g)
                                          }));
                                        }}
                                      />
                                    </div>
                                    <div className={cn('grid grid-cols-2 sm:flex sm:flex-row gap-3 sm:gap-4 mt-3', disabled && 'opacity-60 cursor-not-allowed')} aria-disabled={disabled}>
                                      {[
                                        { key:'email', label:'E-posta' },
                                        { key:'sms', label:'SMS' },
                                        { key:'app', label:'Uygulama içi' },
                                        { key:'browser', label:'Tarayıcı' },
                                      ].map(({ key, label }) => {
                                        const ck = key as ChannelKey;
                                        const checked = it.channels[ck];
                                        return (
                                          <label key={key} className="inline-flex items-center gap-2 select-none">
                                            <Checkbox
                                              disabled={disabled}
                                              checked={checked}
                                              onCheckedChange={(v)=>{
                                                if (disabled) return;
                                                setNotif(prev => ({
                                                  ...prev,
                                                  groups: prev.groups.map(g => g.id===group.id ? ({
                                                    ...g,
                                                    items: g.items.map(x => x.id===it.id ? ({ ...x, channels: { ...x.channels, [ck]: Boolean(v) } }) : x)
                                                  }) : g)
                                                }));
                                              }}
                                              className="h-[18px] w-[18px] rounded-[6px] border-[1.5px] border-slate-300 data-[state=checked]:border-transparent data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-500"
                                            />
                                            <span className="text-[14px] text-slate-600">{label}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Extras */}
                    <div className="border-t border-slate-200 pt-6">
                      <h3 className="text-slate-800 font-semibold mb-2">Ek Tercihler</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 md:p-8 hover:shadow-[0_6px_28px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] transition-all duration-300 ease-in-out">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-800 tracking-tight text-[16.5px]">Sessiz Mod</div>
                              <div className="text-slate-500 text-sm">Sadece güvenlik bildirimleri aktif kalsın.</div>
                            </div>
                            <Switch
                              className="w-12 h-6 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-500 data-[state=unchecked]:bg-slate-300 transition-all duration-300 hover:scale-[1.08]"
                              checked={notif.extras.quietMode}
                              onCheckedChange={(v)=>setNotif(prev=>({ ...prev, extras: { ...prev.extras, quietMode: Boolean(v) } }))}
                            />
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 md:p-8 hover:shadow-[0_6px_28px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] transition-all duration-300 ease-in-out">
                          <div className="font-semibold text-slate-800 tracking-tight text-[16.5px]">Bildirim Saat Aralığı</div>
                          <div className="text-slate-500 text-sm">Belirli saatlerde bildirim alın.</div>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <Input value={notif.extras.timeWindow.start} onChange={(e)=>setNotif(prev=>({ ...prev, extras: { ...prev.extras, timeWindow: { ...prev.extras.timeWindow, start: e.target.value } } }))} placeholder="09:00" />
                            <Input value={notif.extras.timeWindow.end} onChange={(e)=>setNotif(prev=>({ ...prev, extras: { ...prev.extras, timeWindow: { ...prev.extras.timeWindow, end: e.target.value } } }))} placeholder="22:00" />
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 md:p-8 hover:shadow-[0_6px_28px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] transition-all duration-300 ease-in-out">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-800 tracking-tight text-[16.5px]">Günlük Özet</div>
                              <div className="text-slate-500 text-sm">Günde bir kez e-posta özeti.</div>
                            </div>
                            <Switch
                              className="w-12 h-6 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-500 data-[state=unchecked]:bg-slate-300 transition-all duration-300 hover:scale-[1.08]"
                              checked={notif.extras.dailySummary}
                              onCheckedChange={(v)=>setNotif(prev=>({ ...prev, extras: { ...prev.extras, dailySummary: Boolean(v) } }))}
                            />
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 md:p-8 hover:shadow-[0_6px_28px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] transition-all duration-300 ease-in-out">
                          <div className="font-semibold text-slate-800 tracking-tight text-[16.5px]">SMS Gönderim Limiti</div>
                          <div className="text-slate-500 text-sm">Günlük SMS üst sınırı.</div>
                          <div className="mt-3">
                            <Input type="number" min={0} value={notif.extras.smsLimit}
                              onChange={(e)=>setNotif(prev=>({ ...prev, extras: { ...prev.extras, smsLimit: Math.max(0, Number(e.target.value||0)) } }))} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Basit: tüm içeriklerin sonunda tek bir kaydet butonu */}
                    <div className="mt-6 flex justify-end">
                      <Button
                        onClick={saveAll}
                        disabled={!dirtyNotifications}
                        className={cn(
                          'bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-lg px-5 py-2 font-medium',
                          !dirtyNotifications && 'opacity-50 cursor-not-allowed',
                          dirtyNotifications && 'hover:brightness-110'
                        )}
                      >
                        <Save className="h-4 w-4 mr-2"/> Tercihleri Kaydet
                      </Button>
                    </div>
                  </div>
                </Section>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}