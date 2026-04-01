/**
 * Laedt alle Draft-Clips hoch und legt je eine Story-Zeile an.
 * Nutzt exportUri (flaches Foto nach Editor) falls gesetzt, sonst localUri.
 *
 * Phase C (optional): Video mit dynamischen Overlays = entweder Transcoding (FFmpeg)
 * oder zusaetzliche JSON-Spalte + spezieller Viewer – nicht Teil dieses Upload-Pfads.
 */
import { uploadStoryMedia } from './storageService';
import { createStory } from './storyService';

/**
 * @param {string} userId
 * @param {Array<{ id: string, localUri: string, kind: 'photo'|'video', mimeType: string, caption?: string|null, exportUri?: string|null }>} clips
 * @param {{ onClipDone?: (index: number, total: number) => void }} [opts]
 */
export async function publishStoryDrafts(userId, clips, opts = {}) {
  const { onClipDone } = opts;
  const total = clips.length;
  for (let i = 0; i < total; i++) {
    const c = clips[i];
    const uri = c.exportUri || c.localUri;
    const mime = c.mimeType || (c.kind === 'video' ? 'video/mp4' : 'image/jpeg');
    const publicUrl = await uploadStoryMedia(userId, uri, mime);
    await createStory(userId, publicUrl, c.kind === 'video' ? 'video' : 'image', c.caption);
    onClipDone?.(i + 1, total);
  }
}
