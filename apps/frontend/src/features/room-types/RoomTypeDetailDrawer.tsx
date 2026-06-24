'use client';

import { Modal } from '@/components/Modal';
import type { RoomType } from '@/types';
import { formatCurrency, formatDateTime, capitalize } from '@/utils/format';
import { RoomTypeStatusBadge } from './RoomTypeStatusBadge';
import { RoomTypeImageManager } from './RoomTypeImageManager';

interface RoomTypeDetailDrawerProps {
  roomType: RoomType | null;
  isOpen: boolean;
  isLoading: boolean;
  canManage: boolean;
  isUploading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onPricing: () => void;
  onStatusChange: () => void;
  onUploadImage: (url: string, altText: string, setAsCover: boolean) => Promise<void>;
  onRemoveImage: (imageId: string) => Promise<void>;
  onSetCover: (url: string) => Promise<void>;
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

export const RoomTypeDetailDrawer = ({
  roomType,
  isOpen,
  isLoading,
  canManage,
  isUploading,
  onClose,
  onEdit,
  onPricing,
  onStatusChange,
  onUploadImage,
  onRemoveImage,
  onSetCover,
}: RoomTypeDetailDrawerProps) => {
  if (!roomType && !isLoading) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Room Type Details"
      size="xl"
      footer={
        canManage && roomType ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onStatusChange}>Change Status</button>
            <button type="button" className="btn-secondary" onClick={onPricing}>Update Pricing</button>
            <button type="button" className="btn-primary" onClick={onEdit}>Edit Room Type</button>
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
        </div>
      ) : roomType ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{roomType.name}</h3>
              <p className="text-sm text-slate-500">{roomType.code} · {roomType.slug}</p>
            </div>
            <RoomTypeStatusBadge status={roomType.status || (roomType.isActive ? 'active' : 'inactive')} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Basic Information</h4>
              <dl className="space-y-3">
                <DetailRow label="Short Description" value={roomType.shortDescription} />
                <DetailRow label="Description" value={roomType.description} />
                <DetailRow label="Bed Type" value={roomType.bedType ? capitalize(roomType.bedType) : undefined} />
                <DetailRow label="Room Size" value={roomType.roomSize ? `${roomType.roomSize} ${roomType.roomSizeUnit || 'sqft'}` : undefined} />
                <DetailRow label="Meal Plan" value={roomType.mealPlan ? capitalize(roomType.mealPlan) : undefined} />
                <DetailRow label="Inventory Type" value={roomType.inventoryType ? capitalize(roomType.inventoryType) : undefined} />
                <DetailRow label="Linked Rooms" value={roomType.linkedRoomsCount} />
              </dl>
            </section>

            <section>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Pricing & Capacity</h4>
              <dl className="space-y-3">
                <DetailRow label="Base Price" value={formatCurrency(roomType.basePrice)} />
                <DetailRow label="Weekday Price" value={roomType.weekdayPrice ? formatCurrency(roomType.weekdayPrice) : undefined} />
                <DetailRow label="Weekend Price" value={roomType.weekendPrice ? formatCurrency(roomType.weekendPrice) : undefined} />
                <DetailRow label="Tax" value={roomType.taxPercentage !== undefined ? `${roomType.taxPercentage}%` : undefined} />
                <DetailRow label="Discount" value={roomType.discountPercentage !== undefined ? `${roomType.discountPercentage}%` : undefined} />
                <DetailRow label="Max Guests" value={roomType.maxGuests} />
                <DetailRow label="Max Adults" value={roomType.maxAdults} />
                <DetailRow label="Max Children" value={roomType.maxChildren} />
                <DetailRow label="Total Rooms" value={roomType.totalRooms} />
              </dl>
            </section>
          </div>

          <section>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Visibility</h4>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className={`rounded-full px-2.5 py-1 ${roomType.isVisibleOnWebsite ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                Website: {roomType.isVisibleOnWebsite ? 'Visible' : 'Hidden'}
              </span>
              <span className={`rounded-full px-2.5 py-1 ${roomType.isAvailableForBooking ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                Booking: {roomType.isAvailableForBooking ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </section>

          {(roomType.amenities?.length || roomType.facilities?.length) ? (
            <section>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Amenities & Facilities</h4>
              <div className="flex flex-wrap gap-2">
                {(roomType.amenities ?? []).map((a) => (
                  <span key={a} className="rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary-800">{a}</span>
                ))}
                {(roomType.facilities ?? []).map((f) => (
                  <span key={f} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{f}</span>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Images</h4>
            <RoomTypeImageManager
              roomType={roomType}
              canManage={canManage}
              isUploading={isUploading}
              onUpload={onUploadImage}
              onRemove={onRemoveImage}
              onSetCover={onSetCover}
            />
          </section>

          {roomType.auditLogs && roomType.auditLogs.length > 0 && (
            <section>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Activity Timeline</h4>
              <div className="space-y-2">
                {roomType.auditLogs.map((log) => (
                  <div key={log._id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <p className="font-medium text-slate-800">{log.action.replace(/\./g, ' ')}</p>
                    <p className="text-xs text-slate-500">
                      {log.userId?.name || 'System'} · {formatDateTime(log.createdAt)}
                    </p>
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
