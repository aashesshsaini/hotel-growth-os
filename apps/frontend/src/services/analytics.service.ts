import { apiGet } from '@/lib/api';
import type { AnalyticsExportResult, AnalyticsOverview, ListParams } from '@/types';

export const getAnalyticsOverview = (params?: ListParams) =>
  apiGet<AnalyticsOverview>('/analytics/overview', params);

export const exportAnalytics = (params?: ListParams) =>
  apiGet<AnalyticsExportResult>('/analytics/export', params);
