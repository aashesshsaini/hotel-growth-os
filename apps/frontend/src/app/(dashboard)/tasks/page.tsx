'use client';

import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { createTask, deleteTask, getTasks, updateTask } from '@/services/tasks.service';

const statusOptions = [{ value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }];

export default function Page() {
  return (
    <ModuleCrudPage
      title="Tasks"
      subtitle="Operational and growth tasks for staff follow-through."
      searchPlaceholder="Search tasks..."
      list={getTasks}
      create={createTask}
      update={updateTask}
      remove={deleteTask}
      statusOptions={statusOptions}
      comingSoon={'Staff assignment and related entity linking exist in the model but are not fully exposed in the current scaffold.'}
      fields={[ { key: 'title', label: 'Task Title', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'priority', label: 'Priority', type: 'select', options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }] }, { key: 'status', label: 'Status', type: 'select', options: [{ value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }] }, { key: 'dueDate', label: 'Due Date', type: 'date' } ]}
      columns={[ { key: 'title', header: 'Task' }, { key: 'priority', header: 'Priority', type: 'status' }, { key: 'status', header: 'Status', type: 'status' }, { key: 'dueDate', header: 'Due', type: 'date' } ]}
    />
  );
}
