import type { Booking, BookingFormData, Guest, Room, RoomType } from '@/types';

export const BOOKING_STATUS_OPTIONS = [
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
] as const;

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
] as const;

export const BOOKING_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'group', label: 'Group' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'online', label: 'Online' },
  { value: 'ota', label: 'OTA' },
  { value: 'direct', label: 'Direct' },
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
] as const;

export const emptyBookingForm = (): BookingFormData => ({
  guestId: '',
  roomId: '',
  roomTypeId: '',
  bookingType: 'individual',
  source: 'direct',
  checkInDate: '',
  checkOutDate: '',
  roomCount: 1,
  adults: 1,
  children: 0,
  status: 'reserved',
  paymentStatus: 'unpaid',
  roomRate: 0,
  totalAmount: 0,
  paidAmount: 0,
  discount: 0,
  taxAmount: 0,
  extraCharges: 0,
  couponCode: '',
  specialRequests: '',
  guestPreferences: '',
  internalNotes: '',
  notes: '',
  assignedTo: '',
  expectedArrivalTime: '',
  expectedDepartureTime: '',
  isLateCheckIn: false,
  isLateCheckOut: false,
});

export const bookingToForm = (booking: Booking): BookingFormData => ({
  guestId: typeof booking.guestId === 'string' ? booking.guestId : booking.guestId?._id ?? '',
  roomId: typeof booking.roomId === 'string' ? booking.roomId : booking.roomId?._id ?? '',
  roomTypeId: typeof booking.roomTypeId === 'string' ? booking.roomTypeId : booking.roomTypeId?._id ?? '',
  bookingType: booking.bookingType ?? 'individual',
  source: booking.source ?? 'direct',
  checkInDate: booking.checkInDate?.split('T')[0] ?? '',
  checkOutDate: booking.checkOutDate?.split('T')[0] ?? '',
  roomCount: booking.roomCount ?? 1,
  adults: booking.adults ?? 1,
  children: booking.children ?? 0,
  status: booking.status ?? 'reserved',
  paymentStatus: booking.paymentStatus ?? 'unpaid',
  roomRate: booking.roomRate ?? 0,
  totalAmount: booking.totalAmount ?? 0,
  paidAmount: booking.paidAmount ?? 0,
  discount: booking.discount ?? 0,
  taxAmount: booking.taxAmount ?? 0,
  extraCharges: booking.extraCharges ?? 0,
  couponCode: booking.couponCode ?? '',
  specialRequests: booking.specialRequests ?? '',
  guestPreferences: booking.guestPreferences ?? '',
  internalNotes: booking.internalNotes ?? '',
  notes: booking.notes ?? '',
  assignedTo: typeof booking.assignedTo === 'string' ? booking.assignedTo : booking.assignedTo?._id ?? '',
  expectedArrivalTime: booking.expectedArrivalTime ?? '',
  expectedDepartureTime: booking.expectedDepartureTime ?? '',
  isLateCheckIn: booking.isLateCheckIn ?? false,
  isLateCheckOut: booking.isLateCheckOut ?? false,
});

export const getBookingGuestName = (booking: Booking): string => {
  if (typeof booking.guestId === 'object') {
    return booking.guestId.fullName || booking.guestId.name || booking.guestId.phone;
  }
  return 'Guest';
};

export const getGuestLabel = (guest: Guest): string => guest.fullName || guest.name || guest.phone;

export const getRoomLabel = (room: Room): string => {
  const roomType = typeof room.roomTypeId === 'object' ? ` · ${(room.roomTypeId as RoomType).name}` : '';
  return `Room ${room.roomNumber}${roomType}`;
};

