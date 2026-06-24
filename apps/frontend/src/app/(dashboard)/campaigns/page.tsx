'use client';

import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { createCampaigns, deleteCampaigns, getCampaigns, updateCampaigns } from '@/services/campaigns.service';

const statusOptions = [{ value: 'draft', label: 'Draft' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'running', label: 'Running' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }];

export default function Page() {
  return (
    <ModuleCrudPage
      title="Campaigns"
      subtitle="Plan, track, and manage hotel growth campaigns."
      searchPlaceholder="Search campaigns..."
      list={getCampaigns}
      create={createCampaigns}
      update={updateCampaigns}
      remove={deleteCampaigns}
      statusOptions={statusOptions}
      comingSoon={'Launch, audience segmentation, campaign logs, and delivery analytics still need backend workflow restoration.'}
      fields={[ { key: 'name', label: 'Campaign Name', required: true }, { key: 'type', label: 'Campaign Type', type: 'select', required: true, options: [{ value: 'old_guests', label: 'Old Guests' }, { value: 'festival_offer', label: 'Festival Offer' }, { value: 'weekend_offer', label: 'Weekend Offer' }, { value: 'birthday_offer', label: 'Birthday Offer' }] }, { key: 'message', label: 'Message', type: 'textarea', required: true }, { key: 'targetAudience', label: 'Target Audience' }, { key: 'scheduledAt', label: 'Scheduled At', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'running', label: 'Running' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }] } ]}
      columns={[ { key: 'name', header: 'Campaign' }, { key: 'type', header: 'Type', type: 'status' }, { key: 'status', header: 'Status', type: 'status' }, { key: 'scheduledAt', header: 'Scheduled', type: 'date' } ]}
    />
  );
}
