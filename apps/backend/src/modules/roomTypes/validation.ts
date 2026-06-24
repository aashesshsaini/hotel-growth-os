import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';
import {
  BED_TYPES,
  INVENTORY_TYPES,
  MEAL_PLANS,
  ROOM_SIZE_UNITS,
  ROOM_TYPE_STATUSES,
} from './roomType.constants';

const optionalNumber = z.coerce.number().optional();
const optionalBoolean = z
  .union([z.boolean(), z.literal('true'), z.literal('false')])
  .transform((val) => val === true || val === 'true')
  .optional();

const commaSeparatedArray = z
  .string()
  .optional()
  .transform((val) => (val ? val.split(',').map((item) => item.trim()).filter(Boolean) : undefined));

export const listRoomTypesQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  search: z.string().optional(),
  status: z.enum(ROOM_TYPE_STATUSES).optional(),
  bedType: z.enum(BED_TYPES).optional(),
  mealPlan: z.enum(MEAL_PLANS).optional(),
  inventoryType: z.enum(INVENTORY_TYPES).optional(),
  isAvailableForBooking: optionalBoolean,
  isVisibleOnWebsite: optionalBoolean,
  isActive: optionalBoolean,
  minPrice: optionalNumber,
  maxPrice: optionalNumber,
  minGuests: optionalNumber,
  maxGuests: optionalNumber,
  amenities: commaSeparatedArray,
  tags: commaSeparatedArray,
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  sortBy: z
    .enum(['name', 'basePrice', 'maxGuests', 'sortOrder', 'createdAt', 'status'])
    .optional(),
});

export const roomTypeIdParamSchema = z.object({
  id: objectIdSchema,
});

export const roomTypeImageIdParamSchema = z.object({
  id: objectIdSchema,
  imageId: objectIdSchema,
});

export const publicHotelSlugParamSchema = z.object({
  hotelSlug: z.string().min(1),
});

export const roomTypeImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  altText: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const roomTypeBaseFields = {
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(120).optional(),
  code: z.string().min(1).max(20).optional(),
  description: z.string().max(2000).optional(),
  shortDescription: z.string().max(300).optional(),
  basePrice: z.number().min(0),
  weekdayPrice: z.number().min(0).optional(),
  weekendPrice: z.number().min(0).optional(),
  extraAdultPrice: z.number().min(0).optional(),
  extraChildPrice: z.number().min(0).optional(),
  taxPercentage: z.number().min(0).max(100).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  maxGuests: z.number().int().min(1),
  maxAdults: z.number().int().min(1).optional(),
  maxChildren: z.number().int().min(0).optional(),
  bedType: z.enum(BED_TYPES).optional(),
  roomSize: z.number().min(0).optional(),
  roomSizeUnit: z.enum(ROOM_SIZE_UNITS).optional(),
  totalRooms: z.number().int().min(0).optional(),
  amenities: z.array(z.string()).optional(),
  facilities: z.array(z.string()).optional(),
  coverImage: z.string().url().optional(),
  cancellationPolicy: z.string().max(2000).optional(),
  checkInInstructions: z.string().max(1000).optional(),
  mealPlan: z.enum(MEAL_PLANS).optional(),
  inventoryType: z.enum(INVENTORY_TYPES).optional(),
  status: z.enum(ROOM_TYPE_STATUSES).optional(),
  isAvailableForBooking: z.boolean().optional(),
  isVisibleOnWebsite: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
};

export const createRoomTypeSchema = z.object({
  hotelId: objectIdSchema.optional(),
  ...roomTypeBaseFields,
});

export const updateRoomTypeSchema = z.object({
  ...Object.fromEntries(
    Object.entries(roomTypeBaseFields).map(([key, schema]) => [key, schema.optional()])
  ),
  isActive: z.boolean().optional(),
});

export const updateRoomTypeStatusSchema = z.object({
  status: z.enum(ROOM_TYPE_STATUSES),
  reason: z.string().max(500).optional(),
});

export const updateRoomTypePricingSchema = z.object({
  basePrice: z.number().min(0).optional(),
  weekdayPrice: z.number().min(0).optional(),
  weekendPrice: z.number().min(0).optional(),
  extraAdultPrice: z.number().min(0).optional(),
  extraChildPrice: z.number().min(0).optional(),
  taxPercentage: z.number().min(0).max(100).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
});

export const updateRoomTypeAmenitiesSchema = z.object({
  amenities: z.array(z.string()).optional(),
  facilities: z.array(z.string()).optional(),
});

export const uploadRoomTypeImagesSchema = z.object({
  images: z.array(roomTypeImageSchema).min(1).max(10),
  setCoverImageUrl: z.string().url().optional(),
});

export type ListRoomTypesQuery = z.infer<typeof listRoomTypesQuerySchema>;
export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;
export type UpdateRoomTypeInput = Partial<CreateRoomTypeInput> & { isActive?: boolean };
export type UpdateRoomTypeStatusInput = z.infer<typeof updateRoomTypeStatusSchema>;
export type UpdateRoomTypePricingInput = z.infer<typeof updateRoomTypePricingSchema>;
export type UpdateRoomTypeAmenitiesInput = z.infer<typeof updateRoomTypeAmenitiesSchema>;
export type UploadRoomTypeImagesInput = z.infer<typeof uploadRoomTypeImagesSchema>;
