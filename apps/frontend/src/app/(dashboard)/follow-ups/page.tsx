'use client';

import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { createTask, deleteTask, getTasks, updateTask } from '@/services/tasks.service';

const statusOptions = [{ value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }];

export default function Page() {
  return (
    <ModuleCrudPage
      title="Follow-ups"
      subtitle="Track sales, enquiry, guest, and payment follow-ups using the existing Tasks API."
      searchPlaceholder="Search follow-ups..."
      list={getTasks}
      create={createTask}
      update={updateTask}
      remove={deleteTask}
      statusOptions={statusOptions}
      comingSoon={'Entity-linked reminders, automated WhatsApp follow-up sequences, and overdue dashboards are still backend gaps.'}
      fields={[ { key: 'title', label: 'Follow-up Title', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'priority', label: 'Priority', type: 'select', options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }] }, { key: 'status', label: 'Status', type: 'select', options: [{ value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }] }, { key: 'dueDate', label: 'Due Date', type: 'date' } ]}
      columns={[ { key: 'title', header: 'Follow-up' }, { key: 'priority', header: 'Priority', type: 'status' }, { key: 'status', header: 'Status', type: 'status' }, { key: 'dueDate', header: 'Due', type: 'date' } ]}
    />
  );
}
