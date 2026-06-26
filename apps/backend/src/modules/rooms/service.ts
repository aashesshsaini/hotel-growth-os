import { FilterQuery, Types } from 'mongoose';
import { IRoom } from '../../models/Room';
import {
  AvailableRoomsQuery,
  BlockRoomInput,
  BulkCreateRoomsInput,
  BulkUpdateRoomStatusInput,
  CreateRoomInput,
  ListRoomsQuery,
  MarkRoomMaintenanceInput,
  UpdateHousekeepingStatusInput,
  UpdateRoomInput,
  UpdateRoomStatusInput,
} from './validation';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import {
  canBulkCreateRooms,
  canDeleteRooms,
  canManageRooms,
  canUpdateHousekeeping,
  canUpdateMaintenance,
  canUpdateRoomStatus,
  canViewRooms,
  syncStatusFromHousekeeping,
  syncStatusFromMaintenance,
} from './room.constants';
import {
  bulkUpdateRoomsRepository,
  countActiveBookingsForRoomRepository,
  createAuditLogRepository,
  createRoomRepository,
  findAuditLogsByRoomIdRepository,
  findAvailableRoomsRepository,
  findRoomByIdRepository,
  findRoomByNumberInHotelRepository,
  findRoomTypeByIdRepository,
  findRoomsRepository,
  getRoomStatsRepository,
  getUnavailableRoomIdsRepository,
  softDeleteRoomRepository,
  updateRoomRepository,
} from './room.repository';
import {
  AvailableRoomResult,
  BulkCreateRoomsResult,
  RoomStatsResult,
  SanitizedRoom,
  ViewerContext,
} from './room.types';
import { findHotelByIdRepository } from '../roomTypes/roomType.repository';

const resolveHotelId = (hotelId: string | undefined, fallbackHotelId?: string): string => {
  const resolved = hotelId ?? fallbackHotelId;
  if (!resolved) throw new ValidationError('Hotel ID is required');
  return resolved;
};

const assertHotelAccess = (
  viewerRole: string,
  viewerHotelId: string | undefined,
  hotelId: string
): void => {
  if (viewerRole !== 'super_admin' && viewerHotelId !== hotelId) {
    throw new ForbiddenError('Access denied to this hotel');
  }
};

const logAudit = async (
  action: string,
  entityId: string,
  viewer: ViewerContext,
  changes?: Record<string, unknown>,
  hotelId?: string
): Promise<void> => {
  await createAuditLogRepository({
    hotelId: hotelId ?? viewer.hotelId,
    userId: viewer.userId,
    action,
    entity: 'Room',
    entityId: new Types.ObjectId(entityId),
    changes,
  });
};

const addRoomTimeline = (
  room: IRoom,
  action: string,
  viewer: ViewerContext,
  message?: string,
  metadata?: Record<string, unknown>
): void => {
  room.timeline = [
    ...(room.timeline ?? []),
    {
      action,
      message,
      createdBy: new Types.ObjectId(viewer.userId),
      createdAt: new Date(),
      metadata,
    },
  ];
};

const sanitizeRoom = (room: IRoom, includeAudit = false, auditLogs?: unknown[]): SanitizedRoom => {
  const doc = room.toObject ? room.toObject() : room;
  const sanitized: SanitizedRoom = {
    ...doc,
    id: doc._id?.toString(),
    floorNumber: doc.floor,
  };
  if (includeAudit && auditLogs) sanitized.auditLogs = auditLogs;
  return sanitized;
};

const resolveFloor = (input: { floorNumber?: number; floor?: number }): number | undefined => {
  return input.floorNumber ?? input.floor;
};

