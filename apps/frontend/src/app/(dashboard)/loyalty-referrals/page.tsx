'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Download, Gift, Link as LinkIcon, Plus, Send, Star, Trophy, WalletCards } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { capitalize, formatDateTime } from '@/utils/format';
import {
  adjustLoyaltyPoints,
  entityId,
  exportLoyaltyReports,
  generateReferralCode,
  getLoyaltyAnalytics,
  getLoyaltyDashboard,
  getLoyaltySettings,
  getLoyaltyTransactions,
  getReferralCodes,
  getReferralInvites,
  getRewardRedemptions,
  issueReferralReward,
  redeemLoyaltyPoints,
  sendReferralInvite,
  updateLoyaltySettings,
  type LoyaltyAnalytics,
  type LoyaltyDashboard,
  type LoyaltySettings,
  type LoyaltyTransaction,
  type ReferralCode,
  type ReferralInvite,
  type RewardRedemption,
} from '@/services/loyaltyReferrals.service';

const defaultSettings: LoyaltySettings = { referralEnabled: true, referralRewardType: 'coupon', flatReward: 500, percentageReward: 10, couponReward: 'REFER10', rewardExpiryDays: 90, referralTerms: '', maximumReferrals: 25, minimumBookingAmount: 1000, referralValidityDays: 60, loyaltyEnabled: true, pointsPerBooking: 100, bonusPoints: 0, birthdayBonus: 250, festivalBonus: 150, vipMultiplier: 1.5, redemptionMinimumPoints: 500, redemptionValuePerPoint: 1, pointExpiryDays: 365 };

function StatCard({ title, value, helper, icon: Icon }: { title: string; value: string | number; helper?: string; icon: typeof Gift }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p><Icon className="h-5 w-5 text-indigo-500" /></div><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>{helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}</div>;
}
function Badge({ value }: { value: string }) {
  const tone = ['active', 'posted', 'approved', 'issued', 'rewarded', 'booked'].includes(value) ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : ['failed', 'expired', 'cancelled', 'reversed'].includes(value) ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-slate-50 text-slate-700 ring-slate-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{capitalize(value.replace(/_/g, ' '))}</span>;
}

