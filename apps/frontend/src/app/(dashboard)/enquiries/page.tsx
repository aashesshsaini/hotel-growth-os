'use client';

import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { createEnquiries, deleteEnquiries, getEnquiries, updateEnquiries } from '@/services/enquiries.service';

const statusOptions = [{ value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' }, { value: 'interested', label: 'Interested' }, { value: 'booked', label: 'Booked' }, { value: 'lost', label: 'Lost' }];

export default function Page() {
  return (
    <ModuleCrudPage
      title="Enquiries"
      subtitle="Manage website, phone, walk-in, and social leads."
      searchPlaceholder="Search enquiries..."
      list={getEnquiries}
      create={createEnquiries}
      update={updateEnquiries}
      remove={deleteEnquiries}
      statusOptions={statusOptions}
      comingSoon={'Assignment, follow-up reminders, conversion pipeline, and nurturing automation need backend route restoration.'}
      fields={[ { key: 'guestName', label: 'Guest Name', required: true }, { key: 'phone', label: 'Phone', required: true }, { key: 'email', label: 'Email' }, { key: 'source', label: 'Source', type: 'select', options: [{ value: 'whatsapp', label: 'Whatsapp' }, { value: 'phone', label: 'Phone' }, { value: 'website', label: 'Website' }, { value: 'walk_in', label: 'Walk In' }, { value: 'instagram', label: 'Instagram' }, { value: 'facebook', label: 'Facebook' }] }, { key: 'status', label: 'Status', type: 'select', options: [{ value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' }, { value: 'interested', label: 'Interested' }, { value: 'booked', label: 'Booked' }, { value: 'lost', label: 'Lost' }] }, { key: 'checkInDate', label: 'Check In', type: 'date' }, { key: 'checkOutDate', label: 'Check Out', type: 'date' }, { key: 'budget', label: 'Budget', type: 'currency' }, { key: 'notes', label: 'Notes', type: 'textarea' } ]}
      columns={[ { key: 'guestName', header: 'Lead' }, { key: 'phone', header: 'Phone' }, { key: 'source', header: 'Source', type: 'status' }, { key: 'status', header: 'Status', type: 'status' }, { key: 'followUpDate', header: 'Follow-up', type: 'date' } ]}
    />
  );
}