const ensureRoomDefaults = async (room: IRoom): Promise<IRoom> => {
  let changed = false;
  if (!room.housekeepingStatus) {
    room.housekeepingStatus = room.status === 'dirty' ? 'dirty' : 'clean';
    changed = true;
  }
  if (!room.maintenanceStatus) {
    room.maintenanceStatus = room.status === 'maintenance' ? 'under_repair' : 'none';
    changed = true;
  }
  if (room.isBookable === undefined || room.isBookable === null) {
    room.isBookable = !['maintenance', 'blocked', 'out_of_order', 'occupied'].includes(room.status);
    changed = true;
  }
  if (room.isVisibleToStaff === undefined || room.isVisibleToStaff === null) {
    room.isVisibleToStaff = true;
    changed = true;
  }
  if (room.isBlocked === undefined || room.isBlocked === null) {
    room.isBlocked = room.status === 'blocked';
    changed = true;
  }
  if (room.isPriceOverridden === undefined || room.isPriceOverridden === null) {
    room.isPriceOverridden = false;
    changed = true;
  }
  if (!room.tags) {
    room.tags = [];
    changed = true;
  }
  if (!room.images) {
    room.images = [];
    changed = true;
  }
  if (!room.inspectionChecklist) {
    room.inspectionChecklist = [];
    changed = true;
  }
  if (!room.timeline) {
    room.timeline = [];
    changed = true;
  }
  if (changed) return updateRoomRepository(room);
  return room;
};

const validateRoomTypeBelongsToHotel = async (
  roomTypeId: string,
  hotelId: string
): Promise<void> => {
  const roomType = await findRoomTypeByIdRepository(roomTypeId);
  if (!roomType) throw new NotFoundError('Room type not found');
  if (roomType.hotelId.toString() !== hotelId) {
    throw new ForbiddenError('Room type does not belong to this hotel');
  }
};

const getRoomOrThrow = async (id: string, viewer: ViewerContext): Promise<IRoom> => {
  const room = await findRoomByIdRepository(id);
  if (!room) throw new NotFoundError('Room not found');
  assertHotelAccess(viewer.role, viewer.hotelId, room.hotelId.toString());
  return ensureRoomDefaults(room);
};

const buildListFilter = (query: ListRoomsQuery, hotelId: string): FilterQuery<IRoom> => {
  const filter: FilterQuery<IRoom> = { hotelId };
  if (query.roomTypeId) filter.roomTypeId = query.roomTypeId;
  if (query.status) filter.status = query.status;
  if (query.housekeepingStatus) filter.housekeepingStatus = query.housekeepingStatus;
  if (query.maintenanceStatus) filter.maintenanceStatus = query.maintenanceStatus;
  const floor = query.floorNumber ?? query.floor;
  if (floor !== undefined) filter.floor = floor;
  if (query.buildingName) filter.buildingName = query.buildingName;
  if (query.wing) filter.wing = query.wing;
  if (query.isBookable !== undefined) filter.isBookable = query.isBookable;
  if (query.isBlocked !== undefined) filter.isBlocked = query.isBlocked;
  if (query.minCapacity !== undefined) {
    filter.$or = [
      { capacity: { $gte: query.minCapacity } },
      { maxGuestsOverride: { $gte: query.minCapacity } },
    ];
  }
  if (query.createdFrom || query.createdTo) {
    filter.createdAt = {};
    if (query.createdFrom) filter.createdAt.$gte = query.createdFrom;
    if (query.createdTo) filter.createdAt.$lte = query.createdTo;
  }
  return filter;
};

