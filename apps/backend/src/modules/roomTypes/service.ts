import { FilterQuery, Types } from 'mongoose';
import { IRoomType } from '../../models/RoomType';
import {
  CreateRoomTypeInput,
  ListRoomTypesQuery,
  UpdateRoomTypeAmenitiesInput,
  UpdateRoomTypeInput,
  UpdateRoomTypePricingInput,
  UpdateRoomTypeStatusInput,
  UploadRoomTypeImagesInput,
} from './validation';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import {
  canDeleteRoomTypes,
  canManageRoomTypes,
  canViewRoomTypes,
  MAX_ROOM_TYPE_IMAGES,
} from './roomType.constants';
import {
  countRoomsByRoomTypeRepository,
  createAuditLogRepository,
  createRoomTypeRepository,
  findAuditLogsByRoomTypeIdRepository,
  findHotelByIdRepository,
  findHotelBySlugRepository,
  findPublicRoomTypesRepository,
  findRoomTypeByCodeInHotelRepository,
  findRoomTypeByIdRepository,
  findRoomTypeByNameInHotelRepository,
  findRoomTypesRepository,
  generateUniqueRoomTypeCodeRepository,
  generateUniqueRoomTypeSlugRepository,
  getRoomTypeStatsRepository,
  softDeleteRoomTypeRepository,
  updateRoomTypeRepository,
} from './roomType.repository';
import {
  PublicRoomType,
  RoomTypeStatsResult,
  SanitizedRoomType,
  ViewerContext,
} from './roomType.types';

