import { FilterQuery, Types } from 'mongoose';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { ILead, LeadSource } from '../../models/Lead';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import {
  AddLeadNoteInput,
  AssignLeadInput,
  ConvertLeadToBookingInput,
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadInput,
  UpdateLeadStatusInput,
} from './validation';
import {
  createAuditLogRepository,
  createBookingRepository,
  createFollowUpTaskRepository,
  createGuestRepository,
  createLeadRepository,
  findAuditLogsByLeadIdRepository,
  findGuestByPhoneRepository,
  findLeadByIdRepository,
  findLeadsRepository,
  findSalesStaffRepository,
  findUserByIdRepository,
  generateLeadNumberRepository,
  getLeadStatsRepository,
  softDeleteLeadRepository,
  updateLeadRepository,
} from './lead.repository';
import { LeadStatsResult, SanitizedLead, ViewerContext } from './lead.types';

const LEAD_VIEW_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'];
const LEAD_MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'];

const resolveHotelId = (hotelId: string | undefined, fallbackHotelId?: string): string => {
  const resolved = hotelId ?? fallbackHotelId;
  if (!resolved) throw new ValidationError('Hotel ID is required');
  return resolved;
};

const assertHotelAccess = (viewer: ViewerContext, hotelId: string): void => {
  if (viewer.role !== 'super_admin' && viewer.hotelId !== hotelId) {
    throw new ForbiddenError('Access denied to this hotel');
  }
};

const assertCanView = (viewer: ViewerContext): void => {
  if (!LEAD_VIEW_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to view leads');
  }
};

const assertCanManage = (viewer: ViewerContext): void => {
  if (!LEAD_MANAGE_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to manage leads');
  }
};

const sanitizeLead = (lead: ILead, auditLogs?: unknown[]): SanitizedLead => {
  const doc = lead.toObject ? lead.toObject() : lead;
  return { ...doc, id: doc._id?.toString(), auditLogs };
};

const addTimeline = (
  lead: ILead,
  action: string,
  viewer: ViewerContext,
  message?: string,
  metadata?: Record<string, unknown>
) => {
  lead.timeline = lead.timeline ?? [];
  lead.timeline.unshift({
    action,
    message,
    createdAt: new Date(),
    createdBy: new Types.ObjectId(viewer.userId),
    metadata,
  });
  lead.timeline = lead.timeline.slice(0, 50);
};

const logAudit = async (action: string, lead: ILead, viewer: ViewerContext, changes?: Record<string, unknown>) => {
  await createAuditLogRepository({
    hotelId: lead.hotelId,
    userId: viewer.userId,
    action,
    entity: 'Lead',
    entityId: lead._id,
    changes,
  });
};

const buildFilter = (query: ListLeadsQuery, hotelId: string): FilterQuery<ILead> => {
  const filter: FilterQuery<ILead> = { hotelId };
  if (query.status) filter.status = query.status;
  if (query.source) filter.source = query.source;
  if (query.leadType) filter.leadType = query.leadType;
  if (query.priority) filter.priority = query.priority;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.includeConverted === false) filter.status = { $nin: ['converted', 'lost', 'not_interested'] };
  if (query.followUpFrom || query.followUpTo) {
    filter.followUpDate = {};
    if (query.followUpFrom) filter.followUpDate.$gte = query.followUpFrom;
    if (query.followUpTo) filter.followUpDate.$lte = query.followUpTo;
  }
  return filter;
};

const getLeadOrThrow = async (id: string, viewer: ViewerContext): Promise<ILead> => {
  const lead = await findLeadByIdRepository(id);
  if (!lead) throw new NotFoundError('Lead not found');
  assertHotelAccess(viewer, lead.hotelId.toString());
  return lead;
};

const ensureAssignableStaff = async (hotelId: string, assignedTo?: string) => {
  if (!assignedTo) return;
  const user = await findUserByIdRepository(assignedTo);
  if (!user) throw new NotFoundError('Assigned user not found');
  const staff = await findSalesStaffRepository(hotelId, assignedTo);
  if (!staff) throw new ValidationError('Assigned user must be active sales, reception, or manager staff');
};

const sourceToGuestSource = (source: LeadSource): string => {
  const map: Record<string, string> = {
    phone_call: 'phone',
    google_business: 'google_business',
    walk_in: 'walk_in',
    website: 'website',
    whatsapp: 'whatsapp',
    facebook: 'facebook',
    instagram: 'instagram',
    ota: 'ota',
    referral: 'referral',
    corporate: 'corporate',
    wedding: 'event',
    event: 'event',
    other: 'other',
  };
  return map[source] ?? 'other';
};

const leadTypeToBookingType = (leadType: string): string => {
  if (leadType === 'corporate_booking') return 'corporate';
  if (leadType === 'wedding_booking') return 'wedding';
  if (leadType === 'group_booking') return 'group';
  return 'individual';
};

