'use client';

import { Modal } from '@/components/Modal';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import type { BookingFormData, Guest, Room, RoomType, Staff } from '@/types';
import {
  BOOKING_STATUS_OPTIONS,
  BOOKING_TYPE_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  getGuestLabel,
  getRoomLabel,
} from './constants';

interface BookingFormModalProps {
  isOpen: boolean;
  title: string;
  form: BookingFormData;
  errors: Record<string, string>;
  guests: Guest[];
  rooms: Room[];
  roomTypes: RoomType[];
  staff: Staff[];
  isSaving: boolean;
  onClose: () => void;
  onChange: (form: BookingFormData) => void;
  onSave: () => void;
}

export function BookingFormModal({
  isOpen,
  title,
  form,
  errors,
  guests,
  rooms,
  roomTypes,
  staff,
  isSaving,
  onClose,
  onChange,
  onSave,
}: BookingFormModalProps) {
  const set = (patch: Partial<BookingFormData>) => onChange({ ...form, ...patch });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Booking'}
          </button>
        </div>
      }
    >
      {errors.form && <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectInput
          label="Guest"
          value={form.guestId}
          onChange={(event) => set({ guestId: event.target.value })}
          options={[{ value: '', label: 'Select guest' }, ...guests.map((guest) => ({ value: guest._id, label: getGuestLabel(guest) }))]}
          error={errors.guestId}
          required
        />
        <SelectInput
          label="Room"
          value={form.roomId ?? ''}
          onChange={(event) => {
            const room = rooms.find((item) => item._id === event.target.value);
            const roomTypeId = typeof room?.roomTypeId === 'object' ? room.roomTypeId._id : room?.roomTypeId;
            set({ roomId: event.target.value, roomTypeId: roomTypeId || form.roomTypeId });
          }}
          options={[{ value: '', label: 'Assign later' }, ...rooms.map((room) => ({ value: room._id, label: getRoomLabel(room) }))]}
        />
        <SelectInput
          label="Room Type"
          value={form.roomTypeId ?? ''}
          onChange={(event) => {
            const roomType = roomTypes.find((item) => item._id === event.target.value || item.id === event.target.value);
            set({
              roomTypeId: event.target.value,
              roomRate: roomType?.basePrice ?? form.roomRate,
              totalAmount: roomType?.basePrice && !form.totalAmount ? roomType.basePrice : form.totalAmount,
            });
          }}
          options={[
            { value: '', label: 'Select room type' },
            ...roomTypes.map((roomType) => ({
              value: roomType._id || roomType.id || '',
              label: `${roomType.name} (${roomType.availableRoomsCount ?? roomType.totalRooms ?? 0} available)`,
            })),
          ]}
        />
        <SelectInput label="Booking Type" value={form.bookingType ?? 'individual'} onChange={(event) => set({ bookingType: event.target.value })} options={BOOKING_TYPE_OPTIONS} />
        <SelectInput
          label="Assigned Staff"
          value={form.assignedTo ?? ''}
          onChange={(event) => set({ assignedTo: event.target.value })}
          options={[
            { value: '', label: 'Assign later' },
            ...staff.map((member) => ({
              value: typeof member.userId === 'string' ? member.userId : member._id,
              label: `${member.fullName || member.name} · ${member.department || member.role}`,
            })),
          ]}
        />
        <FormInput label="Source" value={form.source ?? ''} onChange={(event) => set({ source: event.target.value })} placeholder="direct, ota, website" />
        <FormInput label="Check-in" type="date" value={form.checkInDate} onChange={(event) => set({ checkInDate: event.target.value })} error={errors.checkInDate} required />
        <FormInput label="Check-out" type="date" value={form.checkOutDate} onChange={(event) => set({ checkOutDate: event.target.value })} error={errors.checkOutDate} required />
        <FormInput label="Adults" type="number" value={form.adults} onChange={(event) => set({ adults: Number(event.target.value) })} required />
        <FormInput label="Children" type="number" value={form.children ?? 0} onChange={(event) => set({ children: Number(event.target.value) })} />
        <FormInput label="Rooms" type="number" value={form.roomCount ?? 1} onChange={(event) => set({ roomCount: Number(event.target.value) })} />
        <FormInput label="Room Rate" type="number" value={form.roomRate ?? 0} onChange={(event) => set({ roomRate: Number(event.target.value) })} />
        <FormInput label="Total Amount" type="number" value={form.totalAmount} onChange={(event) => set({ totalAmount: Number(event.target.value) })} error={errors.totalAmount} required />
        <FormInput label="Paid Amount" type="number" value={form.paidAmount ?? 0} onChange={(event) => set({ paidAmount: Number(event.target.value) })} />
        <FormInput label="Discount" type="number" value={form.discount ?? 0} onChange={(event) => set({ discount: Number(event.target.value) })} />
        <FormInput label="Tax Amount" type="number" value={form.taxAmount ?? 0} onChange={(event) => set({ taxAmount: Number(event.target.value) })} />
        <SelectInput label="Status" value={form.status ?? 'reserved'} onChange={(event) => set({ status: event.target.value })} options={BOOKING_STATUS_OPTIONS} />
        <SelectInput label="Payment Status" value={form.paymentStatus ?? 'unpaid'} onChange={(event) => set({ paymentStatus: event.target.value })} options={PAYMENT_STATUS_OPTIONS} />
        <FormInput label="Expected Arrival" value={form.expectedArrivalTime ?? ''} onChange={(event) => set({ expectedArrivalTime: event.target.value })} placeholder="14:00" />
        <FormInput label="Expected Departure" value={form.expectedDepartureTime ?? ''} onChange={(event) => set({ expectedDepartureTime: event.target.value })} placeholder="11:00" />
        <FormInput label="Coupon Code" value={form.couponCode ?? ''} onChange={(event) => set({ couponCode: event.target.value })} />
        <FormInput label="Extra Charges" type="number" value={form.extraCharges ?? 0} onChange={(event) => set({ extraCharges: Number(event.target.value) })} />
        <TextArea label="Special Requests" value={form.specialRequests ?? ''} onChange={(event) => set({ specialRequests: event.target.value })} className="sm:col-span-2" />
        <TextArea label="Guest Preferences" value={form.guestPreferences ?? ''} onChange={(event) => set({ guestPreferences: event.target.value })} className="sm:col-span-2" />
        <TextArea label="Internal Notes" value={form.internalNotes ?? ''} onChange={(event) => set({ internalNotes: event.target.value })} className="sm:col-span-2" />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.isLateCheckIn ?? false} onChange={(event) => set({ isLateCheckIn: event.target.checked })} />
          Late check-in
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.isLateCheckOut ?? false} onChange={(event) => set({ isLateCheckOut: event.target.checked })} />
          Late check-out
        </label>
      </div>
    </Modal>
  );
}

