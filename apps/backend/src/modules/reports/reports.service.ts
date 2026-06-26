import { ForbiddenError, ValidationError } from '../../utils/errors';
import {
  buildReportExportRepository,
  getCategoryReportRepository,
  getLegacyReportsRepository,
  getReportsSummaryRepository,
  REPORT_CATEGORY_META,
  resolveReportDateRange,
} from './report.repository';
import {
  CategoryReport,
  LegacyReportsResponse,
  ReportCategory,
  ReportExportResult,
  ReportsSummary,
  ViewerContext,
} from './report.types';
import { ExportQuery, ReportQuery } from './reports.validation';

const REPORT_VIEW_ROLES = [
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
  if (!REPORT_VIEW_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to view reports');
  }
};

const assertHotelAccess = (viewer: ViewerContext, hotelId: string): void => {
  if (viewer.role !== 'super_admin' && viewer.hotelId !== hotelId) {
    throw new ForbiddenError('Access denied to this hotel');
  }
};

const resolveRange = (query: ReportQuery) => {
  if (query.period === 'custom' && (!query.fromDate || !query.toDate)) {
    throw new ValidationError('Custom period requires fromDate and toDate');
  }
  return resolveReportDateRange(query.period, query.fromDate, query.toDate);
};

const filterReportRows = (report: CategoryReport, search?: string): CategoryReport => {
  if (!search?.trim()) return report;
  const term = search.trim().toLowerCase();
  const rows = report.rows.filter((row) =>
    Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term))
  );
  return { ...report, rows, totalRows: rows.length };
};

export const getReports = async (viewer: ViewerContext): Promise<LegacyReportsResponse> => {
  assertCanView(viewer);
  return getLegacyReportsRepository(viewer.hotelId);
};

export const getSummary = async (query: ReportQuery, viewer: ViewerContext): Promise<ReportsSummary> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const range = resolveRange(query);
  return getReportsSummaryRepository(hotelId, range);
};

export const getCategories = () => ({
  categories: REPORT_CATEGORY_META,
});

export const getCategoryReport = async (
  category: ReportCategory,
  query: ReportQuery,
  viewer: ViewerContext
): Promise<CategoryReport> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const range = resolveRange(query);
  const report = await getCategoryReportRepository(hotelId, category, range);
  return filterReportRows(report, query.search);
};

export const exportCategoryReport = async (
  category: ReportCategory,
  query: ExportQuery,
  viewer: ViewerContext
): Promise<ReportExportResult> => {
  const report = await getCategoryReport(category, query, viewer);
  return buildReportExportRepository(report, query.format);
};
