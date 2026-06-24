'use client';

import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { createHotels, deleteHotels, getHotels, updateHotels } from '@/services/hotels.service';

const statusOptions = undefined;

export default function Page() {
  return (
    <ModuleCrudPage
      title="Hotel Management"
      subtitle="Manage hotels and multi-hotel records from one place."
      searchPlaceholder="Search hotel management..."
      list={getHotels}
      create={createHotels}
      update={updateHotels}
      remove={deleteHotels}
      statusOptions={statusOptions}
      comingSoon={'Hotel settings, super-admin hotel switcher, and x-hotel-id scoping UI are still pending.'}
      fields={[ { key: 'name', label: 'Hotel Name', required: true }, { key: 'slug', label: 'Slug' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' } ]}
      columns={[ { key: 'name', header: 'Hotel' }, { key: 'slug', header: 'Slug' }, { key: 'email', header: 'Email' }, { key: 'phone', header: 'Phone' }, { key: 'createdAt', header: 'Created', type: 'date' } ]}
    />
  );
}
