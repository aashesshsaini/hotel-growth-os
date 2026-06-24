import { FilterQuery } from 'mongoose';
import { Hotel } from '../../models';
import { paginate } from '../../utils/pagination';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { ListQuery, CreateInput, UpdateInput } from './validation';

interface Viewer { userId: string; role: string; hotelId?: string }

const assertAccess = (doc: unknown, viewer: Viewer): void => {
  
};

export const list = async (query: ListQuery, viewer: Viewer) => {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  return paginate(Hotel, { page: query.page, limit: query.limit, search: query.search, searchFields: ['name', 'email', 'phone', 'slug'], sortBy: query.sortBy, sortOrder: query.sortOrder }, filter as FilterQuery<any>);
};

export const getById = async (id: string, viewer: Viewer) => {
  const doc = await Hotel.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Hotel not found');
  assertAccess(doc, viewer);
  return doc;
};

export const create = async (input: CreateInput, viewer: Viewer) => {
  
  return Hotel.create({  ...input,  createdBy: viewer.userId, updatedBy: viewer.userId });
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
