import { useState } from 'react';
import { supabase } from '../lib/supabase';

export type UploadState = {
  progress: number;
  uploading: boolean;
  error: string | null;
};

async function getArrayBuffer(uri: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  // Works for both blob: URLs (web) and file:// URIs (native).
  // React Native's fetch implementation handles file:// URIs natively.
  const response = await fetch(uri);
  const buffer = await response.arrayBuffer();

  // Web blob URLs carry the real MIME type from the MediaRecorder.
  // Native file:// URIs report application/octet-stream — always upload as
  // video/mp4 so browsers can play back iOS .mov recordings (H.264 codec is
  // compatible; only the container name differs).
  const headerType = response.headers.get('content-type') ?? '';
  const isWebBlob = uri.startsWith('blob:');
  if (isWebBlob && headerType && !headerType.includes('octet-stream')) {
    return { buffer, contentType: headerType };
  }
  return { buffer, contentType: 'video/mp4' };
}

function uploadWithProgress(
  signedUrl: string,
  arrayBuffer: ArrayBuffer,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(String(xhr.status)));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(arrayBuffer);
  });
}

export function useVideoUpload(): UploadState & {
  upload: (
    friendshipId: string,
    userId: string,
    questionId: string,
    localUri: string,
  ) => Promise<string>;
} {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(
    friendshipId: string,
    userId: string,
    questionId: string,
    localUri: string,
  ): Promise<string> {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const { buffer, contentType } = await getArrayBuffer(localUri);
      const ext = contentType.includes('webm') ? 'webm' : 'mp4';
      const storagePath = `videos/${friendshipId}/${userId}/${questionId}.${ext}`;

      const { data, error: urlError } = await supabase.storage
        .from('videos')
        .createSignedUploadUrl(storagePath, { upsert: true });

      if (urlError || !data) {
        throw new Error(urlError?.message ?? 'Failed to get signed URL');
      }

      await uploadWithProgress(data.signedUrl, buffer, contentType, setProgress);
      setProgress(100);
      return storagePath;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload failed';
      setError(message);
      throw e;
    } finally {
      setUploading(false);
    }
  }

  return { progress, uploading, error, upload };
}
