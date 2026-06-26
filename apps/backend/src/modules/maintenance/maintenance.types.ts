export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface MaintenanceStatsResult {
  totalIssues: number;
  open: number;
  assigned: number;
  inProgress: number;
  onHold: number;
  resolved: number;
  closed: number;
  reopened: number;
  urgentIssues: number;
  highPriorityIssues: number;
  maintenanceRooms: number;
  outOfServiceRooms: number;
  totalEstimatedCost: number;
  totalActualCost: number;
  issuesByType: Record<string, number>;
  workloadByStaff: Array<{ staffId: string; name: string; openIssues: number; resolvedToday: number }>;
}

export type SanitizedMaintenanceIssue = Record<string, unknown>;
