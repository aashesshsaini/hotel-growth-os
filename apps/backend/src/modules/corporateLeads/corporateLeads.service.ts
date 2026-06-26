import { FilterQuery, Types } from 'mongoose';
import { AuditLog, Booking, CorporateLead } from '../../models';
import { ICorporateLead } from '../../models/CorporateLead';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import {
  findAuditLogsByCorporateLeadIdRepository,
  findCorporateLeadByIdRepository,
  findCorporateLeadsRepository,
  findUserByIdRepository,
  getCorporateLeadBookingsRepository,
  getCorporateLeadStatsRepository,
  getCorporatePipelineRepository,
  syncOutstandingAmount,
} from './corporateLead.repository';
import { CorporateLeadDetails, CorporateLeadStats, CorporatePipelineColumn, ViewerContext } from './corporateLead.types';
import {
  AddDocumentInput,
  AddMeetingInput,
  AddNoteInput,
  AddProposalInput,
  AssignInput,
  CreateInput,
  ListQuery,
  StatusInput,
  UpdateInput,
} from './corporateLeads.validation';

const VIEW_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'];
const MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'];

const resolveHotelId = (hotelId: string | undefined, fallbackHotelId?: string): string => {
  const resolved = hotelId ?? fallbackHotelId;
  if (!resolved) throw new ValidationError('Hotel ID is required');
  return resolved;
};

const assertCanView = (viewer: ViewerContext): void => {
  if (!VIEW_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to view corporate leads');
};

const assertCanManage = (viewer: ViewerContext): void => {
  if (!MANAGE_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to manage corporate leads');
};

const assertHotelAccess = (viewer: ViewerContext, hotelId: string): void => {
  if (viewer.role !== 'super_admin' && viewer.hotelId !== hotelId) {
    throw new ForbiddenError('Access denied to this hotel');
  }
};

const addTimeline = (
  lead: ICorporateLead,
  action: string,
  viewer: ViewerContext,
  message?: string,
  metadata?: Record<string, unknown>
) => {
  lead.timeline = [
    {
      action,
      message,
      createdAt: new Date(),
      createdBy: new Types.ObjectId(viewer.userId),
      metadata,
    },
    ...(lead.timeline ?? []),
  ].slice(0, 50);
};

const logAudit = async (
  action: string,
  lead: ICorporateLead,
  viewer: ViewerContext,
  changes?: Record<string, unknown>
) => {
  await AuditLog.create({
    hotelId: lead.hotelId,
    userId: viewer.userId,
    action,
    entity: 'CorporateLead',
    entityId: lead._id,
    changes,
  });
};

const buildFilter = (query: ListQuery, hotelId: string): FilterQuery<ICorporateLead> => {
  const filter: FilterQuery<ICorporateLead> = { hotelId };
  if (query.status) filter.status = query.status;
  if (query.companyType) filter.companyType = query.companyType;
  if (query.priority) filter.priority = query.priority;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.followUpFrom || query.followUpTo) {
    filter.followUpDate = {};
    if (query.followUpFrom) filter.followUpDate.$gte = query.followUpFrom;
    if (query.followUpTo) filter.followUpDate.$lte = query.followUpTo;
  }
  return filter;
};

const getLeadOrThrow = async (id: string, viewer: ViewerContext): Promise<ICorporateLead> => {
  const lead = await findCorporateLeadByIdRepository(id);
  if (!lead) throw new NotFoundError('Corporate lead not found');
  assertHotelAccess(viewer, lead.hotelId.toString());
  return lead;
};

const ensurePrimaryContact = (input: CreateInput | UpdateInput, existing?: ICorporateLead) => {
  const contacts = input.contacts ?? existing?.contacts ?? [];
  if (contacts.length === 0 && input.contactPerson) {
    return [
      {
        name: input.contactPerson,
        phone: input.phone,
        email: input.email,
        isPrimary: true,
      },
    ];
  }
  if (contacts.length > 0 && !contacts.some((contact) => contact.isPrimary)) {
    return contacts.map((contact, index) => ({ ...contact, isPrimary: index === 0 }));
  }
  return contacts;
};

export const list = async (query: ListQuery, viewer: ViewerContext) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  return findCorporateLeadsRepository(buildFilter(query, hotelId), {
    page: query.page,
    limit: query.limit,
    search: query.search,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });
};

export const getById = async (id: string, viewer: ViewerContext): Promise<CorporateLeadDetails> => {
  assertCanView(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  const hotelId = lead.hotelId.toString();
  const [bookings, auditLogs] = await Promise.all([
    getCorporateLeadBookingsRepository(hotelId, id),
    findAuditLogsByCorporateLeadIdRepository(hotelId, id),
  ]);

  const bookingRevenue = bookings.reduce((sum, booking) => sum + (booking.paidAmount ?? 0), 0);

  return {
    company: lead.toObject(),
    bookings,
    revenueSummary: {
      totalValue: lead.totalValue ?? 0,
      paidAmount: lead.paidAmount ?? 0,
      outstandingAmount: lead.outstandingAmount ?? 0,
      bookingCount: bookings.length,
      bookingRevenue,
    },
    auditLogs,
  };
};

export const getStats = async (viewer: ViewerContext, hotelIdInput?: string): Promise<CorporateLeadStats> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(hotelIdInput, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  return getCorporateLeadStatsRepository(hotelId);
};

export const getPipeline = async (viewer: ViewerContext, hotelIdInput?: string): Promise<CorporatePipelineColumn[]> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(hotelIdInput, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  return getCorporatePipelineRepository(hotelId);
};

export const create = async (input: CreateInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);

  const contacts = ensurePrimaryContact(input);
  const lead = await CorporateLead.create({
    ...input,
    hotelId,
    contacts,
    tags: input.tags ?? [],
    timeline: [],
    structuredNotes: [],
    meetings: [],
    proposals: [],
    documents: [],
    status: input.status ?? 'new',
    priority: input.priority ?? 'medium',
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });

  syncOutstandingAmount(lead);
  addTimeline(lead, 'corporate.created', viewer, `Company ${lead.companyName} created`);
  await lead.save();
  await logAudit('corporate.created', lead, viewer, input as Record<string, unknown>);
  return findCorporateLeadByIdRepository(lead._id.toString());
};

