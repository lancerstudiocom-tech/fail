import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, RefreshCw, Plus, AlertTriangle } from 'lucide-react';
import { Button } from './ClayUI';
import { scanReceiptLocal } from '../services/ocrService';
import { detectColorLine } from '../services/geminiService'; // Keeping color detection as is

interface CameraStreamScannerProps {
  onResult: (data: any) => void;
  onClose: () => void;
  isScanning: boolean;
  title?: string;
  subtitle?: string;
  type?: 'student' | 'customer' | 'unknown';
}

export const CameraStreamScanner: React.FC<CameraStreamScannerProps> = ({ 
  onResult, 
  onClose, 
  isScanning,
  title = 'Direct Stream Analysis Active',
  subtitle = 'Align receipt or upload image',
  type = 'unknown'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      try {
        const result = await scanReceiptLocal(base64);
        if (result) {
          onResult(result);
        }
      } catch (err) {
        console.error("Upload scan error:", err);
        setError("Failed to process uploaded image.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Could not access camera. Please check permissions.");
      }
    }
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!scanIntervalRef.current) {
      // Direct Stream Analysis: Scan every 3 seconds for text
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current || isScanning || !streamRef.current) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Local Pixel Detection for categorization (Zero Latency)
        const category = detectColorLine(imageData.data);
      // console.log("Local Category Detection:", category);

        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

        try {
          onResult({ isScanning: true }); // Signal scanning start
          const result = await scanReceiptLocal(base64);
          
          // Kill OCR Loop once we have core data
          if (result && (result.name || result.totalAmount)) {
            onResult(result);
            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current);
              scanIntervalRef.current = null;
            }
          }
        } catch (err) {
          console.error("Stream scan error:", err);
        } finally {
          onResult({ isScanning: false }); // Signal scanning end
        }
      }, 3000);
    }
  }, [isScanning, onResult, type]);

  return (
    <div className="absolute inset-0 z-[120] bg-black flex flex-col items-center justify-center">
      {error ? (
        <div className="text-white text-center p-6">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-error" />
          <p>{error}</p>
          <Button onClick={onClose} variant="secondary" className="mt-4">Close</Button>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Scanning Overlay */}
          <div className="absolute inset-0 border-[2px] border-primary/30 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/50 rounded-3xl">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
              
              {/* Scanning Line Animation */}
              <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-0.5 bg-primary/50 shadow-[0_0_15px_rgba(255,133,162,0.8)]"
              />
            </div>
          </div>

          <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-6 px-6">
            <Button 
              onClick={onClose} 
              variant="secondary" 
              className="w-16 h-16 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md border-white/20 text-white"
            >
              <X className="w-8 h-8" />
            </Button>
            
            <div className="flex flex-col items-center gap-2">
              <div className="px-4 py-2 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-widest">
                {isUploading ? 'Processing Upload...' : title}
              </div>
              <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">{subtitle}</p>
            </div>

            <div className="relative">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                variant="secondary" 
                className="w-16 h-16 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md border-white/20 text-white"
                disabled={isUploading}
              >
                {isUploading ? (
                  <RefreshCw className="w-8 h-8 animate-spin" />
                ) : (
                  <Plus className="w-8 h-8" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
