'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getCalendarBookings,
  getCalendarOccupancy,
  getCalendarOverview,
  type CalendarQueryParams,
} from '@/services/calendar.service';
import type {
  CalendarBookingsResponse,
  CalendarOccupancyResponse,
  CalendarOverview,
} from '@/types';

const emptyOverview: CalendarOverview = {
  generatedAt: '',
  dateRange: { from: '', to: '' },
  todayCheckIns: 0,
  todayCheckOuts: 0,
  upcomingArrivals: 0,
  upcomingDepartures: 0,
  inHouseGuests: 0,
  occupancyRate: 0,
  totalRooms: 0,
  occupiedRooms: 0,
  availableRooms: 0,
  blockedRooms: 0,
  maintenanceRooms: 0,
  dirtyRooms: 0,
  conflictCount: 0,
  pendingPayments: 0,
};

const emptyBookings: CalendarBookingsResponse = {
  generatedAt: '',
  dateRange: { from: '', to: '' },
  view: 'resource',
  events: [],
  blocks: [],
  resources: [],
  roomTypeGroups: [],
};

const emptyOccupancy: CalendarOccupancyResponse = {
  generatedAt: '',
  dateRange: { from: '', to: '' },
  days: [],
};

export function useCalendarData(baseParams: CalendarQueryParams) {
  const [overview, setOverview] = useState<CalendarOverview>(emptyOverview);
  const [bookings, setBookings] = useState<CalendarBookingsResponse>(emptyBookings);
  const [occupancy, setOccupancy] = useState<CalendarOccupancyResponse>(emptyOccupancy);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, bookingsData, occupancyData] = await Promise.all([
        getCalendarOverview(baseParams),
        getCalendarBookings(baseParams),
        getCalendarOccupancy(baseParams),
      ]);
      setOverview(overviewData);
      setBookings(bookingsData);
      setOccupancy(occupancyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
      setOverview(emptyOverview);
      setBookings(emptyBookings);
      setOccupancy(emptyOccupancy);
    } finally {
      setIsLoading(false);
    }
  }, [baseParams]);

  useEffect(() => {
    void load();
  }, [load]);

  return { overview, bookings, occupancy, isLoading, error, refresh: load };
}
