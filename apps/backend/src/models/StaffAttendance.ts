import mongoose, { Document, Schema } from 'mongoose';
import { auditFields } from '../utils/schemaHelpers';

export const STAFF_ATTENDANCE_STATUSES = [
  'present',
  'absent',
  'late',
  'half_day',
  'leave',
  'on_duty',
  'off_duty',
] as const;

export type StaffAttendanceStatus = (typeof STAFF_ATTENDANCE_STATUSES)[number];

export interface IStaffAttendance extends Document {
  hotelId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  status: StaffAttendanceStatus;
  checkInAt?: Date;
  checkOutAt?: Date;
  shiftType?: string;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const staffAttendanceSchema = new Schema<IStaffAttendance>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'HotelStaff', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: STAFF_ATTENDANCE_STATUSES,
      required: true,
      default: 'present',
      index: true,
    },
    checkInAt: { type: Date },
    checkOutAt: { type: Date },
    shiftType: { type: String },
    notes: { type: String, maxlength: 1000 },
    ...auditFields,
  },
  { timestamps: true }
);

staffAttendanceSchema.index({ hotelId: 1, staffId: 1, date: 1 }, { unique: true });
staffAttendanceSchema.index({ hotelId: 1, date: 1, status: 1 });

export const StaffAttendance = mongoose.model<IStaffAttendance>('StaffAttendance', staffAttendanceSchema);
