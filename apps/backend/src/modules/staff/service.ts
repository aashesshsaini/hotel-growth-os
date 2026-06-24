import { FilterQuery, Types } from 'mongoose';
import { IHotelStaff } from '../../models/HotelStaff';
import {
  AssignStaffInput,
  CreateStaffInput,
  ListStaffQuery,
  UpdateStaffInput,
  UpdateStaffPermissionsInput,
  UpdateStaffStatusInput,
} from './validation';
import { hashPassword } from '../../utils/password';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import {
  canManageStaff,
  canViewStaffList,
  getDefaultPermissions,
  isLimitedStaffViewer,
} from './staff.constants';
import {
  createAuditLogRepository,
  createStaffRepository,
  createUserRepository,
  findAuditLogsByStaffIdRepository,
  findDuplicateStaffAssignmentRepository,
  findHotelByIdRepository,
  findStaffByEmailInHotelRepository,
  findStaffByIdRepository,
  findStaffByPhoneInHotelRepository,
  findStaffListRepository,
  findUserByEmailRepository,
  findUserByIdRepository,
  getStaffStatsRepository,
  softDeleteStaffRepository,
  updateStaffRepository,
  updateUserByIdRepository,
  updateUserRepository,
} from './staff.repository';
import { SanitizedStaff, StaffStatsResult, ViewerContext } from './staff.types';

const resolveHotelId = (hotelId: string | undefined, fallbackHotelId?: string): string => {
  const resolved = hotelId ?? fallbackHotelId;
  if (!resolved) {
    throw new ValidationError('Hotel ID is required');
  }
  return resolved;
};

const assertHotelAccess = (
  viewerRole: string,
  viewerHotelId: string | undefined,
  hotelId: string
): void => {
  if (viewerRole !== 'super_admin' && viewerHotelId !== hotelId) {
    throw new ForbiddenError('Access denied to this hotel');
  }
};

const assertCanManage = (viewerRole: string): void => {
  if (!canManageStaff(viewerRole)) {
    throw new ForbiddenError('You do not have permission to manage staff');
  }
};

const assertCanView = (viewerRole: string): void => {
  if (!canViewStaffList(viewerRole)) {
    throw new ForbiddenError('You do not have permission to view staff');
  }
};

const logAudit = async (
  action: string,
  entityId: string,
  viewer: ViewerContext,
  changes?: Record<string, unknown>
): Promise<void> => {
  await createAuditLogRepository({
    hotelId: viewer.hotelId,
    userId: viewer.userId,
    action,
    entity: 'Staff',
    entityId: new Types.ObjectId(entityId),
    changes,
  });
};

const sanitizeStaff = (staff: IHotelStaff, viewer: ViewerContext): SanitizedStaff => {
  const doc = staff.toObject ? staff.toObject() : staff;
  const isOwnerOrManager = canManageStaff(viewer.role);
  const isSelf = staff.userId?.toString() === viewer.userId;

  const base: SanitizedStaff = {
    ...doc,
    id: doc._id?.toString(),
    lastLoginAt: doc.lastLoginAt || (doc.userId as { lastLoginAt?: Date })?.lastLoginAt,
  };

  if (isOwnerOrManager || viewer.role === 'super_admin') {
    return base;
  }

  if (isLimitedStaffViewer(viewer.role)) {
    const { salary, permissions, emergencyContactName, emergencyContactPhone, address, dateOfBirth, ...limited } =
      base;

    if (isSelf) {
      return { ...limited, salary, permissions, address, emergencyContactName, emergencyContactPhone };
    }

    return limited;
  }

  return base;
};

const buildListFilter = (query: ListStaffQuery, hotelId: string): FilterQuery<IHotelStaff> => {
  const filter: FilterQuery<IHotelStaff> = { hotelId };

  if (query.role) filter.role = query.role;
  if (query.department) filter.department = query.department;
  if (query.status) filter.status = query.status;
  if (query.shiftType) filter.shiftType = query.shiftType;
  if (query.isActive !== undefined) filter.isActive = query.isActive;

  if (query.joiningDateFrom || query.joiningDateTo) {
    filter.joiningDate = {};
    if (query.joiningDateFrom) {
      filter.joiningDate.$gte = query.joiningDateFrom;
    }
    if (query.joiningDateTo) {
      filter.joiningDate.$lte = query.joiningDateTo;
    }
  }

  return filter;
};

