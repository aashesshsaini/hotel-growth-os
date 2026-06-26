import { FilterQuery, Types } from 'mongoose';
import { AuditLog, Booking, Enquiry, Guest, HotelStaff, Lead, Task, User } from '../../models';
import { IEnquiry, EnquirySource } from '../../models/Enquiry';
import { paginate } from '../../utils/pagination';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import {
  AssignInput,
  ConvertToBookingInput,
  CreateInput,
  ListQuery,
  NoteInput,
  StatusInput,
  UpdateInput,
} from './enquiries.validation';

interface Viewer { userId: string; role: string; hotelId?: string }

const assertAccess = (doc: unknown, viewer: Viewer): void => {
  if (viewer.role !== 'super_admin' && String((doc as { hotelId?: unknown }).hotelId) !== viewer.hotelId) throw new ForbiddenError('Access denied to this hotel');
};

const allowedRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'];
const assertCanManage = (viewer: Viewer) => {
  if (!allowedRoles.includes(viewer.role)) throw new ForbiddenError('You do not have permission to manage enquiries');
};

const getHotelId = (viewer: Viewer, hotelIdInput?: string): string => {
  const hotelId = viewer.role === 'super_admin' && hotelIdInput ? hotelIdInput : viewer.hotelId;
  if (!hotelId) throw new ValidationError('Hotel ID is required');
  return hotelId;
};

const sanitize = (doc: IEnquiry, auditLogs?: unknown[]) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id?.toString(), auditLogs };
};

const addTimeline = (
  doc: IEnquiry,
  action: string,
  viewer: Viewer,
  message?: string,
  metadata?: Record<string, unknown>
) => {
  doc.timeline = doc.timeline ?? [];
  doc.timeline.unshift({
    action,
    message,
    createdAt: new Date(),
    createdBy: new Types.ObjectId(viewer.userId),
    metadata,
  });
  doc.timeline = doc.timeline.slice(0, 50);
};

const logAudit = async (action: string, doc: IEnquiry, viewer: Viewer, changes?: Record<string, unknown>) => {
  await AuditLog.create({
    hotelId: doc.hotelId,
    userId: viewer.userId,
    action,
    entity: 'Enquiry',
    entityId: doc._id,
    changes,
  });
};

const ensureAssignableStaff = async (hotelId: string, assignedTo?: string) => {
  if (!assignedTo) return;
  const user = await User.findOne({ _id: assignedTo, isDeleted: { $ne: true } });
  if (!user) throw new NotFoundError('Assigned user not found');
  const staff = await HotelStaff.findOne({
    hotelId,
    userId: assignedTo,
    role: { $in: ['sales_staff', 'reception_staff', 'hotel_manager'] },
    isDeleted: { $ne: true },
    status: { $nin: ['inactive', 'suspended', 'resigned'] },
  });
  if (!staff) throw new ValidationError('Assigned user must be active sales, reception, or manager staff');
};

const createFollowUpTask = async (doc: IEnquiry) => {
  if (!doc.followUpDate) return;
  await Task.create({
    hotelId: doc.hotelId,
    title: `Follow up enquiry: ${doc.guestName}`,
    description: doc.notes,
    assignedTo: doc.assignedTo,
    dueDate: doc.followUpDate,
    priority: doc.priority === 'urgent' || doc.priority === 'high' ? 'high' : doc.priority === 'low' ? 'low' : 'medium',
    status: 'pending',
    relatedTo: { type: 'Enquiry', id: doc._id },
    createdBy: doc.updatedBy ?? doc.createdBy,
    updatedBy: doc.updatedBy ?? doc.createdBy,
  });
};

const sourceToLeadSource = (source: EnquirySource): string => {
  const map: Record<string, string> = {
    website_form: 'website',
    phone: 'phone_call',
    phone_call: 'phone_call',
    walk_in: 'walk_in',
    google_business: 'google_business',
    whatsapp: 'whatsapp',
    facebook: 'facebook',
    instagram: 'instagram',
    ota: 'ota',
    referral: 'referral',
    corporate: 'corporate',
    wedding: 'wedding',
    event: 'event',
    other: 'other',
  };
  return map[source] ?? 'other';
};

const sourceToGuestSource = (source: EnquirySource): string => {
  if (source === 'phone_call') return 'phone';
  if (source === 'website_form') return 'website';
  if (source === 'wedding') return 'event';
  return source;
};

const enquiryTypeToBookingType = (type?: string): string => {
  if (type === 'corporate_booking') return 'corporate';
  if (type === 'wedding_booking') return 'wedding';
  if (type === 'group_booking') return 'group';
  return 'individual';
};

