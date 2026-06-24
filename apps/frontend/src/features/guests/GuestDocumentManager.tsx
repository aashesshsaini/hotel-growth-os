'use client';

import { Trash2, Upload } from 'lucide-react';
import { FormInput } from '@/components/FormInput';
import type { Guest, GuestDocument } from '@/types';
import { formatDateTime } from '@/utils/format';
import { getEntityId } from '@/types';

interface GuestDocumentManagerProps {
  guest: Guest;
  canManage: boolean;
  onUpload: (url: string, documentType: string) => Promise<void>;
  onRemove: (documentId: string) => Promise<void>;
  isUploading?: boolean;
}

export const GuestDocumentManager = ({
  guest,
  canManage,
  onUpload,
  onRemove,
  isUploading,
}: GuestDocumentManagerProps) => {
  const docs = guest.idProofImages ?? [];

  const handleUpload = async () => {
    const url = window.prompt('Enter document URL (placeholder upload):');
    if (!url) return;
    const documentType = window.prompt('Document type (e.g. aadhaar, passport):') || 'id_proof';
    await onUpload(url, documentType);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Documents</h4>
        {canManage && (
          <button type="button" className="btn-secondary text-sm" onClick={() => void handleUpload()} disabled={isUploading}>
            <Upload className="mr-1 h-4 w-4" /> Upload
          </button>
        )}
      </div>
      {docs.length === 0 ? (
        <p className="text-sm text-slate-500">No documents uploaded.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc: GuestDocument) => (
            <div key={getEntityId(doc as { _id?: string; id?: string })} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
              <div>
                <div className="font-medium">{doc.documentType ?? 'Document'}</div>
                <a href={doc.url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">{doc.url}</a>
                <div className="text-xs text-slate-400">{formatDateTime(doc.uploadedAt)}</div>
              </div>
              {canManage && (
                <button type="button" className="text-red-600 hover:text-red-700" onClick={() => void onRemove(getEntityId(doc as { _id?: string; id?: string }))}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {canManage && (
        <FormInput label="Quick upload URL" placeholder="https://..." onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const input = e.currentTarget;
            if (input.value) void onUpload(input.value, 'id_proof').then(() => { input.value = ''; });
          }
        }} />
      )}
    </div>
  );
};