const applyRoomInput = (room: IRoom, input: UpdateRoomInput | CreateRoomInput): void => {
  if ('roomTypeId' in input && input.roomTypeId) {
    room.roomTypeId = new Types.ObjectId(input.roomTypeId);
  }
  if (input.roomNumber) room.roomNumber = input.roomNumber;
  const floor = resolveFloor(input);
  if (floor !== undefined) room.floor = floor;
  if (input.buildingName !== undefined) room.buildingName = input.buildingName;
  if (input.wing !== undefined) room.wing = input.wing;
  if (input.roomName !== undefined) room.roomName = input.roomName;
  if (input.description !== undefined) room.description = input.description;
  if (input.capacity !== undefined) room.capacity = input.capacity;
  if (input.maxAdults !== undefined) room.maxAdults = input.maxAdults;
  if (input.maxChildren !== undefined) room.maxChildren = input.maxChildren;
  if (input.bedType !== undefined) room.bedType = input.bedType;
  if (input.viewType !== undefined) room.viewType = input.viewType;
  if (input.smokingPolicy !== undefined) room.smokingPolicy = input.smokingPolicy;
  if (input.maxGuestsOverride !== undefined) room.maxGuestsOverride = input.maxGuestsOverride;
  if (input.priceOverride !== undefined) room.priceOverride = input.priceOverride;
  if (input.isPriceOverridden !== undefined) room.isPriceOverridden = input.isPriceOverridden;
  if (input.isBookable !== undefined) room.isBookable = input.isBookable;
  if (input.isVisibleToStaff !== undefined) room.isVisibleToStaff = input.isVisibleToStaff;
  if (input.amenitiesOverride !== undefined) room.amenitiesOverride = input.amenitiesOverride;
  if (input.images !== undefined) room.images = input.images;
  if (input.cleaningNotes !== undefined) room.cleaningNotes = input.cleaningNotes;
  if (input.maintenanceNotes !== undefined) room.maintenanceNotes = input.maintenanceNotes;
  if (input.housekeepingSchedule !== undefined) room.housekeepingSchedule = input.housekeepingSchedule;
  if (input.maintenanceSchedule !== undefined) room.maintenanceSchedule = input.maintenanceSchedule;
  if (input.inspectionChecklist !== undefined) {
    room.inspectionChecklist = input.inspectionChecklist.map((item) => ({
      item: item.item,
      isChecked: item.isChecked ?? false,
      notes: item.notes,
    }));
  }
  if (input.notes !== undefined) room.notes = input.notes;
  if (input.internalNotes !== undefined) room.internalNotes = input.internalNotes;
  if (input.tags !== undefined) room.tags = input.tags;
  if (input.metadata !== undefined) room.metadata = input.metadata;
  if (input.status) room.status = input.status;
  if (input.housekeepingStatus) room.housekeepingStatus = input.housekeepingStatus;
  if (input.maintenanceStatus) room.maintenanceStatus = input.maintenanceStatus;
  if (input.assignedHousekeeperId !== undefined) {
    room.assignedHousekeeperId = input.assignedHousekeeperId ? new Types.ObjectId(input.assignedHousekeeperId) : undefined;
  }
  if (input.assignedMaintenanceStaffId !== undefined) {
    room.assignedMaintenanceStaffId = input.assignedMaintenanceStaffId ? new Types.ObjectId(input.assignedMaintenanceStaffId) : undefined;
  }
};

export const listRoomsService = async (
  query: ListRoomsQuery,
  viewer: ViewerContext
): Promise<PaginatedResponse<SanitizedRoom>> => {
  if (!canViewRooms(viewer.role)) throw new ForbiddenError('You do not have permission to view rooms');
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);

  const result = await findRoomsRepository(buildListFilter(query, hotelId), {
    page: query.page,
    limit: query.limit,
    search: query.search,
    searchFields: ['roomNumber', 'roomName', 'buildingName', 'wing', 'notes'],
    sortBy: query.sortBy ?? 'roomNumber',
    sortOrder: query.sortOrder,
  });

  return { ...result, data: result.data.map((r) => sanitizeRoom(r)) };
};

export const getRoomStatsService = async (
  viewer: ViewerContext,
  hotelIdParam?: string
): Promise<RoomStatsResult> => {
  if (!canViewRooms(viewer.role)) throw new ForbiddenError('You do not have permission to view rooms');
  const hotelId = resolveHotelId(hotelIdParam, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);
  return getRoomStatsRepository(hotelId);
};

export const getRoomByIdService = async (
  id: string,
  viewer: ViewerContext
): Promise<SanitizedRoom> => {
  if (!canViewRooms(viewer.role)) throw new ForbiddenError('You do not have permission to view rooms');
  const room = await getRoomOrThrow(id, viewer);
  let auditLogs: unknown[] | undefined;
  if (canManageRooms(viewer.role)) {
    auditLogs = await findAuditLogsByRoomIdRepository(room._id);
  }
  return sanitizeRoom(room, !!auditLogs, auditLogs);
};

