'use client';

import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { createWhatsapp, deleteWhatsapp, getWhatsapp, updateWhatsapp } from '@/services/whatsapp.service';

const statusOptions = [{ value: 'received', label: 'Received' }, { value: 'sent', label: 'Sent' }, { value: 'delivered', label: 'Delivered' }, { value: 'read', label: 'Read' }, { value: 'failed', label: 'Failed' }];

export default function Page() {
  return (
    <ModuleCrudPage
      title="WhatsApp Automation"
      subtitle="View and capture WhatsApp conversations while send/webhook automation is restored."
      searchPlaceholder="Search whatsapp automation..."
      list={getWhatsapp}
      create={createWhatsapp}
      update={updateWhatsapp}
      remove={deleteWhatsapp}
      statusOptions={statusOptions}
      comingSoon={'Meta webhook, send message, templates, broadcast campaigns, and auto-replies are not yet wired to WhatsApp Business API.'}
      fields={[ { key: 'phone', label: 'Phone', required: true }, { key: 'direction', label: 'Direction', type: 'select', required: true, options: [{ value: 'incoming', label: 'Incoming' }, { value: 'outgoing', label: 'Outgoing' }] }, { key: 'messageType', label: 'Message Type', type: 'select', options: [{ value: 'text', label: 'Text' }, { value: 'image', label: 'Image' }, { value: 'document', label: 'Document' }, { value: 'template', label: 'Template' }] }, { key: 'content', label: 'Content', type: 'textarea', required: true }, { key: 'status', label: 'Status', type: 'select', options: [{ value: 'received', label: 'Received' }, { value: 'sent', label: 'Sent' }, { value: 'delivered', label: 'Delivered' }, { value: 'read', label: 'Read' }, { value: 'failed', label: 'Failed' }] } ]}
      columns={[ { key: 'phone', header: 'Phone' }, { key: 'direction', header: 'Direction', type: 'status' }, { key: 'messageType', header: 'Type', type: 'status' }, { key: 'status', header: 'Status', type: 'status' }, { key: 'createdAt', header: 'Created', type: 'date' } ]}
    />
  );
}