const resolveHotelId = (hotelId: string | undefined, fallbackHotelId?: string): string => {
  const resolved = hotelId ?? fallbackHotelId;
  if (!resolved) {
    throw new ValidationError('Hotel ID is required');
  }
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

const assertCanManage = (viewerRole: string): void => {
  if (!canManageRoomTypes(viewerRole)) {
    throw new ForbiddenError('You do not have permission to manage room types');
  }
};

const assertCanView = (viewerRole: string): void => {
  if (!canViewRoomTypes(viewerRole)) {
    throw new ForbiddenError('You do not have permission to view room types');
  }
};

const assertCanDelete = (viewerRole: string): void => {
  if (!canDeleteRoomTypes(viewerRole)) {
    throw new ForbiddenError('You do not have permission to delete room types');
  }
};

const logAudit = async (
  action: string,
  entityId: string,
  viewer: ViewerContext,
  changes?: Record<string, unknown>
): Promise<void> => {
  await createAuditLogRepository({
    hotelId: viewer.hotelId,
    userId: viewer.userId,
    action,
    entity: 'RoomType',
    entityId: new Types.ObjectId(entityId),
    changes,
  });
};

const sanitizeRoomType = (roomType: IRoomType, includeAudit = false, auditLogs?: unknown[]): SanitizedRoomType => {
  const doc = roomType.toObject ? roomType.toObject() : roomType;
  const sanitized: SanitizedRoomType = {
    ...doc,
    id: doc._id?.toString(),
    isActive: doc.status === 'active' || doc.isActive === true,
  };

  if (includeAudit && auditLogs) {
    sanitized.auditLogs = auditLogs;
  }

  return sanitized;
};

const toPublicRoomType = (roomType: IRoomType): PublicRoomType => ({
  id: roomType._id.toString(),
  name: roomType.name,
  slug: roomType.slug,
  code: roomType.code,
  description: roomType.description,
  shortDescription: roomType.shortDescription,
  basePrice: roomType.basePrice,
  weekdayPrice: roomType.weekdayPrice,
  weekendPrice: roomType.weekendPrice,
  maxGuests: roomType.maxGuests,
  maxAdults: roomType.maxAdults,
  maxChildren: roomType.maxChildren,
  bedType: roomType.bedType,
  roomSize: roomType.roomSize,
  roomSizeUnit: roomType.roomSizeUnit,
  amenities: roomType.amenities ?? [],
  facilities: roomType.facilities ?? [],
  images: (roomType.images ?? []).map((img) => ({
    url: img.url,
    altText: img.altText,
    sortOrder: img.sortOrder,
  })),
  coverImage: roomType.coverImage,
  mealPlan: roomType.mealPlan,
  inventoryType: roomType.inventoryType,
  cancellationPolicy: roomType.cancellationPolicy,
  checkInInstructions: roomType.checkInInstructions,
  tags: roomType.tags ?? [],
});

const buildListFilter = (query: ListRoomTypesQuery, hotelId: string): FilterQuery<IRoomType> => {
  const filter: FilterQuery<IRoomType> = { hotelId };

  if (query.status) filter.status = query.status;
  if (query.bedType) filter.bedType = query.bedType;
  if (query.mealPlan) filter.mealPlan = query.mealPlan;
  if (query.inventoryType) filter.inventoryType = query.inventoryType;
  if (query.isAvailableForBooking !== undefined) {
    filter.isAvailableForBooking = query.isAvailableForBooking;
  }
  if (query.isVisibleOnWebsite !== undefined) {
    filter.isVisibleOnWebsite = query.isVisibleOnWebsite;
  }
  if (query.isActive !== undefined) {
    filter.status = query.isActive ? 'active' : { $ne: 'active' };
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.basePrice = {};
    if (query.minPrice !== undefined) filter.basePrice.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.basePrice.$lte = query.maxPrice;
  }
  if (query.minGuests !== undefined || query.maxGuests !== undefined) {
    filter.maxGuests = {};
    if (query.minGuests !== undefined) filter.maxGuests.$gte = query.minGuests;
    if (query.maxGuests !== undefined) filter.maxGuests.$lte = query.maxGuests;
  }
  if (query.amenities?.length) {
    filter.amenities = { $all: query.amenities };
  }
  if (query.tags?.length) {
    filter.tags = { $all: query.tags };
  }
  if (query.createdFrom || query.createdTo) {
    filter.createdAt = {};
    if (query.createdFrom) filter.createdAt.$gte = query.createdFrom;
    if (query.createdTo) filter.createdAt.$lte = query.createdTo;
  }

  return filter;
};

const getRoomTypeOrThrow = async (
  id: string,
  viewer: ViewerContext
): Promise<IRoomType> => {
  const roomType = await findRoomTypeByIdRepository(id);
  if (!roomType) {
    throw new NotFoundError('Room type not found');
  }
  assertHotelAccess(viewer.role, viewer.hotelId, roomType.hotelId.toString());
  return roomType;
};

const ensureUniqueNameAndCode = async (
  hotelId: string,
  name: string,
  code: string | undefined,
  excludeId?: string
): Promise<void> => {
  const existingName = await findRoomTypeByNameInHotelRepository(hotelId, name, excludeId);
  if (existingName) {
    throw new ConflictError('A room type with this name already exists for this hotel');
  }

  if (code) {
    const existingCode = await findRoomTypeByCodeInHotelRepository(hotelId, code, excludeId);
    if (existingCode) {
      throw new ConflictError('A room type with this code already exists for this hotel');
    }
  }
};

export const listRoomTypesService = async (
  query: ListRoomTypesQuery,
  viewer: ViewerContext
): Promise<PaginatedResponse<SanitizedRoomType>> => {
  assertCanView(viewer.role);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);

  const filter = buildListFilter(query, hotelId);
  const result = await findRoomTypesRepository(filter, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    searchFields: ['name', 'code', 'description', 'shortDescription'],
    sortBy: query.sortBy ?? 'sortOrder',
    sortOrder: query.sortOrder,
  });

  return {
    ...result,
    data: result.data.map((item) => sanitizeRoomType(item)),
  };
};

export const getRoomTypeStatsService = async (
  viewer: ViewerContext,
  hotelIdParam?: string
): Promise<RoomTypeStatsResult> => {
  assertCanView(viewer.role);
  const hotelId = resolveHotelId(hotelIdParam, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);
  return getRoomTypeStatsRepository(hotelId);
};