export const createRoomService = async (
  input: CreateRoomInput,
  viewer: ViewerContext
): Promise<SanitizedRoom> => {
  if (!canManageRooms(viewer.role)) throw new ForbiddenError('You do not have permission to manage rooms');
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);

  const hotel = await findHotelByIdRepository(hotelId);
  if (!hotel) throw new NotFoundError('Hotel not found');

  await validateRoomTypeBelongsToHotel(input.roomTypeId, hotelId);

  const existing = await findRoomByNumberInHotelRepository(hotelId, input.roomNumber);
  if (existing) throw new ConflictError('A room with this number already exists for this hotel');

  const room = await createRoomRepository({
    hotelId,
    roomTypeId: input.roomTypeId,
    roomNumber: input.roomNumber,
    floor: resolveFloor(input),
    buildingName: input.buildingName,
    wing: input.wing,
    roomName: input.roomName,
    description: input.description,
    capacity: input.capacity,
    maxAdults: input.maxAdults,
    maxChildren: input.maxChildren,
    bedType: input.bedType,
    viewType: input.viewType,
    smokingPolicy: input.smokingPolicy ?? 'non_smoking',
    status: input.status ?? 'available',
    housekeepingStatus: input.housekeepingStatus ?? 'clean',
    maintenanceStatus: input.maintenanceStatus ?? 'none',
    assignedHousekeeperId: input.assignedHousekeeperId ? new Types.ObjectId(input.assignedHousekeeperId) : undefined,
    assignedMaintenanceStaffId: input.assignedMaintenanceStaffId ? new Types.ObjectId(input.assignedMaintenanceStaffId) : undefined,
    maxGuestsOverride: input.maxGuestsOverride,
    priceOverride: input.priceOverride,
    isPriceOverridden: input.isPriceOverridden ?? false,
    isBookable: input.isBookable ?? true,
    isVisibleToStaff: input.isVisibleToStaff ?? true,
    isBlocked: false,
    amenitiesOverride: input.amenitiesOverride ?? [],
    images: input.images ?? [],
    cleaningNotes: input.cleaningNotes,
    maintenanceNotes: input.maintenanceNotes,
    housekeepingSchedule: input.housekeepingSchedule,
    maintenanceSchedule: input.maintenanceSchedule,
    inspectionChecklist: input.inspectionChecklist ?? [],
    notes: input.notes,
    internalNotes: input.internalNotes,
    tags: input.tags ?? [],
    timeline: [
      {
        action: 'room.created',
        message: `Room ${input.roomNumber} created`,
        createdBy: viewer.userId,
        createdAt: new Date(),
      },
    ],
    metadata: input.metadata,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });

  await room.populate('roomTypeId', 'name basePrice maxGuests');
  await logAudit('room.created', room._id.toString(), viewer, { roomNumber: input.roomNumber }, hotelId);
  return sanitizeRoom(room);
};

export const bulkCreateRoomsService = async (
  input: BulkCreateRoomsInput,
  viewer: ViewerContext
): Promise<BulkCreateRoomsResult> => {
  if (!canBulkCreateRooms(viewer.role)) {
    throw new ForbiddenError('You do not have permission to bulk create rooms');
  }
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);
  await validateRoomTypeBelongsToHotel(input.roomTypeId, hotelId);

  const createdRooms: SanitizedRoom[] = [];
  let skipped = 0;

  for (let num = input.startRoomNumber; num <= input.endRoomNumber; num += 1) {
    const roomNumber = `${input.prefix || ''}${num}`;
    const existing = await findRoomByNumberInHotelRepository(hotelId, roomNumber);
    if (existing) {
      skipped += 1;
      continue;
    }

    const room = await createRoomRepository({
      hotelId,
      roomTypeId: input.roomTypeId,
      roomNumber,
      floor: input.floorNumber,
      buildingName: input.buildingName,
      wing: input.wing,
      status: 'available',
      housekeepingStatus: 'clean',
      maintenanceStatus: 'none',
      isBookable: true,
      isVisibleToStaff: true,
      isBlocked: false,
      isPriceOverridden: false,
      tags: [],
      createdBy: viewer.userId,
      updatedBy: viewer.userId,
    });
    await room.populate('roomTypeId', 'name basePrice maxGuests');
    createdRooms.push(sanitizeRoom(room));
  }

  await logAudit(
    'room.bulk_created',
    hotelId,
    viewer,
    { count: createdRooms.length, start: input.startRoomNumber, end: input.endRoomNumber },
    hotelId
  );

  return { created: createdRooms.length, skipped, rooms: createdRooms };
};