const ensureUniqueEmailPhone = async (
  hotelId: string,
  email: string,
  phone: string,
  excludeStaffId?: string
): Promise<void> => {
  const emailExists = await findStaffByEmailInHotelRepository(hotelId, email, excludeStaffId);
  if (emailExists) {
    throw new ConflictError('Email already exists for this hotel');
  }

  const phoneExists = await findStaffByPhoneInHotelRepository(hotelId, phone, excludeStaffId);
  if (phoneExists) {
    throw new ConflictError('Phone already exists for this hotel');
  }

  const globalUser = await findUserByEmailRepository(email);
  if (globalUser) {
    if (excludeStaffId) {
      const existingStaff = await findStaffByIdRepository(excludeStaffId, false);
      if (!existingStaff || existingStaff.userId.toString() !== globalUser._id.toString()) {
        throw new ConflictError('Email already registered in the system');
      }
    } else {
      throw new ConflictError('Email already registered in the system');
    }
  }
};

const syncUserFromStaff = async (
  userId: Types.ObjectId,
  staff: Partial<IHotelStaff>,
  password?: string
): Promise<void> => {
  const user = await findUserByIdRepository(userId);
  if (!user) return;

  if (staff.fullName) user.name = staff.fullName;
  if (staff.email) user.email = staff.email;
  if (staff.phone) user.phone = staff.phone;
  if (staff.role) user.role = staff.role;
  if (staff.status) {
    user.isActive = staff.status === 'active';
  }
  if (password) {
    user.password = await hashPassword(password);
  }

  await updateUserRepository(user);
};

export const listStaffService = async (
  query: ListStaffQuery,
  viewer: ViewerContext
): Promise<PaginatedResponse<SanitizedStaff>> => {
  assertCanView(viewer.role);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);

  const result = await findStaffListRepository(buildListFilter(query, hotelId), {
    page: query.page,
    limit: query.limit,
    search: query.search,
    searchFields: ['fullName', 'email', 'phone', 'department', 'designation'],
    sortBy: query.sortBy || 'createdAt',
    sortOrder: query.sortOrder,
  });

  result.data.forEach((staff) => {
    const user = staff.userId as { lastLoginAt?: Date } | Types.ObjectId;
    if (user && typeof user === 'object' && 'lastLoginAt' in user) {
      staff.lastLoginAt = user.lastLoginAt;
    }
  });

  return {
    ...result,
    data: result.data.map((s) => sanitizeStaff(s, viewer)),
  };
};

export const getStaffStatsService = async (
  viewer: ViewerContext,
  hotelIdParam?: string
): Promise<StaffStatsResult> => {
  assertCanView(viewer.role);
  const hotelId = resolveHotelId(hotelIdParam, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);

  const { total, active, inactive, suspended, byRole, byDepartment } =
    await getStaffStatsRepository(hotelId);

  return {
    total,
    active,
    inactive,
    suspended,
    byRole: byRole.reduce((acc: Record<string, number>, r: { _id: string; count: number }) => {
      acc[r._id] = r.count;
      return acc;
    }, {}),
    byDepartment: byDepartment.reduce(
      (acc: Record<string, number>, d: { _id: string; count: number }) => {
        acc[d._id] = d.count;
        return acc;
      },
      {}
    ),
  };
};

export const getStaffByIdService = async (
  id: string,
  viewer: ViewerContext
): Promise<SanitizedStaff & { auditLogs?: unknown[] }> => {
  assertCanView(viewer.role);

  const staff = await findStaffByIdRepository(id);
  if (!staff || staff.isDeleted) {
    throw new NotFoundError('Staff member not found');
  }

  assertHotelAccess(viewer.role, viewer.hotelId, staff.hotelId.toString());

  const user = staff.userId as { lastLoginAt?: Date } | Types.ObjectId;
  if (user && typeof user === 'object' && 'lastLoginAt' in user) {
    staff.lastLoginAt = user.lastLoginAt;
  }

  const auditLogs = canManageStaff(viewer.role)
    ? await findAuditLogsByStaffIdRepository(staff._id)
    : [];

  return {
    ...sanitizeStaff(staff, viewer),
    auditLogs,
  };
};