export const getRoomTypeByIdService = async (
  id: string,
  viewer: ViewerContext
): Promise<SanitizedRoomType> => {
  assertCanView(viewer.role);
  const roomType = await getRoomTypeOrThrow(id, viewer);
  const linkedRoomsCount = await countRoomsByRoomTypeRepository(id);

  let auditLogs: unknown[] | undefined;
  if (canManageRoomTypes(viewer.role)) {
    auditLogs = await findAuditLogsByRoomTypeIdRepository(roomType._id);
  }

  const sanitized = sanitizeRoomType(roomType, !!auditLogs, auditLogs);
  sanitized.linkedRoomsCount = linkedRoomsCount;
  return sanitized;
};

export const createRoomTypeService = async (
  input: CreateRoomTypeInput,
  viewer: ViewerContext
): Promise<SanitizedRoomType> => {
  assertCanManage(viewer.role);
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);

  const hotel = await findHotelByIdRepository(hotelId);
  if (!hotel) {
    throw new NotFoundError('Hotel not found');
  }

  const slug = input.slug ?? (await generateUniqueRoomTypeSlugRepository(hotelId, input.name));
  const code = input.code ?? (await generateUniqueRoomTypeCodeRepository(hotelId, input.name));
  await ensureUniqueNameAndCode(hotelId, input.name, code);

  const roomType = await createRoomTypeRepository({
    hotelId,
    name: input.name,
    slug,
    code,
    description: input.description,
    shortDescription: input.shortDescription,
    basePrice: input.basePrice,
    weekdayPrice: input.weekdayPrice,
    weekendPrice: input.weekendPrice,
    extraAdultPrice: input.extraAdultPrice ?? 0,
    extraChildPrice: input.extraChildPrice ?? 0,
    taxPercentage: input.taxPercentage ?? 0,
    discountPercentage: input.discountPercentage ?? 0,
    maxGuests: input.maxGuests,
    maxAdults: input.maxAdults ?? input.maxGuests,
    maxChildren: input.maxChildren ?? 0,
    bedType: input.bedType,
    roomSize: input.roomSize,
    roomSizeUnit: input.roomSizeUnit ?? 'sqft',
    totalRooms: input.totalRooms ?? 0,
    amenities: input.amenities ?? [],
    facilities: input.facilities ?? [],
    images: [],
    coverImage: input.coverImage,
    cancellationPolicy: input.cancellationPolicy,
    checkInInstructions: input.checkInInstructions,
    mealPlan: input.mealPlan ?? 'room_only',
    inventoryType: input.inventoryType ?? 'standard',
    status: input.status ?? 'active',
    isAvailableForBooking: input.isAvailableForBooking ?? true,
    isVisibleOnWebsite: input.isVisibleOnWebsite ?? true,
    sortOrder: input.sortOrder ?? 0,
    tags: input.tags ?? [],
    metadata: input.metadata,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });

  await logAudit('room_type.created', roomType._id.toString(), viewer, { name: input.name });
  return sanitizeRoomType(roomType);
};