export const updateRoomService = async (
  id: string,
  input: UpdateRoomInput,
  viewer: ViewerContext
): Promise<SanitizedRoom> => {
  if (!canManageRooms(viewer.role)) throw new ForbiddenError('You do not have permission to manage rooms');
  const room = await getRoomOrThrow(id, viewer);

  if (input.roomTypeId) {
    await validateRoomTypeBelongsToHotel(input.roomTypeId, room.hotelId.toString());
  }

  if (input.roomNumber && input.roomNumber !== room.roomNumber) {
    const existing = await findRoomByNumberInHotelRepository(
      room.hotelId.toString(),
      input.roomNumber,
      id
    );
    if (existing) throw new ConflictError('A room with this number already exists for this hotel');
  }

  applyRoomInput(room, input);
  addRoomTimeline(room, 'room.updated', viewer, 'Room details updated');
  room.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateRoomRepository(room);
  await updated.populate('roomTypeId', 'name basePrice maxGuests');
  await logAudit('room.updated', id, viewer, input as Record<string, unknown>, room.hotelId.toString());
  return sanitizeRoom(updated);
};

export const updateRoomStatusService = async (
  id: string,
  input: UpdateRoomStatusInput,
  viewer: ViewerContext
): Promise<SanitizedRoom> => {
  if (!canUpdateRoomStatus(viewer.role)) {
    throw new ForbiddenError('You do not have permission to update room status');
  }
  const room = await getRoomOrThrow(id, viewer);

  if (input.status === 'occupied' && !input.allowManualOccupied && !room.currentBookingId) {
    throw new ValidationError('Cannot mark room as occupied without an active booking');
  }

  const previousStatus = room.status;
  room.status = input.status;
  if (input.notes !== undefined) room.notes = input.notes;
  addRoomTimeline(room, 'room.status_changed', viewer, input.notes || `Status changed to ${input.status}`, {
    previousStatus,
    newStatus: input.status,
  });

  if (input.status === 'dirty') room.housekeepingStatus = 'dirty';
  if (input.status === 'cleaning') room.housekeepingStatus = 'cleaning_in_progress';
  if (input.status === 'available' && ['dirty', 'cleaning'].includes(previousStatus)) {
    room.housekeepingStatus = 'clean';
  }

  room.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateRoomRepository(room);
  await updated.populate('roomTypeId', 'name basePrice maxGuests');
  await logAudit(
    'room.status_changed',
    id,
    viewer,
    { previousStatus, newStatus: input.status },
    room.hotelId.toString()
  );
  return sanitizeRoom(updated);
};

export const bulkUpdateRoomStatusService = async (
  input: BulkUpdateRoomStatusInput,
  viewer: ViewerContext
): Promise<{ updated: number }> => {
  if (!canManageRooms(viewer.role)) throw new ForbiddenError('You do not have permission to manage rooms');
  const hotelId = resolveHotelId(undefined, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);

  const updated = await bulkUpdateRoomsRepository(
    { _id: { $in: input.roomIds }, hotelId, isDeleted: { $ne: true } },
    {
      status: input.status,
      notes: input.notes,
      updatedBy: viewer.userId,
    }
  );

  await logAudit('room.bulk_status_updated', hotelId, viewer, input as Record<string, unknown>, hotelId);
  return { updated };
};

