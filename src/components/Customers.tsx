import React, { useState, useEffect, useRef } from 'react';
import { Card, Button } from './ClayUI';
import { motion, AnimatePresence } from 'motion/react';
import { scanReceiptLocal, parseOCRText } from '../services/ocrService';
import { detectColorLine } from '../services/geminiService';
import { cn } from '../lib/utils';
import { Camera, Image, Plus, Trash2, X, Check, RefreshCw, Phone, User, Ruler, AlertTriangle, ArrowLeft } from 'lucide-react';

import { CameraStreamScanner } from './CameraStreamScanner';

interface Measurements {
  // Blouse
  uc: string;
  mc: string;
  waist: string;
  shoulder: string;
  armhole: string;
  shDart: string;
  dDart: string;
  htB: string;
  htF: string;
  neckB: string;
  neckF: string;
  slLn: string;
  slRnd: string;
  // TOP & Bottom
  topLength: string;
  waistIn: string;
  waistRd: string;
  hipIn: string;
  hipRd: string;
  seatIn: string;
  seatRd: string;
  topNeckB: string;
  topNeckF: string;
  bottomLn: string;
  thigh: string;
  knee: string;
  ankle: string;
  skirtLn: string;
  floorLn: string;
  notes: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  entryDate: string;
  deliveryDate: string;
  status: string;
  totalBill: number;
  initialAmount?: number;
  balance: number;
  measurements?: Measurements;
  isPending?: boolean;
}

interface CustomersProps {
  triggerScan?: boolean;
  onScanHandled?: () => void;
}

interface MeasurementHistory {
  id: string;
  customerId: string;
  type: string;
  data: Measurements;
  date: string;
}

