'use client';

import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { createCorporateLeads, deleteCorporateLeads, getCorporateLeads, updateCorporateLeads } from '@/services/corporateLeads.service';

const statusOptions = [{ value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' }, { value: 'negotiating', label: 'Negotiating' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'lost', label: 'Lost' }];

export default function Page() {
  return (
    <ModuleCrudPage
      title="Corporate Leads"
      subtitle="Track company enquiries, room blocks, negotiated value, and follow-ups."
      searchPlaceholder="Search corporate leads..."
      list={getCorporateLeads}
      create={createCorporateLeads}
      update={updateCorporateLeads}
      remove={deleteCorporateLeads}
      statusOptions={statusOptions}
      comingSoon={'Account-level corporate CRM, negotiated contracts, and follow-up automation are still pending.'}
      fields={[ { key: 'companyName', label: 'Company Name', required: true }, { key: 'contactPerson', label: 'Contact Person', required: true }, { key: 'phone', label: 'Phone', required: true }, { key: 'email', label: 'Email' }, { key: 'estimatedRooms', label: 'Estimated Rooms', type: 'number' }, { key: 'estimatedGuests', label: 'Estimated Guests', type: 'number' }, { key: 'totalValue', label: 'Total Value', type: 'currency' }, { key: 'status', label: 'Status', type: 'select', options: [{ value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' }, { value: 'negotiating', label: 'Negotiating' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'lost', label: 'Lost' }] }, { key: 'followUpDate', label: 'Follow-up Date', type: 'date' }, { key: 'requirements', label: 'Requirements', type: 'textarea' }, { key: 'notes', label: 'Notes', type: 'textarea' } ]}
      columns={[ { key: 'companyName', header: 'Company' }, { key: 'contactPerson', header: 'Contact' }, { key: 'phone', header: 'Phone' }, { key: 'status', header: 'Status', type: 'status' }, { key: 'totalValue', header: 'Value', type: 'currency' } ]}
    />
  );
}
