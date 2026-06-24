import mongoose, { Document, Schema } from 'mongoose';
import {
  StaffRole,
  StaffStatus,
  ShiftType,
  Gender,
  StaffPermission,
} from '@hotel-growth-os/shared';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface IHotelStaff extends Document {
  userId: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  role: StaffRole;
  department?: string;
  designation?: string;
  profileImage?: string;
  gender?: Gender;
  dateOfBirth?: Date;
  joiningDate: Date;
  salary?: number;
  shiftType?: ShiftType;
  shiftStartTime?: string;
  shiftEndTime?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  permissions: StaffPermission[];
  status: StaffStatus;
  isActive: boolean;
  lastLoginAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const hotelStaffSchema = new Schema<IHotelStaff>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    alternatePhone: { type: String, trim: true },
    role: {
      type: String,
      enum: [
        'hotel_owner',
        'hotel_manager',
        'reception_staff',
        'sales_staff',
        'accountant',
        'housekeeping',
        'maintenance',
        'security',
      ],
      required: true,
    },
    department: { type: String, trim: true, index: true },
    designation: { type: String, trim: true },
    profileImage: { type: String },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    dateOfBirth: { type: Date },
    joiningDate: { type: Date, required: true, default: Date.now, index: true },
    salary: { type: Number, min: 0 },
    shiftType: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night', 'rotational', 'flexible'],
      index: true,
    },
    shiftStartTime: { type: String },
    shiftEndTime: { type: String },
    address: { type: String },
    emergencyContactName: { type: String, trim: true },
    emergencyContactPhone: { type: String, trim: true },
    permissions: {
      type: [{ type: String }],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    ...auditFields,
  },
  { timestamps: true }
);

hotelStaffSchema.index({ hotelId: 1, userId: 1 }, { unique: true });
hotelStaffSchema.index({ hotelId: 1, email: 1 }, { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } });
hotelStaffSchema.index({ hotelId: 1, phone: 1 });
hotelStaffSchema.index({ hotelId: 1, role: 1 });
hotelStaffSchema.index({ hotelId: 1, status: 1 });
hotelStaffSchema.index({ hotelId: 1, department: 1 });
hotelStaffSchema.index({ hotelId: 1, fullName: 'text', email: 'text', phone: 'text' });
hotelStaffSchema.plugin(softDeletePlugin);

export const HotelStaff = mongoose.model<IHotelStaff>('HotelStaff', hotelStaffSchema);
