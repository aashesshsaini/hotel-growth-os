import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface ITask extends Document {
  hotelId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assignedTo?: mongoose.Types.ObjectId;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  relatedTo?: {
    type: string;
    id: mongoose.Types.ObjectId;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    relatedTo: { type: { type: String }, id: Schema.Types.ObjectId },
    ...auditFields,
  },
  { timestamps: true }
);

taskSchema.index({ hotelId: 1, status: 1 });
taskSchema.index({ hotelId: 1, assignedTo: 1 });
taskSchema.plugin(softDeletePlugin);

export const Task = mongoose.model<ITask>('Task', taskSchema);
