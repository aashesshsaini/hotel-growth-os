import { ForbiddenError, ValidationError } from '../../utils/errors';
import { AnalyticsQuery, ExportQuery } from './analytics.validation';
import {
  buildAnalyticsExportRepository,
  getAnalyticsOverviewRepository,
  resolveDateRange,
} from './analytics.repository';
import { AnalyticsExportResult, AnalyticsOverview, ViewerContext } from './analytics.types';

const ANALYTICS_VIEW_ROLES = [
  'super_admin',
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'accountant',
];

const resolveHotelId = (hotelId: string | undefined, fallbackHotelId?: string): string => {
  const resolved = hotelId ?? fallbackHotelId;
  if (!resolved) throw new ValidationError('Hotel ID is required');
  return resolved;
};

const assertCanView = (viewer: ViewerContext): void => {
  if (!ANALYTICS_VIEW_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to view analytics');
  }
};

export const getOverview = async (query: AnalyticsQuery, viewer: ViewerContext): Promise<AnalyticsOverview> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  if (viewer.role !== 'super_admin' && viewer.hotelId !== hotelId) {
    throw new ForbiddenError('Access denied to this hotel');
  }
  if (query.period === 'custom' && (!query.fromDate || !query.toDate)) {
    throw new ValidationError('Custom period requires fromDate and toDate');
  }
  const range = resolveDateRange(query.period, query.fromDate, query.toDate);
  return getAnalyticsOverviewRepository(hotelId, range);
};

export const exportAnalytics = async (query: ExportQuery, viewer: ViewerContext): Promise<AnalyticsExportResult> => {
  const overview = await getOverview(query, viewer);
  return buildAnalyticsExportRepository(overview, query.type);
};