export const update = async (id: string, input: UpdateInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);

  if (input.contacts) input.contacts = ensurePrimaryContact(input, lead);
  Object.assign(lead, input, { updatedBy: viewer.userId });
  syncOutstandingAmount(lead);
  addTimeline(lead, 'corporate.updated', viewer, 'Company profile updated');
  await lead.save();
  await logAudit('corporate.updated', lead, viewer, input as Record<string, unknown>);
  return findCorporateLeadByIdRepository(id);
};

export const remove = async (id: string, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  Object.assign(lead, { isDeleted: true, deletedAt: new Date(), deletedBy: viewer.userId, updatedBy: viewer.userId });
  addTimeline(lead, 'corporate.deleted', viewer, 'Company archived');
  await lead.save();
  await logAudit('corporate.deleted', lead, viewer);
};

export const assign = async (id: string, input: AssignInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  const user = await findUserByIdRepository(input.assignedTo);
  if (!user) throw new NotFoundError('Assigned user not found');
  lead.assignedTo = new Types.ObjectId(input.assignedTo);
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'corporate.assigned', viewer, input.notes || `Assigned to ${user.name || user.email}`);
  await lead.save();
  await logAudit('corporate.assigned', lead, viewer, input as Record<string, unknown>);
  return findCorporateLeadByIdRepository(id);
};

export const updateStatus = async (id: string, input: StatusInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  lead.status = input.status;
  if (input.followUpDate) lead.followUpDate = input.followUpDate;
  if (input.lostReason) lead.lostReason = input.lostReason;
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, `corporate.status.${input.status}`, viewer, input.notes || `Status changed to ${input.status}`);
  await lead.save();
  await logAudit('corporate.status_updated', lead, viewer, input as Record<string, unknown>);
  return findCorporateLeadByIdRepository(id);
};

export const addNote = async (id: string, input: AddNoteInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  lead.structuredNotes = [
    { text: input.note, createdAt: new Date(), createdBy: new Types.ObjectId(viewer.userId) },
    ...(lead.structuredNotes ?? []),
  ].slice(0, 100);
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'corporate.note_added', viewer, input.note);
  await lead.save();
  return findCorporateLeadByIdRepository(id);
};

export const addMeeting = async (id: string, input: AddMeetingInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  lead.meetings = [
    {
      title: input.title,
      scheduledAt: input.scheduledAt,
      location: input.location,
      attendees: input.attendees,
      status: input.status ?? 'scheduled',
      notes: input.notes,
      createdAt: new Date(),
      createdBy: new Types.ObjectId(viewer.userId),
    },
    ...(lead.meetings ?? []),
  ].slice(0, 100);
  if (lead.status === 'new' || lead.status === 'contacted') lead.status = 'meeting_scheduled';
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'corporate.meeting_scheduled', viewer, input.title);
  await lead.save();
  return findCorporateLeadByIdRepository(id);
};

export const addProposal = async (id: string, input: AddProposalInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  lead.proposals = [
    {
      title: input.title,
      amount: input.amount,
      sentAt: input.sentAt,
      validUntil: input.validUntil,
      status: input.status ?? 'draft',
      notes: input.notes,
      createdAt: new Date(),
      createdBy: new Types.ObjectId(viewer.userId),
    },
    ...(lead.proposals ?? []),
  ].slice(0, 100);
  if (input.status === 'sent' && !['proposal_sent', 'negotiation', 'negotiating', 'contract_review', 'approved', 'active_client', 'confirmed'].includes(lead.status)) {
    lead.status = 'proposal_sent';
  }
  if (input.amount > (lead.totalValue ?? 0)) lead.totalValue = input.amount;
  syncOutstandingAmount(lead);
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'corporate.proposal_added', viewer, input.title);
  await lead.save();
  return findCorporateLeadByIdRepository(id);
};

export const addDocument = async (id: string, input: AddDocumentInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  lead.documents = [
    {
      name: input.name,
      url: input.url,
      documentType: input.documentType,
      uploadedAt: new Date(),
      uploadedBy: new Types.ObjectId(viewer.userId),
    },
    ...(lead.documents ?? []),
  ].slice(0, 50);
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'corporate.document_added', viewer, input.name);
  await lead.save();
  return findCorporateLeadByIdRepository(id);
};

export const recordPayment = async (
  id: string,
  input: { amount: number; notes?: string },
  viewer: ViewerContext
) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  lead.paidAmount = (lead.paidAmount ?? 0) + input.amount;
  syncOutstandingAmount(lead);
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'corporate.payment_recorded', viewer, input.notes || `Payment of ${input.amount} recorded`);
  await lead.save();
  return findCorporateLeadByIdRepository(id);
};
