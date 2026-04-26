import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { createWorker } from 'tesseract.js';
import { parseBillWithGroq } from '../services/groqService';
import { Card, Button } from './ClayUI';
import { Camera, RefreshCw, X, Check, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface BillScannerProps {
  onScanComplete: (data: any) => void;
  onClose: () => void;
}

export const BillScanner: React.FC<BillScannerProps> = ({ onScanComplete, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsScanning(true);
    setError(null);
    setStatus('Initializing OCR Engine...');
    
    try {
      const file = acceptedFiles[0];
      
      // PRE-PROCESSING: Increase contrast and grayscale for better handwriting detection
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(resolve => img.onload = resolve);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = img.width;
      canvas.height = img.height;
      
      // 1. Draw image to canvas
      ctx.drawImage(img, 0, 0);
      
      // 2. Grayscale & Contrast boost using filters
      ctx.filter = 'grayscale(100%) contrast(200%) brightness(120%)';
      ctx.drawImage(canvas, 0, 0);
      
      const processedBlob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
      const processedFile = new File([processedBlob], 'processed.png', { type: 'image/png' });

      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
            setStatus('Scanning Document...');
          }
        }
      });

      const { data: { text } } = await worker.recognize(processedFile);
      await worker.terminate();

      if (!text || text.trim().length < 10) {
        throw new Error("Could not read enough text from the image. Please try a clearer photo.");
      }

      setStatus('Analyzing with AI...');
      const structuredData = await parseBillWithGroq(text);
      
      onScanComplete(structuredData);
    } catch (err: any) {
      console.error("Scan Error:", err);
      setError(err.message || "Failed to scan document");
    } finally {
      setIsScanning(false);
      setProgress(0);
      setStatus('');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
    disabled: isScanning
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl selection:bg-primary/20">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-10 space-y-8 relative overflow-hidden shadow-2xl border-white/60 rounded-[40px] bg-surface">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-headline text-3xl italic text-primary">Bill Scanner</h3>
              <p className="label-caps !text-[10px] mt-1">AI-Powered Extraction</p>
            </div>
            <button 
              onClick={onClose}
              disabled={isScanning}
              className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-primary/40 hover:text-primary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div 
            {...getRootProps()} 
            className={cn(
              "relative aspect-[4/3] rounded-[32px] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-6 cursor-pointer overflow-hidden",
              isDragActive ? "border-primary bg-primary/5 scale-[0.98]" : "border-primary/10 hover:border-primary/30",
              isScanning && "cursor-wait opacity-50"
            )}
          >
            <input {...getInputProps()} />
            
            <AnimatePresence mode="wait">
              {isScanning ? (
                <motion.div 
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-6"
                >
                  <div className="relative w-24 h-24 mx-auto">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="44"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-primary/10"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="44"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={276}
                        strokeDashoffset={276 - (276 * progress) / 100}
                        className="text-primary transition-all duration-300"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-headline text-xl italic text-primary">
                      {progress}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-headline text-2xl italic text-primary animate-pulse">{status}</p>
                    <p className="label-caps !text-[9px]">Maximum Velocity Engine Active</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4"
                >
                  <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mx-auto mb-2 text-primary shadow-premium">
                    <Camera className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-headline text-xl italic text-primary">Upload Bill Image</p>
                    <p className="label-caps !text-[9px]">Tap to snap or drag & drop</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scanning Line Animation */}
            {isScanning && (
              <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent z-10 opacity-50 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
              />
            )}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[10px] uppercase tracking-widest font-bold text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-4">
            <Button 
              onClick={onClose}
              disabled={isScanning}
              variant="secondary"
              className="flex-1 py-5 rounded-[2rem]"
            >
              Cancel
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
