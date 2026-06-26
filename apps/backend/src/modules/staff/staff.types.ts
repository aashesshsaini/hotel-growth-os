export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface StaffStatsResult {
  total: number;
  active: number;
  inactive: number;
  onDuty: number;
  offDuty: number;
  onLeave: number;
  suspended: number;
  resigned: number;
  presentToday: number;
  lateToday: number;
  byRole: Record<string, number>;
  byDepartment: Record<string, number>;
  byShift: Record<string, number>;
}

export type SanitizedStaff = Record<string, unknown>;
