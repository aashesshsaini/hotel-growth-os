'use client';

import { useCallback, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { DataTable, type Column } from '@/components/DataTable';
import { DashboardCard } from '@/components/DashboardCard';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/components/Toast';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import type { GenericEntity, ListParams, PaginatedResponse } from '@/types';
import { getEntityId } from '@/types';
import { capitalize, formatCurrency, formatDate } from '@/utils/format';

export interface ModuleField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'currency';
  required?: boolean;
  options?: readonly { value: string; label: string }[];
  placeholder?: string;
}

export interface ModuleColumn {
  key: string;
  header: string;
  type?: 'text' | 'date' | 'currency' | 'status';
}

interface ModuleCrudPageProps {
  title: string;
  subtitle: string;
  searchPlaceholder?: string;
  fields: ModuleField[];
  columns: ModuleColumn[];
  list: (params?: ListParams) => Promise<PaginatedResponse<GenericEntity>>;
  create?: (payload: Record<string, unknown>) => Promise<GenericEntity>;
  update?: (id: string, payload: Record<string, unknown>) => Promise<GenericEntity>;
  remove?: (id: string) => Promise<void>;
  statusOptions?: readonly { value: string; label: string }[];
  comingSoon?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

const getDisplayName = (row: GenericEntity): string =>
  String(
    row.name ||
      row.title ||
      row.fullName ||
      row.guestName ||
      row.companyName ||
      row.eventName ||
      row.bookingNumber ||
      row.phone ||
      getEntityId(row)
  );

const formatCell = (value: unknown, type?: ModuleColumn['type']) => {
  if (value === undefined || value === null || value === '') return '—';
  if (type === 'date') return formatDate(String(value));
  if (type === 'currency') return formatCurrency(Number(value) || 0);
  if (type === 'status') return capitalize(String(value));
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return 'View details';
  return String(value);
};

const initialForm = (fields: ModuleField[], row?: GenericEntity): Record<string, string> => {
  return fields.reduce<Record<string, string>>((acc, field) => {
    const value = row?.[field.key];
    if (value === undefined || value === null) {
      acc[field.key] = '';
    } else if (field.type === 'date') {
      acc[field.key] = new Date(String(value)).toISOString().split('T')[0];
    } else {
      acc[field.key] = String(value);
    }
    return acc;
  }, {});
};

const toPayload = (fields: ModuleField[], form: Record<string, string>) => {
  return fields.reduce<Record<string, unknown>>((payload, field) => {
    const value = form[field.key];
    if (value === undefined || value === '') return payload;
    if (field.type === 'number' || field.type === 'currency') {
      payload[field.key] = Number(value);
    } else if (value === 'true' || value === 'false') {
      payload[field.key] = value === 'true';
    } else {
      payload[field.key] = value;
    }
    return payload;
  }, {});
};

export function ModuleCrudPage({
  title,
  subtitle,
  searchPlaceholder,
  fields,
  columns,
  list,
  create,
  update,
  remove,
  statusOptions,
  comingSoon,
  emptyTitle,
  emptyDescription,
}: ModuleCrudPageProps) {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingRow, setEditingRow] = useState<GenericEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GenericEntity | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => initialForm(fields));
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(
    (params: ListParams) => list({ ...params, status: statusFilter || undefined }),
    [list, statusFilter]
  );

  const { data, pagination, isLoading, error, setPage, setSearch, refresh, setParams } =
    usePaginatedQuery<GenericEntity>({ fetchFn: fetchData });

  const openCreate = () => {
    setEditingRow(null);
    setForm(initialForm(fields));
    setModalMode('create');
  };

  const openEdit = (row: GenericEntity) => {
    setEditingRow(row);
    setForm(initialForm(fields, row));
    setModalMode('edit');
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setParams((prev) => ({ ...prev, status: value || undefined, page: 1 }));
  };

  const handleSave = async () => {
    const action = modalMode === 'edit' ? update : create;
    if (!action) return;

    setIsSaving(true);
    try {
      const payload = toPayload(fields, form);
      if (modalMode === 'edit' && editingRow) {
        await update?.(getEntityId(editingRow), payload);
        showToast(`${title} updated`);
      } else {
        await create?.(payload);
        showToast(`${title} created`);
      }
      setModalMode(null);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to save ${title}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !remove) return;
    setIsSaving(true);
    try {
      await remove(getEntityId(deleteTarget));
      showToast(`${title} deleted`);
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to delete ${title}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const tableColumns = useMemo<Column<GenericEntity>[]>(() => {
    const configured = columns.map((column) => ({
      key: column.key,
      header: column.header,
      render: (row: GenericEntity) => formatCell(row[column.key], column.type),
    }));

    return [
      ...configured,
      {
        key: 'actions',
        header: 'Actions',
        className: 'text-right',
        render: (row: GenericEntity) => (
          <div className="flex justify-end gap-2">
            {update && (
              <button type="button" className="btn-secondary !px-2 !py-1.5" onClick={() => openEdit(row)}>
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {remove && (
              <button type="button" className="btn-secondary !px-2 !py-1.5 text-red-600" onClick={() => setDeleteTarget(row)}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ];
  }, [columns, remove, update]);

  const activeCount = data.filter((row) => ['active', 'running', 'confirmed', 'completed'].includes(String(row.status))).length;
  const openCount = data.filter((row) => ['new', 'pending', 'draft', 'scheduled', 'contacted'].includes(String(row.status))).length;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          create ? (
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add {title}
            </button>
          ) : undefined
        }
      />

      {comingSoon && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Advanced workflow pending:</span> {comingSoon}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <DashboardCard title="Total Records" value={pagination.total} />
        <DashboardCard title="Active / Completed" value={activeCount} />
        <DashboardCard title="Open / Draft" value={openCount} />
      </div>

      <DataTable
        columns={tableColumns}
        data={data}
        isLoading={isLoading}
        error={error}
        onSearch={setSearch}
        searchPlaceholder={searchPlaceholder}
        filters={
          statusOptions ? (
            <SelectInput
              value={statusFilter}
              onChange={(event) => handleStatusChange(event.target.value)}
              options={[{ value: '', label: 'All statuses' }, ...statusOptions]}
              className="min-w-44"
            />
          ) : undefined
        }
        rowKey={(row) => getEntityId(row)}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          onPageChange: setPage,
        }}
        emptyTitle={emptyTitle || `No ${title.toLowerCase()} found`}
        emptyDescription={emptyDescription || `Create the first ${title.toLowerCase()} record to start using this module.`}
      />

      <Modal
        isOpen={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={`${modalMode === 'edit' ? 'Edit' : 'Add'} ${title}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setModalMode(null)} disabled={isSaving}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const value = form[field.key] ?? '';
            const onChange = (nextValue: string) => setForm((prev) => ({ ...prev, [field.key]: nextValue }));

            if (field.type === 'textarea') {
              return (
                <div key={field.key} className="sm:col-span-2">
                  <TextArea
                    label={field.label}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    required={field.required}
                    placeholder={field.placeholder}
                  />
                </div>
              );
            }

            if (field.type === 'select') {
              return (
                <SelectInput
                  key={field.key}
                  label={field.label}
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  options={field.options || []}
                  required={field.required}
                  placeholder={field.placeholder}
                />
              );
            }

            return (
              <FormInput
                key={field.key}
                label={field.label}
                type={field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                required={field.required}
                placeholder={field.placeholder}
              />
            );
          })}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${title}`}
        message={`Delete ${deleteTarget ? getDisplayName(deleteTarget) : 'this record'}? This will use the existing backend delete endpoint.`}
        isLoading={isSaving}
      />
    </div>
  );
}
