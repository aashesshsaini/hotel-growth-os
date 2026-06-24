import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export const BED_TYPES = [
  'single',
  'double',
  'queen',
  'king',
  'twin',
  'bunk',
  'sofa_bed',
  'mixed',
] as const;

export const MEAL_PLANS = [
  'room_only',
  'breakfast',
  'half_board',
  'full_board',
  'all_inclusive',
] as const;

export const INVENTORY_TYPES = [
  'standard',
  'dormitory',
  'villa',
  'cottage',
  'banquet_room',
  'conference_room',
] as const;

export const ROOM_TYPE_STATUSES = ['active', 'inactive', 'archived'] as const;

export const ROOM_SIZE_UNITS = ['sqft', 'sqm'] as const;

export type BedType = (typeof BED_TYPES)[number];
export type MealPlan = (typeof MEAL_PLANS)[number];
export type InventoryType = (typeof INVENTORY_TYPES)[number];
export type RoomTypeStatus = (typeof ROOM_TYPE_STATUSES)[number];
export type RoomSizeUnit = (typeof ROOM_SIZE_UNITS)[number];

export interface IRoomTypeImage {
  _id?: mongoose.Types.ObjectId;
  url: string;
  publicId?: string;
  altText?: string;
  sortOrder: number;
}

export interface IRoomType extends Document {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  code?: string;
  description?: string;
  shortDescription?: string;
  basePrice: number;
  weekdayPrice?: number;
  weekendPrice?: number;
  extraAdultPrice?: number;
  extraChildPrice?: number;
  taxPercentage?: number;
  discountPercentage?: number;
  maxGuests: number;
  maxAdults: number;
  maxChildren: number;
  bedType?: BedType;
  roomSize?: number;
  roomSizeUnit?: RoomSizeUnit;
  totalRooms: number;
  amenities: string[];
  facilities: string[];
  images: IRoomTypeImage[];
  coverImage?: string;
  cancellationPolicy?: string;
  checkInInstructions?: string;
  mealPlan?: MealPlan;
  inventoryType?: InventoryType;
  status: RoomTypeStatus;
  isAvailableForBooking: boolean;
  isVisibleOnWebsite: boolean;
  sortOrder: number;
  tags: string[];
  metadata?: Record<string, unknown>;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roomTypeImageSchema = new Schema<IRoomTypeImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    altText: { type: String },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true }
);

const roomTypeSchema = new Schema<IRoomType>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, index: true },
    code: { type: String, trim: true, uppercase: true, index: true },
    description: { type: String, maxlength: 2000 },
    shortDescription: { type: String, maxlength: 300 },
    basePrice: { type: Number, required: true, min: 0, index: true },
    weekdayPrice: { type: Number, min: 0 },
    weekendPrice: { type: Number, min: 0 },
    extraAdultPrice: { type: Number, min: 0, default: 0 },
    extraChildPrice: { type: Number, min: 0, default: 0 },
    taxPercentage: { type: Number, min: 0, max: 100, default: 0 },
    discountPercentage: { type: Number, min: 0, max: 100, default: 0 },
    maxGuests: { type: Number, required: true, min: 1 },
    maxAdults: { type: Number, required: true, min: 1, default: 2 },
    maxChildren: { type: Number, min: 0, default: 0 },
    bedType: { type: String, enum: BED_TYPES },
    roomSize: { type: Number, min: 0 },
    roomSizeUnit: { type: String, enum: ROOM_SIZE_UNITS, default: 'sqft' },
    totalRooms: { type: Number, min: 0, default: 0 },
    amenities: [{ type: String }],
    facilities: [{ type: String }],
    images: [roomTypeImageSchema],
    coverImage: { type: String },
    cancellationPolicy: { type: String, maxlength: 2000 },
    checkInInstructions: { type: String, maxlength: 1000 },
    mealPlan: { type: String, enum: MEAL_PLANS, default: 'room_only' },
    inventoryType: { type: String, enum: INVENTORY_TYPES, default: 'standard' },
    status: { type: String, enum: ROOM_TYPE_STATUSES, default: 'active', index: true },
    isAvailableForBooking: { type: Boolean, default: true, index: true },
    isVisibleOnWebsite: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
    tags: [{ type: String }],
    metadata: { type: Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
    ...auditFields,
  },
  { timestamps: true }
);

roomTypeSchema.index({ hotelId: 1, slug: 1 }, { unique: true });
roomTypeSchema.index({ hotelId: 1, code: 1 }, { unique: true, sparse: true });
roomTypeSchema.index({ hotelId: 1, name: 1 });
roomTypeSchema.index({ hotelId: 1, status: 1 });
roomTypeSchema.index({ hotelId: 1, isAvailableForBooking: 1 });
roomTypeSchema.index({ hotelId: 1, isVisibleOnWebsite: 1 });
roomTypeSchema.index({ hotelId: 1, basePrice: 1 });
roomTypeSchema.index({ createdAt: -1 });

roomTypeSchema.pre('save', function syncActiveStatus(next) {
  this.isActive = this.status === 'active';
  next();
});

roomTypeSchema.plugin(softDeletePlugin);

export const RoomType = mongoose.model<IRoomType>('RoomType', roomTypeSchema);
