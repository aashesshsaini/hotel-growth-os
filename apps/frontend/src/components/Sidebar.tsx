'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BedDouble,
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  DollarSign,
  Home,
  Hotel,
  MessageCircle,
  Megaphone,
  Plug,
  Settings,
  Star,
  Target,
  UserCheck,
  Users,
  WalletCards,
} from 'lucide-react';

const sections = [
  {
    label: 'Core Operations',
    items: [
      ['/dashboard', 'Dashboard', Home],
      ['/bookings', 'Bookings', CalendarDays],
      ['/booking-calendar', 'Booking Calendar', CalendarDays],
      ['/rooms', 'Rooms', BedDouble],
      ['/room-types', 'Room Types', Hotel],
      ['/guests', 'Guest CRM', Users],
      ['/payments', 'Payments', WalletCards],
      ['/staff', 'Staff', UserCheck],
    ],
  },
  {
    label: 'Leads & CRM',
    items: [
      ['/leads', 'Lead Center', Target],
      ['/enquiries', 'Enquiries', MessageCircle],
      ['/corporate-leads', 'Corporate Leads', Building2],
      ['/event-leads', 'Event Leads', CalendarDays],
      ['/follow-ups', 'Follow-ups', ClipboardList],
    ],
  },
  {
    label: 'Growth',
    items: [
      ['/campaigns', 'Campaigns', Megaphone],
      ['/whatsapp', 'WhatsApp Automation', MessageCircle],
      ['/reviews', 'Review Growth', Star],
    ],
  },
  {
    label: 'Analytics',
    items: [
      ['/analytics', 'Analytics', BarChart3],
      ['/reports', 'Reports', DollarSign],
    ],
  },
  {
    label: 'Automation',
    items: [
      ['/tasks', 'Tasks', ClipboardList],
      ['/notifications', 'Notifications', Bell],
    ],
  },
  {
    label: 'Platform',
    items: [
      ['/hotels', 'Hotel Management', Hotel],
      ['/integrations', 'Integrations', Plug],
      ['/settings', 'Settings', Settings],
    ],
  },
] as const;

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 lg:block">
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-slate-950 p-4 text-white">
        <p className="font-bold">Hotel Growth OS</p>
        <p className="text-xs text-indigo-100">Growth, CRM & operations platform</p>
      </div>
      <nav className="space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map(([href, label, Icon]) => {
                const active = path === href || (href !== '/dashboard' && path.startsWith(`${href}/`));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
