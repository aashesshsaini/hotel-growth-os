'use client';

import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { createEventLeads, deleteEventLeads, getEventLeads, updateEventLeads } from '@/services/eventLeads.service';

const statusOptions = [{ value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' }, { value: 'quoted', label: 'Quoted' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'completed', label: 'Completed' }, { value: 'lost', label: 'Lost' }];

export default function Page() {
  return (
    <ModuleCrudPage
      title="Event Leads"
      subtitle="Manage weddings, banquets, events, quotes, and follow-ups."
      searchPlaceholder="Search event leads..."
      list={getEventLeads}
      create={createEventLeads}
      update={updateEventLeads}
      remove={deleteEventLeads}
      statusOptions={statusOptions}
      comingSoon={'Dedicated wedding/event pipeline, reminders, and quote-to-booking conversion are pending.'}
      fields={[ { key: 'eventName', label: 'Event Name', required: true }, { key: 'eventType', label: 'Event Type', required: true }, { key: 'contactPerson', label: 'Contact Person', required: true }, { key: 'phone', label: 'Phone', required: true }, { key: 'email', label: 'Email' }, { key: 'eventDate', label: 'Event Date', type: 'date', required: true }, { key: 'guestCount', label: 'Guest Count', type: 'number', required: true }, { key: 'packageName', label: 'Package' }, { key: 'packagePrice', label: 'Package Price', type: 'currency' }, { key: 'status', label: 'Status', type: 'select', options: [{ value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' }, { value: 'quoted', label: 'Quoted' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'completed', label: 'Completed' }, { value: 'lost', label: 'Lost' }] }, { key: 'followUpDate', label: 'Follow-up Date', type: 'date' }, { key: 'notes', label: 'Notes', type: 'textarea' } ]}
      columns={[ { key: 'eventName', header: 'Event' }, { key: 'eventType', header: 'Type' }, { key: 'contactPerson', header: 'Contact' }, { key: 'eventDate', header: 'Event Date', type: 'date' }, { key: 'status', header: 'Status', type: 'status' } ]}
    />
  );
}
