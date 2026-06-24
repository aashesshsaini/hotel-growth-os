import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '@hotel-growth-os/shared';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  hotelId?: mongoose.Types.ObjectId;
  isActive: boolean;
  lastLoginAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff', 'accountant'],
      required: true,
    },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', index: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    ...auditFields,
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ hotelId: 1, role: 1 });
userSchema.plugin(softDeletePlugin);

export const User = mongoose.model<IUser>('User', userSchema);
