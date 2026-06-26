'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, LayoutDashboard, ListChecks, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { ActionMenu } from '@/components/ActionMenu';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { CompanyDetailDrawer } from '@/features/corporate-leads/CompanyDetailDrawer';
import { CorporateStatsCards } from '@/features/corporate-leads/CorporateStatsCards';
import { PipelineBoard, StatusBadge } from '@/features/corporate-leads/PipelineBoard';
import {
  CORPORATE_COMPANY_TYPES,
  CORPORATE_PAYMENT_TERMS,
  CORPORATE_PRIORITIES,
  CORPORATE_STATUSES,
  emptyCorporateForm,
} from '@/features/corporate-leads/constants';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  createCorporateLead,
  deleteCorporateLead,
  getCorporateLeadById,
  getCorporateLeadStats,
  getCorporateLeads,
  getCorporatePipeline,
  updateCorporateLead,
} from '@/services/corporateLeads.service';
import { staffService } from '@/services/staff.service';
import type { CorporateLead, CorporateLeadDetails, CorporateLeadFormData, CorporateLeadStats, CorporatePipelineColumn, Staff } from '@/types';
import { getEntityId } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';

type ViewMode = 'dashboard' | 'pipeline' | 'list';

export default function CorporateLeadsPage() {
  const { showToast } = useToast();
  const [view, setView] = useState<ViewMode>('dashboard');
  const [stats, setStats] = useState<CorporateLeadStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pipeline, setPipeline] = useState<CorporatePipelineColumn[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [companyTypeFilter, setCompanyTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CorporateLead | null>(null);
  const [form, setForm] = useState<CorporateLeadFormData>(emptyCorporateForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CorporateLead | null>(null);
  const [details, setDetails] = useState<CorporateLeadDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const listParams = useMemo(() => ({
    status: statusFilter || undefined,
    companyType: companyTypeFilter || undefined,
    priority: priorityFilter || undefined,
    assignedTo: assignedFilter || undefined,
  }), [statusFilter, companyTypeFilter, priorityFilter, assignedFilter]);

  const listParamsRef = useRef(listParams);
  listParamsRef.current = listParams;

  const fetchList = useCallback(
    (params: Parameters<typeof getCorporateLeads>[0]) =>
      getCorporateLeads({ ...params, ...listParamsRef.current }),
    []
  );

  const { data, pagination, isLoading, error, setPage, setSearch, refresh } = usePaginatedQuery<CorporateLead>({
    fetchFn: fetchList,
  });

  const loadMeta = useCallback(async () => {
    setStatsLoading(true);
    setPipelineLoading(true);
    try {
      const [statsData, pipelineData] = await Promise.all([
        getCorporateLeadStats(),
        getCorporatePipeline(),
      ]);
      setStats(statsData);
      setPipeline(pipelineData);
    } catch {
      setStats(null);
      setPipeline([]);
    } finally {
      setStatsLoading(false);
      setPipelineLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeta();
    void staffService.list({ limit: 100 }).then((result) => setStaff(result.data)).catch(() => setStaff([]));
  }, [loadMeta]);

  useEffect(() => { setPage(1); void refresh(); }, [statusFilter, companyTypeFilter, priorityFilter, assignedFilter, setPage, refresh]);

  const reload = () => Promise.all([refresh(), loadMeta()]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCorporateForm());
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (company: CorporateLead) => {
    setEditing(company);
    setForm({
      companyName: company.companyName,
      companyType: company.companyType || 'corporate',
      industry: company.industry || '',
      website: company.website || '',
      contactPerson: company.contactPerson,
      phone: company.phone,
      email: company.email || '',
      gstNumber: company.gstNumber || '',
      panNumber: company.panNumber || '',
      requirements: company.requirements || '',
      estimatedRooms: company.estimatedRooms || 0,
      estimatedGuests: company.estimatedGuests || 0,
      status: company.status,
      priority: company.priority || 'medium',
      source: company.source || 'direct',
      followUpDate: company.followUpDate?.slice(0, 10) || '',
      notes: company.notes || '',
      totalValue: company.totalValue || 0,
      paidAmount: company.paidAmount || 0,
      creditLimit: company.creditLimit || 0,
      paymentTerms: company.paymentTerms || 'net_30',
      corporateRate: company.corporateRate || 0,
      specialPricing: company.specialPricing || '',
      roomAllocation: company.roomAllocation || 0,
      assignedTo: typeof company.assignedTo === 'object' ? getEntityId(company.assignedTo) : company.assignedTo || '',
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openDetails = async (id: string) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      setDetails(await getCorporateLeadById(id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load company', 'error');
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.companyName.trim()) errors.companyName = 'Company name is required';
    if (!form.contactPerson.trim()) errors.contactPerson = 'Contact person is required';
    if (!form.phone.trim()) errors.phone = 'Phone is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (editing) {
        await updateCorporateLead(getEntityId(editing), form);
        showToast('Company updated successfully', 'success');
      } else {
        await createCorporateLead(form);
        showToast('Company created successfully', 'success');
      }
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCorporateLead(getEntityId(deleteTarget));
      showToast('Company archived', 'success');
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'company',
        header: 'Company',
        render: (row: CorporateLead) => (
          <div>
            <div className="font-semibold text-slate-950">{row.companyName}</div>
            <div className="text-xs text-slate-500">
              {row.companyNumber || '—'} · {row.companyType?.replace(/_/g, ' ') || 'corporate'}
            </div>
          </div>
        ),
      },
      {
        key: 'contact',
        header: 'Contact',
        render: (row: CorporateLead) => (
          <div>
            {row.contactPerson}
            <div className="text-xs text-slate-500">{row.phone}</div>
          </div>
        ),
      },
      { key: 'status', header: 'Pipeline', render: (row: CorporateLead) => <StatusBadge status={row.status} /> },
      { key: 'value', header: 'Value', render: (row: CorporateLead) => formatCurrency(row.totalValue ?? 0) },
      { key: 'followUp', header: 'Follow-up', render: (row: CorporateLead) => (row.followUpDate ? formatDate(row.followUpDate) : '—') },
      {
        key: 'actions',
        header: '',
        render: (row: CorporateLead) => (
          <ActionMenu
            items={[
              { label: 'View profile', icon: Eye, onClick: () => void openDetails(getEntityId(row)) },
              { label: 'Edit', icon: Pencil, onClick: () => openEdit(row) },
              { label: 'Delete', icon: Trash2, onClick: () => setDeleteTarget(row), variant: 'danger' },
            ]}
          />
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-900 to-violet-800 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">Corporate Sales CRM</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Corporate Leads Management</h1>
            <p className="mt-3 max-w-2xl text-sm text-indigo-100 sm:text-base">
              Manage company accounts, sales pipeline, proposals, contracts, and corporate revenue from one enterprise workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void reload()} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20">
              <RefreshCw className="mr-2 inline h-4 w-4" />Refresh
            </button>
            <button type="button" onClick={openCreate} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
              <Plus className="mr-2 inline h-4 w-4" />Add Company
            </button>
          </div>
        </div>
      </section>

      <CorporateStatsCards stats={stats} isLoading={statsLoading} />

      <div className="flex flex-wrap gap-2">
        {([
          { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
          { id: 'pipeline', label: 'Pipeline Board', icon: ListChecks },
          { id: 'list', label: 'Company List', icon: Eye },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${view === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
          >
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {view === 'pipeline' && (
        <PipelineBoard columns={pipeline} isLoading={pipelineLoading} onSelect={(id) => void openDetails(id)} />
      )}

      {view === 'dashboard' && (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Sales Pipeline Snapshot</h2>
            <PipelineBoard columns={pipeline.slice(0, 4)} isLoading={pipelineLoading} onSelect={(id) => void openDetails(id)} />
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Company Type Mix</h2>
            <div className="space-y-3">
              {stats && Object.entries(stats.companyTypeBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                  <span className="font-medium capitalize text-slate-800">{type.replace(/_/g, ' ')}</span>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">{count}</span>
                </div>
              ))}
              {!stats && <p className="text-sm text-slate-500">Loading breakdown...</p>}
            </div>
          </section>
        </div>
      )}

      {(view === 'list' || view === 'dashboard') && (
        <>
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-4">
            <SelectInput label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...CORPORATE_STATUSES]} />
            <SelectInput label="Company Type" value={companyTypeFilter} onChange={(e) => setCompanyTypeFilter(e.target.value)} options={[{ value: '', label: 'All types' }, ...CORPORATE_COMPANY_TYPES]} />
            <SelectInput label="Priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} options={[{ value: '', label: 'All priorities' }, ...CORPORATE_PRIORITIES]} />
            <SelectInput label="Relationship Manager" value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} options={[{ value: '', label: 'All managers' }, ...staff.map((member) => ({ value: getEntityId(member), label: member.fullName || member.name || member.email }))]} />
          </div>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            error={error}
            searchPlaceholder="Search company, contact, GST, phone..."
            emptyTitle="No corporate companies found"
            emptyDescription="Add a company account or adjust filters."
            rowKey={(row) => getEntityId(row)}
            onSearch={setSearch}
            pagination={{
              page: pagination.page,
              totalPages: pagination.totalPages,
              total: pagination.total,
              onPageChange: setPage,
            }}
          />
        </>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Company' : 'Add Company'}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={isSaving} onClick={() => void handleSave()}>{isSaving ? 'Saving...' : 'Save Company'}</button>
          </div>
        }
      >
        {formErrors.form && <p className="mb-4 text-sm text-rose-600">{formErrors.form}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Company Name" required value={form.companyName} error={formErrors.companyName} onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))} />
          <SelectInput label="Company Type" value={form.companyType || 'corporate'} onChange={(e) => setForm((prev) => ({ ...prev, companyType: e.target.value }))} options={CORPORATE_COMPANY_TYPES} />
          <FormInput label="Contact Person" required value={form.contactPerson} error={formErrors.contactPerson} onChange={(e) => setForm((prev) => ({ ...prev, contactPerson: e.target.value }))} />
          <FormInput label="Phone" required value={form.phone} error={formErrors.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          <FormInput label="Email" value={form.email || ''} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <FormInput label="Industry" value={form.industry || ''} onChange={(e) => setForm((prev) => ({ ...prev, industry: e.target.value }))} />
          <FormInput label="GST Number" value={form.gstNumber || ''} onChange={(e) => setForm((prev) => ({ ...prev, gstNumber: e.target.value }))} />
          <FormInput label="PAN Number" value={form.panNumber || ''} onChange={(e) => setForm((prev) => ({ ...prev, panNumber: e.target.value }))} />
          <SelectInput label="Status" value={form.status || 'new'} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} options={CORPORATE_STATUSES} />
          <SelectInput label="Priority" value={form.priority || 'medium'} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} options={CORPORATE_PRIORITIES} />
          <SelectInput label="Payment Terms" value={form.paymentTerms || 'net_30'} onChange={(e) => setForm((prev) => ({ ...prev, paymentTerms: e.target.value }))} options={CORPORATE_PAYMENT_TERMS} />
          <SelectInput label="Relationship Manager" value={form.assignedTo || ''} onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))} options={[{ value: '', label: 'Unassigned' }, ...staff.map((member) => ({ value: getEntityId(member), label: member.fullName || member.name || member.email }))]} />
          <FormInput label="Total Value" type="number" value={form.totalValue ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, totalValue: Number(e.target.value) }))} />
          <FormInput label="Corporate Rate" type="number" value={form.corporateRate ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, corporateRate: Number(e.target.value) }))} />
          <FormInput label="Credit Limit" type="number" value={form.creditLimit ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, creditLimit: Number(e.target.value) }))} />
          <FormInput label="Room Allocation" type="number" value={form.roomAllocation ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, roomAllocation: Number(e.target.value) }))} />
          <FormInput label="Estimated Rooms" type="number" value={form.estimatedRooms ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, estimatedRooms: Number(e.target.value) }))} />
          <FormInput label="Follow-up Date" type="date" value={form.followUpDate || ''} onChange={(e) => setForm((prev) => ({ ...prev, followUpDate: e.target.value }))} />
          <div className="sm:col-span-2"><TextArea label="Requirements" value={form.requirements || ''} onChange={(e) => setForm((prev) => ({ ...prev, requirements: e.target.value }))} /></div>
          <div className="sm:col-span-2"><TextArea label="Notes" value={form.notes || ''} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
        </div>
      </Modal>

      <CompanyDetailDrawer
        details={details}
        isOpen={detailsOpen}
        isLoading={detailsLoading}
        onClose={() => setDetailsOpen(false)}
        onEdit={() => { if (details?.company) { setDetailsOpen(false); openEdit(details.company); } }}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Archive Company"
        message={`Archive ${deleteTarget?.companyName}? This can be restored from backend if needed.`}
        confirmLabel="Archive"
      />
    </div>
  );
}
