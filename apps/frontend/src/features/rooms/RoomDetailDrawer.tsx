'use client';

import { Modal } from '@/components/Modal';
import type { Room } from '@/types';
import { formatCurrency, formatDateTime, capitalize } from '@/utils/format';
import { getBookingLabel, getGuestName, getRoomTypeName } from './utils';
import { RoomStatusBadge } from './RoomStatusBadge';
import { HousekeepingStatusBadge } from './HousekeepingStatusBadge';
import { MaintenanceStatusBadge } from './MaintenanceStatusBadge';

interface RoomDetailDrawerProps {
  room: Room | null;
  isOpen: boolean;
  isLoading: boolean;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onMaintenance: () => void;
  onHousekeeping: () => void;
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

export const RoomDetailDrawer = ({
  room,
  isOpen,
  isLoading,
  canManage,
  onClose,
  onEdit,
  onStatusChange,
  onBlock,
  onUnblock,
  onMaintenance,
  onHousekeeping,
}: RoomDetailDrawerProps) => {
  if (!room && !isLoading) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Room Details"
      size="xl"
      footer={
        canManage && room ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onHousekeeping}>Housekeeping</button>
            <button type="button" className="btn-secondary" onClick={onMaintenance}>Maintenance</button>
            {room.isBlocked ? (
              <button type="button" className="btn-secondary" onClick={onUnblock}>Unblock</button>
            ) : (
              <button type="button" className="btn-secondary" onClick={onBlock}>Block Room</button>
            )}
            <button type="button" className="btn-secondary" onClick={onStatusChange}>Change Status</button>
            <button type="button" className="btn-primary" onClick={onEdit}>Edit Room</button>
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}</div>
      ) : room ? (
        <div className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-700 to-purple-700 p-5 text-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-100">Room Profile</p>
                <h3 className="mt-2 text-2xl font-bold">Room {room.roomNumber}</h3>
                <p className="text-sm text-indigo-100">{getRoomTypeName(room)} · Floor {room.floorNumber ?? room.floor ?? '—'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <RoomStatusBadge status={room.status} />
                <HousekeepingStatusBadge status={room.housekeepingStatus} />
                <MaintenanceStatusBadge status={room.maintenanceStatus} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Basic Info</h4>
              <dl className="space-y-3">
                <DetailRow label="Room Name" value={room.roomName} />
                <DetailRow label="Building" value={room.buildingName} />
                <DetailRow label="Wing" value={room.wing} />
                <DetailRow label="Capacity" value={room.capacity} />
                <DetailRow label="Adults / Children" value={room.maxAdults || room.maxChildren !== undefined ? `${room.maxAdults ?? '—'} / ${room.maxChildren ?? 0}` : undefined} />
                <DetailRow label="Bed Type" value={room.bedType} />
                <DetailRow label="View Type" value={room.viewType} />
                <DetailRow label="Smoking Policy" value={room.smokingPolicy ? capitalize(room.smokingPolicy) : undefined} />
                <DetailRow label="Description" value={room.description} />
                <DetailRow label="Notes" value={room.notes} />
                <DetailRow label="Internal Notes" value={room.internalNotes} />
              </dl>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Current State</h4>
              <dl className="space-y-3">
                <DetailRow label="Current Guest" value={getGuestName(room)} />
                <DetailRow label="Current Booking" value={getBookingLabel(room)} />
                <DetailRow label="Last Cleaned" value={formatDateTime(room.lastCleanedAt)} />
                <DetailRow label="Last Inspected" value={formatDateTime(room.lastInspectedAt)} />
                <DetailRow label="Housekeeping Schedule" value={formatDateTime(room.housekeepingSchedule)} />
                <DetailRow label="Maintenance Schedule" value={formatDateTime(room.maintenanceSchedule)} />
                <DetailRow label="Bookable" value={room.isBookable ? 'Yes' : 'No'} />
                <DetailRow label="Blocked" value={room.isBlocked ? 'Yes' : 'No'} />
                <DetailRow label="Block Reason" value={room.blockedReason} />
                <DetailRow label="Price Override" value={room.isPriceOverridden && room.priceOverride ? formatCurrency(room.priceOverride) : undefined} />
              </dl>
            </section>
          </div>

          {room.amenitiesOverride && room.amenitiesOverride.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {room.amenitiesOverride.map((amenity) => (
                  <span key={amenity} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{amenity}</span>
                ))}
              </div>
            </section>
          )}

          {(room.cleaningNotes || room.maintenanceNotes) && (
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-900">Cleaning Notes</h4>
                <p className="text-sm text-slate-600">{room.cleaningNotes || '—'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-900">Maintenance Notes</h4>
                <p className="text-sm text-slate-600">{room.maintenanceNotes || '—'}</p>
              </div>
            </section>
          )}

          {room.inspectionChecklist && room.inspectionChecklist.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Inspection Checklist</h4>
              <div className="space-y-2">
                {room.inspectionChecklist.map((item) => (
                  <div key={item.item} className="flex items-start justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span>{item.item}</span>
                    <span className={item.isChecked ? 'text-emerald-700' : 'text-amber-700'}>{item.isChecked ? 'Checked' : 'Pending'}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {room.auditLogs && room.auditLogs.length > 0 && (
            <section>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Activity Timeline</h4>
              <div className="space-y-2">
                {room.auditLogs.map((log) => (
                  <div key={log._id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <p className="font-medium text-slate-800">{capitalize(log.action.replace(/\./g, ' '))}</p>
                    <p className="text-xs text-slate-500">{log.userId?.name || 'System'} · {formatDateTime(log.createdAt)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {room.timeline && room.timeline.length > 0 && (
            <section>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Room Timeline</h4>
              <div className="space-y-2">
                {room.timeline.slice().reverse().map((item, index) => (
                  <div key={`${item.action}-${index}`} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <p className="font-medium text-slate-800">{capitalize(item.action.replace(/\./g, ' '))}</p>
                    {item.message && <p className="text-slate-600">{item.message}</p>}
                    <p className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : null}
    </Modal>
  );
};
