'use client';

import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { createReviews, deleteReviews, getReviews, updateReviews } from '@/services/reviews.service';

const statusOptions = undefined;

export default function Page() {
  return (
    <ModuleCrudPage
      title="Review Growth"
      subtitle="Capture guest feedback and prepare Google review growth workflows."
      searchPlaceholder="Search review growth..."
      list={getReviews}
      create={createReviews}
      update={updateReviews}
      remove={deleteReviews}
      statusOptions={statusOptions}
      comingSoon={'Review request sending, public guest form, Google routing, and reputation analytics are still pending.'}
      fields={[ { key: 'bookingId', label: 'Booking ID', required: true }, { key: 'guestId', label: 'Guest ID', required: true }, { key: 'rating', label: 'Rating', type: 'number', required: true }, { key: 'feedback', label: 'Feedback', type: 'textarea' }, { key: 'status', label: 'Status' } ]}
      columns={[ { key: 'rating', header: 'Rating' }, { key: 'feedback', header: 'Feedback' }, { key: 'status', header: 'Status', type: 'status' }, { key: 'createdAt', header: 'Created', type: 'date' } ]}
    />
  );
}
