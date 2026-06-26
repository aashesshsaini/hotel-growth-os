'use client';

import { useCallback, useMemo, useState } from 'react';
import type { CalendarView } from '@/types';
import { addDays, formatIsoDate, resolveDefaultRange } from '../utils/date';

export function useCalendarNavigation(initialView: CalendarView = 'resource') {
  const [view, setView] = useState<CalendarView>(initialView);
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  const range = useMemo(() => resolveDefaultRange(view, anchorDate), [view, anchorDate]);

  const queryParams = useMemo(
    () => ({
      view,
      fromDate: formatIsoDate(range.from),
      toDate: formatIsoDate(range.to),
    }),
    [view, range]
  );

  const goToday = useCallback(() => setAnchorDate(new Date()), []);
  const goPrevious = useCallback(() => {
    if (view === 'day') setAnchorDate((current) => addDays(current, -1));
    else if (view === 'month') setAnchorDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
    else setAnchorDate((current) => addDays(current, -7));
  }, [view]);
  const goNext = useCallback(() => {
    if (view === 'day') setAnchorDate((current) => addDays(current, 1));
    else if (view === 'month') setAnchorDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
    else setAnchorDate((current) => addDays(current, 7));
  }, [view]);

  return {
    view,
    setView,
    anchorDate,
    setAnchorDate,
    range,
    queryParams,
    goToday,
    goPrevious,
    goNext,
  };
}