const generateLeadNumber = () => `LD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
const generateBookingNumber = () => `BK-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

export const list = async (query: ListQuery, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = getHotelId(viewer, query.hotelId);
  const filter: Record<string, unknown> = { hotelId };
  if (query.status) filter.status = query.status;
  if (query.source) filter.source = query.source;
  if (query.enquiryType) filter.enquiryType = query.enquiryType;
  if (query.priority) filter.priority = query.priority;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.followUpFrom || query.followUpTo) {
    filter.followUpDate = {};
    if (query.followUpFrom) (filter.followUpDate as Record<string, Date>).$gte = query.followUpFrom;
    if (query.followUpTo) (filter.followUpDate as Record<string, Date>).$lte = query.followUpTo;
  }
  if (query.createdFrom || query.createdTo) {
    filter.createdAt = {};
    if (query.createdFrom) (filter.createdAt as Record<string, Date>).$gte = query.createdFrom;
    if (query.createdTo) (filter.createdAt as Record<string, Date>).$lte = query.createdTo;
  }
  const result = await paginate(Enquiry, { page: query.page, limit: query.limit, search: query.search, searchFields: ['guestName', 'phone', 'email'], sortBy: query.sortBy, sortOrder: query.sortOrder }, filter as FilterQuery<IEnquiry>);
  await Enquiry.populate(result.data, [
    { path: 'assignedTo', select: 'name email role' },
    { path: 'convertedLeadId', select: 'leadNumber fullName status' },
    { path: 'convertedGuestId', select: 'fullName name phone email' },
    { path: 'convertedBookingId', select: 'bookingNumber status checkInDate checkOutDate totalAmount' },
  ]);
  return { ...result, data: result.data.map((doc) => sanitize(doc)) };
};

export const getById = async (id: string, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Enquiry.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate('assignedTo', 'name email role')
    .populate('convertedLeadId', 'leadNumber fullName status')
    .populate('convertedGuestId', 'fullName name phone email')
    .populate('convertedBookingId', 'bookingNumber status checkInDate checkOutDate totalAmount')
    .populate('timeline.createdBy', 'name email');
  if (!doc) throw new NotFoundError('Enquiry not found');
  assertAccess(doc, viewer);
  const auditLogs = await AuditLog.find({ entity: 'Enquiry', entityId: doc._id }).sort({ createdAt: -1 }).limit(20).populate('userId', 'name email');
  return sanitize(doc, auditLogs);
};

export const create = async (input: CreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = getHotelId(viewer, input.hotelId);
  await ensureAssignableStaff(hotelId, input.assignedTo);
  const doc = await Enquiry.create({
    hotelId,
    ...input,
    status: input.status ?? (input.assignedTo ? 'assigned' : 'new'),
    enquiryType: input.enquiryType ?? 'room_booking',
    priority: input.priority ?? 'medium',
    assignedTo: input.assignedTo ? new Types.ObjectId(input.assignedTo) : undefined,
    sourceHistory: [{ source: input.source ?? 'phone_call', capturedAt: new Date(), notes: 'Enquiry captured' }],
    timeline: [{ action: 'enquiry.created', message: 'Enquiry created', createdAt: new Date(), createdBy: new Types.ObjectId(viewer.userId) }],
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  await createFollowUpTask(doc);
  await logAudit('enquiry.created', doc, viewer);
  return getById(doc._id.toString(), viewer);
};

export const update = async (id: string, input: UpdateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Enquiry.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Enquiry not found');
  assertAccess(doc, viewer);
  const previousSource = doc.source;
  if (input.assignedTo !== undefined) await ensureAssignableStaff(doc.hotelId.toString(), input.assignedTo);
  Object.assign(doc, input, {
    assignedTo: input.assignedTo ? new Types.ObjectId(input.assignedTo) : doc.assignedTo,
    updatedBy: viewer.userId,
  });
  if (input.source && input.source !== previousSource) doc.sourceHistory.unshift({ source: input.source, capturedAt: new Date(), notes: 'Source updated' });
  addTimeline(doc, 'enquiry.updated', viewer, 'Enquiry updated', input as Record<string, unknown>);
  await doc.save();
  await createFollowUpTask(doc);
  await logAudit('enquiry.updated', doc, viewer, input as Record<string, unknown>);
  return getById(id, viewer);
};

export const remove = async (id: string, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Enquiry.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Enquiry not found');
  assertAccess(doc, viewer);
  Object.assign(doc, { isDeleted: true, deletedAt: new Date(), deletedBy: viewer.userId });
  await doc.save();
  await logAudit('enquiry.deleted', doc, viewer);
};

export const stats = async (viewer: Viewer, hotelIdInput?: string) => {
  assertCanManage(viewer);
  const hotelId = getHotelId(viewer, hotelIdInput);
  const baseFilter = { hotelId, isDeleted: { $ne: true } };
  const now = new Date();
  const [statusAgg, sourceAgg, typeAgg, priorityAgg, pendingFollowUps, pipelineAgg] = await Promise.all([
    Enquiry.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Enquiry.aggregate([{ $match: baseFilter }, { $group: { _id: '$source', count: { $sum: 1 } } }]),
    Enquiry.aggregate([{ $match: baseFilter }, { $group: { _id: '$enquiryType', count: { $sum: 1 } } }]),
    Enquiry.aggregate([{ $match: baseFilter }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Enquiry.countDocuments({ ...baseFilter, followUpDate: { $lte: now }, status: { $nin: ['converted_to_booking', 'closed', 'lost', 'spam', 'booked'] } }),
    Enquiry.aggregate([{ $match: baseFilter }, { $group: { _id: null, value: { $sum: '$budget' } } }]),
  ]);
  const byStatus = statusAgg.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item._id || 'unknown']: item.count }), {});
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
  const converted = (byStatus.converted_to_booking ?? 0) + (byStatus.booked ?? 0);
  return {
    totalEnquiries: total,
    newEnquiries: byStatus.new ?? 0,
    assignedEnquiries: byStatus.assigned ?? 0,
    pendingFollowUps,
    urgentEnquiries: priorityAgg.find((item) => item._id === 'urgent')?.count ?? 0,
    convertedEnquiries: converted,
    lostEnquiries: (byStatus.lost ?? 0) + (byStatus.spam ?? 0),
    conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    estimatedValue: pipelineAgg[0]?.value ?? 0,
    byStatus,
    bySource: sourceAgg.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item._id || 'unknown']: item.count }), {}),
    byType: typeAgg.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item._id || 'unknown']: item.count }), {}),
  };
};

