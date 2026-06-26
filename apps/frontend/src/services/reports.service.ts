import { apiGet } from '@/lib/api';
import type {
  CategoryReport,
  LegacyReportsResponse,
  ReportCategory,
  ReportExportResult,
  ReportsSummary,
} from '@/types';

export interface ReportQueryParams {
  period?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  hotelId?: string;
}

export interface ExportQueryParams extends ReportQueryParams {
  format?: 'csv' | 'excel' | 'pdf';
}

export const getReports = () => apiGet<LegacyReportsResponse>('/reports');

export const getReportsSummary = (params?: ReportQueryParams) =>
  apiGet<ReportsSummary>('/reports/summary', params);

export const getReportCategories = () =>
  apiGet<{ categories: Array<{ id: ReportCategory; title: string; description: string; group: string }> }>(
    '/reports/categories'
  );

export const getCategoryReport = (category: ReportCategory, params?: ReportQueryParams) =>
  apiGet<CategoryReport>(`/reports/${category}`, params);

export const exportCategoryReport = (category: ReportCategory, params?: ExportQueryParams) =>
  apiGet<ReportExportResult>(`/reports/${category}/export`, params);