const generateBookingNumber = () => `BK-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

export const listLeadsService = async (
  query: ListLeadsQuery,
  viewer: ViewerContext
): Promise<PaginatedResponse<SanitizedLead>> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const result = await findLeadsRepository(buildFilter(query, hotelId), {
    page: query.page,
    limit: query.limit,
    search: query.search,
    searchFields: ['fullName', 'phone', 'email', 'companyName', 'leadNumber'],
    sortBy: query.sortBy ?? 'createdAt',
    sortOrder: query.sortOrder,
  });
  return { ...result, data: result.data.map((lead) => sanitizeLead(lead)) };
};

export const getLeadStatsService = async (viewer: ViewerContext, hotelIdParam?: string): Promise<LeadStatsResult> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(hotelIdParam, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const stats = await getLeadStatsRepository(hotelId);
  const leadsByStatus = stats.statusAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});
  const leadsBySource = stats.sourceAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});
  const leadsByType = stats.typeAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});
  const totalLeads = Object.values(leadsByStatus).reduce((sum, count) => sum + count, 0);
  const convertedLeads = leadsByStatus.converted ?? 0;
  return {
    totalLeads,
    newLeads: leadsByStatus.new ?? 0,
    hotLeads: stats.hotLeads,
    pendingFollowUps: stats.pendingFollowUps,
    convertedLeads,
    lostLeads: (leadsByStatus.lost ?? 0) + (leadsByStatus.not_interested ?? 0),
    conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
    estimatedPipelineValue: stats.estimatedPipelineValue,
    leadsByStatus,
    leadsBySource,
    leadsByType,
    assignedWorkload: stats.assignedWorkload,
  };
};

export const getLeadByIdService = async (id: string, viewer: ViewerContext) => {
  assertCanView(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  const auditLogs = LEAD_MANAGE_ROLES.includes(viewer.role)
    ? await findAuditLogsByLeadIdRepository(lead._id)
    : undefined;
  return sanitizeLead(lead, auditLogs);
};

export const createLeadService = async (input: CreateLeadInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  await ensureAssignableStaff(hotelId, input.assignedTo);
  const leadNumber = await generateLeadNumberRepository(hotelId);
  const lead = await createLeadRepository({
    hotelId,
    leadNumber,
    ...input,
    status: input.status ?? 'new',
    priority: input.priority ?? 'medium',
    assignedTo: input.assignedTo ? new Types.ObjectId(input.assignedTo) : undefined,
    sourceHistory: [{ source: input.source, capturedAt: new Date(), notes: 'Lead created' }],
    timeline: [{ action: 'lead.created', message: 'Lead created', createdAt: new Date(), createdBy: new Types.ObjectId(viewer.userId) }],
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  await createFollowUpTaskRepository(lead, input.assignedTo ? new Types.ObjectId(input.assignedTo) : undefined);
  await logAudit('lead.created', lead, viewer, { leadNumber });
  return sanitizeLead(await findLeadByIdRepository(lead._id.toString()) ?? lead);
};

export const updateLeadService = async (id: string, input: UpdateLeadInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  const changes: Record<string, unknown> = {};
  const previousSource = lead.source;
  if (input.assignedTo !== undefined) {
    await ensureAssignableStaff(lead.hotelId.toString(), input.assignedTo);
    lead.assignedTo = input.assignedTo ? new Types.ObjectId(input.assignedTo) : undefined;
    changes.assignedTo = input.assignedTo;
  }
  const assignableFields: Array<keyof UpdateLeadInput> = ['fullName', 'phone', 'email', 'companyName', 'city', 'source', 'leadType', 'status', 'priority', 'estimatedValue', 'expectedRooms', 'expectedGuests', 'checkInDate', 'checkOutDate', 'eventDate', 'followUpDate', 'notes', 'lostReason', 'enquiryId', 'corporateLeadId', 'eventLeadId'];
  assignableFields.forEach((field) => {
    if (field in input && input[field] !== undefined) {
      (lead as unknown as Record<string, unknown>)[field] = ['enquiryId', 'corporateLeadId', 'eventLeadId'].includes(field)
        ? new Types.ObjectId(input[field] as string)
        : input[field];
      changes[field] = input[field];
    }
  });
  if (input.source && input.source !== previousSource) {
    lead.sourceHistory.unshift({ source: input.source, capturedAt: new Date(), notes: 'Lead source updated' });
  }
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'lead.updated', viewer, 'Lead updated', changes);
  await updateLeadRepository(lead);
  if (input.followUpDate) await createFollowUpTaskRepository(lead, lead.assignedTo);
  await logAudit('lead.updated', lead, viewer, changes);
  return getLeadByIdService(id, viewer);
};

export const assignLeadService = async (id: string, input: AssignLeadInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  await ensureAssignableStaff(lead.hotelId.toString(), input.assignedTo);
  lead.assignedTo = new Types.ObjectId(input.assignedTo);
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'lead.assigned', viewer, input.notes || 'Lead assigned', { assignedTo: input.assignedTo });
  await updateLeadRepository(lead);
  await createFollowUpTaskRepository(lead, lead.assignedTo);
  await logAudit('lead.assigned', lead, viewer, { assignedTo: input.assignedTo });
  return getLeadByIdService(id, viewer);
};

export const updateLeadStatusService = async (id: string, input: UpdateLeadStatusInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  const previous = lead.status;
  lead.status = input.status;
  if (input.lostReason !== undefined) lead.lostReason = input.lostReason;
  if (input.followUpDate !== undefined) lead.followUpDate = input.followUpDate;
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'lead.status_changed', viewer, input.notes || `Status changed to ${input.status}`, { previous, status: input.status });
  await updateLeadRepository(lead);
  if (input.followUpDate) await createFollowUpTaskRepository(lead, lead.assignedTo);
  await logAudit('lead.status_changed', lead, viewer, { previous, status: input.status });
  return getLeadByIdService(id, viewer);
};

export const addLeadNoteService = async (id: string, input: AddLeadNoteInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  lead.notes = [lead.notes, input.note].filter(Boolean).join('\n');
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'lead.note_added', viewer, input.note);
  await updateLeadRepository(lead);
  await logAudit('lead.note_added', lead, viewer, { note: input.note });
  return getLeadByIdService(id, viewer);
};

export const convertLeadToGuestService = async (id: string, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  let guest = lead.convertedGuestId ? null : await findGuestByPhoneRepository(lead.hotelId.toString(), lead.phone);
  if (!guest) {
    guest = await createGuestRepository({
      hotelId: lead.hotelId,
      fullName: lead.fullName,
      name: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      guestType: lead.leadType === 'corporate_booking' ? 'corporate' : lead.leadType === 'event_booking' ? 'event_guest' : 'individual',
      source: sourceToGuestSource(lead.source),
      notes: lead.notes,
      lastEnquiryDate: lead.createdAt,
      tags: ['lead-converted'],
      createdBy: viewer.userId,
      updatedBy: viewer.userId,
    });
  }
  lead.convertedGuestId = guest._id;
  lead.status = 'converted';
  lead.convertedAt = new Date();
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'lead.converted_to_guest', viewer, 'Lead converted to guest', { guestId: guest._id.toString() });
  await updateLeadRepository(lead);
  await logAudit('lead.converted_to_guest', lead, viewer, { guestId: guest._id.toString() });
  return { lead: await getLeadByIdService(id, viewer), guest };
};

export const convertLeadToBookingService = async (
  id: string,
  input: ConvertLeadToBookingInput,
  viewer: ViewerContext
) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  let guestId = input.guestId ? new Types.ObjectId(input.guestId) : lead.convertedGuestId;
  if (!guestId) {
    const result = await convertLeadToGuestService(id, viewer);
    const guest = result.guest as { _id: Types.ObjectId };
    guestId = guest._id;
  }
  const booking = await createBookingRepository({
    hotelId: lead.hotelId,
    bookingNumber: generateBookingNumber(),
    guestId,
    roomId: input.roomId ? new Types.ObjectId(input.roomId) : undefined,
    roomTypeId: input.roomTypeId ? new Types.ObjectId(input.roomTypeId) : undefined,
    bookingType: leadTypeToBookingType(lead.leadType),
    source: lead.source,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    roomCount: input.roomCount ?? lead.expectedRooms ?? 1,
    adults: input.adults,
    children: input.children ?? 0,
    status: 'reserved',
    paymentStatus: input.paidAmount ? 'partially_paid' : 'unpaid',
    roomRate: input.roomRate,
    totalAmount: input.totalAmount,
    paidAmount: input.paidAmount ?? 0,
    notes: input.notes ?? lead.notes,
    assignedTo: input.assignedTo ? new Types.ObjectId(input.assignedTo) : lead.assignedTo,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
    timeline: [{ action: 'booking.created_from_lead', message: `Converted from ${lead.leadNumber}`, createdAt: new Date(), createdBy: new Types.ObjectId(viewer.userId) }],
  });
  lead.convertedBookingId = booking._id;
  lead.status = 'converted';
  lead.convertedAt = lead.convertedAt ?? new Date();
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'lead.converted_to_booking', viewer, 'Lead converted to booking', { bookingId: booking._id.toString() });
  await updateLeadRepository(lead);
  await logAudit('lead.converted_to_booking', lead, viewer, { bookingId: booking._id.toString() });
  return { lead: await getLeadByIdService(id, viewer), booking };
};

export const deleteLeadService = async (id: string, viewer: ViewerContext): Promise<void> => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  await softDeleteLeadRepository(id, viewer.userId);
  await logAudit('lead.deleted', lead, viewer, { leadNumber: lead.leadNumber });
};