export const createStaffService = async (
  input: CreateStaffInput,
  viewer: ViewerContext
): Promise<SanitizedStaff> => {
  assertCanManage(viewer.role);
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);

  const hotel = await findHotelByIdRepository(hotelId);
  if (!hotel) {
    throw new NotFoundError('Hotel not found');
  }

  await ensureUniqueEmailPhone(hotelId, input.email, input.phone);

  const hashedPassword = await hashPassword(input.password);
  const status = input.status || 'active';
  const permissions = input.permissions?.length ? input.permissions : getDefaultPermissions(input.role);

  const user = await createUserRepository({
    name: input.fullName,
    email: input.email.toLowerCase(),
    password: hashedPassword,
    phone: input.phone,
    role: input.role,
    hotelId,
    isActive: status === 'active',
    createdBy: viewer.userId,
  });

  const staff = await createStaffRepository({
    userId: user._id,
    hotelId,
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    phone: input.phone,
    alternatePhone: input.alternatePhone || undefined,
    role: input.role,
    department: input.department,
    designation: input.designation,
    profileImage: input.profileImage || undefined,
    gender: input.gender,
    dateOfBirth: input.dateOfBirth,
    joiningDate: input.joiningDate || new Date(),
    salary: input.salary,
    shiftType: input.shiftType,
    shiftStartTime: input.shiftStartTime,
    shiftEndTime: input.shiftEndTime,
    address: input.address,
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone || undefined,
    permissions,
    status,
    isActive: status === 'active',
    createdBy: viewer.userId,
  });

  await logAudit('staff.created', staff._id.toString(), viewer, {
    fullName: staff.fullName,
    role: staff.role,
    email: staff.email,
  });

  return sanitizeStaff(staff, viewer);
};

export const updateStaffService = async (
  id: string,
  input: UpdateStaffInput,
  viewer: ViewerContext
): Promise<SanitizedStaff> => {
  assertCanManage(viewer.role);

  const staff = await findStaffByIdRepository(id, false);
  if (!staff || staff.isDeleted) {
    throw new NotFoundError('Staff member not found');
  }

  assertHotelAccess(viewer.role, viewer.hotelId, staff.hotelId.toString());

  if (input.email || input.phone) {
    await ensureUniqueEmailPhone(
      staff.hotelId.toString(),
      input.email || staff.email,
      input.phone || staff.phone,
      id
    );
  }

  const changes: Record<string, unknown> = {};

  if (input.fullName !== undefined) { staff.fullName = input.fullName; changes.fullName = input.fullName; }
  if (input.email !== undefined) { staff.email = input.email; changes.email = input.email; }
  if (input.phone !== undefined) { staff.phone = input.phone; changes.phone = input.phone; }
  if (input.alternatePhone !== undefined) { staff.alternatePhone = input.alternatePhone || undefined; changes.alternatePhone = input.alternatePhone; }
  if (input.role !== undefined) { staff.role = input.role; changes.role = input.role; }
  if (input.department !== undefined) { staff.department = input.department; changes.department = input.department; }
  if (input.designation !== undefined) { staff.designation = input.designation; changes.designation = input.designation; }
  if (input.profileImage !== undefined) { staff.profileImage = input.profileImage || undefined; changes.profileImage = input.profileImage; }
  if (input.gender !== undefined) { staff.gender = input.gender; changes.gender = input.gender; }
  if (input.dateOfBirth !== undefined) { staff.dateOfBirth = input.dateOfBirth; changes.dateOfBirth = input.dateOfBirth; }
  if (input.joiningDate !== undefined) { staff.joiningDate = input.joiningDate; changes.joiningDate = input.joiningDate; }
  if (input.salary !== undefined) { staff.salary = input.salary; changes.salary = input.salary; }
  if (input.shiftType !== undefined) { staff.shiftType = input.shiftType; changes.shiftType = input.shiftType; }
  if (input.shiftStartTime !== undefined) { staff.shiftStartTime = input.shiftStartTime; changes.shiftStartTime = input.shiftStartTime; }
  if (input.shiftEndTime !== undefined) { staff.shiftEndTime = input.shiftEndTime; changes.shiftEndTime = input.shiftEndTime; }
  if (input.address !== undefined) { staff.address = input.address; changes.address = input.address; }
  if (input.emergencyContactName !== undefined) { staff.emergencyContactName = input.emergencyContactName; changes.emergencyContactName = input.emergencyContactName; }
  if (input.emergencyContactPhone !== undefined) { staff.emergencyContactPhone = input.emergencyContactPhone || undefined; changes.emergencyContactPhone = input.emergencyContactPhone; }
  if (input.permissions !== undefined) { staff.permissions = input.permissions; changes.permissions = input.permissions; }
  if (input.status !== undefined) {
    staff.status = input.status;
    staff.isActive = input.status === 'active';
    changes.status = input.status;
  }

  staff.updatedBy = new Types.ObjectId(viewer.userId);
  await updateStaffRepository(staff);
  await syncUserFromStaff(staff.userId, staff);

  await logAudit('staff.updated', id, viewer, changes);

  return sanitizeStaff(staff, viewer);
};