export const assign = async (id: string, input: AssignInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Enquiry.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Enquiry not found');
  assertAccess(doc, viewer);
  await ensureAssignableStaff(doc.hotelId.toString(), input.assignedTo);
  doc.assignedTo = new Types.ObjectId(input.assignedTo);
  if (doc.status === 'new') doc.status = 'assigned';
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'enquiry.assigned', viewer, input.notes || 'Enquiry assigned', { assignedTo: input.assignedTo });
  await doc.save();
  await createFollowUpTask(doc);
  await logAudit('enquiry.assigned', doc, viewer, { assignedTo: input.assignedTo });
  return getById(id, viewer);
};

export const updateStatus = async (id: string, input: StatusInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Enquiry.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Enquiry not found');
  assertAccess(doc, viewer);
  const previous = doc.status;
  doc.status = input.status;
  if (input.lostReason !== undefined) doc.lostReason = input.lostReason;
  if (input.followUpDate !== undefined) doc.followUpDate = input.followUpDate;
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'enquiry.status_changed', viewer, input.notes || `Status changed to ${input.status}`, { previous, status: input.status });
  await doc.save();
  await createFollowUpTask(doc);
  await logAudit('enquiry.status_changed', doc, viewer, { previous, status: input.status });
  return getById(id, viewer);
};

export const addNote = async (id: string, input: NoteInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Enquiry.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Enquiry not found');
  assertAccess(doc, viewer);
  if (input.internal) doc.internalNotes = [doc.internalNotes, input.note].filter(Boolean).join('\n');
  else doc.notes = [doc.notes, input.note].filter(Boolean).join('\n');
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, input.internal ? 'enquiry.internal_note_added' : 'enquiry.note_added', viewer, input.note);
  await doc.save();
  await logAudit('enquiry.note_added', doc, viewer, { internal: input.internal });
  return getById(id, viewer);
};

