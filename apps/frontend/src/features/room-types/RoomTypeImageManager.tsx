'use client';

import { Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FormInput } from '@/components/FormInput';
import type { RoomType, RoomTypeImage } from '@/types';
import { getEntityId } from '@/types';

interface RoomTypeImageManagerProps {
  roomType: RoomType;
  canManage: boolean;
  isUploading: boolean;
  onUpload: (url: string, altText: string, setAsCover: boolean) => Promise<void>;
  onRemove: (imageId: string) => Promise<void>;
  onSetCover: (url: string) => Promise<void>;
}

export const RoomTypeImageManager = ({
  roomType,
  canManage,
  isUploading,
  onUpload,
  onRemove,
  onSetCover,
}: RoomTypeImageManagerProps) => {
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [setAsCover, setSetAsCover] = useState(false);

  const images = roomType.images ?? [];

  const handleUpload = async () => {
    if (!imageUrl.trim()) return;
    await onUpload(imageUrl.trim(), altText.trim() || roomType.name, setAsCover);
    setImageUrl('');
    setAltText('');
    setSetAsCover(false);
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="rounded-lg border border-dashed border-slate-300 p-4">
          <p className="mb-3 text-sm text-slate-600">Add image URL (placeholder upload — connect Cloudinary/S3 later)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            <FormInput label="Alt Text" value={altText} onChange={(e) => setAltText(e.target.value)} />
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={setAsCover} onChange={(e) => setSetAsCover(e.target.checked)} className="rounded border-slate-300" />
            Set as cover image
          </label>
          <button type="button" className="btn-primary mt-3" onClick={() => void handleUpload()} disabled={isUploading || !imageUrl.trim()}>
            {isUploading ? 'Uploading...' : 'Add Image'}
          </button>
        </div>
      )}

      {images.length === 0 ? (
        <p className="text-sm text-slate-500">No images uploaded yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img: RoomTypeImage) => (
            <div key={img._id || img.url} className="group relative overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.altText || roomType.name} className="h-40 w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="truncate text-xs text-white">{img.altText || 'Room image'}</p>
                {roomType.coverImage === img.url && (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-300">
                    <Star className="h-3 w-3 fill-current" /> Cover
                  </span>
                )}
              </div>
              {canManage && img._id && (
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  {roomType.coverImage !== img.url && (
                    <button type="button" className="rounded bg-white/90 p-1.5 text-slate-700 hover:bg-white" onClick={() => void onSetCover(img.url)} title="Set as cover">
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button type="button" className="rounded bg-white/90 p-1.5 text-red-600 hover:bg-white" onClick={() => void onRemove(getEntityId(img))} title="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
