import { FilterQuery, Model, Document } from 'mongoose';
import { PaginatedResponse } from '@hotel-growth-os/shared';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  searchFields?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

export async function paginate<T extends Document>(
  model: Model<T>,
  options: PaginationOptions,
  baseFilter: FilterQuery<T> = {}
): Promise<PaginatedResponse<T>> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 10));
  const skip = (page - 1) * limit;

  const filter: FilterQuery<T> = { ...baseFilter, isDeleted: { $ne: true } };

  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        (filter as Record<string, unknown>)[key] = value;
      }
    });
  }

  if (options.search && options.searchFields?.length) {
    const searchRegex = { $regex: options.search, $options: 'i' };
    filter.$or = options.searchFields.map((field) => ({
      [field]: searchRegex,
    })) as FilterQuery<T>['$or'];
  }

  const sortField = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

  const [data, total] = await Promise.all([
    model
      .find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .exec(),
    model.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export const softDeleteFilter = { isDeleted: { $ne: true } };