export const updateRoomTypeService = async (
  id: string,
  input: UpdateRoomTypeInput,
  viewer: ViewerContext
): Promise<SanitizedRoomType> => {
  assertCanManage(viewer.role);
  const roomType = await getRoomTypeOrThrow(id, viewer);

  if (input.name && input.name !== roomType.name) {
    await ensureUniqueNameAndCode(roomType.hotelId.toString(), input.name, input.code, id);
    roomType.name = input.name;
    if (!input.slug) {
      roomType.slug = await generateUniqueRoomTypeSlugRepository(
        roomType.hotelId.toString(),
        input.name,
        id
      );
    }
  }

  if (input.code && input.code !== roomType.code) {
    await ensureUniqueNameAndCode(
      roomType.hotelId.toString(),
      input.name ?? roomType.name,
      input.code,
      id
    );
    roomType.code = input.code;
  }

  if (input.slug) roomType.slug = input.slug;
  if (input.description !== undefined) roomType.description = input.description;
  if (input.shortDescription !== undefined) roomType.shortDescription = input.shortDescription;
  if (input.basePrice !== undefined) roomType.basePrice = input.basePrice;
  if (input.weekdayPrice !== undefined) roomType.weekdayPrice = input.weekdayPrice;
  if (input.weekendPrice !== undefined) roomType.weekendPrice = input.weekendPrice;
  if (input.extraAdultPrice !== undefined) roomType.extraAdultPrice = input.extraAdultPrice;
  if (input.extraChildPrice !== undefined) roomType.extraChildPrice = input.extraChildPrice;
  if (input.taxPercentage !== undefined) roomType.taxPercentage = input.taxPercentage;
  if (input.discountPercentage !== undefined) roomType.discountPercentage = input.discountPercentage;
  if (input.maxGuests !== undefined) roomType.maxGuests = input.maxGuests;
  if (input.maxAdults !== undefined) roomType.maxAdults = input.maxAdults;
  if (input.maxChildren !== undefined) roomType.maxChildren = input.maxChildren;
  if (input.bedType !== undefined) roomType.bedType = input.bedType;
  if (input.roomSize !== undefined) roomType.roomSize = input.roomSize;
  if (input.roomSizeUnit !== undefined) roomType.roomSizeUnit = input.roomSizeUnit;
  if (input.totalRooms !== undefined) roomType.totalRooms = input.totalRooms;
  if (input.amenities !== undefined) roomType.amenities = input.amenities;
  if (input.facilities !== undefined) roomType.facilities = input.facilities;
  if (input.coverImage !== undefined) roomType.coverImage = input.coverImage;
  if (input.cancellationPolicy !== undefined) roomType.cancellationPolicy = input.cancellationPolicy;
  if (input.checkInInstructions !== undefined) roomType.checkInInstructions = input.checkInInstructions;
  if (input.mealPlan !== undefined) roomType.mealPlan = input.mealPlan;
  if (input.inventoryType !== undefined) roomType.inventoryType = input.inventoryType;
  if (input.status !== undefined) roomType.status = input.status;
  if (input.isAvailableForBooking !== undefined) {
    roomType.isAvailableForBooking = input.isAvailableForBooking;
  }
  if (input.isVisibleOnWebsite !== undefined) {
    roomType.isVisibleOnWebsite = input.isVisibleOnWebsite;
  }
  if (input.sortOrder !== undefined) roomType.sortOrder = input.sortOrder;
  if (input.tags !== undefined) roomType.tags = input.tags;
  if (input.metadata !== undefined) roomType.metadata = input.metadata;
  if (input.isActive !== undefined) {
    roomType.status = input.isActive ? 'active' : 'inactive';
  }

  roomType.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateRoomTypeRepository(roomType);
  await logAudit('room_type.updated', id, viewer, input as Record<string, unknown>);
  return sanitizeRoomType(updated);
};

export const updateRoomTypeStatusService = async (
  id: string,
  input: UpdateRoomTypeStatusInput,
  viewer: ViewerContext
): Promise<SanitizedRoomType> => {
  assertCanManage(viewer.role);
  const roomType = await getRoomTypeOrThrow(id, viewer);
  const previousStatus = roomType.status;
  roomType.status = input.status;
  roomType.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateRoomTypeRepository(roomType);
  await logAudit('room_type.status_changed', id, viewer, {
    previousStatus,
    newStatus: input.status,
    reason: input.reason,
  });
  return sanitizeRoomType(updated);
};

export const updateRoomTypePricingService = async (
  id: string,
  input: UpdateRoomTypePricingInput,
  viewer: ViewerContext
): Promise<SanitizedRoomType> => {
  assertCanManage(viewer.role);
  const roomType = await getRoomTypeOrThrow(id, viewer);

  if (input.basePrice !== undefined) roomType.basePrice = input.basePrice;
  if (input.weekdayPrice !== undefined) roomType.weekdayPrice = input.weekdayPrice;
  if (input.weekendPrice !== undefined) roomType.weekendPrice = input.weekendPrice;
  if (input.extraAdultPrice !== undefined) roomType.extraAdultPrice = input.extraAdultPrice;
  if (input.extraChildPrice !== undefined) roomType.extraChildPrice = input.extraChildPrice;
  if (input.taxPercentage !== undefined) roomType.taxPercentage = input.taxPercentage;
  if (input.discountPercentage !== undefined) roomType.discountPercentage = input.discountPercentage;

  roomType.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateRoomTypeRepository(roomType);
  await logAudit('room_type.pricing_updated', id, viewer, input as Record<string, unknown>);
  return sanitizeRoomType(updated);
};

