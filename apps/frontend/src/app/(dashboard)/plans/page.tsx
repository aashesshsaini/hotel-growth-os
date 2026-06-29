'use client';

import { useMemo, useState } from 'react';
import { Copy, Eye, Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react';
import { ActionMenu } from '@/components/ActionMenu';
import { DataTable, type Column } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { PlatformOnly } from '@/components/PlatformOnly';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { ModulePageLayout, ModuleToolbar, StatCard, SummaryCardGrid } from '@/components/layout';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  createPlatformPlan,
  deletePlatformPlan,
  duplicatePlatformPlan,
  getPlatformPlans,
  updatePlatformPlan,
  updatePlatformPlanStatus,
  type PlatformPlan,
  type PlatformPlanPayload,
  type PlanFeatures,
} from '@/services/platform.service';
import { formatCurrency, formatDate } from '@/utils/format';

const featureLabels: Array<{ key: keyof PlanFeatures; label: string }> = [
  { key: 'crmAccess', label: 'CRM Access' },
  { key: 'analyticsAccess', label: 'Analytics Access' },
  { key: 'apiAccess', label: 'API Access' },
  { key: 'multiBranchSupport', label: 'Multi-Branch Support' },
  { key: 'prioritySupport', label: 'Priority Support' },
];

const emptyPlan: PlatformPlanPayload = {
  name: 'Starter',
  description: '',
  priceMonthly: 0,
  priceYearly: 0,
  currency: 'INR',
  trialDays: 14,
  maxHotelsAllowed: 1,
  maxStaffAllowed: 10,
  maxRoomsAllowed: 50,
  features: {
    crmAccess: true,
    analyticsAccess: false,
    apiAccess: false,
    multiBranchSupport: false,
    prioritySupport: false,
  },
  isActive: true,
  isDefault: false,
};

