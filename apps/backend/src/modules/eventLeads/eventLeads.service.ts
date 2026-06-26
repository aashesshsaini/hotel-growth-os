import { FilterQuery, Types } from 'mongoose';
import { AuditLog, EventLead } from '../../models';
import { IEventLead } from '../../models/EventLead';
import { createGuestRepository, findGuestByPhoneRepository } from '../guests/guest.repository';
import { createBookingRepository } from '../leads/lead.repository';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import {
  findAuditLogsByEventLeadIdRepository,
  findEventLeadByIdRepository,
  findEventLeadsRepository,
  findUserByIdRepository,
  getEventLeadBookingsRepository,
  getEventLeadStatsRepository,
  getEventPipelineRepository,
  syncOutstandingAmount,
} from './eventLead.repository';
import { EventLeadDetails, EventLeadStats, EventPipelineColumn, ViewerContext } from './eventLead.types';
import {
  AddDocumentInput,
  AddNoteInput,
  AddPackageInput,
  AddProposalInput,
  AddSiteVisitInput,
  AssignInput,
  ConvertToBookingInput,
  CreateInput,
  ListQuery,
  RecordPaymentInput,
  StatusInput,
  UpdateInput,
} from './eventLeads.validation';

const VIEW_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'];
const MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'];

const resolveHotelId = (hotelId: string | undefined, fallbackHotelId?: string): string => {
  const resolved = hotelId ?? fallbackHotelId;
  if (!resolved) throw new ValidationError('Hotel ID is required');
  return resolved;
};

