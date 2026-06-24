import type { Room } from '@/types';

export const getRoomTypeName = (room: Room): string => {
  if (typeof room.roomTypeId === 'object' && room.roomTypeId?.name) return room.roomTypeId.name;
  return '—';
};

export const getGuestName = (room: Room): string => {
  if (typeof room.currentGuestId === 'object' && room.currentGuestId?.name) return room.currentGuestId.name;
  return '—';
};

export const getBookingLabel = (room: Room): string => {
  if (typeof room.currentBookingId === 'object' && room.currentBookingId?.bookingNumber) {
    return room.currentBookingId.bookingNumber;
  }
  return '—';
};
