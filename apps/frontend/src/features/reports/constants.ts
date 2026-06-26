import type { LucideIcon } from 'lucide-react';
import {
  BedDouble,
  CalendarDays,
  IndianRupee,
  Megaphone,
  MessageCircle,
  Sparkles,
  Star,
  Users,
  Wallet,
  Wrench,
  UserCog,
  TrendingUp,
} from 'lucide-react';
import type { ReportCategory } from '@/types';

export const REPORT_PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
] as const;

export const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel' },
  { value: 'pdf', label: 'PDF / Print' },
] as const;

export const QUICK_REPORTS: Array<{ category: ReportCategory; label: string; description: string }> = [
  { category: 'revenue', label: 'Revenue Summary', description: 'Collected revenue and payment trends' },
  { category: 'bookings', label: 'Booking Activity', description: 'Reservations, cancellations, and no-shows' },
  { category: 'occupancy', label: 'Occupancy Snapshot', description: 'Current room utilization by type' },
  { category: 'payments', label: 'Payment Collections', description: 'Collections, pending, and refunds' },
  { category: 'leads', label: 'Lead Funnel', description: 'Pipeline conversion and hot leads' },
  { category: 'reviews', label: 'Reputation Report', description: 'Ratings and review performance' },
];

export const CATEGORY_ICONS: Record<ReportCategory, LucideIcon> = {
  bookings: CalendarDays,
  guests: Users,
  revenue: IndianRupee,
  payments: Wallet,
  occupancy: TrendingUp,
  rooms: BedDouble,
  leads: Users,
  campaigns: Megaphone,
  whatsapp: MessageCircle,
  reviews: Star,
  staff: UserCog,
  housekeeping: Sparkles,
  maintenance: Wrench,
};

export const CATEGORY_TONES: Record<ReportCategory, 'indigo' | 'emerald' | 'amber' | 'violet' | 'rose' | 'sky'> = {
  bookings: 'indigo',
  guests: 'violet',
  revenue: 'emerald',
  payments: 'amber',
  occupancy: 'sky',
  rooms: 'indigo',
  leads: 'rose',
  campaigns: 'violet',
  whatsapp: 'emerald',
  reviews: 'amber',
  staff: 'indigo',
  housekeeping: 'sky',
  maintenance: 'rose',
};

export const SAVED_REPORTS_STORAGE_KEY = 'hgo-saved-reports';
export const EXPORT_HISTORY_STORAGE_KEY = 'hgo-report-export-history';

export interface SavedReportItem {
  id: string;
  category: ReportCategory;
  label: string;
  period: string;
  createdAt: string;
}

export interface ExportHistoryItem {
  id: string;
  category: ReportCategory;
  format: string;
  filename: string;
  exportedAt: string;
}
