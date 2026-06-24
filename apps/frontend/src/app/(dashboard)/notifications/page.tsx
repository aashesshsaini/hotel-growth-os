'use client';

import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { createNotification, deleteNotification, getNotifications, updateNotification } from '@/services/notifications.service';

const statusOptions = undefined;

export default function Page() {
  return (
    <ModuleCrudPage
      title="Notifications"
      subtitle="Create and review operational notifications."
      searchPlaceholder="Search notifications..."
      list={getNotifications}
      create={createNotification}
      update={updateNotification}
      remove={deleteNotification}
      statusOptions={statusOptions}
      comingSoon={'Mark-read endpoints and user notification center UX are still pending.'}
      fields={[ { key: 'title', label: 'Title', required: true }, { key: 'message', label: 'Message', type: 'textarea', required: true }, { key: 'type', label: 'Type', type: 'select', options: [{ value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }, { value: 'success', label: 'Success' }, { value: 'error', label: 'Error' }] }, { key: 'isRead', label: 'Read State', type: 'select', options: [{ value: 'true', label: 'Read' }, { value: 'false', label: 'Unread' }] } ]}
      columns={[ { key: 'title', header: 'Notification' }, { key: 'type', header: 'Type', type: 'status' }, { key: 'isRead', header: 'Read' }, { key: 'createdAt', header: 'Created', type: 'date' } ]}
    />
  );
}
