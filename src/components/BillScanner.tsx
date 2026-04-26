import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseBillImageWithGroq } from '../services/groqService';
import { Card, Button } from './ClayUI';
import { Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface BillScannerProps {
  onScanComplete: (data: any) => void;
  onClose: () => void;
}

// Convert File to base64 string
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:image/jpeg;base64," prefix — keep only the base64 part
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const BillScanner: React.FC<BillScannerProps> = ({ onScanComplete, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsScanning(true);
    setExtractedData(null);
    setError(null);

    try {
      const file = acceptedFiles[0];
      
      // Convert image to base64 and send directly to the vision model
      const base64 = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';
      
      const structuredData = await parseBillImageWithGroq(base64, mimeType);
      setExtractedData(structuredData);
    } catch (err: any) {
      console.error("Scan Error:", err);
      setError(err.message || "Failed to scan document");
    } finally {
      setIsScanning(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
    disabled: isScanning || !!extractedData
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 sm:p-10 space-y-6 sm:space-y-8 relative shadow-2xl rounded-[40px] bg-surface border border-primary/10">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-headline text-3xl italic text-primary">Bill Scanner</h3>
              <p className="label-caps !text-[10px] mt-1">AI Vision Engine</p>
            </div>
            <button
              onClick={onClose}
              disabled={isScanning}
              className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center text-primary/40 hover:text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Content */}
          <AnimatePresence mode="wait">
            {/* REVIEW STATE: show extracted data */}
            {extractedData ? (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="p-5 rounded-[1.5rem] bg-primary/5 border border-primary/10">
                  <p className="label-caps !text-[8px] mb-2 opacity-60">Customer Name</p>
                  <p className="font-headline text-2xl italic text-primary">
                    {extractedData.name || <span className="opacity-40 text-base">Not Found</span>}
                  </p>
                </div>
                <div className="p-5 rounded-[1.5rem] bg-primary/5 border border-primary/10">
                  <p className="label-caps !text-[8px] mb-2 opacity-60">Total Bill</p>
                  <p className="font-headline text-2xl italic text-primary">
                    ₹ {extractedData.totalBill ?? 0}
                  </p>
                </div>
                {extractedData.phone && (
                  <div className="p-5 rounded-[1.5rem] bg-primary/5 border border-primary/10">
                    <p className="label-caps !text-[8px] mb-2 opacity-60">Phone</p>
                    <p className="font-headline text-2xl italic text-primary">{extractedData.phone}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => setExtractedData(null)}
                    className="flex-1 py-5 rounded-[2rem]"
                  >
                    Rescan
                  </Button>
                  <Button
                    onClick={() => onScanComplete(extractedData)}
                    className="flex-1 py-5 rounded-[2rem] bg-primary text-white shadow-lg shadow-primary/30"
                  >
                    Confirm ✓
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* UPLOAD STATE */
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div
                  {...getRootProps()}
                  className={cn(
                    "relative aspect-[4/3] rounded-[2rem] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden",
                    isDragActive
                      ? "border-primary bg-primary/5 scale-[0.98]"
                      : "border-primary/15 hover:border-primary/40 hover:bg-primary/[0.02]",
                    isScanning && "cursor-wait pointer-events-none"
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
                        className="text-center space-y-4 px-6"
                      >
                        {/* Pulsing eye icon — "AI is seeing the image" */}
                        <div className="relative w-20 h-20 mx-auto">
                          <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-4xl text-primary">
                              visibility
                            </span>
                          </motion.div>
                          <motion.div
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 rounded-full border-2 border-primary/30"
                          />
                        </div>
                        <div>
                          <p className="font-headline text-xl italic text-primary">AI Reading Bill...</p>
                          <p className="label-caps !text-[9px] mt-1 opacity-60">Vision model analyzing handwriting</p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center space-y-4 px-6"
                      >
                        <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mx-auto text-primary">
                          <Camera className="w-9 h-9" />
                        </div>
                        <div>
                          <p className="font-headline text-xl italic text-primary">Snap or Upload Bill</p>
                          <p className="label-caps !text-[9px] mt-1 opacity-60">Tap to open camera or choose image</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Scanning sweep line */}
                  {isScanning && (
                    <motion.div
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"
                    />
                  )}
                </div>

                <Button
                  onClick={onClose}
                  disabled={isScanning}
                  variant="secondary"
                  className="w-full py-5 rounded-[2rem]"
                >
                  Cancel
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Toast */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-500 text-[10px] uppercase tracking-widest font-bold text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
};
