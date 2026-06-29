import mongoose, { Document, Schema } from 'mongoose';

export interface IImpersonationSession extends Document {
  platformUserId: mongoose.Types.ObjectId;
  impersonatedUserId: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  status: 'active' | 'ended';
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const impersonationSessionSchema = new Schema<IImpersonationSession>(
  {
    platformUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    impersonatedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    startedAt: { type: Date, default: Date.now, index: true },
    endedAt: Date,
    status: { type: String, enum: ['active', 'ended'], default: 'active', index: true },
    reason: String,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

impersonationSessionSchema.index({ platformUserId: 1, status: 1, startedAt: -1 });
impersonationSessionSchema.index({ hotelId: 1, status: 1 });

export const ImpersonationSession = mongoose.model<IImpersonationSession>('ImpersonationSession', impersonationSessionSchema);
