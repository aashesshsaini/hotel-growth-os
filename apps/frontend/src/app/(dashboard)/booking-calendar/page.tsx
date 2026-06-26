'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { FormInput, SelectInput } from '@/components/FormInput';
import { useToast } from '@/components/Toast';
import { BookingDetailDrawer } from '@/features/bookings/BookingDetailDrawer';
import { BookingQuickPopup, QuickBookingModal } from '@/features/calendar/components/BookingQuickPopup';
import { buildRangeLabel, CalendarToolbar } from '@/features/calendar/components/CalendarToolbar';
import { ConflictAlert } from '@/features/calendar/components/ConflictAlert';
import { MiniCalendar, OccupancyHeatmapBar } from '@/features/calendar/components/MiniCalendar';
import { OccupancyLegend, OccupancySummary } from '@/features/calendar/components/OccupancySummary';
import { MonthGridView, ResourceTimelineView, WeekGridView } from '@/features/calendar/components/ResourceTimelineView';
import { BOOKING_STATUS_FILTERS, BOOKING_TYPE_FILTERS } from '@/features/calendar/constants';
import { useCalendarData } from '@/features/calendar/hooks/useCalendarData';
import { useCalendarNavigation } from '@/features/calendar/hooks/useCalendarNavigation';
import { addDays, formatIsoDate } from '@/features/calendar/utils/date';
import {
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  getBookingsById,
} from '@/services/bookings.service';
import {
  createQuickCalendarBooking,
  moveCalendarBooking,
} from '@/services/calendar.service';
import { getGuests } from '@/services/guests.service';
import { getRooms } from '@/services/rooms.service';
import { getRoomTypes } from '@/services/roomTypes.service';
import type { BookingDetails, CalendarEvent, Guest, Room, RoomType } from '@/types';