export const updateStaffStatusService = async (
  id: string,
  input: UpdateStaffStatusInput,
  viewer: ViewerContext
): Promise<SanitizedStaff> => {
  assertCanManage(viewer.role);

  const staff = await findStaffByIdRepository(id, false);
  if (!staff || staff.isDeleted) {
    throw new NotFoundError('Staff member not found');
  }

  assertHotelAccess(viewer.role, viewer.hotelId, staff.hotelId.toString());

  const previousStatus = staff.status;
  staff.status = input.status;
  staff.isActive = input.status === 'active';
  staff.updatedBy = new Types.ObjectId(viewer.userId);
  await updateStaffRepository(staff);

  const user = await findUserByIdRepository(staff.userId);
  if (user) {
    user.isActive = input.status === 'active';
    await updateUserRepository(user);
  }

  await logAudit('staff.status_changed', id, viewer, {
    from: previousStatus,
    to: input.status,
    reason: input.reason,
  });

  return sanitizeStaff(staff, viewer);
};

export const updateStaffPermissionsService = async (
  id: string,
  input: UpdateStaffPermissionsInput,
  viewer: ViewerContext
): Promise<SanitizedStaff> => {
  assertCanManage(viewer.role);

  const staff = await findStaffByIdRepository(id, false);
  if (!staff || staff.isDeleted) {
    throw new NotFoundError('Staff member not found');
  }

  assertHotelAccess(viewer.role, viewer.hotelId, staff.hotelId.toString());

  const previous = [...staff.permissions];
  staff.permissions = input.permissions;
  staff.updatedBy = new Types.ObjectId(viewer.userId);
  await updateStaffRepository(staff);

  await logAudit('staff.permissions_changed', id, viewer, {
    from: previous,
    to: input.permissions,
  });

  return sanitizeStaff(staff, viewer);
};

export const assignStaffToHotelService = async (
  id: string,
  input: AssignStaffInput,
  viewer: ViewerContext
): Promise<SanitizedStaff> => {
  if (viewer.role !== 'super_admin') {
    throw new ForbiddenError('Only super admin can reassign staff to hotels');
  }

  const staff = await findStaffByIdRepository(id, false);
  if (!staff || staff.isDeleted) {
    throw new NotFoundError('Staff member not found');
  }

  const hotel = await findHotelByIdRepository(input.hotelId);
  if (!hotel) {
    throw new NotFoundError('Hotel not found');
  }

  const existingAssignment = await findDuplicateStaffAssignmentRepository(
    input.hotelId,
    staff.userId,
    id
  );
  if (existingAssignment) {
    throw new ConflictError('Staff member is already assigned to this hotel');
  }

  staff.hotelId = hotel._id;
  staff.updatedBy = new Types.ObjectId(viewer.userId);
  await updateStaffRepository(staff);

  await updateUserByIdRepository(staff.userId, { hotelId: hotel._id });

  await logAudit('staff.reassigned', id, viewer, { hotelId: input.hotelId });

  return sanitizeStaff(staff, viewer);
};

export const deleteStaffService = async (id: string, viewer: ViewerContext): Promise<void> => {
  assertCanManage(viewer.role);

  const staff = await findStaffByIdRepository(id, false);
  if (!staff || staff.isDeleted) {
    throw new NotFoundError('Staff member not found');
  }

  assertHotelAccess(viewer.role, viewer.hotelId, staff.hotelId.toString());

  await softDeleteStaffRepository(id, viewer.userId);

  await updateUserByIdRepository(staff.userId, {
    isActive: false,
    isDeleted: true,
    deletedAt: new Date(),
  });

  await logAudit('staff.deleted', id, viewer, { fullName: staff.fullName });
};
