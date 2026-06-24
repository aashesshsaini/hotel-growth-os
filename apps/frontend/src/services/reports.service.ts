import { apiGet } from '@/lib/api';
export const getReports = () => apiGet<Record<string, number>>('/reports');
