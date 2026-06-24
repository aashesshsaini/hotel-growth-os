export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface StaffStatsResult {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byRole: Record<string, number>;
  byDepartment: Record<string, number>;
}

export type SanitizedStaff = Record<string, unknown>;
