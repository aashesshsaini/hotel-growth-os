import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BedDouble,
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  FileText,
  Flag,
  HeartPulse,
  Home,
  Hotel,
  MessageCircle,
  Megaphone,
  Plug,
  Receipt,
  Settings,
  ShieldCheck,
  Star,
  Target,
  UserCheck,
  Users,
  WalletCards,
  Wrench,
} from 'lucide-react';

export interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

export type ProductSurface = 'platform' | 'hotel';

export const getProductSurface = (role?: string): ProductSurface =>
  role === 'super_admin' ? 'platform' : 'hotel';

export const PRODUCT_COPY: Record<ProductSurface, { title: string; subtitle: string; badge: string }> = {
  platform: {
    title: 'Platform Console',
    subtitle: 'Manage SaaS tenants, health, billing, and global controls',
    badge: 'SaaS Platform',
  },
  hotel: {
    title: 'Hotel Portal',
    subtitle: 'Run hotel operations, CRM, revenue, and guest experience',
    badge: 'Hotel Operations',
  },
};

export const PLATFORM_NAVIGATION: NavigationSection[] = [
  {
    label: 'Platform',
    items: [
      { href: '/dashboard', label: 'Platform Dashboard', icon: Home },
      { href: '/hotels', label: 'Hotel Management', icon: Hotel },
      { href: '/subscriptions', label: 'Subscriptions', icon: WalletCards },
      { href: '/plans', label: 'Plans', icon: ClipboardList },
      { href: '/billing', label: 'Billing', icon: DollarSign },
      { href: '/invoices', label: 'Invoices', icon: Receipt },
      { href: '/users', label: 'Users', icon: Users },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/analytics', label: 'Platform Analytics', icon: BarChart3 },
      { href: '/reports', label: 'Platform Reports', icon: DollarSign },
    ],
  },
  {
    label: 'Governance',
    items: [
      { href: '/support', label: 'Support Center', icon: MessageCircle },
      { href: '/audit-logs', label: 'Audit Logs', icon: FileText },
      { href: '/notifications', label: 'Platform Notifications', icon: Bell },
      { href: '/integrations', label: 'Integrations', icon: Plug },
      { href: '/system-health', label: 'System Health', icon: HeartPulse },
      { href: '/feature-flags', label: 'Feature Flags', icon: Flag },
      { href: '/settings', label: 'Global Settings', icon: Settings },
      { href: '/profile', label: 'Profile', icon: ShieldCheck },
    ],
  },
];

export const HOTEL_NAVIGATION: NavigationSection[] = [
  {
    label: 'Core Operations',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: Home },
      { href: '/bookings', label: 'Bookings', icon: CalendarDays },
      { href: '/booking-calendar', label: 'Booking Calendar', icon: CalendarDays },
      { href: '/rooms', label: 'Rooms', icon: BedDouble },
      { href: '/housekeeping', label: 'Housekeeping', icon: ClipboardCheck },
      { href: '/maintenance', label: 'Maintenance', icon: Wrench },
      { href: '/room-types', label: 'Room Types', icon: Hotel },
      { href: '/guests', label: 'Guest CRM', icon: Users },
      { href: '/payments', label: 'Payments', icon: WalletCards },
      { href: '/staff', label: 'Staff', icon: UserCheck },
    ],
  },
  {
    label: 'Leads & CRM',
    items: [
      { href: '/leads', label: 'Lead Center', icon: Target },
      { href: '/enquiries', label: 'Enquiries', icon: MessageCircle },
      { href: '/corporate-leads', label: 'Corporate Leads', icon: Building2 },
      { href: '/event-leads', label: 'Event Leads', icon: CalendarDays },
      { href: '/follow-ups', label: 'Follow-ups', icon: ClipboardList },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
      { href: '/whatsapp', label: 'WhatsApp Automation', icon: MessageCircle },
      { href: '/reviews', label: 'Review Growth', icon: Star },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/reports', label: 'Reports', icon: DollarSign },
    ],
  },
  {
    label: 'Automation',
    items: [
      { href: '/tasks', label: 'Tasks', icon: ClipboardList },
      { href: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Hotel Settings',
    items: [
      { href: '/integrations', label: 'Hotel Integrations', icon: Plug },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const getNavigationSections = (role?: string): NavigationSection[] =>
  getProductSurface(role) === 'platform' ? PLATFORM_NAVIGATION : HOTEL_NAVIGATION;
