export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export type ReportCategory =
  | 'bookings'
  | 'guests'
  | 'revenue'
  | 'payments'
  | 'occupancy'
  | 'rooms'
  | 'leads'
  | 'campaigns'
  | 'whatsapp'
  | 'reviews'
  | 'staff'
  | 'housekeeping'
  | 'maintenance';

export type ReportPeriod =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

export type ReportExportFormat = 'csv' | 'excel' | 'pdf';

export interface ReportDateRange {
  from: string;
  to: string;
  period: ReportPeriod;
}

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface ReportCategoryMeta {
  id: ReportCategory;
  title: string;
  description: string;
  group: 'sales' | 'finance' | 'operations' | 'marketing' | 'people';
}

export interface ReportCategorySummary {
  id: ReportCategory;
  title: string;
  description: string;
  metric: string | number;
  metricLabel: string;
  recordCount: number;
}

export interface ReportsSummary {
  generatedAt: string;
  dateRange: ReportDateRange;
  categories: ReportCategorySummary[];
}

export interface CategoryReport {
  category: ReportCategory;
  title: string;
  description: string;
  generatedAt: string;
  dateRange: ReportDateRange;
  summary: Record<string, string | number>;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

export interface ReportExportResult {
  filename: string;
  contentType: string;
  data: string;
  format: ReportExportFormat;
}

export interface LegacyReportsResponse {
  bookings: number;
  guests: number;
  revenue: number;
}

export interface ResolvedReportDateRange {
  from: Date;
  to: Date;
  period: ReportPeriod;
}