export const deleteRoomService = async (id: string, viewer: ViewerContext): Promise<void> => {
  if (!canDeleteRooms(viewer.role)) throw new ForbiddenError('You do not have permission to delete rooms');
  const room = await getRoomOrThrow(id, viewer);

  if (['occupied', 'reserved'].includes(room.status)) {
    throw new ConflictError('Cannot delete a room that is occupied or reserved');
  }

  const activeBookings = await countActiveBookingsForRoomRepository(id);
  if (activeBookings > 0) {
    throw new ConflictError('Cannot delete room with active or upcoming bookings');
  }

  await softDeleteRoomRepository(id, viewer.userId);
  await logAudit('room.deleted', id, viewer, { roomNumber: room.roomNumber }, room.hotelId.toString());
};

export const getAvailableRoomsService = async (
  query: AvailableRoomsQuery,
  viewer: ViewerContext
): Promise<AvailableRoomResult[]> => {
  if (!canViewRooms(viewer.role)) throw new ForbiddenError('You do not have permission to view rooms');
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);

  if (query.checkOutDate <= query.checkInDate) {
    throw new ValidationError('Check-out date must be after check-in date');
  }

  const unavailableIds = await getUnavailableRoomIdsRepository(
    hotelId,
    query.checkInDate,
    query.checkOutDate
  );

  const rooms = await findAvailableRoomsRepository(
    hotelId,
    query.checkInDate,
    query.checkOutDate,
    unavailableIds,
    query.roomTypeId,
    query.numberOfGuests
  );

  return rooms.map((room) => {
    const roomTypeDoc = room.roomTypeId as unknown as {
      _id: Types.ObjectId;
      name: string;
      basePrice: number;
      maxGuests: number;
      amenities?: string[];
    };
    const effectivePrice = room.isPriceOverridden && room.priceOverride !== undefined
      ? room.priceOverride
      : roomTypeDoc?.basePrice ?? 0;
    const effectiveMaxGuests = room.maxGuestsOverride ?? roomTypeDoc?.maxGuests ?? 1;

    return {
      id: room._id.toString(),
      roomNumber: room.roomNumber,
      floorNumber: room.floor,
      buildingName: room.buildingName,
      wing: room.wing,
      status: room.status,
      roomType: roomTypeDoc
        ? {
            id: roomTypeDoc._id.toString(),
            name: roomTypeDoc.name,
            basePrice: roomTypeDoc.basePrice,
            maxGuests: roomTypeDoc.maxGuests,
            amenities: roomTypeDoc.amenities,
          }
        : undefined,
      effectivePrice,
      effectiveMaxGuests,
    };
  });
};

export const blockRoomService = async (
  id: string,
  input: BlockRoomInput,
  viewer: ViewerContext
): Promise<SanitizedRoom> => {
  if (!canManageRooms(viewer.role)) throw new ForbiddenError('You do not have permission to block rooms');
  const room = await getRoomOrThrow(id, viewer);

  room.isBlocked = true;
  room.status = 'blocked';
  room.isBookable = false;
  room.blockedReason = input.blockedReason;
  room.blockedFrom = input.blockedFrom;
  room.blockedTo = input.blockedTo;
  room.updatedBy = new Types.ObjectId(viewer.userId);
  addRoomTimeline(room, 'room.blocked', viewer, input.blockedReason, {
    blockedFrom: input.blockedFrom,
    blockedTo: input.blockedTo,
  });

  const updated = await updateRoomRepository(room);
  await updated.populate('roomTypeId', 'name basePrice maxGuests');
  await logAudit('room.blocked', id, viewer, input as Record<string, unknown>, room.hotelId.toString());
  return sanitizeRoom(updated);
};