export default function BookingCalendarPage() {
  const { showToast } = useToast();
  const navigation = useCalendarNavigation('resource');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bookingTypeFilter, setBookingTypeFilter] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [details, setDetails] = useState<BookingDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [quickForm, setQuickForm] = useState({
    guestId: '',
    roomId: '',
    roomTypeId: '',
    bookingType: 'individual',
    checkInDate: formatIsoDate(new Date()),
    checkOutDate: formatIsoDate(addDays(new Date(), 1)),
    adults: 1,
    totalAmount: 0,
    notes: '',
  });

  const queryParams = useMemo(
    () => ({
      ...navigation.queryParams,
      search: search.trim() || undefined,
      status: statusFilter || undefined,
      bookingType: bookingTypeFilter || undefined,
      roomTypeId: roomTypeFilter || undefined,
    }),
    [navigation.queryParams, search, statusFilter, bookingTypeFilter, roomTypeFilter]
  );

  const { overview, bookings, occupancy, isLoading, error, refresh } = useCalendarData(queryParams);

  useEffect(() => {
    let cancelled = false;

    void Promise.allSettled([
      getGuests({ limit: 100 }),
      getRooms({ limit: 100 }),
      getRoomTypes({ limit: 100 }),
    ]).then(([guestsResult, roomsResult, roomTypesResult]) => {
      if (cancelled) return;

      if (guestsResult.status === 'fulfilled') setGuests(guestsResult.value.data);
      if (roomsResult.status === 'fulfilled') setRooms(roomsResult.value.data);
      if (roomTypesResult.status === 'fulfilled') setRoomTypes(roomTypesResult.value.data);

      const failed = [guestsResult, roomsResult, roomTypesResult].filter((result) => result.status === 'rejected');
      if (failed.length > 0) {
        showToast('Failed to load reference data', 'error');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const openDetails = useCallback(async (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      setDetails(await getBookingsById(event.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load booking', 'error');
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }, [showToast]);

  const handleMoveEvent = async (event: CalendarEvent, roomId: string, day: Date) => {
    const nights = event.nights || 1;
    const checkInDate = formatIsoDate(day);
    const checkOutDate = formatIsoDate(addDays(day, nights));
    try {
      await moveCalendarBooking(event.id, {
        checkInDate,
        checkOutDate,
        roomId,
        note: 'Moved from reservation calendar',
      });
      showToast('Booking moved successfully', 'success');
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to move booking', 'error');
    }
  };

  const handleQuickBooking = async () => {
    if (!quickForm.guestId || !quickForm.checkInDate || !quickForm.checkOutDate) {
      showToast('Guest and dates are required', 'error');
      return;
    }
    setQuickSubmitting(true);
    try {
      await createQuickCalendarBooking({
        guestId: quickForm.guestId,
        roomId: quickForm.roomId || undefined,
        roomTypeId: quickForm.roomTypeId || undefined,
        bookingType: quickForm.bookingType,
        checkInDate: quickForm.checkInDate,
        checkOutDate: quickForm.checkOutDate,
        adults: quickForm.adults,
        totalAmount: quickForm.totalAmount,
        notes: quickForm.notes,
        status: 'reserved',
      });
      showToast('Quick booking created', 'success');
      setQuickOpen(false);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create booking', 'error');
    } finally {
      setQuickSubmitting(false);
    }
  };

  const rangeLabel = buildRangeLabel(navigation.range.from, navigation.range.to, navigation.view);

  const calendarBody = (() => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      );
    }
    if (navigation.view === 'resource' || navigation.view === 'timeline') {
      return (
        <ResourceTimelineView
          data={bookings}
          rangeFrom={navigation.range.from}
          rangeTo={navigation.range.to}
          onSelectEvent={(event) => {
            setSelectedEvent(event);
          }}
          onMoveEvent={(event, roomId, day) => void handleMoveEvent(event, roomId, day)}
        />
      );
    }
    if (navigation.view === 'month') {
      return <MonthGridView data={bookings} anchorDate={navigation.anchorDate} onSelectEvent={(event) => void openDetails(event)} />;
    }
    return (
      <WeekGridView
        data={bookings}
        rangeFrom={navigation.range.from}
        rangeTo={navigation.range.to}
        onSelectEvent={(event) => void openDetails(event)}
      />
    );
  })();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-900 to-violet-800 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">Reservation Calendar</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Hotel Operations Calendar</h1>
            <p className="mt-3 max-w-2xl text-sm text-indigo-100 sm:text-base">
              Room resource timeline, drag-and-drop reservations, occupancy heatmap, and quick booking workflows for front desk teams.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/bookings" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">
              <CalendarDays className="h-4 w-4" />
              Bookings List
            </Link>
            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4" />
              Quick Booking
            </button>
          </div>
        </div>
      </section>

      <OccupancySummary overview={overview} />

      <CalendarToolbar
        view={navigation.view}
        onViewChange={navigation.setView}
        rangeLabel={rangeLabel}
        onPrevious={navigation.goPrevious}
        onNext={navigation.goNext}
        onToday={navigation.goToday}
        onRefresh={() => void refresh()}
        isLoading={isLoading}
      />

      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:items-end">
        <FormInput label="Search guest or booking" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." />
        <SelectInput label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} options={BOOKING_STATUS_FILTERS} />
        <SelectInput label="Booking type" value={bookingTypeFilter} onChange={(event) => setBookingTypeFilter(event.target.value)} options={BOOKING_TYPE_FILTERS} />
        <SelectInput
          label="Room type"
          value={roomTypeFilter}
          onChange={(event) => setRoomTypeFilter(event.target.value)}
          options={[{ value: '', label: 'All room types' }, ...roomTypes.map((item) => ({ value: item._id, label: item.name }))]}
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <ConflictAlert events={bookings.events} />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <OccupancyLegend />
          {calendarBody}
        </div>
        <div className="space-y-4">
          <MiniCalendar
            anchorDate={navigation.anchorDate}
            rangeFrom={navigation.range.from}
            rangeTo={navigation.range.to}
            days={occupancy.days}
            onSelectDate={(date) => navigation.setAnchorDate(date)}
          />
          <OccupancyHeatmapBar days={occupancy.days} />
        </div>
      </div>

      <BookingQuickPopup
        event={selectedEvent && !detailsOpen ? selectedEvent : null}
        onClose={() => setSelectedEvent(null)}
        onOpenDetails={() => selectedEvent && void openDetails(selectedEvent)}
        onCheckIn={selectedEvent?.status === 'confirmed' ? () => void checkInBooking(selectedEvent.id).then(refresh).catch((err) => showToast(err.message, 'error')) : undefined}
        onCheckOut={selectedEvent?.status === 'checked_in' ? () => void checkOutBooking(selectedEvent.id).then(refresh).catch((err) => showToast(err.message, 'error')) : undefined}
      />

      <QuickBookingModal
        isOpen={quickOpen}
        guests={guests}
        rooms={rooms}
        roomTypes={roomTypes}
        form={quickForm}
        onChange={(updates) => setQuickForm((prev) => ({ ...prev, ...updates }))}
        onClose={() => setQuickOpen(false)}
        onSubmit={() => void handleQuickBooking()}
        isSubmitting={quickSubmitting}
      />

      <BookingDetailDrawer
        details={details}
        isOpen={detailsOpen}
        isLoading={detailsLoading}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedEvent(null);
        }}
        onEdit={() => showToast('Use Bookings page to edit full reservation details', 'success')}
        onCancel={() => selectedEvent && void cancelBooking(selectedEvent.id, 'Cancelled from calendar').then(refresh)}
        onCheckIn={() => selectedEvent && void checkInBooking(selectedEvent.id).then(refresh)}
        onCheckOut={() => selectedEvent && void checkOutBooking(selectedEvent.id).then(refresh)}
        onPayment={() => showToast('Open Payments module to record payment', 'success')}
      />
    </div>
  );
}
