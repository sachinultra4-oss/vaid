import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  FolderUp,
  Leaf,
  RotateCcw,
  Save,
  Upload,
} from 'lucide-react';
import type { PhotoSlotRecord } from '../types/clinic';
import { adminFetch } from './adminApi';

const MAX_BYTES = 10 * 1024 * 1024;

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

function resizeToWebP(img: HTMLImageElement, targetWidth: number): string {
  const scale = img.naturalWidth > targetWidth ? targetWidth / img.naturalWidth : 1;
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/webp', 0.86);
}

async function processUploadVariants(file: File) {
  if (file.size > MAX_BYTES) {
    throw new Error(`"${file.name}" exceeds 10 MB limit.`);
  }
  const original = await readAsDataURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`"${file.name}" is not a valid image.`));
    img.src = original;
  });

  return {
    original,
    w480: resizeToWebP(img, 480),
    w960: resizeToWebP(img, 960),
    w1920: resizeToWebP(img, 1920),
  };
}

export function PhotosManager({
  token,
  photos,
  onUpdated,
  onPublicRefresh,
}: {
  token: string;
  photos: PhotoSlotRecord[];
  onUpdated: (next: PhotoSlotRecord[]) => void;
  onPublicRefresh: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'live' | 'missing' | 'needs_alt'>('all');
  const [editingSlot, setEditingSlot] = useState<PhotoSlotRecord | null>(null);
  const [altText, setAltText] = useState('');
  const [focalX, setFocalX] = useState(50);
  const [focalY, setFocalY] = useState(50);
  const [hasFace, setHasFace] = useState(false);
  const [consentGiven, setConsentGiven] = useState(true);
  const [isPublished, setIsPublished] = useState(true);
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const openEditor = (slot: PhotoSlotRecord) => {
    setEditingSlot(slot);
    setAltText(slot.alt_text);
    setFocalX(slot.focal_x);
    setFocalY(slot.focal_y);
    setHasFace(slot.has_patient_face);
    setConsentGiven(slot.consent_given);
    setIsPublished(slot.is_published);
    setErrorMsg('');
    setStatusMsg('');
  };

  const uploadFileToSlot = async (
    slot: PhotoSlotRecord,
    file: File,
    overrides?: { alt_text?: string; focal_x?: number; focal_y?: number; has_patient_face?: boolean; consent_given?: boolean; is_published?: boolean }
  ) => {
    setErrorMsg('');
    setStatusMsg('');
    setBusySlot(slot.slot_id);
    try {
      const variants = await processUploadVariants(file);
      const data = await adminFetch<{ photo: PhotoSlotRecord; blockedByConsent?: boolean }>(
        `/api/admin/photos/${slot.slot_id}/upload`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            ...variants,
            alt_text: overrides?.alt_text ?? slot.alt_text,
            focal_x: overrides?.focal_x ?? slot.focal_x,
            focal_y: overrides?.focal_y ?? slot.focal_y,
            has_patient_face: overrides?.has_patient_face ?? slot.has_patient_face,
            consent_given: overrides?.consent_given ?? slot.consent_given,
            is_published: overrides?.is_published ?? true,
          }),
        }
      );
      const nextList = photos.map((p) => (p.slot_id === slot.slot_id ? data.photo : p));
      onUpdated(nextList);
      onPublicRefresh();
      if (editingSlot?.slot_id === slot.slot_id) {
        openEditor(data.photo);
      }
      setStatusMsg(
        data.blockedByConsent
          ? `Uploaded ${slot.slot_id}, kept unpublished until patient consent is ticked.`
          : `Converted to WebP (480 / 960 / 1920) and published live to ${slot.slot_id}.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusySlot(null);
    }
  };

  const handleBulkUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg('');
    setStatusMsg('');
    const arr = Array.from(files);
    let updatedList = [...photos];
    let matchedCount = 0;

    for (const file of arr) {
      const base = file.name.replace(/\.[^.]+$/, '').toLowerCase();
      const target =
        updatedList.find((p) => p.slot_id.toLowerCase() === base) ||
        updatedList.find((p) => !p.url);
      if (!target) continue;

      setBusySlot(target.slot_id);
      try {
        const variants = await processUploadVariants(file);
        const data = await adminFetch<{ photo: PhotoSlotRecord }>(
          `/api/admin/photos/${target.slot_id}/upload`,
          token,
          {
            method: 'POST',
            body: JSON.stringify({
              ...variants,
              alt_text: target.alt_text,
              focal_x: target.focal_x,
              focal_y: target.focal_y,
              has_patient_face: false,
              consent_given: true,
              is_published: true,
            }),
          }
        );
        updatedList = updatedList.map((p) => (p.slot_id === target.slot_id ? data.photo : p));
        matchedCount += 1;
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Bulk upload error');
      }
    }

    setBusySlot(null);
    onUpdated(updatedList);
    onPublicRefresh();
    setStatusMsg(`Bulk upload complete: ${matchedCount} photo(s) converted to WebP and placed in slots.`);
  };

  const saveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    setErrorMsg('');
    setStatusMsg('');
    try {
      const data = await adminFetch<{ photo: PhotoSlotRecord }>(
        `/api/admin/photos/${editingSlot.slot_id}`,
        token,
        {
          method: 'PATCH',
          body: JSON.stringify({
            alt_text: altText,
            focal_x: focalX,
            focal_y: focalY,
            has_patient_face: hasFace,
            consent_given: consentGiven,
            is_published: isPublished,
          }),
        }
      );
      onUpdated(photos.map((p) => (p.slot_id === editingSlot.slot_id ? data.photo : p)));
      openEditor(data.photo);
      onPublicRefresh();
      setStatusMsg(`Saved settings for ${editingSlot.slot_id}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed.');
    }
  };

  const undoSlot = async (slotId: string) => {
    setErrorMsg('');
    try {
      const data = await adminFetch<{ photo: PhotoSlotRecord }>(
        `/api/admin/photos/${slotId}/undo`,
        token,
        { method: 'POST' }
      );
      onUpdated(photos.map((p) => (p.slot_id === slotId ? data.photo : p)));
      if (editingSlot?.slot_id === slotId) openEditor(data.photo);
      onPublicRefresh();
      setStatusMsg(`Reverted last change on ${slotId}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Nothing to undo.');
    }
  };

  const filtered = photos.filter((p) => {
    if (filter === 'missing') return !p.url;
    if (filter === 'needs_alt') return Boolean(p.url) && !p.alt_text.trim();
    if (filter === 'live') return Boolean(p.url) && p.is_published && (!p.has_patient_face || p.consent_given);
    return true;
  });

  const missingCount = photos.filter((p) => !p.url).length;
  const needsAltCount = photos.filter((p) => p.url && !p.alt_text.trim()).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif t-28 font-medium">Photos & Slots</h2>
          <p className="t-14 text-[#12201A]/75">
            Max 10 MB per photo. Automatically converts to WebP (480, 960, 1920px) + keeps original.
          </p>
        </div>

        <label className="btn-primary cursor-pointer shrink-0">
          <FolderUp className="w-4 h-4" aria-hidden="true" />
          <span>Bulk Upload Photos</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => handleBulkUpload(e.target.files)}
          />
        </label>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: `All Slots (${photos.length})` },
          { id: 'live', label: `Live (${photos.length - missingCount})` },
          { id: 'missing', label: `Missing (${missingCount})` },
          { id: 'needs_alt', label: `Needs Alt Text (${needsAltCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as typeof filter)}
            className={`px-4 py-2 min-h-[40px] rounded-full text-sm font-bold border cursor-pointer ${
              filter === tab.id
                ? 'bg-[#0E3B26] text-[#F4EFE2] border-[#0E3B26]'
                : 'bg-[#FAF7EF] text-[#12201A] border-[#12201A]/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div role="alert" className="p-3.5 rounded-xl bg-[#C46A3C]/15 border border-[#C46A3C] t-14 font-bold">
          {errorMsg}
        </div>
      )}
      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-[#3E7A4A]/15 border border-[#3E7A4A] t-14 font-bold text-[#0E3B26]">
          {statusMsg}
        </div>
      )}

      {/* Editor Panel when a slot is selected */}
      {editingSlot && (
        <div className="clinic-card p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-serif t-20 font-medium">{editingSlot.slot_id}</span>
              <span className="t-14 text-[#12201A]/70">
                {editingSlot.target_width}×{editingSlot.target_height}
              </span>
            </div>

            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                setFocalX(Math.min(100, Math.max(0, x)));
                setFocalY(Math.min(100, Math.max(0, y)));
              }}
              title="Click anywhere on image to set focal point"
              className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#E5DEC9] border border-[#12201A]/20 cursor-crosshair"
            >
              {editingSlot.url ? (
                <img
                  src={editingSlot.url}
                  alt={editingSlot.alt_text || editingSlot.label}
                  style={{ objectPosition: `${focalX}% ${focalY}%` }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#0E3B26]/40">
                  <Leaf className="w-10 h-10" />
                </div>
              )}
              <div
                style={{ left: `${focalX}%`, top: `${focalY}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-[#C46A3C] bg-[#FAF7EF]/75 flex items-center justify-center pointer-events-none"
              >
                <Crosshair className="w-3.5 h-3.5 text-[#C46A3C]" />
              </div>
            </div>
            <p className="t-14 text-[#12201A]/70">
              Click photo above to adjust focal crop ({focalX}% × {focalY}%).
            </p>
          </div>

          <form onSubmit={saveMetadata} className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold t-16">{editingSlot.label}</p>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="t-14 font-bold underline cursor-pointer"
              >
                Close editor
              </button>
            </div>

            <div>
              <label className="block t-14 font-bold mb-1">
                Alt Text (required for accessibility)
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe what is clearly visible in this clinic photograph"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45"
              />
              {!altText.trim() && (
                <p className="t-14 text-[#C46A3C] font-bold mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Warning: Alt text is empty.</span>
                </p>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 t-14 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasFace}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasFace(checked);
                    if (checked && !consentGiven) setIsPublished(false);
                  }}
                  className="w-4 h-4 accent-[#0E3B26]"
                />
                <span>Photo shows a patient’s face</span>
              </label>

              {hasFace && (
                <label className="flex items-center gap-2.5 t-14 font-bold text-[#0E3B26] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="w-4 h-4 accent-[#0E3B26]"
                  />
                  <span>Patient written/verbal consent given (required before publishing)</span>
                </label>
              )}

              <label className="flex items-center gap-2.5 t-14 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  disabled={hasFace && !consentGiven}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-[#0E3B26]"
                />
                <span>Published live on website</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button type="submit" className="btn-primary">
                <Save className="w-4 h-4" />
                <span>Save Slot Details</span>
              </button>

              <label className="btn-secondary cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{busySlot === editingSlot.slot_id ? 'Processing WebP...' : 'Replace Photo'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      uploadFileToSlot(editingSlot, f, {
                        alt_text: altText,
                        focal_x: focalX,
                        focal_y: focalY,
                        has_patient_face: hasFace,
                        consent_given: consentGiven,
                        is_published: isPublished,
                      });
                    }
                  }}
                />
              </label>

              {editingSlot.previous_snapshot && (
                <button
                  type="button"
                  onClick={() => undoSlot(editingSlot.slot_id)}
                  className="btn-secondary"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Undo Last Change</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Slot Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((slot) => {
          const isMissing = !slot.url;
          const missingAlt = Boolean(slot.url) && !slot.alt_text.trim();
          const isStandIn = slot.is_standin;

          return (
            <div
              key={slot.slot_id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) uploadFileToSlot(slot, f);
              }}
              className="clinic-card flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[4/3] bg-[#E5DEC9] overflow-hidden">
                  {slot.url ? (
                    <img
                      src={slot.url}
                      alt={slot.alt_text || slot.label}
                      style={{ objectPosition: `${slot.focal_x}% ${slot.focal_y}%` }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#0E3B26]/45 gap-1">
                      <Leaf className="w-8 h-8" />
                      <span className="text-xs font-bold">Drop photo here</span>
                    </div>
                  )}

                  <span
                    className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      isMissing
                        ? 'bg-[#C46A3C] text-[#F4EFE2]'
                        : isStandIn
                        ? 'bg-[#C9A24B] text-[#12201A]'
                        : 'bg-[#0E3B26] text-[#F4EFE2]'
                    }`}
                  >
                    {isMissing ? 'Missing' : isStandIn ? 'Stand-in' : 'Live'}
                  </span>
                </div>

                <div className="p-4 space-y-1">
                  <p className="font-bold t-14 text-[#12201A]">{slot.slot_id}</p>
                  <p className="text-xs text-[#12201A]/75">{slot.label}</p>
                  {missingAlt && (
                    <p className="text-xs font-bold text-[#C46A3C] flex items-center gap-1 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Needs alt text
                    </p>
                  )}
                  {!isMissing && !missingAlt && (
                    <p className="text-xs text-[#3E7A4A] flex items-center gap-1 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {slot.has_patient_face ? (slot.consent_given ? 'Consent verified' : 'Consent needed') : 'Ready'}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-4 pb-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditor(slot)}
                  className="flex-1 min-h-[38px] px-3 rounded-full border border-[#12201A]/25 text-xs font-bold hover:bg-[#12201A]/5 cursor-pointer"
                >
                  Edit / Crop
                </button>
                <label className="min-h-[38px] px-3 rounded-full bg-[#0E3B26] text-[#F4EFE2] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{busySlot === slot.slot_id ? '...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFileToSlot(slot, f);
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