export const convertToLead = async (id: string, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Enquiry.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Enquiry not found');
  assertAccess(doc, viewer);
  let lead = doc.convertedLeadId ? await Lead.findById(doc.convertedLeadId) : null;
  if (!lead) {
    lead = await Lead.create({
      hotelId: doc.hotelId,
      leadNumber: generateLeadNumber(),
      fullName: doc.guestName,
      phone: doc.phone,
      email: doc.email,
      source: sourceToLeadSource(doc.source),
      leadType: doc.enquiryType ?? 'room_booking',
      status: 'new',
      priority: doc.priority === 'urgent' ? 'hot' : doc.priority ?? 'medium',
      estimatedValue: doc.budget,
      expectedGuests: doc.guestsCount,
      checkInDate: doc.checkInDate,
      checkOutDate: doc.checkOutDate,
      assignedTo: doc.assignedTo,
      followUpDate: doc.followUpDate,
      notes: doc.notes,
      enquiryId: doc._id,
      sourceHistory: [{ source: sourceToLeadSource(doc.source), capturedAt: new Date(), notes: 'Converted from enquiry' }],
      timeline: [{ action: 'lead.created_from_enquiry', message: `Converted from enquiry ${doc._id}`, createdAt: new Date(), createdBy: new Types.ObjectId(viewer.userId) }],
      createdBy: viewer.userId,
      updatedBy: viewer.userId,
    });
  }
  doc.convertedLeadId = lead._id;
  doc.status = 'converted_to_lead';
  doc.convertedAt = doc.convertedAt ?? new Date();
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'enquiry.converted_to_lead', viewer, 'Enquiry converted to lead', { leadId: lead._id.toString() });
  await doc.save();
  await logAudit('enquiry.converted_to_lead', doc, viewer, { leadId: lead._id.toString() });
  return { enquiry: await getById(id, viewer), lead };
};

export const convertToGuest = async (id: string, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Enquiry.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Enquiry not found');
  assertAccess(doc, viewer);
  let guest = doc.convertedGuestId ? await Guest.findById(doc.convertedGuestId) : await Guest.findOne({ hotelId: doc.hotelId, phone: doc.phone, isDeleted: { $ne: true } });
  if (!guest) {
    guest = await Guest.create({
      hotelId: doc.hotelId,
      fullName: doc.guestName,
      name: doc.guestName,
      phone: doc.phone,
      email: doc.email,
      guestType: doc.enquiryType === 'corporate_booking' ? 'corporate' : doc.enquiryType === 'event_booking' ? 'event_guest' : 'individual',
      source: sourceToGuestSource(doc.source),
      notes: doc.notes,
      lastEnquiryDate: doc.createdAt,
      tags: ['enquiry-converted'],
      createdBy: viewer.userId,
      updatedBy: viewer.userId,
    });
  }
  doc.convertedGuestId = guest._id;
  doc.convertedAt = doc.convertedAt ?? new Date();
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'enquiry.converted_to_guest', viewer, 'Enquiry converted to guest', { guestId: guest._id.toString() });
  await doc.save();
  await logAudit('enquiry.converted_to_guest', doc, viewer, { guestId: guest._id.toString() });
  return { enquiry: await getById(id, viewer), guest };
};

export const convertToBooking = async (id: string, input: ConvertToBookingInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Enquiry.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Enquiry not found');
  assertAccess(doc, viewer);
  let guestId = input.guestId ? new Types.ObjectId(input.guestId) : doc.convertedGuestId;
  if (!guestId) {
    const result = await convertToGuest(id, viewer);
    guestId = (result.guest as { _id: Types.ObjectId })._id;
  }
  const booking = await Booking.create({
    hotelId: doc.hotelId,
    bookingNumber: generateBookingNumber(),
    guestId,
    enquiryId: doc._id,
    roomId: input.roomId ? new Types.ObjectId(input.roomId) : undefined,
    roomTypeId: input.roomTypeId ? new Types.ObjectId(input.roomTypeId) : undefined,
    bookingType: enquiryTypeToBookingType(doc.enquiryType),
    source: doc.source,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    roomCount: input.roomCount ?? 1,
    adults: input.adults,
    children: input.children ?? 0,
    status: 'reserved',
    paymentStatus: input.paidAmount ? 'partially_paid' : 'unpaid',
    roomRate: input.roomRate,
    totalAmount: input.totalAmount,
    paidAmount: input.paidAmount ?? 0,
    notes: input.notes ?? doc.notes,
    assignedTo: input.assignedTo ? new Types.ObjectId(input.assignedTo) : doc.assignedTo,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
    timeline: [{ action: 'booking.created_from_enquiry', message: `Converted from enquiry ${doc._id}`, createdAt: new Date(), createdBy: new Types.ObjectId(viewer.userId) }],
  });
  doc.convertedBookingId = booking._id;
  doc.status = 'converted_to_booking';
  doc.convertedAt = doc.convertedAt ?? new Date();
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'enquiry.converted_to_booking', viewer, 'Enquiry converted to booking', { bookingId: booking._id.toString() });
  await doc.save();
  await logAudit('enquiry.converted_to_booking', doc, viewer, { bookingId: booking._id.toString() });
  return { enquiry: await getById(id, viewer), booking };
};
