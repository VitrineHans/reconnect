import { useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Video as VideoCompressor } from 'react-native-compressor';
import { supabase } from '../lib/supabase';

export type UploadState = {
  progress: number;
  uploading: boolean;
  error: string | null;
};

async function compressVideo(uri: string): Promise<string> {
  return VideoCompressor.compress(uri, {
    compressionMethod: 'auto',
    maxSize: 1280,
  });
}

async function readAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: 'base64' as FileSystem.EncodingType,
  });
}

function uploadWithProgress(
  signedUrl: string,
  arrayBuffer: ArrayBuffer,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', 'video/mp4');
    xhr.setRequestHeader('x-upsert', 'false');
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
      const storagePath = `videos/${friendshipId}/${userId}/${questionId}.mp4`;
      const compressedUri = await compressVideo(localUri);
      const base64 = await readAsBase64(compressedUri);
      const arrayBuffer = decode(base64);

      const { data, error: urlError } = await supabase.storage
        .from('videos')
        .createSignedUploadUrl(storagePath);

      if (urlError || !data) {
        throw new Error(urlError?.message ?? 'Failed to get signed URL');
      }

      await uploadWithProgress(data.signedUrl, arrayBuffer, setProgress);
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
