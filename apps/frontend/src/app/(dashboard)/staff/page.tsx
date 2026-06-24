'use client';

import {
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserCog,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { SelectInput } from '@/components/FormInput';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { StaffDetailModal } from '@/features/staff/StaffDetailModal';
import { StaffFilters } from '@/features/staff/StaffFilters';
import { StaffForm } from '@/features/staff/StaffForm';
import { StaffPermissionsModal } from '@/features/staff/StaffPermissionsModal';
import { RoleBadge } from '@/features/staff/RoleBadge';
import { StaffStatsCards } from '@/features/staff/StaffStatsCards';
import { emptyStaffForm, MANAGEMENT_ROLES, STAFF_STATUSES } from '@/features/staff/constants';
import { useAuth } from '@/hooks/useAuth';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { staffService } from '@/services/staff.service';
import type { Staff, StaffFormData, StaffStats } from '@/types';
import { getEntityId } from '@/types';
import { capitalize, formatDateTime, toInputDate } from '@/utils/format';

export default function StaffPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user ? MANAGEMENT_ROLES.includes(user.role) : false;

  const [stats, setStats] = useState<StaffStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const listParams = useMemo(
    () => ({
      role: roleFilter || undefined,
      department: departmentFilter || undefined,
      status: statusFilter || undefined,
      shiftType: shiftFilter || undefined,
      joiningDateFrom: dateFrom || undefined,
      joiningDateTo: dateTo || undefined,
    }),
    [roleFilter, departmentFilter, statusFilter, shiftFilter, dateFrom, dateTo]
  );

  const fetchStaffList = useCallback(
    (params: Parameters<typeof staffService.list>[0]) =>
      staffService.list({ ...params, ...listParams }),
    [listParams]
  );

  const { data, pagination, isLoading, error, setPage, setSearch, refresh, setParams } =
    usePaginatedQuery<Staff>({ fetchFn: fetchStaffList });

  useEffect(() => {
    setParams((prev) => ({ ...prev, ...listParams, page: 1 }));
  }, [listParams, setParams]);

  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const result = await staffService.getStats();
        setStats(result);
      } catch {
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    };
    void loadStats();
  }, [data.length]);

  const departments = useMemo(() => {
    const deps = new Set<string>();
    data.forEach((s) => {
      if (s.department) deps.add(s.department);
    });
    if (stats?.byDepartment) {
      Object.keys(stats.byDepartment).forEach((d) => deps.add(d));
    }
    return Array.from(deps).sort();
  }, [data, stats]);

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<StaffFormData>({ ...emptyStaffForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [detailStaff, setDetailStaff] = useState<Staff | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [permissionsStaff, setPermissionsStaff] = useState<Staff | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  const [statusStaff, setStatusStaff] = useState<Staff | null>(null);
  const [newStatus, setNewStatus] = useState('active');
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const resetFilters = () => {
    setRoleFilter('');
    setDepartmentFilter('');
    setStatusFilter('');
    setShiftFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const openCreate = () => {
    setForm({ ...emptyStaffForm });
    setFormErrors({});
    setEditingId(null);
    setFormMode('create');
  };

  const openEdit = (staff: Staff) => {
    setForm({
      fullName: staff.fullName || staff.name || '',
      email: staff.email,
      phone: staff.phone,
      alternatePhone: staff.alternatePhone || '',
      role: staff.role,
      department: staff.department || '',
      designation: staff.designation || '',
      gender: staff.gender || '',
      joiningDate: toInputDate(staff.joiningDate),
      shiftType: staff.shiftType || 'morning',
      shiftStartTime: staff.shiftStartTime || '',
      shiftEndTime: staff.shiftEndTime || '',
      address: staff.address || '',
      emergencyContactName: staff.emergencyContactName || '',
      emergencyContactPhone: staff.emergencyContactPhone || '',
      salary: staff.salary,
      status: staff.status || 'active',
    });
    setFormErrors({});
    setEditingId(getEntityId(staff));
    setFormMode('edit');
    setShowDetail(false);
  };

  const viewStaff = async (staff: Staff) => {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const full = await staffService.getById(getEntityId(staff));
      setDetailStaff(full);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load staff details', 'error');
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.fullName.trim()) errors.fullName = 'Full name is required';
    if (!form.email.trim()) errors.email = 'Email is required';
    if (!form.phone.trim()) errors.phone = 'Phone is required';
    if (formMode === 'create' && (!form.password || form.password.length < 8)) {
      errors.password = 'Password must be at least 8 characters';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (formMode === 'create') {
        await staffService.create(form);
        showToast('Staff member created successfully');
      } else if (editingId) {
        const { password: _, ...updateData } = form;
        await staffService.update(editingId, updateData);
        showToast('Staff member updated successfully');
      }
      setFormMode(null);
      refresh();
      const updatedStats = await staffService.getStats();
      setStats(updatedStats);
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to save staff' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusStaff) return;
    setIsSaving(true);
    try {
      await staffService.updateStatus(getEntityId(statusStaff), newStatus);
      showToast('Staff status updated');
      setShowStatusModal(false);
      setStatusStaff(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermissionsSave = async (permissions: string[]) => {
    if (!permissionsStaff) return;
    setIsSaving(true);
    try {
      await staffService.updatePermissions(getEntityId(permissionsStaff), permissions);
      showToast('Permissions updated');
      setShowPermissions(false);
      setPermissionsStaff(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update permissions', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await staffService.remove(getEntityId(deleteTarget));
      showToast('Staff member removed');
      setDeleteTarget(null);
      refresh();
      const updatedStats = await staffService.getStats();
      setStats(updatedStats);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete staff', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormChange = (field: keyof StaffFormData, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <PageHeader
        title="Staff Management"
        subtitle="Manage hotel team members, roles, shifts and permissions"
        actions={
          canManage ? (
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Staff
            </button>
          ) : undefined
        }
      />

      <StaffStatsCards stats={stats} isLoading={statsLoading} />

      <StaffFilters
        role={roleFilter}
        department={departmentFilter}
        status={statusFilter}
        shiftType={shiftFilter}
        joiningDateFrom={dateFrom}
        joiningDateTo={dateTo}
        departments={departments}
        onRoleChange={setRoleFilter}
        onDepartmentChange={setDepartmentFilter}
        onStatusChange={setStatusFilter}
        onShiftChange={setShiftFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onReset={resetFilters}
      />

      <DataTable
        columns={[
          {
            key: 'fullName',
            header: 'Name',
            render: (row) => (
              <div>
                <p className="font-medium text-slate-900">{row.fullName || row.name}</p>
                {row.designation && <p className="text-xs text-slate-500">{row.designation}</p>}
              </div>
            ),
          },
          {
            key: 'role',
            header: 'Role',
            render: (row) => <RoleBadge role={row.role} />,
          },
          { key: 'department', header: 'Department', render: (row) => row.department || '—' },
          { key: 'phone', header: 'Phone' },
          { key: 'email', header: 'Email' },
          {
            key: 'shift',
            header: 'Shift',
            render: (row) =>
              row.shiftType ? (
                <span className="capitalize">{row.shiftType.replace(/_/g, ' ')}</span>
              ) : (
                '—'
              ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusBadge status={row.status || (row.isActive ? 'active' : 'inactive')} />
            ),
          },
          {
            key: 'lastLoginAt',
            header: 'Last Login',
            render: (row) => (row.lastLoginAt ? formatDateTime(row.lastLoginAt) : 'Never'),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <div className="relative">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() =>
                    setActionMenuId(actionMenuId === getEntityId(row) ? null : getEntityId(row))
                  }
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {actionMenuId === getEntityId(row) && (
                  <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setActionMenuId(null);
                        void viewStaff(row);
                      }}
                    >
                      <Eye className="h-4 w-4" /> View
                    </button>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setActionMenuId(null);
                            openEdit(row);
                          }}
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setActionMenuId(null);
                            setStatusStaff(row);
                            setNewStatus(row.status || 'active');
                            setShowStatusModal(true);
                          }}
                        >
                          <UserCog className="h-4 w-4" /> Change Status
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setActionMenuId(null);
                            setPermissionsStaff(row);
                            setShowPermissions(true);
                          }}
                        >
                          <Shield className="h-4 w-4" /> Permissions
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setActionMenuId(null);
                            setDeleteTarget(row);
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ),
          },
        ]}
        data={data}
        isLoading={isLoading}
        error={error}
        onSearch={setSearch}
        searchPlaceholder="Search by name, email, phone..."
        emptyTitle="No staff members found"
        emptyDescription="Add your first team member or adjust filters"
        rowKey={(row) => getEntityId(row)}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          onPageChange: setPage,
        }}
      />

      <Modal
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        title={formMode === 'create' ? 'Add Staff Member' : 'Edit Staff Member'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setFormMode(null)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? 'Saving...' : formMode === 'create' ? 'Create Staff' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <StaffForm
          form={form}
          errors={formErrors}
          isEdit={formMode === 'edit'}
          onChange={handleFormChange}
        />
      </Modal>

      {detailLoading ? (
        <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Loading..." size="xl">
          <div className="py-8 text-center text-sm text-slate-500">Loading staff profile...</div>
        </Modal>
      ) : (
        <StaffDetailModal
          staff={detailStaff}
          isOpen={showDetail && !detailLoading}
          onClose={() => {
            setShowDetail(false);
            setDetailStaff(null);
          }}
          canManage={canManage}
          onEdit={() => detailStaff && openEdit(detailStaff)}
          onPermissions={() => {
            if (detailStaff) {
              setPermissionsStaff(detailStaff);
              setShowPermissions(true);
            }
          }}
          onStatusChange={() => {
            if (detailStaff) {
              setStatusStaff(detailStaff);
              setNewStatus(detailStaff.status || 'active');
              setShowStatusModal(true);
            }
          }}
        />
      )}

      <StaffPermissionsModal
        isOpen={showPermissions}
        onClose={() => {
          setShowPermissions(false);
          setPermissionsStaff(null);
        }}
        permissions={permissionsStaff?.permissions || []}
        onSave={handlePermissionsSave}
        isSaving={isSaving}
      />

      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Change Staff Status"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setShowStatusModal(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={() => void handleStatusUpdate()} disabled={isSaving}>
              {isSaving ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        }
      >
        <SelectInput
          label="Status"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          options={STAFF_STATUSES}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Staff Member"
        message={`Are you sure you want to remove ${deleteTarget?.fullName || deleteTarget?.name}? This will deactivate their account.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