export const unblockRoomService = async (
  id: string,
  viewer: ViewerContext
): Promise<SanitizedRoom> => {
  if (!canManageRooms(viewer.role)) throw new ForbiddenError('You do not have permission to unblock rooms');
  const room = await getRoomOrThrow(id, viewer);

  room.isBlocked = false;
  room.blockedReason = undefined;
  room.blockedFrom = undefined;
  room.blockedTo = undefined;
  room.isBookable = true;
  room.status = room.currentBookingId ? 'occupied' : 'available';
  room.updatedBy = new Types.ObjectId(viewer.userId);
  addRoomTimeline(room, 'room.unblocked', viewer, 'Room unblocked');

  const updated = await updateRoomRepository(room);
  await updated.populate('roomTypeId', 'name basePrice maxGuests');
  await logAudit('room.unblocked', id, viewer, {}, room.hotelId.toString());
  return sanitizeRoom(updated);
};

export const markRoomMaintenanceService = async (
  id: string,
  input: MarkRoomMaintenanceInput,
  viewer: ViewerContext
): Promise<SanitizedRoom> => {
  if (!canUpdateMaintenance(viewer.role)) {
    throw new ForbiddenError('You do not have permission to update maintenance status');
  }
  const room = await getRoomOrThrow(id, viewer);
  const previous = room.maintenanceStatus;
  room.maintenanceStatus = input.maintenanceStatus;
  if (input.notes) room.notes = input.notes;
  if (input.maintenanceStatus === 'resolved' || input.maintenanceStatus === 'none') {
    room.maintenanceNotes = input.notes ?? room.maintenanceNotes;
  } else {
    room.maintenanceNotes = input.notes ?? room.maintenanceNotes;
    room.maintenanceSchedule = room.maintenanceSchedule ?? new Date();
  }

  const syncedStatus = syncStatusFromMaintenance(input.maintenanceStatus);
  if (syncedStatus) {
    room.status = syncedStatus as IRoom['status'];
    room.isBookable = syncedStatus === 'available';
  }

  room.updatedBy = new Types.ObjectId(viewer.userId);
  addRoomTimeline(room, 'room.maintenance_changed', viewer, input.notes || `Maintenance changed to ${input.maintenanceStatus}`, {
    previous,
    new: input.maintenanceStatus,
  });
  const updated = await updateRoomRepository(room);
  await updated.populate('roomTypeId', 'name basePrice maxGuests');
  await logAudit(
    'room.maintenance_changed',
    id,
    viewer,
    { previous, new: input.maintenanceStatus },
    room.hotelId.toString()
  );
  return sanitizeRoom(updated);
};

export const updateHousekeepingStatusService = async (
  id: string,
  input: UpdateHousekeepingStatusInput,
  viewer: ViewerContext
): Promise<SanitizedRoom> => {
  if (!canUpdateHousekeeping(viewer.role)) {
    throw new ForbiddenError('You do not have permission to update housekeeping status');
  }
  const room = await getRoomOrThrow(id, viewer);
  const previous = room.housekeepingStatus;
  room.housekeepingStatus = input.housekeepingStatus;
  if (input.notes) room.notes = input.notes;
  room.cleaningNotes = input.notes ?? room.cleaningNotes;
  if (input.housekeepingStatus === 'clean' || input.housekeepingStatus === 'inspected') {
    room.lastCleanedAt = new Date();
  }
  if (input.housekeepingStatus === 'inspected') {
    room.lastInspectedAt = new Date();
  }

  const syncedStatus = syncStatusFromHousekeeping(input.housekeepingStatus, room.status);
  if (syncedStatus && !room.currentBookingId) {
    room.status = syncedStatus as IRoom['status'];
    if (syncedStatus === 'available') room.isBookable = true;
  }

  room.updatedBy = new Types.ObjectId(viewer.userId);
  addRoomTimeline(room, 'room.housekeeping_changed', viewer, input.notes || `Housekeeping changed to ${input.housekeepingStatus}`, {
    previous,
    new: input.housekeepingStatus,
  });
  const updated = await updateRoomRepository(room);
  await updated.populate('roomTypeId', 'name basePrice maxGuests');
  await logAudit(
    'room.housekeeping_changed',
    id,
    viewer,
    { previous, new: input.housekeepingStatus },
    room.hotelId.toString()
  );
  return sanitizeRoom(updated);
};
