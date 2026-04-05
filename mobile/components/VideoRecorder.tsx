import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';

type RecordingState = 'idle' | 'recording' | 'preview';

type Props = {
  onVideoReady: (uri: string) => void;
  onCancel: () => void;
};

export function VideoRecorder({ onVideoReady, onCancel }: Props) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [timeLeft, setTimeLeft] = useState(30);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (recordingState !== 'recording') return;
    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [recordingState]);

  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera and microphone access required.</Text>
        {!cameraPermission?.granted && (
          <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
            <Text style={styles.buttonText}>Allow Camera</Text>
          </TouchableOpacity>
        )}
        {!micPermission?.granted && (
          <TouchableOpacity style={styles.button} onPress={requestMicPermission}>
            <Text style={styles.buttonText}>Allow Microphone</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleRecord() {
    if (!cameraRef.current) return;
    setRecordingState('recording');
    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: 30 });
      if (result?.uri) {
        setVideoUri(result.uri);
        setRecordingState('preview');
      }
    } catch {
      setRecordingState('idle');
    }
  }

  function handleStop() {
    cameraRef.current?.stopRecording();
  }

  function handleReRecord() {
    setVideoUri(null);
    setRecordingState('idle');
  }

  function handleSubmit() {
    if (videoUri) onVideoReady(videoUri);
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} mode="video" facing="front" />

      {recordingState === 'recording' && (
        <View style={styles.timerContainer}>
          <Text style={styles.timer}>
            0:{timeLeft.toString().padStart(2, '0')}
          </Text>
        </View>
      )}

      <View style={styles.controls}>
        {recordingState === 'idle' && (
          <>
            <TouchableOpacity style={styles.button} onPress={handleRecord}>
              <Text style={styles.buttonText}>Record</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {recordingState === 'recording' && (
          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        )}

        {recordingState === 'preview' && (
          <>
            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleReRecord}>
              <Text style={styles.cancelText}>Re-record</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  permissionText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  timerContainer: { position: 'absolute', top: 60, alignSelf: 'center' },
  timer: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  controls: {
    position: 'absolute',
    bottom: 48,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    backgroundColor: '#6B4EFF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 32,
  },
  stopButton: {
    backgroundColor: '#FF4E4E',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 32,
  },
  cancelButton: { paddingVertical: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelText: { color: '#aaa', fontSize: 16 },
});
