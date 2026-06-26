export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface HousekeepingStatsResult {
  totalTasks: number;
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  inspectionPending: number;
  rejected: number;
  recleanRequired: number;
  dirtyRooms: number;
  cleanRooms: number;
  cleaningInProgressRooms: number;
  inspectionRooms: number;
  tasksByType: Record<string, number>;
  workloadByStaff: Array<{ staffId: string; name: string; openTasks: number; completedToday: number }>;
}

export type SanitizedHousekeepingTask = Record<string, unknown>;