export default function LoyaltyReferralsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState<LoyaltyDashboard | null>(null);
  const [analytics, setAnalytics] = useState<LoyaltyAnalytics | null>(null);
  const [settings, setSettings] = useState<LoyaltySettings>(defaultSettings);
  const [codeOpen, setCodeOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [guestId, setGuestId] = useState('');
  const [inviteForm, setInviteForm] = useState({ guestId: '', recipient: '', channel: 'whatsapp' });
  const [pointsForm, setPointsForm] = useState({ guestId: '', points: 100, reason: 'Manual loyalty adjustment' });
  const [redeemForm, setRedeemForm] = useState({ guestId: '', points: 500, rewardType: 'points', notes: '' });
  const [rewardForm, setRewardForm] = useState({ inviteId: '', bookingAmount: 1000 });

  const codesQuery = usePaginatedQuery<ReferralCode>({ fetchFn: getReferralCodes, initialParams: { limit: 10 } });
  const invitesQuery = usePaginatedQuery<ReferralInvite>({ fetchFn: getReferralInvites, initialParams: { limit: 10 } });
  const transactionsQuery = usePaginatedQuery<LoyaltyTransaction>({ fetchFn: getLoyaltyTransactions, initialParams: { limit: 10 } });
  const redemptionsQuery = usePaginatedQuery<RewardRedemption>({ fetchFn: getRewardRedemptions, initialParams: { limit: 10 } });

  const loadOverview = useCallback(async () => {
    const [nextDashboard, nextAnalytics, nextSettings] = await Promise.all([getLoyaltyDashboard(), getLoyaltyAnalytics({ months: 6 }), getLoyaltySettings()]);
    setDashboard(nextDashboard);
    setAnalytics(nextAnalytics);
    setSettings(nextSettings);
  }, []);
  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const quickAction = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      showToast(message, 'success');
      await Promise.all([loadOverview(), codesQuery.refresh(), invitesQuery.refresh(), transactionsQuery.refresh(), redemptionsQuery.refresh()]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Action failed', 'error');
    }
  };

  const stats = useMemo(() => [
    { title: 'Total referrals', value: dashboard?.totalReferrals ?? 0, helper: `${dashboard?.successfulReferrals ?? 0} successful`, icon: LinkIcon },
    { title: 'Pending referrals', value: dashboard?.pendingReferrals ?? 0, helper: 'Invitations awaiting conversion', icon: Send },
    { title: 'Loyalty members', value: dashboard?.loyaltyMembers ?? 0, helper: `${dashboard?.pointsIssued ?? 0} points issued`, icon: Trophy },
    { title: 'Points redeemed', value: dashboard?.pointsRedeemed ?? 0, helper: `${dashboard?.rewardIssued ?? 0} rewards issued`, icon: WalletCards },
  ], [dashboard]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Retention Growth</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Referral & Loyalty Program</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Generate referral links, reward advocates, manage loyalty points, and track guest retention from one hotel-scoped ledger.</p></div>
        <div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => setCodeOpen(true)}><LinkIcon className="h-4 w-4" /> Generate link</button><button className="btn-secondary" onClick={() => setInviteOpen(true)}><Send className="h-4 w-4" /> Invite</button><button className="btn-secondary" onClick={() => void quickAction(exportLoyaltyReports, 'Export generated')}><Download className="h-4 w-4" /> Export</button><button className="btn-primary" onClick={() => setPointsOpen(true)}><Plus className="h-4 w-4" /> Adjust points</button></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.title} {...stat} />)}</div>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">{['dashboard', 'referrals', 'settings', 'transactions', 'redemptions', 'analytics'].map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>{capitalize(tab)}</button>)}</div>

      {activeTab === 'dashboard' && <div className="grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-slate-950">Program health</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><StatCard title="Referral conversion" value={`${analytics?.referralConversion ?? 0}%`} icon={LinkIcon} /><StatCard title="Loyalty growth" value={analytics?.loyaltyGrowth ?? 0} icon={Star} /></div></div><div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-slate-950">Quick actions</h2><div className="mt-4 grid gap-3"><button className="btn-secondary justify-start" onClick={() => setRedeemOpen(true)}><Gift className="h-4 w-4" /> Redeem points</button><button className="btn-secondary justify-start" onClick={() => setRewardOpen(true)}><Trophy className="h-4 w-4" /> Issue referral reward</button><button className="btn-secondary justify-start" onClick={() => setInviteOpen(true)}><Send className="h-4 w-4" /> Resend invitation</button></div></div></div>}

      {activeTab === 'referrals' && <div className="grid gap-6 xl:grid-cols-2"><DataTable columns={[{ key: 'code', header: 'Code' }, { key: 'referralLink', header: 'Link' }, { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> }, { key: 'useCount', header: 'Uses' }, { key: 'actions', header: 'Actions', render: (row) => <button className="btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(row.code)}><Copy className="h-4 w-4" /></button> }]} data={codesQuery.data} isLoading={codesQuery.isLoading} error={codesQuery.error} onSearch={codesQuery.setSearch} rowKey={entityId} pagination={{ page: codesQuery.pagination.page, totalPages: codesQuery.pagination.totalPages, total: codesQuery.pagination.total, onPageChange: codesQuery.setPage }} emptyTitle="No referral codes" emptyDescription="Generate referral links for existing guests." /><DataTable columns={[{ key: 'code', header: 'Code' }, { key: 'channel', header: 'Channel', render: (row) => capitalize(row.channel) }, { key: 'recipientMasked', header: 'Recipient' }, { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> }, { key: 'rewardStatus', header: 'Reward', render: (row) => <Badge value={row.rewardStatus} /> }]} data={invitesQuery.data} isLoading={invitesQuery.isLoading} error={invitesQuery.error} onSearch={invitesQuery.setSearch} rowKey={entityId} pagination={{ page: invitesQuery.pagination.page, totalPages: invitesQuery.pagination.totalPages, total: invitesQuery.pagination.total, onPageChange: invitesQuery.setPage }} emptyTitle="No invitations" emptyDescription="Referral invitations appear here." /></div>}

      {activeTab === 'settings' && <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><SelectInput label="Referral program" value={String(settings.referralEnabled)} onChange={(e) => setSettings({ ...settings, referralEnabled: e.target.value === 'true' })} options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} /><SelectInput label="Referral reward type" value={settings.referralRewardType} onChange={(e) => setSettings({ ...settings, referralRewardType: e.target.value as LoyaltySettings['referralRewardType'] })} options={['flat', 'percentage', 'coupon', 'free_upgrade', 'free_breakfast'].map((value) => ({ value, label: capitalize(value.replace(/_/g, ' ')) }))} /><FormInput label="Flat reward" type="number" value={settings.flatReward} onChange={(e) => setSettings({ ...settings, flatReward: Number(e.target.value) })} /><FormInput label="Percentage reward" type="number" value={settings.percentageReward} onChange={(e) => setSettings({ ...settings, percentageReward: Number(e.target.value) })} /><FormInput label="Maximum referrals" type="number" value={settings.maximumReferrals} onChange={(e) => setSettings({ ...settings, maximumReferrals: Number(e.target.value) })} /><FormInput label="Minimum booking amount" type="number" value={settings.minimumBookingAmount} onChange={(e) => setSettings({ ...settings, minimumBookingAmount: Number(e.target.value) })} /><SelectInput label="Loyalty" value={String(settings.loyaltyEnabled)} onChange={(e) => setSettings({ ...settings, loyaltyEnabled: e.target.value === 'true' })} options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} /><FormInput label="Points per booking" type="number" value={settings.pointsPerBooking} onChange={(e) => setSettings({ ...settings, pointsPerBooking: Number(e.target.value) })} /><FormInput label="VIP multiplier" type="number" step="0.1" value={settings.vipMultiplier} onChange={(e) => setSettings({ ...settings, vipMultiplier: Number(e.target.value) })} /><FormInput label="Birthday bonus" type="number" value={settings.birthdayBonus} onChange={(e) => setSettings({ ...settings, birthdayBonus: Number(e.target.value) })} /><FormInput label="Festival bonus" type="number" value={settings.festivalBonus} onChange={(e) => setSettings({ ...settings, festivalBonus: Number(e.target.value) })} /><FormInput label="Point expiry days" type="number" value={settings.pointExpiryDays} onChange={(e) => setSettings({ ...settings, pointExpiryDays: Number(e.target.value) })} /></div><div className="mt-4"><TextArea label="Referral terms" value={settings.referralTerms || ''} onChange={(e) => setSettings({ ...settings, referralTerms: e.target.value })} /></div><div className="mt-5 flex justify-end"><button className="btn-primary" onClick={() => void quickAction(() => updateLoyaltySettings(settings), 'Settings saved')}>Save settings</button></div></div>}

      {activeTab === 'transactions' && <DataTable columns={[{ key: 'type', header: 'Type', render: (row) => <Badge value={row.type} /> }, { key: 'points', header: 'Points' }, { key: 'balanceAfter', header: 'Balance' }, { key: 'reason', header: 'Reason' }, { key: 'createdAt', header: 'Date', render: (row) => row.createdAt ? formatDateTime(row.createdAt) : '—' }]} data={transactionsQuery.data} isLoading={transactionsQuery.isLoading} error={transactionsQuery.error} onSearch={transactionsQuery.setSearch} rowKey={entityId} pagination={{ page: transactionsQuery.pagination.page, totalPages: transactionsQuery.pagination.totalPages, total: transactionsQuery.pagination.total, onPageChange: transactionsQuery.setPage }} emptyTitle="No point transactions" emptyDescription="Point earning, redemption, and adjustments appear here." />}
      {activeTab === 'redemptions' && <DataTable columns={[{ key: 'rewardType', header: 'Reward' }, { key: 'pointsRedeemed', header: 'Points' }, { key: 'amountValue', header: 'Value' }, { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> }, { key: 'createdAt', header: 'Date', render: (row) => row.createdAt ? formatDateTime(row.createdAt) : '—' }]} data={redemptionsQuery.data} isLoading={redemptionsQuery.isLoading} error={redemptionsQuery.error} onSearch={redemptionsQuery.setSearch} rowKey={entityId} pagination={{ page: redemptionsQuery.pagination.page, totalPages: redemptionsQuery.pagination.totalPages, total: redemptionsQuery.pagination.total, onPageChange: redemptionsQuery.setPage }} emptyTitle="No redemptions" emptyDescription="Reward redemptions appear here." />}
      {activeTab === 'analytics' && <div className="grid gap-4 lg:grid-cols-2"><StatCard title="Referral conversion" value={`${analytics?.referralConversion ?? 0}%`} icon={LinkIcon} /><StatCard title="Booking conversion" value={`${analytics?.bookingConversion ?? 0}%`} icon={Trophy} /><StatCard title="Reward usage" value={analytics?.rewardUsage ?? 0} icon={Gift} /><StatCard title="Revenue from referrals" value={`₹${analytics?.revenueFromReferrals ?? 0}`} icon={WalletCards} /></div>}

      <Modal isOpen={codeOpen} onClose={() => setCodeOpen(false)} title="Generate referral link" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setCodeOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => void quickAction(() => generateReferralCode({ guestId }), 'Referral code generated').then(() => setCodeOpen(false))}>Generate</button></div>}><FormInput label="Guest ID" value={guestId} onChange={(e) => setGuestId(e.target.value)} /></Modal>
      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} title="Send referral invitation" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setInviteOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => void quickAction(() => sendReferralInvite(inviteForm), 'Invitation sent').then(() => setInviteOpen(false))}>Send</button></div>}><div className="space-y-4"><FormInput label="Referrer guest ID" value={inviteForm.guestId} onChange={(e) => setInviteForm({ ...inviteForm, guestId: e.target.value })} /><FormInput label="Recipient phone/email" value={inviteForm.recipient} onChange={(e) => setInviteForm({ ...inviteForm, recipient: e.target.value })} /><SelectInput label="Channel" value={inviteForm.channel} onChange={(e) => setInviteForm({ ...inviteForm, channel: e.target.value })} options={[{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }]} /></div></Modal>
      <Modal isOpen={pointsOpen} onClose={() => setPointsOpen(false)} title="Adjust loyalty points" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setPointsOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => void quickAction(() => adjustLoyaltyPoints(pointsForm), 'Points adjusted').then(() => setPointsOpen(false))}>Adjust</button></div>}><div className="space-y-4"><FormInput label="Guest ID" value={pointsForm.guestId} onChange={(e) => setPointsForm({ ...pointsForm, guestId: e.target.value })} /><FormInput label="Points" type="number" value={pointsForm.points} onChange={(e) => setPointsForm({ ...pointsForm, points: Number(e.target.value) })} /><TextArea label="Reason" value={pointsForm.reason} onChange={(e) => setPointsForm({ ...pointsForm, reason: e.target.value })} /></div></Modal>
      <Modal isOpen={redeemOpen} onClose={() => setRedeemOpen(false)} title="Redeem points" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setRedeemOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => void quickAction(() => redeemLoyaltyPoints(redeemForm), 'Points redeemed').then(() => setRedeemOpen(false))}>Redeem</button></div>}><div className="space-y-4"><FormInput label="Guest ID" value={redeemForm.guestId} onChange={(e) => setRedeemForm({ ...redeemForm, guestId: e.target.value })} /><FormInput label="Points" type="number" value={redeemForm.points} onChange={(e) => setRedeemForm({ ...redeemForm, points: Number(e.target.value) })} /><TextArea label="Notes" value={redeemForm.notes} onChange={(e) => setRedeemForm({ ...redeemForm, notes: e.target.value })} /></div></Modal>
      <Modal isOpen={rewardOpen} onClose={() => setRewardOpen(false)} title="Issue referral reward" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setRewardOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => void quickAction(() => issueReferralReward(rewardForm), 'Referral reward issued').then(() => setRewardOpen(false))}>Issue</button></div>}><div className="space-y-4"><FormInput label="Invitation ID" value={rewardForm.inviteId} onChange={(e) => setRewardForm({ ...rewardForm, inviteId: e.target.value })} /><FormInput label="Booking amount" type="number" value={rewardForm.bookingAmount} onChange={(e) => setRewardForm({ ...rewardForm, bookingAmount: Number(e.target.value) })} /></div></Modal>
    </div>
  );
}
