import mongoose, { Document, Schema } from 'mongoose';
import {
  HousekeepingStatus,
  MaintenanceStatus,
  RoomStatus,
  HOUSEKEEPING_STATUSES,
  MAINTENANCE_STATUSES,
  ROOM_STATUSES,
} from '@hotel-growth-os/shared';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface IRoomImage {
  _id?: mongoose.Types.ObjectId;
  url: string;
  publicId?: string;
  altText?: string;
  sortOrder?: number;
  uploadedAt?: Date;
}

export interface IRoomTimelineItem {
  action: string;
  message?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface IRoomInspectionItem {
  item: string;
  isChecked: boolean;
  notes?: string;
}

export interface IRoom extends Document {
  hotelId: mongoose.Types.ObjectId;
  roomTypeId: mongoose.Types.ObjectId;
  roomNumber: string;
  floor?: number;
  buildingName?: string;
  wing?: string;
  roomName?: string;
  description?: string;
  capacity?: number;
  maxAdults?: number;
  maxChildren?: number;
  bedType?: string;
  viewType?: string;
  smokingPolicy?: 'smoking' | 'non_smoking';
  status: RoomStatus;
  housekeepingStatus: HousekeepingStatus;
  maintenanceStatus: MaintenanceStatus;
  currentBookingId?: mongoose.Types.ObjectId;
  currentGuestId?: mongoose.Types.ObjectId;
  assignedHousekeeperId?: mongoose.Types.ObjectId;
  assignedMaintenanceStaffId?: mongoose.Types.ObjectId;
  maxGuestsOverride?: number;
  priceOverride?: number;
  isPriceOverridden: boolean;
  isBookable: boolean;
  isVisibleToStaff: boolean;
  isBlocked: boolean;
  blockedReason?: string;
  blockedFrom?: Date;
  blockedTo?: Date;
  amenitiesOverride?: string[];
  images: IRoomImage[];
  cleaningNotes?: string;
  maintenanceNotes?: string;
  housekeepingSchedule?: Date;
  maintenanceSchedule?: Date;
  lastCleanedAt?: Date;
  lastInspectedAt?: Date;
  inspectionChecklist: IRoomInspectionItem[];
  notes?: string;
  internalNotes?: string;
  qrCode?: string;
  tags?: string[];
  timeline: IRoomTimelineItem[];
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    roomTypeId: { type: Schema.Types.ObjectId, ref: 'RoomType', required: true, index: true },
    roomNumber: { type: String, required: true, trim: true, index: true },
    floor: { type: Number, index: true },
    buildingName: { type: String, trim: true },
    wing: { type: String, trim: true },
    roomName: { type: String, trim: true },
    description: { type: String, maxlength: 1000 },
    capacity: { type: Number, min: 1 },
    maxAdults: { type: Number, min: 1 },
    maxChildren: { type: Number, min: 0 },
    bedType: { type: String, trim: true },
    viewType: { type: String, trim: true },
    smokingPolicy: { type: String, enum: ['smoking', 'non_smoking'], default: 'non_smoking' },
    status: {
      type: String,
      enum: ROOM_STATUSES,
      default: 'available',
      index: true,
    },
    housekeepingStatus: {
      type: String,
      enum: HOUSEKEEPING_STATUSES,
      default: 'clean',
      index: true,
    },
    maintenanceStatus: {
      type: String,
      enum: MAINTENANCE_STATUSES,
      default: 'none',
      index: true,
    },
    currentBookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    currentGuestId: { type: Schema.Types.ObjectId, ref: 'Guest' },
    assignedHousekeeperId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedMaintenanceStaffId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    maxGuestsOverride: { type: Number, min: 1 },
    priceOverride: { type: Number, min: 0 },
    isPriceOverridden: { type: Boolean, default: false },
    isBookable: { type: Boolean, default: true, index: true },
    isVisibleToStaff: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false, index: true },
    blockedReason: { type: String, maxlength: 500 },
    blockedFrom: { type: Date },
    blockedTo: { type: Date },
    amenitiesOverride: [{ type: String }],
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        altText: { type: String },
        sortOrder: { type: Number, default: 0 },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    cleaningNotes: { type: String, maxlength: 1000 },
    maintenanceNotes: { type: String, maxlength: 1000 },
    housekeepingSchedule: { type: Date },
    maintenanceSchedule: { type: Date },
    lastCleanedAt: { type: Date },
    lastInspectedAt: { type: Date },
    inspectionChecklist: [
      {
        item: { type: String, required: true },
        isChecked: { type: Boolean, default: false },
        notes: { type: String },
      },
    ],
    notes: { type: String, maxlength: 1000 },
    internalNotes: { type: String, maxlength: 2000 },
    qrCode: { type: String },
    tags: [{ type: String }],
    timeline: [
      {
        action: { type: String, required: true },
        message: { type: String },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
        metadata: { type: Schema.Types.Mixed },
      },
    ],
    metadata: { type: Schema.Types.Mixed },
    ...auditFields,
  },
  { timestamps: true }
);

roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hotelId: 1, roomTypeId: 1 });
roomSchema.index({ hotelId: 1, status: 1 });
roomSchema.index({ hotelId: 1, housekeepingStatus: 1 });
roomSchema.index({ hotelId: 1, isBookable: 1 });
roomSchema.index({ hotelId: 1, isBlocked: 1 });
roomSchema.index({ createdAt: -1 });

roomSchema.plugin(softDeletePlugin);

export const Room = mongoose.model<IRoom>('Room', roomSchema);