export default function PlansPage() {
  const { showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<PlatformPlan | null>(null);
  const [editing, setEditing] = useState<PlatformPlan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformPlan | null>(null);
  const [form, setForm] = useState<PlatformPlanPayload>(emptyPlan);
  const [saving, setSaving] = useState(false);
  const { data, pagination, isLoading, error, setPage, setSearch, refresh } = usePaginatedQuery<PlatformPlan>({ fetchFn: getPlatformPlans });

  const activePlans = data.filter((plan) => plan.isActive).length;
  const defaultPlan = data.find((plan) => plan.isDefault)?.name ?? 'Not set';

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPlan);
    setFormOpen(true);
  };

  const openEdit = (plan: PlatformPlan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description || '',
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      currency: plan.currency,
      trialDays: plan.trialDays,
      maxHotelsAllowed: plan.maxHotelsAllowed,
      maxStaffAllowed: plan.maxStaffAllowed,
      maxRoomsAllowed: plan.maxRoomsAllowed,
      features: plan.features,
      isActive: plan.isActive,
      isDefault: plan.isDefault,
    });
    setFormOpen(true);
  };

  const savePlan = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updatePlatformPlan(editing.id, form);
        showToast('Plan updated');
      } else {
        await createPlatformPlan(form);
        showToast('Plan created');
      }
      setFormOpen(false);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<Column<PlatformPlan>[]>(
    () => [
      {
        key: 'name',
        header: 'Plan Name',
        render: (plan) => (
          <div>
            <div className="font-semibold text-slate-950">{plan.name}</div>
            <div className="text-xs text-slate-500">{plan.description || 'No description'}</div>
          </div>
        ),
      },
      { key: 'price', header: 'Price', render: (plan) => <div>{formatCurrency(plan.priceMonthly)} / mo<div className="text-xs text-slate-500">{formatCurrency(plan.priceYearly)} / yr</div></div> },
      { key: 'trialDays', header: 'Trial Days' },
      { key: 'limits', header: 'Limits Summary', render: (plan) => <div>{plan.maxHotelsAllowed} hotels<div className="text-xs text-slate-500">{plan.maxStaffAllowed} staff · {plan.maxRoomsAllowed} rooms</div></div> },
      { key: 'status', header: 'Status', render: (plan) => <div className="space-y-1"><StatusBadge status={plan.isActive ? 'active' : 'inactive'} />{plan.isDefault && <div><StatusBadge status="default" /></div>}</div> },
      { key: 'createdAt', header: 'Created', render: (plan) => formatDate(plan.createdAt) },
      {
        key: 'actions',
        header: '',
        className: 'text-right',
        render: (plan) => (
          <ActionMenu
            items={[
              { label: 'View', icon: Eye, onClick: () => setViewing(plan) },
              { label: 'Edit', icon: Pencil, onClick: () => openEdit(plan) },
              { label: 'Duplicate Plan', icon: Copy, onClick: async () => { await duplicatePlatformPlan(plan.id); showToast('Plan duplicated'); await refresh(); } },
              { label: plan.isActive ? 'Deactivate' : 'Activate', icon: plan.isActive ? PowerOff : Power, onClick: async () => { await updatePlatformPlanStatus(plan.id, !plan.isActive); showToast('Plan status updated'); await refresh(); }, dividerBefore: true },
              { label: 'Delete', icon: Trash2, onClick: () => setDeleteTarget(plan), variant: 'danger', dividerBefore: true },
            ]}
          />
        ),
      },
    ],
    [refresh, showToast]
  );

  return (
    <PlatformOnly>
      <ModulePageLayout
        title="Plans"
        subtitle="Define SaaS pricing, usage limits, trial policy, and future feature entitlements."
        actions={<button type="button" className="btn-primary" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Plan</button>}
        summary={
          <SummaryCardGrid columns={4}>
            <StatCard title="Plans" value={data.length} helper={`${activePlans} active`} />
            <StatCard title="Default Plan" value={defaultPlan} helper="Used for new tenants" />
            <StatCard title="Feature Control" value="Ready" helper="Plan-level feature flags" />
            <StatCard title="Billing Cycles" value="Monthly + Yearly" helper="Future billing service ready" />
          </SummaryCardGrid>
        }
        toolbar={<ModuleToolbar onSearch={setSearch} searchPlaceholder="Search plans..." />}
      >
        <DataTable
          compact
          hideToolbar
          columns={columns}
          data={data}
          isLoading={isLoading}
          error={error}
          rowKey={(plan) => plan.id}
          emptyTitle="No plans found"
          emptyDescription="Create a plan to start controlling SaaS access and billing."
          pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        />

        <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Plan' : 'Create Plan'} size="xl" footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void savePlan()}>{saving ? 'Saving...' : 'Save Plan'}</button>
          </div>
        }>
          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Plan Details</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <SelectInput label="Name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value as PlatformPlanPayload['name'] }))} options={[{ value: 'Starter', label: 'Starter' }, { value: 'Pro', label: 'Pro' }, { value: 'Enterprise', label: 'Enterprise' }, { value: 'Custom', label: 'Custom' }]} />
                <FormInput label="Currency" value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))} />
                <div className="sm:col-span-2">
                  <TextArea label="Description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pricing</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <FormInput label="Monthly Price" type="number" value={form.priceMonthly} onChange={(e) => setForm((prev) => ({ ...prev, priceMonthly: Number(e.target.value) }))} />
                <FormInput label="Yearly Price" type="number" value={form.priceYearly} onChange={(e) => setForm((prev) => ({ ...prev, priceYearly: Number(e.target.value) }))} />
                <FormInput label="Trial Days" type="number" value={form.trialDays} onChange={(e) => setForm((prev) => ({ ...prev, trialDays: Number(e.target.value) }))} />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Limits</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <FormInput label="Max Hotels" type="number" value={form.maxHotelsAllowed} onChange={(e) => setForm((prev) => ({ ...prev, maxHotelsAllowed: Number(e.target.value) }))} />
                <FormInput label="Max Staff" type="number" value={form.maxStaffAllowed} onChange={(e) => setForm((prev) => ({ ...prev, maxStaffAllowed: Number(e.target.value) }))} />
                <FormInput label="Max Rooms" type="number" value={form.maxRoomsAllowed} onChange={(e) => setForm((prev) => ({ ...prev, maxRoomsAllowed: Number(e.target.value) }))} />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Feature Toggle Matrix</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {featureLabels.map((feature) => (
                  <label key={feature.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    {feature.label}
                    <input
                      type="checkbox"
                      checked={form.features[feature.key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, features: { ...prev.features, [feature.key]: e.target.checked } }))}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                Default plan
              </label>
            </section>
          </div>
        </Modal>

        <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Plan Details" size="lg">
          {viewing && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Name</p><p className="font-semibold">{viewing.name}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Price</p><p className="font-semibold">{formatCurrency(viewing.priceMonthly)} / {formatCurrency(viewing.priceYearly)}</p></div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {featureLabels.map((feature) => <div key={feature.key} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span>{feature.label}</span><StatusBadge status={viewing.features[feature.key] ? 'active' : 'inactive'} /></div>)}
              </div>
            </div>
          )}
        </Modal>

        <ConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (!deleteTarget) return;
            await deletePlatformPlan(deleteTarget.id);
            setDeleteTarget(null);
            showToast('Plan deleted');
            await refresh();
          }}
          title="Delete Plan"
          message={`Soft delete ${deleteTarget?.name ?? 'this plan'}? Existing subscriptions remain unchanged.`}
          confirmLabel="Delete"
          variant="danger"
        />
      </ModulePageLayout>
    </PlatformOnly>
  );
}
