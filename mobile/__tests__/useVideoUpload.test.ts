// Covers VIDEO-03, VIDEO-04, VIDEO-05

// --- XHR mock (must be before imports) ---
type XHRInstance = {
  open: jest.Mock;
  setRequestHeader: jest.Mock;
  send: jest.Mock;
  upload: { onprogress: ((e: ProgressEvent) => void) | null };
  onload: (() => void) | null;
  onerror: (() => void) | null;
  status: number;
};

let xhrInstance: XHRInstance;

class MockXMLHttpRequest {
  open = jest.fn();
  setRequestHeader = jest.fn();
  send = jest.fn();
  upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  status = 200;

  constructor() {
    xhrInstance = this as unknown as XHRInstance;
  }
}

(global as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = MockXMLHttpRequest;

// --- Module mocks ---

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64string'),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('base64-arraybuffer', () => ({
  decode: jest.fn().mockReturnValue(new ArrayBuffer(8)),
}));

jest.mock('react-native-compressor', () => ({
  Video: {
    compress: jest.fn().mockImplementation((uri: string) => Promise.resolve(uri)),
  },
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUploadUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.example.com/signed', token: 'tok' },
          error: null,
        }),
      }),
    },
  },
}));

import { renderHook, act } from '@testing-library/react-native';
import { useVideoUpload } from '../hooks/useVideoUpload';

/** Flush all pending microtasks */
const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// --- Tests ---

describe('useVideoUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('VIDEO-03: upload() resolves with correct storage path', async () => {
    const { result } = renderHook(() => useVideoUpload());

    let storagePath: string | undefined;
    await act(async () => {
      const uploadPromise = result.current.upload(
        'friendship-1',
        'user-1',
        'question-1',
        'file:///video.mp4',
      );
      // Flush pending microtasks so XHR is created and onload is assigned
      await flushMicrotasks();
      // Simulate XHR success
      if (xhrInstance?.onload) xhrInstance.onload();
      storagePath = await uploadPromise;
    });

    expect(storagePath).toBe('videos/friendship-1/user-1/question-1.mp4');
  });

  it('VIDEO-05: progress updates when XHR onprogress fires', async () => {
    const { result } = renderHook(() => useVideoUpload());

    // Start upload — don't await yet
    let uploadPromise: Promise<string>;
    await act(async () => {
      uploadPromise = result.current.upload(
        'friendship-1',
        'user-1',
        'question-1',
        'file:///video.mp4',
      );
      // Flush microtasks so XHR is created and handlers are attached
      await flushMicrotasks();
    });

    // Fire progress at 50% inside its own act so React can flush state
    await act(async () => {
      if (xhrInstance?.upload.onprogress) {
        xhrInstance.upload.onprogress({
          lengthComputable: true,
          loaded: 50,
          total: 100,
        } as ProgressEvent);
      }
    });

    // Progress should be 50 now (upload still in flight)
    expect(result.current.progress).toBe(50);

    // Complete the upload
    await act(async () => {
      if (xhrInstance?.onload) xhrInstance.onload();
      await uploadPromise;
    });
  });

  it('VIDEO-03: upload() rejects when XHR returns status 500', async () => {
    const { result } = renderHook(() => useVideoUpload());

    let rejected: boolean = false;
    await act(async () => {
      const uploadPromise = result.current.upload(
        'friendship-1',
        'user-1',
        'question-1',
        'file:///video.mp4',
      );
      await flushMicrotasks();

      xhrInstance.status = 500;
      if (xhrInstance?.onload) xhrInstance.onload();

      try {
        await uploadPromise;
      } catch (e) {
        rejected = true;
        expect((e as Error).message).toBe('500');
      }
    });

    expect(rejected).toBe(true);
  });
});
