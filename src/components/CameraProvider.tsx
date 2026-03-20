import React, { createContext, useContext, useRef, useEffect, useState } from 'react';

interface CameraContextType {
  captureSnapshot: () => Promise<string | undefined>;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const useCamera = () => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCamera must be used within a CameraProvider');
  }
  return context;
};

export const CameraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // We don't initialize automatically anymore to avoid "Permission denied" on load
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const initCamera = async () => {
    if (stream) return stream;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      return mediaStream;
    } catch (err) {
      console.warn('Camera access denied or not available:', err);
      return null;
    }
  };

  const captureSnapshot = async (): Promise<string | undefined> => {
    const activeStream = await initCamera();
    if (!videoRef.current || !canvasRef.current || !activeStream) return undefined;

    const video = videoRef.current;
    
    // Ensure video is playing
    try {
      await video.play();
    } catch (e) {
      console.warn('Video play failed:', e);
    }

    // Wait for video to be ready and have dimensions
    let attempts = 0;
    while ((video.readyState < 2 || video.videoWidth === 0) && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (video.videoWidth === 0) return undefined;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return undefined;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.6);
  };

  return (
    <CameraContext.Provider value={{ captureSnapshot }}>
      {children}
      <div style={{ position: 'fixed', top: -1000, left: -1000, opacity: 0, pointerEvents: 'none' }}>
        <video ref={videoRef} autoPlay playsInline muted />
        <canvas ref={canvasRef} />
      </div>
    </CameraContext.Provider>
  );
};
