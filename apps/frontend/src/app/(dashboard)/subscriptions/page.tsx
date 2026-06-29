'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, CalendarPlus, Plus, Power, RefreshCw, Repeat, ShieldOff, ToggleLeft, WalletCards } from 'lucide-react';
import { ActionMenu } from '@/components/ActionMenu';
import { DataTable, type Column } from '@/components/DataTable';
import { FormInput, SelectInput } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import { PlatformOnly } from '@/components/PlatformOnly';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { FilterPanel, ModulePageLayout, ModuleToolbar, StatCard, SummaryCardGrid } from '@/components/layout';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  assignPlatformSubscription,
  getPlatformHotels,
  getPlatformPlans,
  getPlatformSubscriptions,
  runPlatformSubscriptionAction,
  type PlatformHotel,
  type PlatformPlan,
  type PlatformSubscription,
  type PlatformSubscriptionPayload,
} from '@/services/platform.service';
import { formatDate } from '@/utils/format';

const emptyAssignment: PlatformSubscriptionPayload = {
  hotelId: '',
  planId: '',
  status: 'trial',
  autoRenew: true,
  billingCycle: 'monthly',
};

export default function SubscriptionsPage() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [hotels, setHotels] = useState<PlatformHotel[]>([]);
  const [planId, setPlanId] = useState('');
  const [status, setStatus] = useState('');
  const [billingCycle, setBillingCycle] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [changeTarget, setChangeTarget] = useState<PlatformSubscription | null>(null);
  const [trialTarget, setTrialTarget] = useState<PlatformSubscription | null>(null);
  const [assignment, setAssignment] = useState<PlatformSubscriptionPayload>(emptyAssignment);
  const [changePlanId, setChangePlanId] = useState('');
  const [trialDays, setTrialDays] = useState(7);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([getPlatformPlans({ limit: 100 }), getPlatformHotels({ limit: 100 })]).then(([planResult, hotelResult]) => {
      setPlans(planResult.data);
      setHotels(hotelResult.data);
    });
  }, []);

  const fetchSubscriptions = useCallback(
    (params: Parameters<typeof getPlatformSubscriptions>[0]) =>
      getPlatformSubscriptions({
        ...params,
        planId: planId || undefined,
        status: status || undefined,
        billingCycle: billingCycle || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    [billingCycle, fromDate, planId, status, toDate]
  );

  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } =
    usePaginatedQuery<PlatformSubscription>({ fetchFn: fetchSubscriptions });

  const activeCount = data.filter((item) => item.status === 'active').length;
  const trialCount = data.filter((item) => item.status === 'trial').length;
  const autoRenewCount = data.filter((item) => item.autoRenew).length;
  const activeFilters = [planId, status, billingCycle, fromDate, toDate].filter(Boolean).length;

  const updateFilter = (key: string, value: string, setter: (value: string) => void) => {
    setter(value);
    setParams((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const resetFilters = () => {
    setPlanId('');
    setStatus('');
    setBillingCycle('');
    setFromDate('');
    setToDate('');
    setParams((prev) => ({ ...prev, planId: undefined, status: undefined, billingCycle: undefined, fromDate: undefined, toDate: undefined, page: 1 }));
  };

  const assignSubscription = async () => {
    setSaving(true);
    try {
      await assignPlatformSubscription(assignment);
      showToast('Subscription assigned');
      setAssignOpen(false);
      setAssignment(emptyAssignment);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to assign subscription', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (subscription: PlatformSubscription, action: Parameters<typeof runPlatformSubscriptionAction>[1]['action'], payload = {}) => {
    try {
      await runPlatformSubscriptionAction(subscription.id, { action, ...payload, reason: 'Subscription action from Super Admin panel' });
      showToast('Subscription updated');
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update subscription', 'error');
    }
  };

  const columns = useMemo<Column<PlatformSubscription>[]>(
    () => [
      {
        key: 'hotelName',
        header: 'Hotel Name',
        render: (subscription) => (
          <div>
            <div className="font-semibold text-slate-950">{subscription.hotelName}</div>
            <div className="text-xs text-slate-500">{subscription.ownerEmail || 'Owner email unavailable'}</div>
          </div>
        ),
      },
      { key: 'planName', header: 'Plan', render: (subscription) => <StatusBadge status={subscription.planName} /> },
      { key: 'status', header: 'Status', render: (subscription) => <StatusBadge status={subscription.status} /> },
      { key: 'startDate', header: 'Start Date', render: (subscription) => formatDate(subscription.startDate) },
      { key: 'renewalDate', header: 'Renewal Date', render: (subscription) => subscription.renewalDate ? formatDate(subscription.renewalDate) : '—' },
      { key: 'autoRenew', header: 'Auto Renew', render: (subscription) => <StatusBadge status={subscription.autoRenew ? 'active' : 'inactive'} /> },
      { key: 'updatedAt', header: 'Last Updated', render: (subscription) => formatDate(subscription.updatedAt) },
      {
        key: 'actions',
        header: '',
        className: 'text-right',
        render: (subscription) => (
          <ActionMenu
            items={[
              { label: 'Change Plan', icon: WalletCards, onClick: () => { setChangeTarget(subscription); setChangePlanId(subscription.planId); } },
              { label: 'Extend Trial', icon: CalendarPlus, onClick: () => setTrialTarget(subscription) },
              { label: 'Suspend', icon: ShieldOff, onClick: () => void runAction(subscription, 'suspend'), hidden: subscription.status === 'suspended', dividerBefore: true },
              { label: 'Reactivate', icon: Power, onClick: () => void runAction(subscription, 'reactivate'), hidden: subscription.status === 'active' },
              { label: 'Cancel', icon: Ban, onClick: () => void runAction(subscription, 'cancel') },
              { label: 'Force Expiry', icon: RefreshCw, onClick: () => void runAction(subscription, 'force_expire') },
              { label: subscription.autoRenew ? 'Disable Auto Renew' : 'Enable Auto Renew', icon: ToggleLeft, onClick: () => void runAction(subscription, 'toggle_auto_renew', { autoRenew: !subscription.autoRenew }), dividerBefore: true },
            ]}
          />
        ),
      },
    ],
    [plans]
  );

  return (
    <PlatformOnly>
      <ModulePageLayout
        title="Subscriptions"
        subtitle="Manage hotel subscription lifecycle, trial-to-paid conversion, renewals, and plan changes."
        actions={<button type="button" className="btn-primary" onClick={() => setAssignOpen(true)}><Plus className="mr-2 h-4 w-4" />Assign Plan</button>}
        summary={
          <SummaryCardGrid columns={4}>
            <StatCard title="Subscriptions On Page" value={data.length} helper={`${activeCount} active`} />
            <StatCard title="Trials" value={trialCount} helper="Trial lifecycle tracking" />
            <StatCard title="Auto Renew" value={autoRenewCount} helper="Renewal automation enabled" />
            <StatCard title="Billing Cycles" value="Monthly / Yearly" helper="Billing service ready" />
          </SummaryCardGrid>
        }
        toolbar={
          <ModuleToolbar
            onSearch={setSearch}
            searchPlaceholder="Search hotel name or owner email..."
            filters={
              <FilterPanel
                title="Subscription Filters"
                activeCount={activeFilters}
                onReset={resetFilters}
                basicFilters={
                  <>
                    <div className="filter-field">
                      <SelectInput label="Plan" value={planId} onChange={(e) => updateFilter('planId', e.target.value, setPlanId)} options={[{ value: '', label: 'All plans' }, ...plans.map((plan) => ({ value: plan.id, label: plan.name }))]} />
                    </div>
                    <div className="filter-field">
                      <SelectInput label="Status" value={status} onChange={(e) => updateFilter('status', e.target.value, setStatus)} options={[{ value: '', label: 'All statuses' }, { value: 'trial', label: 'Trial' }, { value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }, { value: 'suspended', label: 'Suspended' }, { value: 'cancelled', label: 'Cancelled' }]} />
                    </div>
                  </>
                }
              >
                <SelectInput label="Billing Cycle" value={billingCycle} onChange={(e) => updateFilter('billingCycle', e.target.value, setBillingCycle)} options={[{ value: '', label: 'All cycles' }, { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />
                <FormInput label="Renewal From" type="date" value={fromDate} onChange={(e) => updateFilter('fromDate', e.target.value, setFromDate)} />
                <FormInput label="Renewal To" type="date" value={toDate} onChange={(e) => updateFilter('toDate', e.target.value, setToDate)} />
              </FilterPanel>
            }
          />
        }
      >
        <DataTable
          compact
          hideToolbar
          columns={columns}
          data={data}
          isLoading={isLoading}
          error={error}
          rowKey={(subscription) => subscription.id}
          emptyTitle="No subscriptions found"
          emptyDescription="Assign a plan to a hotel to begin subscription tracking."
          pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        />

        <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Plan to Hotel" size="lg" footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setAssignOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void assignSubscription()}>Assign Plan</button>
          </div>
        }>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput label="Hotel" value={assignment.hotelId} onChange={(e) => setAssignment((prev) => ({ ...prev, hotelId: e.target.value }))} options={[{ value: '', label: 'Select hotel' }, ...hotels.map((hotel) => ({ value: hotel.id, label: hotel.name }))]} />
            <SelectInput label="Plan" value={assignment.planId} onChange={(e) => setAssignment((prev) => ({ ...prev, planId: e.target.value }))} options={[{ value: '', label: 'Select plan' }, ...plans.map((plan) => ({ value: plan.id, label: plan.name }))]} />
            <SelectInput label="Status" value={assignment.status} onChange={(e) => setAssignment((prev) => ({ ...prev, status: e.target.value as PlatformSubscriptionPayload['status'] }))} options={[{ value: 'trial', label: 'Trial' }, { value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }, { value: 'suspended', label: 'Suspended' }, { value: 'cancelled', label: 'Cancelled' }]} />
            <SelectInput label="Billing Cycle" value={assignment.billingCycle} onChange={(e) => setAssignment((prev) => ({ ...prev, billingCycle: e.target.value as PlatformSubscriptionPayload['billingCycle'] }))} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />
            <FormInput label="Start Date" type="date" value={assignment.startDate || ''} onChange={(e) => setAssignment((prev) => ({ ...prev, startDate: e.target.value }))} />
            <FormInput label="Renewal Date" type="date" value={assignment.renewalDate || ''} onChange={(e) => setAssignment((prev) => ({ ...prev, renewalDate: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={assignment.autoRenew} onChange={(e) => setAssignment((prev) => ({ ...prev, autoRenew: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              Auto Renew
            </label>
          </div>
        </Modal>

        <Modal isOpen={!!changeTarget} onClose={() => setChangeTarget(null)} title="Change Plan" size="sm" footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setChangeTarget(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={async () => { if (changeTarget) { await runAction(changeTarget, 'change_plan', { planId: changePlanId }); setChangeTarget(null); } }}>Change Plan</button>
          </div>
        }>
          <SelectInput label="Plan" value={changePlanId} onChange={(e) => setChangePlanId(e.target.value)} options={plans.map((plan) => ({ value: plan.id, label: plan.name }))} />
        </Modal>

        <Modal isOpen={!!trialTarget} onClose={() => setTrialTarget(null)} title="Extend Trial" size="sm" footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setTrialTarget(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={async () => { if (trialTarget) { await runAction(trialTarget, 'extend_trial', { trialDays }); setTrialTarget(null); } }}>Extend</button>
          </div>
        }>
          <FormInput label="Trial Days" type="number" value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} />
        </Modal>
      </ModulePageLayout>
    </PlatformOnly>
  );
}
