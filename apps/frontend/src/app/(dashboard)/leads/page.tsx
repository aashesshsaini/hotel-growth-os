'use client';

import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { createEnquiries, deleteEnquiries, getEnquiries, updateEnquiries } from '@/services/enquiries.service';

const statusOptions = [{ value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' }, { value: 'interested', label: 'Interested' }, { value: 'booked', label: 'Booked' }, { value: 'lost', label: 'Lost' }];

export default function Page() {
  return (
    <ModuleCrudPage
      title="Lead Center"
      subtitle="Unified lead inbox using the existing enquiries API as the first restored lead source."
      searchPlaceholder="Search lead center..."
      list={getEnquiries}
      create={createEnquiries}
      update={updateEnquiries}
      remove={deleteEnquiries}
      statusOptions={statusOptions}
      comingSoon={'Next restoration should merge enquiries, WhatsApp leads, website leads, corporate leads, and event leads into one pipeline view.'}
      fields={[ { key: 'guestName', label: 'Lead Name', required: true }, { key: 'phone', label: 'Phone', required: true }, { key: 'email', label: 'Email' }, { key: 'source', label: 'Source', type: 'select', options: [{ value: 'whatsapp', label: 'Whatsapp' }, { value: 'phone', label: 'Phone' }, { value: 'website', label: 'Website' }, { value: 'walk_in', label: 'Walk In' }, { value: 'instagram', label: 'Instagram' }, { value: 'facebook', label: 'Facebook' }] }, { key: 'status', label: 'Status', type: 'select', options: [{ value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' }, { value: 'interested', label: 'Interested' }, { value: 'booked', label: 'Booked' }, { value: 'lost', label: 'Lost' }] }, { key: 'budget', label: 'Budget', type: 'currency' }, { key: 'followUpDate', label: 'Follow-up Date', type: 'date' }, { key: 'notes', label: 'Notes', type: 'textarea' } ]}
      columns={[ { key: 'guestName', header: 'Lead' }, { key: 'phone', header: 'Phone' }, { key: 'source', header: 'Source', type: 'status' }, { key: 'status', header: 'Status', type: 'status' }, { key: 'budget', header: 'Budget', type: 'currency' } ]}
    />
  );
}