export const Customers: React.FC<CustomersProps> = ({ triggerScan, onScanHandled }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [measurementHistory, setMeasurementHistory] = useState<MeasurementHistory[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  useEffect(() => {
    if (triggerScan) {
      setShowCamera(true);
      onScanHandled?.();
    }
  }, [triggerScan]);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    entryDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    totalBill: 0,
    initialAmount: 0,
    balance: 0,
    measurements: {
      uc: '', mc: '', waist: '', shoulder: '', armhole: '', shDart: '', dDart: '',
      htB: '', htF: '', neckB: '', neckF: '', slLn: '', slRnd: '',
      topLength: '', waistIn: '', waistRd: '', hipIn: '', hipRd: '', seatIn: '', seatRd: '',
      topNeckB: '', topNeckF: '', bottomLn: '', thigh: '', knee: '', ankle: '',
      skirtLn: '', floorLn: '', notes: ''
    },
    rawText: ''
  });

  const loadData = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('tailor_customers') || '[]');
      setCustomers(stored);
    } catch (err) {
      console.error("Load error:", err);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        console.log("Image loaded, starting OCR...");
        const result = await scanReceiptLocal(base64);
        if (result && result.rawText) {
          console.log("AI Analysis Result Found:", result.rawText);
          handleStreamResult(result);
        } else {
          console.warn("AI Analysis failed completely or returned no text");
          alert("AI Analysis was unable to read this image. Please try a clearer photo.");
        }
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload error:", err);
      setIsScanning(false);
    }
  };

  const handleStreamResult = (data: any) => {
    if (!data) return;
    
    if (data.isScanning !== undefined) {
      setIsScanning(data.isScanning);
      return;
    }
    
    // Kill OCR Loop and force manual measurements
    setNewCustomer({
      name: data.name || '',
      phone: data.phone || '',
      entryDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      totalBill: data.totalAmount || 0,
      initialAmount: data.paidAmount || 0,
      balance: data.balance || 0,
      measurements: {
        uc: '', mc: '', waist: '', shoulder: '', armhole: '', shDart: '', dDart: '',
        htB: '', htF: '', neckB: '', neckF: '', slLn: '', slRnd: '',
        topLength: '', waistIn: '', waistRd: '', hipIn: '', hipRd: '', seatIn: '', seatRd: '',
        topNeckB: '', topNeckF: '', bottomLn: '', thigh: '', knee: '', ankle: '',
        skirtLn: '', floorLn: '', notes: ''
      },
      rawText: data.rawText || ''
    });
    
    setShowCamera(false);
    setShowReviewModal(true);
  };

  useEffect(() => {
    setNewCustomer(prev => ({
      ...prev,
      balance: prev.totalBill - prev.initialAmount
    }));
  }, [newCustomer.totalBill, newCustomer.initialAmount]);


  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) return;

    try {
      const id = Date.now().toString();
      const record = {
        id,
        ...newCustomer,
        status: 'Active',
        entryDate: new Date().toISOString(),
        balance: newCustomer.totalBill - newCustomer.initialAmount
      };

      const all = JSON.parse(localStorage.getItem('tailor_customers') || '[]');
      const updated = [...all, record];
      localStorage.setItem('tailor_customers', JSON.stringify(updated));
      
      // Save History
      const history = JSON.parse(localStorage.getItem('tailor_measurement_history') || '[]');
      const historyEntry = {
        id: Date.now().toString() + '-h',
        customerId: id,
        type: 'Initial',
        data: newCustomer.measurements,
        date: new Date().toISOString()
      };
      localStorage.setItem('tailor_measurement_history', JSON.stringify([...history, historyEntry]));

      setCustomers(updated);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowAddModal(false);
        setNewCustomer({
          name: '', phone: '', entryDate: new Date().toISOString().split('T')[0], deliveryDate: '',
          totalBill: 0, initialAmount: 0, balance: 0,
          measurements: {
            uc: '', mc: '', waist: '', shoulder: '', armhole: '', shDart: '', dDart: '',
            htB: '', htF: '', neckB: '', neckF: '', slLn: '', slRnd: '',
            topLength: '', waistIn: '', waistRd: '', hipIn: '', hipRd: '', seatIn: '', seatRd: '',
            topNeckB: '', topNeckF: '', bottomLn: '', thigh: '', knee: '', ankle: '',
            skirtLn: '', floorLn: '', notes: ''
          },
          rawText: ''
        });
      }, 1000);
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      const all = JSON.parse(localStorage.getItem('tailor_customers') || '[]');
      const updated = all.map((c: any) => c.id === editingCustomer.id ? editingCustomer : c);
      localStorage.setItem('tailor_customers', JSON.stringify(updated));

      // Save to history if measurements changed
      const history = JSON.parse(localStorage.getItem('tailor_measurement_history') || '[]');
      const historyEntry = {
        id: Date.now().toString() + '-up',
        customerId: editingCustomer.id,
        type: 'Update',
        data: editingCustomer.measurements,
        date: new Date().toISOString()
      };
      localStorage.setItem('tailor_measurement_history', JSON.stringify([...history, historyEntry]));

      setCustomers(updated);
      setShowEditModal(false);
      setEditingCustomer(null);
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  const deleteCustomer = (id: string) => {
    try {
      const all = JSON.parse(localStorage.getItem('tailor_customers') || '[]');
      const updated = all.filter((c: any) => c.id !== id);
      localStorage.setItem('tailor_customers', JSON.stringify(updated));
      
      const history = JSON.parse(localStorage.getItem('tailor_measurement_history') || '[]');
      const updatedHistory = history.filter((h: any) => h.customerId !== id);
      localStorage.setItem('tailor_measurement_history', JSON.stringify(updatedHistory));

      setCustomers(updated);
      setShowDeleteConfirm(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  const fetchMeasurementHistory = (customerId: string) => {
    try {
      const all = JSON.parse(localStorage.getItem('tailor_measurement_history') || '[]');
      const history = all.filter((h: any) => h.customerId === customerId);
      setMeasurementHistory(history.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err) {
      console.error("History Error:", err);
    }
  };

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (selectedCustomer) {
      fetchMeasurementHistory(selectedCustomer.id);
    } else {
      setMeasurementHistory([]);
    }
  }, [selectedCustomer]);

  return (
    <div className="p-6 flex flex-col gap-8 relative min-h-[calc(100vh-200px)] pb-32">
      {/* Auth Error Toast */}
      <AnimatePresence>
        {authError && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm"
          >
            <div className="bg-error text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-xs font-bold uppercase tracking-wider">{authError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Area */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full glass-card flex items-center justify-center bg-white/50">
              <span className="material-symbols-outlined text-primary text-2xl">group</span>
            </div>
            <div>
              <h2 className="font-headline text-3xl tracking-tight text-primary leading-none italic">Customers</h2>
              <p className="label-caps text-[10px] uppercase tracking-[0.2em] mt-1 font-bold">Customer Database</p>
            </div>
          </div>
          <Button 
            onClick={() => {
              setCustomerToDelete(null);
              setShowDeleteConfirm(true);
            }} 
            variant="red" 
            className="w-10 h-10 p-0 rounded-full flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-xl">delete_sweep</span>
          </Button>
        </div>
      </div>

      {/* Customer List */}
      <div className="flex flex-col gap-4">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center opacity-40 px-6">
            <span className="material-symbols-outlined text-6xl mb-4 text-primary">person_search</span>
            <div className="max-w-[280px] mx-auto space-y-1">
              <p className="font-headline text-xl tracking-tight italic">No customer records</p>
              <p className="font-body text-sm">Add customers manually or scan a receipt</p>
            </div>
          </div>
        ) : (
          customers.map((customer) => (
            <Card 
              key={customer.id} 
              onClick={() => setSelectedCustomer(customer)}
              className={cn(
                "p-5 flex flex-col gap-4 glass-card bg-primary/5 transition-all hover:scale-[1.01] cursor-pointer",
                customer.isPending && "opacity-70 border-dashed border-primary/40"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full glass-card-inset flex items-center justify-center font-headline text-lg text-primary bg-primary/5">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-headline text-lg tracking-tight text-primary italic">{customer.name}</h4>
                      {customer.isPending && (
                        <span className="material-symbols-outlined text-sm text-primary animate-spin">sync</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[#cc0052]/60">
                      <span className="material-symbols-outlined text-xs">call</span>
                      <span className="font-mono text-[10px] tracking-wider font-bold">{customer.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-headline text-xl text-primary leading-none italic">₹{customer.balance}</p>
                  <p className="label-caps text-[8px] uppercase tracking-widest mt-1 font-bold">Balance</p>
                </div>
              </div>

              {customer.measurements && (
                <div className="px-4 py-3 rounded-2xl bg-primary/5 border border-primary/10 grid grid-cols-3 gap-2">
                  <p className="font-label text-[8px] uppercase tracking-widest text-primary/40 mb-1 font-bold col-span-3">Quick Measurements</p>
                  {customer.measurements.mc && <div className="flex flex-col"><span className="text-[8px] text-primary/40 uppercase">M.Chest</span><span className="text-xs font-mono font-bold text-primary/70">{customer.measurements.mc}"</span></div>}
                  {customer.measurements.waist && <div className="flex flex-col"><span className="text-[8px] text-primary/40 uppercase">Waist</span><span className="text-xs font-mono font-bold text-primary/70">{customer.measurements.waist}"</span></div>}
                  {customer.measurements.topLength && <div className="flex flex-col"><span className="text-[8px] text-primary/40 uppercase">Top Len</span><span className="text-xs font-mono font-bold text-primary/70">{customer.measurements.topLength}"</span></div>}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Floating Actions */}
      <div className="absolute bottom-32 right-8 z-40 flex flex-col gap-4">
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
        <Button 
          onClick={() => fileInputRef.current?.click()}
          className="h-16 px-6 rounded-full flex items-center justify-center gap-3 shadow-2xl transition-all hover:scale-110 active:scale-95 bg-white/40 backdrop-blur-xl text-primary border border-white/60"
          disabled={isScanning}
          title="Upload Measurement Image"
        >
          <Image className="w-6 h-6 text-primary" />
          <span className="font-bold text-xs uppercase tracking-widest">Upload Bill</span>
        </Button>
        <Button 
          onClick={() => setShowCamera(true)}
          className="h-16 px-6 rounded-full flex items-center justify-center gap-3 shadow-2xl transition-all hover:scale-110 active:scale-95 bg-primary/20 backdrop-blur-xl text-primary border border-primary/30"
          disabled={isScanning}
          title="Scan with Camera"
        >
          {isScanning ? (
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <Camera className="w-6 h-6 text-primary" />
          )}
          <span className="font-bold text-xs uppercase tracking-widest">Scan Camera</span>
        </Button>
        <Button 
          onClick={() => setShowAddModal(true)}
          variant="primary"
          className="h-16 px-6 rounded-full flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-110 active:scale-95"
          title="Add Customer Manually"
        >
          <Plus className="w-6 h-6" />
          <span className="font-bold text-xs uppercase tracking-widest">New Customer</span>
        </Button>
      </div>

      {/* Customer Detail Modal (Digital Dossier) */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-surface">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-4xl glass-card p-6 sm:p-10 space-y-8 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
              id="print-area"
            >
              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-primary/10 pb-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full glass-card bg-primary/5 flex items-center justify-center font-headline text-4xl text-primary italic shrink-0">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline text-4xl text-primary italic leading-tight">{selectedCustomer.name}</h3>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 bg-primary/5 px-3 py-1 rounded-full">
                        <Phone className="w-3 h-3 text-primary" />
                        <p className="font-mono text-[10px] text-primary font-bold">{selectedCustomer.phone}</p>
                      </div>
                      <p className="label-caps text-[10px] text-primary/40 font-bold">ID: {selectedCustomer.id.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <div className="px-4 py-2 rounded-2xl glass-card bg-primary/10 border border-primary/20">
                     <p className="font-headline text-xl text-primary italic leading-none">₹{selectedCustomer.balance}</p>
                     <p className="label-caps text-[8px] text-primary/40 font-bold mt-1 text-right">Balance Due</p>
                   </div>
                </div>
              </div>

              {/* Identity & Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 rounded-3xl bg-primary/5 border border-primary/10">
                <div className="space-y-1">
                  <p className="label-caps text-[9px] text-primary/40 font-bold">Entry Date</p>
                  <p className="font-mono text-sm text-primary font-bold">{selectedCustomer.entryDate}</p>
                </div>
                <div className="space-y-1">
                  <p className="label-caps text-[9px] text-primary/40 font-bold">Delivery Date</p>
                  <p className="font-mono text-sm text-primary font-bold">{selectedCustomer.deliveryDate || 'Not Set'}</p>
                </div>
                <div className="space-y-1">
                  <p className="label-caps text-[9px] text-primary/40 font-bold">Current Status</p>
                  <p className="font-headline text-lg text-primary italic">{selectedCustomer.status}</p>
                </div>
                <div className="space-y-1">
                  <p className="label-caps text-[9px] text-primary/40 font-bold">Total Bill</p>
                  <p className="font-mono text-sm text-primary font-bold">₹{selectedCustomer.totalBill}</p>
                </div>
              </div>

              {/* Measurements Layout (Mirroring the Sumi Designs Form) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Column 1: Blouse */}
                <div className="space-y-6 p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16"></div>
                  <h4 className="font-headline text-2xl text-primary italic border-b border-primary/10 pb-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary/40">apparel</span>
                    Blouse Measurements
                  </h4>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                    {[
                      { label: 'U.C (Upper Chest)', key: 'uc' },
                      { label: 'M.C (Middle Chest)', key: 'mc' },
                      { label: 'Waist', key: 'waist' },
                      { label: 'Shoulder', key: 'shoulder' },
                      { label: 'Armhole', key: 'armhole' },
                      { label: 'Sh-Dart', key: 'shDart' },
                      { label: 'D-Dart', key: 'dDart' },
                      { label: 'Ht: Back', key: 'htB' },
                      { label: 'Ht: Front', key: 'htF' },
                      { label: 'Neck: Back', key: 'neckB' },
                      { label: 'Neck: Front', key: 'neckF' },
                      { label: 'Sl. Ln', key: 'slLn' },
                      { label: 'Sl. Rnd', key: 'slRnd' }
                    ].map((field) => (
                      <div key={field.key} className="flex justify-between items-center border-b border-primary/5 pb-2">
                        <span className="label-caps text-[10px] text-primary/60 font-bold">{field.label}</span>
                        <span className="font-mono text-sm font-black text-primary">{(selectedCustomer.measurements as any)?.[field.key] || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: TOP & Bottom */}
                <div className="space-y-6 p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16"></div>
                  <h4 className="font-headline text-2xl text-primary italic border-b border-primary/10 pb-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary/40">straighten</span>
                    TOP & Bottom
                  </h4>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                    {[
                      { label: 'TOP Length', key: 'topLength' },
                      { label: 'Waist In/Rd', key: 'waistIn' },
                      { label: 'Hip In/Rd', key: 'hipIn' },
                      { label: 'Seat In/Rd', key: 'seatIn' },
                      { label: 'Neck: Back', key: 'topNeckB' },
                      { label: 'Neck: Front', key: 'topNeckF' },
                      { label: 'Bottom Ln', key: 'bottomLn' },
                      { label: 'Thigh', key: 'thigh' },
                      { label: 'Knee', key: 'knee' },
                      { label: 'Ankle', key: 'ankle' },
                      { label: 'Skirt Ln', key: 'skirtLn' },
                      { label: 'Floor Ln', key: 'floorLn' }
                    ].map((field) => (
                      <div key={field.key} className="flex justify-between items-center border-b border-primary/5 pb-2">
                        <span className="label-caps text-[10px] text-primary/60 font-bold">{field.label}</span>
                        <span className="font-mono text-sm font-black text-primary">{(selectedCustomer.measurements as any)?.[field.key] || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedCustomer.measurements?.notes && (
                <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10">
                  <p className="label-caps text-[10px] text-primary/40 font-bold mb-3">Special Instructions / Notes</p>
                  <p className="text-lg font-body text-primary italic leading-relaxed">"{selectedCustomer.measurements.notes}"</p>
                </div>
              )}

              {/* Dossier Footer / Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-8">
                <Button 
                  onClick={() => window.print()}
                  variant="secondary" 
                  className="flex-1 py-5 rounded-full flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Print Digital Form
                </Button>
                <Button 
                  onClick={() => {
                    setEditingCustomer(selectedCustomer);
                    setShowEditModal(true);
                    setSelectedCustomer(null);
                  }}
                  variant="secondary" 
                  className="flex-1 py-5 rounded-full flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Edit Details
                </Button>
                <Button 
                  onClick={() => setSelectedCustomer(null)}
                  variant="primary" 
                  className="flex-1 py-5 rounded-full shadow-2xl shadow-primary/30"
                >
                  Close Dossier
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Camera Stream Scanner */}
      {showCamera && (
        <CameraStreamScanner 
          onResult={handleStreamResult}
          onClose={() => setShowCamera(false)}
          isScanning={isScanning}
          type="customer"
        />
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm"
            >
              <Card className="p-8 flex flex-col gap-6 text-center glass-card">
                <div className="w-20 h-20 rounded-full glass-card-inset bg-error/5 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-error text-4xl">warning</span>
                </div>
                <div>
                  <h3 className="font-headline text-2xl tracking-tight text-primary italic">
                    {customerToDelete ? 'Delete Customer?' : 'Clear Ledger?'}
                  </h3>
                  <p className="font-body text-sm text-primary/60 mt-2">
                    {customerToDelete 
                      ? 'This will permanently remove this customer record.' 
                      : 'This will permanently remove all customer records and pending syncs.'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4" variant="secondary">Cancel</Button>
                  <Button onClick={() => customerToDelete ? deleteCustomer(customerToDelete) : removeAllCustomers()} variant="red" className="flex-1 py-4">
                    {customerToDelete ? 'Delete' : 'Delete All'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scanning Toast */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200]"
          >
            <div className="bg-primary text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 border border-white/10">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <p className="font-bold text-xs uppercase tracking-widest text-white">Digitalizing Measurement...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAddModal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-surface">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-4xl glass-card p-6 sm:p-10 space-y-8 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center gap-4"
                    >
                      <div className="w-20 h-20 rounded-full glass-card bg-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-4xl">check</span>
                      </div>
                      <p className="font-headline text-2xl tracking-tight text-primary italic">Customer Saved</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Back Button & Header */}
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-primary/40 hover:bg-primary/5 transition-colors border border-primary/10"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-headline text-3xl tracking-tight text-primary italic">Sumi Designs</h3>
                    <p className="label-caps text-[9px] text-primary/40 font-bold">New Measurement Receipt</p>
                  </div>
                </div>

                <form onSubmit={handleSaveCustomer} className="flex flex-col gap-8">
                  {/* Identity Header */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 rounded-3xl bg-primary/5 border border-primary/10">
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Name</label>
                      <input 
                        required
                        type="text" 
                        value={newCustomer.name}
                        onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                        className="w-full input-premium px-5 py-4 text-sm font-body outline-none transition-all text-primary rounded-2xl"
                        placeholder="Customer Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Ph. No</label>
                      <input 
                        required
                        type="tel" 
                        value={newCustomer.phone}
                        onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all text-primary rounded-2xl"
                        placeholder="Phone Number"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Entry Date</label>
                      <input 
                        required
                        type="date" 
                        value={newCustomer.entryDate}
                        onChange={e => setNewCustomer({...newCustomer, entryDate: e.target.value})}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all text-primary rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Delivery Date</label>
                      <input 
                        required
                        type="date" 
                        value={newCustomer.deliveryDate}
                        onChange={e => setNewCustomer({...newCustomer, deliveryDate: e.target.value})}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all text-primary rounded-2xl"
                      />
                    </div>
                  </div>

                  {/* Two-Column Measurement Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Column 1: Blouse */}
                    <div className="space-y-6 p-6 rounded-3xl bg-primary/5 border border-primary/10">
                      <h4 className="font-headline text-2xl text-primary italic border-b border-primary/20 pb-3">Blouse</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'U.C (Upper Chest)', key: 'uc' },
                          { label: 'M.C (Middle Chest)', key: 'mc' },
                          { label: 'Waist', key: 'waist' },
                          { label: 'Shoulder', key: 'shoulder' },
                          { label: 'Armhole', key: 'armhole' },
                          { label: 'Sh-Dart', key: 'shDart' },
                          { label: 'D-Dart', key: 'dDart' },
                          { label: 'Ht: Back', key: 'htB' },
                          { label: 'Ht: Front', key: 'htF' },
                          { label: 'Neck: Back', key: 'neckB' },
                          { label: 'Neck: Front', key: 'neckF' },
                          { label: 'Sl. Ln', key: 'slLn' },
                          { label: 'Sl. Rnd', key: 'slRnd' }
                        ].map((field) => (
                          <div key={field.key} className="space-y-2">
                            <label className="label-caps !text-primary">{field.label}</label>
                            <input 
                              type="text" 
                              value={(newCustomer.measurements as any)[field.key]}
                              onChange={e => setNewCustomer({
                                ...newCustomer, 
                                measurements: { ...newCustomer.measurements, [field.key]: e.target.value }
                              })}
                              className="w-full input-premium px-4 py-3 text-sm font-mono outline-none text-primary rounded-xl"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Column 2: TOP & Bottom */}
                    <div className="space-y-6 p-6 rounded-3xl bg-primary/5 border border-primary/10">
                      <h4 className="font-headline text-2xl text-primary italic border-b border-primary/20 pb-3">TOP & Bottom</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'TOP Length', key: 'topLength' },
                          { label: 'Waist In', key: 'waistIn' },
                          { label: 'Waist Rd', key: 'waistRd' },
                          { label: 'Hip In', key: 'hipIn' },
                          { label: 'Hip Rd', key: 'hipRd' },
                          { label: 'Seat In', key: 'seatIn' },
                          { label: 'Seat Rd', key: 'seatRd' },
                          { label: 'Neck: Back', key: 'topNeckB' },
                          { label: 'Neck: Front', key: 'topNeckF' },
                          { label: 'Bottom Ln', key: 'bottomLn' },
                          { label: 'Thigh', key: 'thigh' },
                          { label: 'Knee', key: 'knee' },
                          { label: 'Ankle', key: 'ankle' },
                          { label: 'Skirt Ln', key: 'skirtLn' },
                          { label: 'Floor Ln', key: 'floorLn' }
                        ].map((field) => (
                          <div key={field.key} className="space-y-2">
                            <label className="label-caps !text-primary">{field.label}</label>
                            <input 
                              type="text" 
                              value={(newCustomer.measurements as any)[field.key]}
                              onChange={e => setNewCustomer({
                                ...newCustomer, 
                                measurements: { ...newCustomer.measurements, [field.key]: e.target.value }
                              })}
                              className="w-full input-premium px-4 py-3 text-sm font-mono outline-none text-primary rounded-xl"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-4">
                    <label className="label-caps !text-primary">Notes / Special Instructions</label>
                    <textarea 
                      value={newCustomer.measurements.notes}
                      onChange={e => setNewCustomer({
                        ...newCustomer, 
                        measurements: { ...newCustomer.measurements, notes: e.target.value }
                      })}
                      className="w-full input-premium px-6 py-4 min-h-[120px] outline-none text-primary rounded-2xl"
                      placeholder="Add any specific details or requests..."
                    />
                  </div>

                  {/* Billing Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-3xl bg-primary/5 border border-primary/10">
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Total Amount (₹)</label>
                      <input 
                        required
                        type="number" 
                        value={newCustomer.totalBill || ''}
                        onChange={e => setNewCustomer({...newCustomer, totalBill: Number(e.target.value)})}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none text-primary rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Initial Amount (₹)</label>
                      <input 
                        required
                        type="number" 
                        value={newCustomer.initialAmount || ''}
                        onChange={e => setNewCustomer({...newCustomer, initialAmount: Number(e.target.value)})}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none text-primary rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Balance (₹)</label>
                      <input 
                        readOnly
                        type="number" 
                        value={newCustomer.balance}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none text-primary/60 rounded-2xl opacity-60"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-5 rounded-full" variant="secondary">Cancel</Button>
                    <Button type="submit" className="flex-1 py-5 rounded-full shadow-xl shadow-primary/20" variant="primary">Save Measurement</Button>
                  </div>
                </form>
              </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Customer Modal */}
      <AnimatePresence>
        {showEditModal && editingCustomer && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-4xl glass-card p-6 sm:p-10 space-y-8 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center gap-4"
                    >
                      <div className="w-20 h-20 rounded-full glass-card bg-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-4xl">check</span>
                      </div>
                      <p className="font-headline text-2xl tracking-tight text-primary italic">Changes Saved</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Back Button & Header */}
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingCustomer(null);
                    }}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-primary/40 hover:bg-primary/5 transition-colors border border-primary/10"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-headline text-3xl tracking-tight text-primary italic">Update Record</h3>
                    <p className="label-caps text-[9px] text-primary/40 font-bold">Edit Customer measurements</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateCustomer} className="flex flex-col gap-8">
                  {/* Identity Header */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 rounded-3xl bg-primary/5 border border-primary/10">
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Name</label>
                      <input 
                        required
                        type="text" 
                        value={editingCustomer.name}
                        onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})}
                        className="w-full input-premium px-5 py-4 text-sm font-body outline-none transition-all text-primary rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Ph. No</label>
                      <input 
                        required
                        type="tel" 
                        value={editingCustomer.phone}
                        onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all text-primary rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Entry Date</label>
                      <input 
                        required
                        type="date" 
                        value={editingCustomer.entryDate}
                        onChange={e => setEditingCustomer({...editingCustomer, entryDate: e.target.value})}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all text-primary rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Delivery Date</label>
                      <input 
                        required
                        type="date" 
                        value={editingCustomer.deliveryDate}
                        onChange={e => setEditingCustomer({...editingCustomer, deliveryDate: e.target.value})}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all text-primary rounded-2xl"
                      />
                    </div>
                  </div>

                  {/* Two-Column Measurement Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Column 1: Blouse */}
                    <div className="space-y-6 p-6 rounded-3xl bg-primary/5 border border-primary/10">
                      <h4 className="font-headline text-2xl text-primary italic border-b border-primary/20 pb-3">Blouse</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'U.C (Upper Chest)', key: 'uc' },
                          { label: 'M.C (Middle Chest)', key: 'mc' },
                          { label: 'Waist', key: 'waist' },
                          { label: 'Shoulder', key: 'shoulder' },
                          { label: 'Armhole', key: 'armhole' },
                          { label: 'Sh-Dart', key: 'shDart' },
                          { label: 'D-Dart', key: 'dDart' },
                          { label: 'Ht: Back', key: 'htB' },
                          { label: 'Ht: Front', key: 'htF' },
                          { label: 'Neck: Back', key: 'neckB' },
                          { label: 'Neck: Front', key: 'neckF' },
                          { label: 'Sl. Ln', key: 'slLn' },
                          { label: 'Sl. Rnd', key: 'slRnd' }
                        ].map((field) => (
                          <div key={field.key} className="space-y-2">
                            <label className="label-caps !text-primary">{field.label}</label>
                            <input 
                              type="text" 
                              value={(editingCustomer.measurements as any)?.[field.key] || ''}
                              onChange={e => setEditingCustomer({
                                ...editingCustomer, 
                                measurements: { ...(editingCustomer.measurements || {}), [field.key]: e.target.value } as any
                              })}
                              className="w-full input-premium px-4 py-3 text-sm font-mono outline-none text-primary rounded-xl"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6 p-6 rounded-3xl bg-primary/5 border border-primary/10">
                      <h4 className="font-headline text-2xl text-primary italic border-b border-primary/20 pb-3">TOP & Bottom</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'TOP Length', key: 'topLength' },
                          { label: 'Waist In', key: 'waistIn' },
                          { label: 'Waist Rd', key: 'waistRd' },
                          { label: 'Hip In', key: 'hipIn' },
                          { label: 'Hip Rd', key: 'hipRd' },
                          { label: 'Seat In', key: 'seatIn' },
                          { label: 'Seat Rd', key: 'seatRd' },
                          { label: 'Neck: Back', key: 'topNeckB' },
                          { label: 'Neck: Front', key: 'topNeckF' },
                          { label: 'Bottom Ln', key: 'bottomLn' },
                          { label: 'Thigh', key: 'thigh' },
                          { label: 'Knee', key: 'knee' },
                          { label: 'Ankle', key: 'ankle' },
                          { label: 'Skirt Ln', key: 'skirtLn' },
                          { label: 'Floor Ln', key: 'floorLn' }
                        ].map((field) => (
                          <div key={field.key} className="space-y-2">
                            <label className="label-caps !text-primary">{field.label}</label>
                            <input 
                              type="text" 
                              value={(editingCustomer.measurements as any)?.[field.key] || ''}
                              onChange={e => setEditingCustomer({
                                ...editingCustomer, 
                                measurements: { ...(editingCustomer.measurements || {}), [field.key]: e.target.value } as any
                              })}
                              className="w-full input-premium px-4 py-3 text-sm font-mono outline-none text-primary rounded-xl"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-4">
                    <label className="label-caps !text-primary">Notes / Special Instructions</label>
                    <textarea 
                      value={editingCustomer.measurements?.notes || ''}
                      onChange={e => setEditingCustomer({
                        ...editingCustomer, 
                        measurements: { ...(editingCustomer.measurements || {}), notes: e.target.value } as any
                      })}
                      className="w-full input-premium px-6 py-4 min-h-[120px] outline-none text-primary rounded-2xl"
                      placeholder="Add any specific details or requests..."
                    />
                  </div>

                  {/* Billing Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-3xl bg-primary/5 border border-primary/10">
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Total Amount (₹)</label>
                      <input 
                        required
                        type="number" 
                        value={editingCustomer.totalBill || ''}
                        onChange={e => setEditingCustomer({...editingCustomer, totalBill: Number(e.target.value)})}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none text-primary rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Initial Amount (₹)</label>
                      <input 
                        required
                        type="number" 
                        value={editingCustomer.initialAmount || ''}
                        onChange={e => setEditingCustomer({...editingCustomer, initialAmount: Number(e.target.value)})}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none text-primary rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-caps !text-primary">Balance (₹)</label>
                      <input 
                        readOnly
                        type="number" 
                        value={editingCustomer.balance}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none text-primary/60 rounded-2xl opacity-60"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-5 rounded-full" variant="secondary">Cancel</Button>
                    <Button type="submit" className="flex-1 py-5 rounded-full shadow-xl shadow-primary/20" variant="primary">Save Changes</Button>
                  </div>
                </form>
              </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OCR Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="absolute inset-0 z-[120] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <Card className="p-8 flex flex-col gap-8 relative overflow-hidden glass-card shadow-2xl">
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center gap-4"
                    >
                      <div className="w-20 h-20 rounded-full glass-card bg-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-4xl">check</span>
                      </div>
                      <p className="font-headline text-2xl tracking-tight text-primary italic">Customer Saved</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-headline text-3xl tracking-tight text-primary italic">Review Scan</h3>
                    <p className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">OCR Analysis Result</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-full glass-card bg-primary/10 text-primary text-[10px] font-headline uppercase tracking-widest italic">
                    Premium AI
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Extracted Raw Text (Editable)</label>
                    <textarea 
                      value={newCustomer.rawText}
                      onChange={e => {
                        const text = e.target.value;
                        const lines = text.split('\n');
                        const parsed = parseOCRText(lines);
                        setNewCustomer({
                          ...newCustomer,
                          ...parsed,
                          rawText: text
                        });
                      }}
                      className="w-full input-premium px-5 py-4 text-xs font-mono h-24 resize-none"
                      placeholder="Raw OCR text..."
                    />
                    <p className="text-[8px] text-primary/40 italic">Editing this text will automatically re-parse the identity fields.</p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <h4 className="font-headline text-xl text-primary italic border-b border-primary/10 pb-2">Identity</h4>
                    <div className="space-y-2">
                      <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Detected Name</label>
                      <input 
                        type="text" 
                        value={newCustomer.name}
                        onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                        className="w-full input-premium px-5 py-4 text-sm font-body outline-none transition-all text-[#1A1A1A] dark:text-white rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Detected Phone</label>
                      <input 
                        type="tel" 
                        value={newCustomer.phone}
                        onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all text-[#1A1A1A] dark:text-white rounded-2xl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Total Amount (₹)</label>
                        <input 
                          type="number" 
                          value={newCustomer.totalBill || ''}
                          onChange={e => setNewCustomer({...newCustomer, totalBill: Number(e.target.value)})}
                          className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all text-[#1A1A1A] dark:text-white rounded-2xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Initial Amount (₹)</label>
                        <input 
                          type="number" 
                          value={newCustomer.initialAmount || ''}
                          onChange={e => setNewCustomer({...newCustomer, initialAmount: Number(e.target.value)})}
                          className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all text-[#1A1A1A] dark:text-white rounded-2xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Balance (₹)</label>
                      <input 
                        readOnly
                        type="number" 
                        value={newCustomer.balance}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all text-[#1A1A1A] dark:text-white rounded-2xl opacity-60"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <h4 className="font-headline text-xl text-[#1A1A1A] dark:text-white italic border-b border-[#1A1A1A]/10 pb-2">Measurements</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'U.Chest', key: 'uc' },
                        { label: 'M.Chest', key: 'mc' },
                        { label: 'Waist', key: 'waist' },
                        { label: 'Shoulder', key: 'shoulder' },
                        { label: 'Armhole', key: 'armhole' },
                        { label: 'Top Len', key: 'topLength' }
                      ].map((field) => (
                        <div key={field.key} className="space-y-2">
                          <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">{field.label}</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={(newCustomer.measurements as any)[field.key]}
                              onChange={e => setNewCustomer({
                                ...newCustomer, 
                                measurements: { ...newCustomer.measurements, [field.key]: e.target.value }
                              })}
                              className="w-full input-premium px-5 py-4 text-sm font-mono outline-none text-[#1A1A1A] dark:text-white rounded-2xl"
                              placeholder="0.0"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={() => setShowReviewModal(false)} className="flex-1 py-4" variant="secondary">Discard</Button>
                  <Button onClick={() => handleSaveCustomer({ preventDefault: () => {} } as any)} className="flex-1 py-4" variant="primary">Confirm & Save</Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