const assertCanView = (viewer: ViewerContext): void => {
  if (!VIEW_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to view event leads');
};

const assertCanManage = (viewer: ViewerContext): void => {
  if (!MANAGE_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to manage event leads');
};

const assertHotelAccess = (viewer: ViewerContext, hotelId: string): void => {
  if (viewer.role !== 'super_admin' && viewer.hotelId !== hotelId) {
    throw new ForbiddenError('Access denied to this hotel');
  }
};

const generateBookingNumber = () => `BK-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

const eventTypeToBookingType = (eventType: string): string => {
  if (['wedding', 'engagement', 'anniversary', 'birthday', 'party'].includes(eventType)) return 'wedding';
  if (['corporate_event', 'conference', 'seminar', 'training'].includes(eventType)) return 'corporate';
  if (eventType === 'group_stay') return 'group';
  return 'group';
};

const addTimeline = (
  lead: IEventLead,
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
  lead: IEventLead,
  viewer: ViewerContext,
  changes?: Record<string, unknown>
) => {
  await AuditLog.create({
    hotelId: lead.hotelId,
    userId: viewer.userId,
    action,
    entity: 'EventLead',
    entityId: lead._id,
    changes,
  });
};

const buildFilter = (query: ListQuery, hotelId: string): FilterQuery<IEventLead> => {
  const filter: FilterQuery<IEventLead> = { hotelId };
  if (query.status) filter.status = query.status;
  if (query.eventType) filter.eventType = query.eventType;
  if (query.priority) filter.priority = query.priority;
  if (query.source) filter.source = query.source;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.eventDateFrom || query.eventDateTo) {
    filter.eventDate = {};
    if (query.eventDateFrom) filter.eventDate.$gte = query.eventDateFrom;
    if (query.eventDateTo) filter.eventDate.$lte = query.eventDateTo;
  }
  if (query.followUpFrom || query.followUpTo) {
    filter.followUpDate = {};
    if (query.followUpFrom) filter.followUpDate.$gte = query.followUpFrom;
    if (query.followUpTo) filter.followUpDate.$lte = query.followUpTo;
  }
  return filter;
};

const getLeadOrThrow = async (id: string, viewer: ViewerContext): Promise<IEventLead> => {
  const lead = await findEventLeadByIdRepository(id);
  if (!lead) throw new NotFoundError('Event lead not found');
  assertHotelAccess(viewer, lead.hotelId.toString());
  return lead;
};

const applyFinancialDefaults = (input: CreateInput | UpdateInput, lead?: IEventLead) => {
  const totalValue = input.totalValue ?? input.estimatedValue ?? lead?.totalValue ?? lead?.estimatedValue ?? 0;
  const paidAmount = input.paidAmount ?? lead?.paidAmount ?? 0;
  return { totalValue, paidAmount, outstandingAmount: Math.max(0, totalValue - paidAmount) };
};

export const list = async (query: ListQuery, viewer: ViewerContext) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  return findEventLeadsRepository(buildFilter(query, hotelId), {
    page: query.page,
    limit: query.limit,
    search: query.search,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });
};

export const getById = async (id: string, viewer: ViewerContext): Promise<EventLeadDetails> => {
  assertCanView(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  const hotelId = lead.hotelId.toString();
  const [bookings, auditLogs] = await Promise.all([
    getEventLeadBookingsRepository(hotelId, id),
    findAuditLogsByEventLeadIdRepository(hotelId, id),
  ]);

  const bookingRevenue = bookings.reduce((sum, booking) => sum + (Number(booking.paidAmount) || 0), 0);

  return {
    event: lead.toObject(),
    bookings,
    revenueSummary: {
      totalValue: lead.totalValue ?? lead.estimatedValue ?? 0,
      paidAmount: lead.paidAmount ?? 0,
      advanceAmount: lead.advanceAmount ?? 0,
      outstandingAmount: lead.outstandingAmount ?? 0,
      bookingCount: bookings.length,
      bookingRevenue,
    },
    auditLogs,
  };
};

export const getStats = async (viewer: ViewerContext, hotelIdInput?: string): Promise<EventLeadStats> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(hotelIdInput, viewer.hotelId);
  return getEventLeadStatsRepository(hotelId);
};

export const getPipeline = async (viewer: ViewerContext, hotelIdInput?: string): Promise<EventPipelineColumn[]> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(hotelIdInput, viewer.hotelId);
  return getEventPipelineRepository(hotelId);
};

export const create = async (input: CreateInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  const financials = applyFinancialDefaults(input);

  const lead = await EventLead.create({
    ...input,
    hotelId,
    totalValue: financials.totalValue,
    paidAmount: financials.paidAmount,
    outstandingAmount: financials.outstandingAmount,
    requirements: input.requirements ?? {},
    packages: [],
    structuredNotes: [],
    timeline: [],
    proposals: [],
    siteVisits: [],
    documents: [],
    payments: [],
    tags: input.tags ?? [],
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });

  addTimeline(lead, 'event.created', viewer, `Event ${lead.eventName} created`);
  await lead.save();
  await logAudit('event.created', lead, viewer, input as Record<string, unknown>);
  return findEventLeadByIdRepository(lead._id.toString());
};

export const update = async (id: string, input: UpdateInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  Object.assign(lead, input, { updatedBy: viewer.userId });

  if (input.totalValue !== undefined || input.estimatedValue !== undefined || input.paidAmount !== undefined) {
    const financials = applyFinancialDefaults(input, lead);
    lead.totalValue = financials.totalValue;
    lead.outstandingAmount = financials.outstandingAmount;
    syncOutstandingAmount(lead);
  }

  addTimeline(lead, 'event.updated', viewer, 'Event lead updated');
  await lead.save();
  await logAudit('event.updated', lead, viewer, input as Record<string, unknown>);
  return findEventLeadByIdRepository(id);
};

export const remove = async (id: string, viewer: ViewerContext): Promise<void> => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  lead.isDeleted = true;
  lead.deletedAt = new Date();
  lead.deletedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'event.deleted', viewer, 'Event lead archived');
  await lead.save();
  await logAudit('event.deleted', lead, viewer);
};

export const assign = async (id: string, input: AssignInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  const user = await findUserByIdRepository(input.assignedTo);
  if (!user) throw new NotFoundError('Event manager not found');

  lead.assignedTo = new Types.ObjectId(input.assignedTo);
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'event.assigned', viewer, input.notes || `Assigned to ${user.name || user.email}`);
  await lead.save();
  await logAudit('event.assigned', lead, viewer, input as Record<string, unknown>);
  return findEventLeadByIdRepository(id);
};

export const updateStatus = async (id: string, input: StatusInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  lead.status = input.status;
  if (input.lostReason !== undefined) lead.lostReason = input.lostReason;
  if (input.followUpDate !== undefined) lead.followUpDate = input.followUpDate;
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, `event.status.${input.status}`, viewer, input.notes || `Status changed to ${input.status}`);
  await lead.save();
  await logAudit('event.status_updated', lead, viewer, input as Record<string, unknown>);
  return findEventLeadByIdRepository(id);
};

export const addNote = async (id: string, input: AddNoteInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  lead.structuredNotes = [
    { text: input.note, createdAt: new Date(), createdBy: new Types.ObjectId(viewer.userId) },
    ...(lead.structuredNotes ?? []),
  ].slice(0, 100);
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'event.note_added', viewer, input.note);
  await lead.save();
  return findEventLeadByIdRepository(id);
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
  ].slice(0, 50);
  if (input.status === 'sent' && lead.status === 'requirement_collected') {
    lead.status = 'proposal_sent';
  }
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'event.proposal_added', viewer, input.title);
  await lead.save();
  return findEventLeadByIdRepository(id);
};

export const addPackage = async (id: string, input: AddPackageInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  lead.packages = [
    {
      name: input.name,
      price: input.price,
      description: input.description,
      inclusions: input.inclusions,
      status: input.status ?? 'draft',
      createdAt: new Date(),
      createdBy: new Types.ObjectId(viewer.userId),
    },
    ...(lead.packages ?? []),
  ].slice(0, 30);
  if (!lead.packageName) {
    lead.packageName = input.name;
    lead.packagePrice = input.price;
  }
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'event.package_added', viewer, input.name);
  await lead.save();
  return findEventLeadByIdRepository(id);
};

export const addSiteVisit = async (id: string, input: AddSiteVisitInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  lead.siteVisits = [
    {
      title: input.title,
      scheduledAt: input.scheduledAt,
      location: input.location,
      status: input.status ?? 'scheduled',
      notes: input.notes,
      createdAt: new Date(),
      createdBy: new Types.ObjectId(viewer.userId),
    },
    ...(lead.siteVisits ?? []),
  ].slice(0, 30);
  if (lead.status === 'proposal_sent' || lead.status === 'requirement_collected') {
    lead.status = 'site_visit_scheduled';
  }
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'event.site_visit_scheduled', viewer, input.title);
  await lead.save();
  return findEventLeadByIdRepository(id);
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
  addTimeline(lead, 'event.document_added', viewer, input.name);
  await lead.save();
  return findEventLeadByIdRepository(id);
};

export const recordPayment = async (id: string, input: RecordPaymentInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);
  const paymentType = input.paymentType ?? 'advance';

  lead.payments = [
    {
      amount: input.amount,
      paymentType,
      paidAt: new Date(),
      notes: input.notes,
      createdBy: new Types.ObjectId(viewer.userId),
    },
    ...(lead.payments ?? []),
  ].slice(0, 100);

  if (paymentType === 'advance') {
    lead.advanceAmount = (lead.advanceAmount ?? 0) + input.amount;
  }
  lead.paidAmount = (lead.paidAmount ?? 0) + input.amount;
  syncOutstandingAmount(lead);

  if (lead.status === 'negotiation' || lead.status === 'proposal_sent') {
    lead.status = 'advance_pending';
  }

  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'event.payment_recorded', viewer, `${paymentType} payment of ${input.amount}`);
  await lead.save();
  await logAudit('event.payment_recorded', lead, viewer, input as Record<string, unknown>);
  return findEventLeadByIdRepository(id);
};

export const convertToBooking = async (id: string, input: ConvertToBookingInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const lead = await getLeadOrThrow(id, viewer);

  let guestId = input.guestId ? new Types.ObjectId(input.guestId) : lead.convertedGuestId;
  if (!guestId) {
    let guest = await findGuestByPhoneRepository(lead.hotelId.toString(), lead.phone);
    if (!guest) {
      guest = await createGuestRepository({
        hotelId: lead.hotelId,
        fullName: lead.contactPerson,
        name: lead.contactPerson,
        phone: lead.phone,
        email: lead.email,
        guestType: 'event_guest',
        source: lead.source || 'direct',
        notes: lead.notes,
        tags: ['event-lead-converted', lead.eventType],
        createdBy: viewer.userId,
        updatedBy: viewer.userId,
      });
    }
    guestId = guest._id;
    lead.convertedGuestId = guestId;
  }

  const booking = await createBookingRepository({
    hotelId: lead.hotelId,
    bookingNumber: generateBookingNumber(),
    guestId,
    eventLeadId: lead._id,
    bookingType: eventTypeToBookingType(lead.eventType),
    source: lead.source || 'direct',
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    roomCount: input.roomCount ?? 1,
    adults: input.adults,
    children: input.children ?? 0,
    status: 'reserved',
    paymentStatus: input.paidAmount ? 'partially_paid' : 'unpaid',
    roomRate: input.roomRate,
    totalAmount: input.totalAmount,
    paidAmount: input.paidAmount ?? lead.paidAmount ?? 0,
    notes: input.notes ?? lead.notes,
    assignedTo: input.assignedTo ? new Types.ObjectId(input.assignedTo) : lead.assignedTo,
    roomId: input.roomId ? new Types.ObjectId(input.roomId) : undefined,
    roomTypeId: input.roomTypeId ? new Types.ObjectId(input.roomTypeId) : undefined,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
    timeline: [{
      action: 'booking.created_from_event_lead',
      message: `Converted from ${lead.eventNumber || lead.eventName}`,
      createdAt: new Date(),
      createdBy: new Types.ObjectId(viewer.userId),
    }],
  });

  lead.convertedBookingId = booking._id;
  lead.status = 'converted';
  lead.convertedAt = lead.convertedAt ?? new Date();
  lead.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(lead, 'event.converted_to_booking', viewer, 'Event lead converted to booking', { bookingId: booking._id.toString() });
  await lead.save();
  await logAudit('event.converted_to_booking', lead, viewer, { bookingId: booking._id.toString() });

  return {
    event: await findEventLeadByIdRepository(id),
    booking,
  };
};