export const updateRoomTypeAmenitiesService = async (
  id: string,
  input: UpdateRoomTypeAmenitiesInput,
  viewer: ViewerContext
): Promise<SanitizedRoomType> => {
  assertCanManage(viewer.role);
  const roomType = await getRoomTypeOrThrow(id, viewer);

  if (input.amenities !== undefined) roomType.amenities = input.amenities;
  if (input.facilities !== undefined) roomType.facilities = input.facilities;

  roomType.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateRoomTypeRepository(roomType);
  await logAudit('room_type.amenities_updated', id, viewer, input as Record<string, unknown>);
  return sanitizeRoomType(updated);
};

export const uploadRoomTypeImagesService = async (
  id: string,
  input: UploadRoomTypeImagesInput,
  viewer: ViewerContext
): Promise<SanitizedRoomType> => {
  assertCanManage(viewer.role);
  const roomType = await getRoomTypeOrThrow(id, viewer);

  const currentCount = roomType.images?.length ?? 0;
  if (currentCount + input.images.length > MAX_ROOM_TYPE_IMAGES) {
    throw new ValidationError(`Maximum ${MAX_ROOM_TYPE_IMAGES} images allowed per room type`);
  }

  const startOrder = currentCount;
  const newImages = input.images.map((img, index) => ({
    url: img.url,
    publicId: img.publicId ?? `placeholder-${Date.now()}-${index}`,
    altText: img.altText ?? roomType.name,
    sortOrder: img.sortOrder ?? startOrder + index,
  }));

  roomType.images.push(...newImages);

  if (input.setCoverImageUrl) {
    roomType.coverImage = input.setCoverImageUrl;
  } else if (!roomType.coverImage && newImages.length > 0) {
    roomType.coverImage = newImages[0].url;
  }

  roomType.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateRoomTypeRepository(roomType);
  await logAudit('room_type.image_uploaded', id, viewer, { count: input.images.length });
  return sanitizeRoomType(updated);
};

export const removeRoomTypeImageService = async (
  id: string,
  imageId: string,
  viewer: ViewerContext
): Promise<SanitizedRoomType> => {
  assertCanManage(viewer.role);
  const roomType = await getRoomTypeOrThrow(id, viewer);

  const imageIndex = roomType.images.findIndex((img) => img._id?.toString() === imageId);
  if (imageIndex === -1) {
    throw new NotFoundError('Image not found');
  }

  const removedImage = roomType.images[imageIndex];
  roomType.images.splice(imageIndex, 1);

  if (roomType.coverImage === removedImage.url) {
    roomType.coverImage = roomType.images[0]?.url;
  }

  roomType.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateRoomTypeRepository(roomType);
  await logAudit('room_type.image_removed', id, viewer, { imageId });
  return sanitizeRoomType(updated);
};

export const deleteRoomTypeService = async (id: string, viewer: ViewerContext): Promise<void> => {
  assertCanDelete(viewer.role);
  const roomType = await getRoomTypeOrThrow(id, viewer);

  const activeRooms = await countRoomsByRoomTypeRepository(id);
  if (activeRooms > 0) {
    throw new ConflictError('Cannot delete room type with assigned rooms');
  }

  await softDeleteRoomTypeRepository(id, viewer.userId);
  await logAudit('room_type.deleted', id, viewer, { name: roomType.name });
};

export const getPublicRoomTypesService = async (hotelSlug: string): Promise<PublicRoomType[]> => {
  const hotel = await findHotelBySlugRepository(hotelSlug);
  if (!hotel) {
    throw new NotFoundError('Hotel not found');
  }

  const roomTypes = await findPublicRoomTypesRepository(hotel._id.toString());
  return roomTypes.map(toPublicRoomType);
};
