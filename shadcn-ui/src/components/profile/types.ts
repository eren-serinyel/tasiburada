import { User } from '@/lib/types';

export type SidebarKey = 'account' | 'addresses' | 'payments' | 'security' | 'notifications' | 'company' | 'operations' | 'documents' | 'payouts';

export type Address = { id: string; title: string; line1: string; line2?: string; district?: string; city?: string; postalCode?: string; notes?: string };
export type CardItem = { id: string; holder: string; number: string; expiry: string };

export type ChannelKey = 'email' | 'sms' | 'app' | 'browser';
export type Channels = Record<ChannelKey, boolean>;
export type NotifItem = { id: string; title: string; description?: string; enabled: boolean; channels: Channels };
export type NotifGroup = { id: string; title: string; description?: string; items: NotifItem[] };
export type NotifState = {
  groups: NotifGroup[];
  extras: {
    quietMode: boolean;
    timeWindow: { start: string; end: string };
    dailySummary: boolean;
    smsLimit: number;
  };
};

export type VehicleType = { id: number; name: string; defaultCapacityKg: number; defaultCapacityM3: number };

export interface SectionProps {
  user: User;
  onUserUpdate?: (user: User) => void;
  refreshProfileStatus?: () => Promise<void>;
}
