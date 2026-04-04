import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { Save, ChevronDown } from 'lucide-react';
import type { SectionProps, NotifState, ChannelKey } from './types';
import { defaultNotif, defaultCarrierNotif } from './helpers';

export default function NotificationSection({ user }: SectionProps) {
  const isCarrier = user.type === 'carrier';
  const [notif, setNotif] = useState<NotifState>(isCarrier ? defaultCarrierNotif() : defaultNotif());
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((isCarrier ? defaultCarrierNotif() : defaultNotif()).groups.map(g => [g.id, true]))
  );
  const [dirty, setDirty] = useState(false);

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`profile_notif_${user.id}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (isCarrier) {
        const carrierGroupIds = new Set(['process', 'reviews', 'security', 'system']);
        const ok = parsed?.groups && Array.isArray(parsed.groups) && parsed.groups.every((g: any) => carrierGroupIds.has(g.id));
        if (ok) { setNotif(parsed); setGroupOpen(Object.fromEntries(parsed.groups.map((g: any) => [g.id, true]))); }
      } else {
        if (parsed?.groups) { setNotif(parsed); setGroupOpen(Object.fromEntries(parsed.groups.map((g: any) => [g.id, true]))); }
      }
    } catch {}
  }, [user.id, isCarrier]);

  useEffect(() => { setDirty(true); }, [notif]);

  const save = () => {
    try { localStorage.setItem(`profile_notif_${user.id}`, JSON.stringify(notif)); } catch {}
    setDirty(false);
    toast.success('Bildirim tercihleri kaydedildi.');
  };

  const channelLabels: Record<ChannelKey, string> = { email: 'E-posta', sms: 'SMS', app: 'Uygulama', browser: 'Tarayıcı' };

  return (
    <div className="space-y-8 bg-gradient-to-b from-[#F9FAFB] to-[#EFF6FF] p-6 md:p-8 rounded-2xl">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-[18px] font-semibold text-slate-800">Bildirim Tercihleri</h2>
          <p className="text-[14px] text-slate-500 mt-1">Hangi bildirimleri hangi kanallardan almak istediğinizi seçin.</p>
        </div>
        <Button variant="outline" className="rounded-lg px-4 py-2 text-sm font-medium border border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
          onClick={() => {
            setNotif(prev => ({ ...prev, groups: prev.groups.map(g => g.id === 'security' ? g : ({ ...g, items: g.items.map(i => ({ ...i, enabled: false })) })) }));
            toast.success('Güvenlik hariç tüm bildirimler devre dışı bırakıldı.');
          }}
        >Tümünü Devre Dışı Bırak (Güvenlik hariç)</Button>
      </div>

      {notif.groups.map((group, gi) => {
        const isOpen = groupOpen[group.id] ?? true;
        return (
          <div key={group.id} className={cn('border border-slate-200 rounded-xl overflow-hidden', gi > 0 && 'mt-8')}>
            <button type="button" onClick={() => setGroupOpen(m => ({ ...m, [group.id]: !isOpen }))}
              className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200">
              <div className="font-semibold text-[16px] text-slate-800">{group.title}</div>
              <ChevronDown className={cn('h-4 w-4 text-slate-500 transition-transform', isOpen ? 'rotate-180' : 'rotate-0')} />
            </button>
            <div className="px-5 py-2 text-sm text-slate-500 border-b border-slate-200">{group.description}</div>
            <div className={cn('transition-all duration-300 ease-out overflow-hidden', isOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0')}>
              <div className="divide-y divide-slate-200">
                {group.items.map(it => {
                  const quietBlocked = notif.extras.quietMode && group.id !== 'security';
                  const disabled = !it.enabled || quietBlocked;
                  return (
                    <div key={it.id} className={cn('flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4', quietBlocked && 'opacity-40 pointer-events-none')}>
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Switch className="w-11 h-6 shrink-0 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-500 data-[state=unchecked]:bg-slate-300 transition-all duration-300 hover:scale-[1.08]"
                          checked={it.enabled}
                          onCheckedChange={(v) => setNotif(prev => ({
                            ...prev, groups: prev.groups.map(g => g.id !== group.id ? g : ({ ...g, items: g.items.map(i => i.id !== it.id ? i : ({ ...i, enabled: Boolean(v) })) }))
                          }))}
                        />
                        <div className="min-w-0"><div className="font-semibold text-slate-800 tracking-tight text-[15px] truncate">{it.title}</div>{it.description && <div className="text-slate-500 text-[13px] leading-snug mt-0.5">{it.description}</div>}</div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {(Object.keys(it.channels) as ChannelKey[]).map(ch => (
                          <label key={ch} className={cn('flex items-center gap-1.5 text-xs select-none', disabled && 'opacity-40 pointer-events-none')}>
                            <Checkbox className="h-4 w-4 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" checked={it.channels[ch]}
                              onCheckedChange={(v) => setNotif(prev => ({
                                ...prev, groups: prev.groups.map(g => g.id !== group.id ? g : ({ ...g, items: g.items.map(i => i.id !== it.id ? i : ({ ...i, channels: { ...i.channels, [ch]: Boolean(v) } })) }))
                              }))}
                            />
                            <span className="text-slate-600">{channelLabels[ch]}</span>
                          </label>
                        ))}
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
              <div><div className="font-semibold text-slate-800 tracking-tight text-[16.5px]">Sessiz Mod</div><div className="text-slate-500 text-sm">Sadece güvenlik bildirimleri aktif kalsın.</div></div>
              <Switch className="w-12 h-6 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-500 data-[state=unchecked]:bg-slate-300 transition-all duration-300 hover:scale-[1.08]"
                checked={notif.extras.quietMode}
                onCheckedChange={(v) => setNotif(prev => ({ ...prev, extras: { ...prev.extras, quietMode: Boolean(v) } }))}
              />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 md:p-8 hover:shadow-[0_6px_28px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] transition-all duration-300 ease-in-out">
            <div className="font-semibold text-slate-800 tracking-tight text-[16.5px]">Bildirim Saat Aralığı</div>
            <div className="text-slate-500 text-sm">Belirli saatlerde bildirim alın.</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Input value={notif.extras.timeWindow.start} onChange={(e) => setNotif(prev => ({ ...prev, extras: { ...prev.extras, timeWindow: { ...prev.extras.timeWindow, start: e.target.value } } }))} placeholder="09:00" />
              <Input value={notif.extras.timeWindow.end} onChange={(e) => setNotif(prev => ({ ...prev, extras: { ...prev.extras, timeWindow: { ...prev.extras.timeWindow, end: e.target.value } } }))} placeholder="22:00" />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 md:p-8 hover:shadow-[0_6px_28px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-between">
              <div><div className="font-semibold text-slate-800 tracking-tight text-[16.5px]">Günlük Özet</div><div className="text-slate-500 text-sm">Günde bir kez e-posta özeti.</div></div>
              <Switch className="w-12 h-6 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-500 data-[state=unchecked]:bg-slate-300 transition-all duration-300 hover:scale-[1.08]"
                checked={notif.extras.dailySummary}
                onCheckedChange={(v) => setNotif(prev => ({ ...prev, extras: { ...prev.extras, dailySummary: Boolean(v) } }))}
              />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 md:p-8 hover:shadow-[0_6px_28px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] transition-all duration-300 ease-in-out">
            <div className="font-semibold text-slate-800 tracking-tight text-[16.5px]">SMS Gönderim Limiti</div>
            <div className="text-slate-500 text-sm">Günlük SMS üst sınırı.</div>
            <div className="mt-3"><Input type="number" min={0} value={notif.extras.smsLimit} onChange={(e) => setNotif(prev => ({ ...prev, extras: { ...prev.extras, smsLimit: Math.max(0, Number(e.target.value || 0)) } }))} /></div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={!dirty}
          className={cn('bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-lg px-5 py-2 font-medium', !dirty && 'opacity-50 cursor-not-allowed', dirty && 'hover:brightness-110')}>
          <Save className="h-4 w-4 mr-2" /> Tercihleri Kaydet
        </Button>
      </div>
    </div>
  );
}
