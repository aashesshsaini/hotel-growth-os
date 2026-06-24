import { FilterQuery } from 'mongoose';
import { Review } from '../../models';
import { paginate } from '../../utils/pagination';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { ListQuery, CreateInput, UpdateInput } from './reviews.validation';

interface Viewer { userId: string; role: string; hotelId?: string }

const assertAccess = (doc: unknown, viewer: Viewer): void => {
  if (viewer.role !== 'super_admin' && String((doc as any).hotelId) !== viewer.hotelId) throw new ForbiddenError('Access denied to this hotel');
};

export const list = async (query: ListQuery, viewer: Viewer) => {
  const filter: Record<string, unknown> = viewer.role === 'super_admin' && query.hotelId ? { hotelId: query.hotelId } : viewer.hotelId ? { hotelId: viewer.hotelId } : {};
  if (query.status) filter.status = query.status;
  return paginate(Review, { page: query.page, limit: query.limit, search: query.search, searchFields: ['feedback'], sortBy: query.sortBy, sortOrder: query.sortOrder }, filter as FilterQuery<any>);
};

export const getById = async (id: string, viewer: Viewer) => {
  const doc = await Review.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Review not found');
  assertAccess(doc, viewer);
  return doc;
};

export const create = async (input: CreateInput, viewer: Viewer) => {
  const hotelId = input.hotelId ?? viewer.hotelId; if (!hotelId) throw new ValidationError('Hotel ID is required');
  return Review.create({ hotelId, ...input,  createdBy: viewer.userId, updatedBy: viewer.userId });
};

export const update = async (id: string, input: UpdateInput, viewer: Viewer) => {
  const doc = await getById(id, viewer);
  Object.assign(doc, input, { updatedBy: viewer.userId });
  await doc.save();
  return doc;
};

export const remove = async (id: string, viewer: Viewer) => {
  const doc = await getById(id, viewer);
  Object.assign(doc, { isDeleted: true, deletedAt: new Date(), deletedBy: viewer.userId });
  await doc.save();
};
