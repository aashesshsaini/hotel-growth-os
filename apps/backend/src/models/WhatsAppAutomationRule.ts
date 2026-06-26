import mongoose, { Document, Schema } from 'mongoose';
import { WHATSAPP_AUTOMATION_TRIGGERS, WhatsAppAutomationTrigger } from '@hotel-growth-os/shared';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IWhatsAppAutomationRule extends Document {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  trigger: WhatsAppAutomationTrigger;
  description?: string;
  isActive: boolean;
  messageType: 'text' | 'template';
  messageContent?: string;
  templateId?: mongoose.Types.ObjectId;
  delayMinutes: number;
  assignedTo?: mongoose.Types.ObjectId;
  conditions?: Record<string, unknown>;
  stats: {
    triggered: number;
    sent: number;
    failed: number;
  };
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppAutomationRuleSchema = new Schema<IWhatsAppAutomationRule>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    name: { type: String, required: true, trim: true },
    trigger: { type: String, enum: WHATSAPP_AUTOMATION_TRIGGERS, required: true, index: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    messageType: { type: String, enum: ['text', 'template'], default: 'text' },
    messageContent: { type: String },
    templateId: { type: Schema.Types.ObjectId, ref: 'WhatsAppTemplate' },
    delayMinutes: { type: Number, default: 0, min: 0 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    conditions: { type: Schema.Types.Mixed },
    stats: {
      triggered: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    ...auditFields,
  },
  { timestamps: true }
);

whatsAppAutomationRuleSchema.index({ hotelId: 1, trigger: 1, isActive: 1 });
whatsAppAutomationRuleSchema.plugin(softDeletePlugin);

export const WhatsAppAutomationRule = mongoose.model<IWhatsAppAutomationRule>(
  'WhatsAppAutomationRule',
  whatsAppAutomationRuleSchema
);
