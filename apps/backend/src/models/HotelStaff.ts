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
  employeeId?: string;
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
  experienceYears?: number;
  skills: string[];
  shiftType?: ShiftType;
  shiftStartTime?: string;
  shiftEndTime?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  documents: Array<{
    _id?: mongoose.Types.ObjectId;
    documentType: string;
    name?: string;
    url: string;
    publicId?: string;
    uploadedAt?: Date;
  }>;
  notes?: string;
  timeline: Array<{
    action: string;
    message?: string;
    createdAt?: Date;
    createdBy?: mongoose.Types.ObjectId;
    metadata?: Record<string, unknown>;
  }>;
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
    employeeId: { type: String, trim: true, uppercase: true, index: true },
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
    experienceYears: { type: Number, min: 0, default: 0 },
    skills: [{ type: String, trim: true }],
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
    documents: [
      {
        documentType: { type: String, required: true },
        name: { type: String },
        url: { type: String, required: true },
        publicId: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: { type: String, maxlength: 2000 },
    timeline: [
      {
        action: { type: String, required: true },
        message: { type: String },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        metadata: { type: Schema.Types.Mixed },
      },
    ],
    permissions: {
      type: [{ type: String }],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on_duty', 'off_duty', 'leave', 'suspended', 'resigned'],
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
hotelStaffSchema.index({ hotelId: 1, employeeId: 1 }, { unique: true, sparse: true, partialFilterExpression: { isDeleted: { $ne: true } } });
hotelStaffSchema.index({ hotelId: 1, email: 1 }, { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } });
hotelStaffSchema.index({ hotelId: 1, phone: 1 });
hotelStaffSchema.index({ hotelId: 1, role: 1 });
hotelStaffSchema.index({ hotelId: 1, status: 1 });
hotelStaffSchema.index({ hotelId: 1, department: 1 });
hotelStaffSchema.index({ hotelId: 1, fullName: 'text', email: 'text', phone: 'text' });
hotelStaffSchema.plugin(softDeletePlugin);

export const HotelStaff = mongoose.model<IHotelStaff>('HotelStaff', hotelStaffSchema);
