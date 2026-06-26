import { Types } from 'mongoose';
import { IWhatsAppAutomationRule } from '../../models/WhatsAppAutomationRule';
import { IWhatsAppMessage } from '../../models/WhatsAppMessage';
import { IWhatsAppTemplate } from '../../models/WhatsAppTemplate';

export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface WhatsAppStatsResult {
  totalMessages: number;
  incomingMessages: number;
  outgoingMessages: number;
  sentMessages: number;
  deliveredMessages: number;
  readMessages: number;
  failedMessages: number;
  scheduledMessages: number;
  queuedMessages: number;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  automationSuccessRate: number;
  activeConversations: number;
  activeTemplates: number;
  activeAutomationRules: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byTrigger: Record<string, number>;
}

export interface WhatsAppConversationSummary {
  phone: string;
  guestId?: string;
  guestName?: string;
  lastMessage: string;
  lastMessageAt?: Date;
  lastDirection?: string;
  lastStatus?: string;
  unreadCount: number;
  messageCount: number;
  assignedTo?: string;
}

export type SanitizedWhatsAppMessage = Omit<IWhatsAppMessage, '_id'> & {
  id: string;
  _id: Types.ObjectId;
  guest?: { id: string; fullName?: string; phone?: string };
};

export type SanitizedWhatsAppTemplate = Omit<IWhatsAppTemplate, '_id'> & {
  id: string;
  _id: Types.ObjectId;
};

export type SanitizedWhatsAppAutomationRule = Omit<IWhatsAppAutomationRule, '_id'> & {
  id: string;
  _id: Types.ObjectId;
  template?: SanitizedWhatsAppTemplate;
};
