import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSupabase } from '../context/SupabaseContext';
import { Card, Button } from './ClayUI';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { BillScanner } from './BillScanner';

// --- Types ---
interface Measurements {
  uc: string; mc: string; waist: string; shoulder: string; armhole: string;
  shDart: string; dDart: string; htB: string; htF: string;
  neckB: string; neckF: string; slLn: string; slRnd: string;
  topLength: string; waistIn: string; waistRd: string; hipIn: string; hipRd: string;
  seatIn: string; seatRd: string; topNeckB: string; topNeckF: string;
  bottomLn: string; thigh: string; knee: string; ankle: string;
  skirtLn: string; floorLn: string; notes: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  status: string;
  totalBill: number;
  balance: number;
  deliveryDate: string;
  measurements?: Measurements;
}

export const Customers: React.FC = React.memo(() => {
  const { customers: rawCustomers, measurements: rawHistory, addRecord, updateRecord, deleteRecord, loading: contextLoading } = useSupabase();
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [paymentInput, setPaymentInput] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const processingRef = useRef(false);

  const [newCustomer, setNewCustomer] = useState({
    name: '', phone: '', entryDate: new Date().toLocaleDateString('en-GB'), deliveryDate: '',
    totalBill: 0, initialAmount: 0, balance: 0,
    measurements: {
      uc: '', mc: '', waist: '', shoulder: '', armhole: '', shDart: '', dDart: '',
      htB: '', htF: '', neckB: '', neckF: '', slLn: '', slRnd: '',
      topLength: '', waistIn: '', waistRd: '', hipIn: '', hipRd: '', seatIn: '', seatRd: '',
      topNeckB: '', topNeckF: '', bottomLn: '', thigh: '', knee: '', ankle: '',
      skirtLn: '', floorLn: '', notes: ''
    } as Measurements,
    rawText: ''
  });

  // Derived
  const customers = useMemo(() => (rawCustomers as any[]).map(c => ({
    id: c.id,
    name: c.name || '',
    phone: c.phone || '',
    status: c.status || 'Pending',
    totalBill: Number(c.total_bill || c.totalBill || 0),
    balance: Number(c.balance || 0),
    deliveryDate: c.receipt_no || c.receiptNo || '',
  })), [rawCustomers]);

  const filteredCustomers = useMemo(() => customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  ), [customers, searchQuery]);

  // Actions
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processingRef.current) return;
    if (!newCustomer.name || !newCustomer.phone) {
      alert("Name and Phone are mandatory");
      return;
    }
    
    processingRef.current = true;
    setIsProcessing(true);
    
    try {
      // 1. Save core customer data
      const record = {
        name: newCustomer.name,
        phone: newCustomer.phone,
        status: 'Pending',
        total_bill: newCustomer.totalBill,
        balance: Math.max(0, newCustomer.totalBill - newCustomer.initialAmount),
        receipt_no: `${new Date().toLocaleDateString('en-GB')} | TBD` // Format: OrderDate | DeliveryDate
      };

      const customerId = await addRecord('customers', record);
      
      // 2. Save measurements (wrapped in try-catch to be resilient)
      if (customerId) {
        try {
          await addRecord('measurements', {
            customerId,
            type: 'Initial',
            data: newCustomer.measurements,
            date: new Date().toISOString()
          });
        } catch (mErr) {
          console.warn("Measurement history save failed, but client was saved:", mErr);
        }
      }

      // 3. UI Success flow
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowAddModal(false);
        setNewCustomer({
          name: '', phone: '', entryDate: new Date().toLocaleDateString('en-GB'), deliveryDate: '',
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
        setIsProcessing(false);
        processingRef.current = false;
      }, 1000);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Error saving client. Please check your connection.");
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const handleScanComplete = (data: any) => {
    setNewCustomer({
      ...newCustomer,
      name: data.name || '',
      phone: data.phone || '',
      totalBill: data.totalBill || 0,
      measurements: {
        ...newCustomer.measurements,
        ...(data.measurements || {})
      }
    });
    setShowScanner(false);
    setShowAddModal(true);
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processingRef.current || !editingCustomer) return;
    processingRef.current = true;
    setIsProcessing(true);
    setShowEditModal(false);
    try {
      const newBalance = Math.max(0, editingCustomer.balance - paymentInput);
      await updateRecord('customers', editingCustomer.id, {
        balance: newBalance
      });
      await addRecord('measurements', {
        customerId: editingCustomer.id,
        type: 'Payment',
        data: { amount: paymentInput, balance: newBalance },
        date: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      await deleteRecord('customers', customerToDelete);
      setShowDeleteConfirm(false);
      setCustomerToDelete(null);
    } catch (err) { console.error(err); }
  };

  const clearAllCustomers = async () => {
    if (!window.confirm("Are you sure you want to delete ALL customers?")) return;
    try {
      await Promise.all(customers.map(c => deleteRecord('customers', c.id)));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="flex flex-col gap-6 pb-32 max-w-lg mx-auto">
      {/* Top Bar */}
      <div className="flex gap-3 sm:gap-4 items-center transform-gpu">
        <div className="relative flex-1 group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors">search</span>
          <input 
            type="text"
            placeholder="Find a client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-primary/5 border border-primary/10 pl-12 py-3.5 sm:py-4 rounded-full outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base"
          />
        </div>
        <Button 
          onClick={clearAllCustomers}
          className="w-12 h-12 sm:w-14 sm:h-14 bg-error/5 text-error flex items-center justify-center rounded-2xl border border-error/10 hover:bg-error/10 transition-colors"
        >
          <span className="material-symbols-outlined">delete_sweep</span>
        </Button>
      </div>

      {/* Customer List */}
      <div className="flex flex-col gap-3 sm:gap-4 will-change-transform">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-30">
            <span className="material-symbols-outlined text-6xl mb-4 text-primary">person_search</span>
            <p className="font-headline text-xl italic">No client records</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <Card key={customer.id} className="p-5 sm:p-6 flex flex-col gap-4 bg-primary/[0.03] sm:glass-card border border-primary/5 sm:border-primary/10 rounded-[28px] sm:rounded-[32px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-headline text-xl sm:text-2xl italic text-primary bg-primary/10">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-headline text-xl sm:text-2xl italic text-primary tracking-tight leading-tight">{customer.name}</h3>
                    <p className="text-primary/60 text-[10px] sm:text-xs font-mono">{customer.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase text-primary/40 tracking-widest">BALANCE</p>
                  <p className="font-headline text-xl sm:text-2xl italic text-primary">₹{Math.max(0, customer.balance)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-primary/5 sm:border-primary/10">
                <div className="flex items-center gap-3 text-[9px] font-bold text-primary/40 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">calendar_month</span> {customer.deliveryDate.split(' | ')[0]}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingCustomer(customer); setPaymentInput(0); setShowEditModal(true); }}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/5 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all border border-primary/10 active:scale-95 transform-gpu"
                  >
                    <span className="material-symbols-outlined text-xl">payments</span>
                  </button>
                  <button 
                    onClick={() => { setCustomerToDelete(customer.id); setShowDeleteConfirm(true); }}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-error/5 text-error flex items-center justify-center hover:bg-error hover:text-white transition-all border border-error/10 active:scale-95 transform-gpu"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-6 flex gap-3">
        <Button 
          onClick={() => setShowScanner(true)}
          className="w-20 h-14 sm:w-24 sm:h-16 rounded-3xl bg-white text-primary border border-primary/20 shadow-xl flex items-center justify-center shrink-0"
        >
          <span className="material-symbols-outlined text-3xl">camera_enhance</span>
        </Button>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="flex-1 rounded-3xl py-6 bg-primary text-white shadow-2xl shadow-primary/40 font-headline text-2xl italic flex items-center justify-center gap-3"
        >
          <span className="material-symbols-outlined text-3xl">person_add</span>
          NEW CUSTOMER
        </Button>
      </div>

      <AnimatePresence>
        {showScanner && (
          <BillScanner 
            onScanComplete={handleScanComplete}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showEditModal && editingCustomer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cn("w-full max-w-md transform-gpu", isProcessing && "pointer-events-none")}>
              <Card className="p-6 sm:p-8 space-y-6 sm:space-y-8 rounded-[32px] sm:rounded-[40px] shadow-2xl border border-primary/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-3xl italic text-primary">Update Payment</h3>
                  <button onClick={() => setShowEditModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/5"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="p-6 rounded-3xl bg-primary/5 space-y-1">
                  <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">Current Balance</p>
                  <p className="font-headline text-3xl italic text-primary">₹{editingCustomer.balance}</p>
                </div>
                <form onSubmit={handleUpdatePayment} className="space-y-6">
                  <div className="space-y-2">
                    <label className="label-caps">Payment Received (₹)</label>
                    <input type="number" autoFocus value={paymentInput} onChange={e => setPaymentInput(Number(e.target.value))} className="w-full input-premium p-5 text-2xl font-headline italic" placeholder="0" />
                  </div>
                  <Button type="submit" disabled={isProcessing} className="w-full py-6 rounded-3xl bg-primary text-white font-headline text-2xl italic shadow-xl shadow-primary/20">
                    {isProcessing ? "Processing..." : "Confirm Payment"}
                  </Button>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[110] flex items-start justify-center p-0 sm:p-6 bg-surface sm:bg-surface/95 sm:backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className={cn(
                "w-full max-w-4xl bg-surface rounded-t-[32px] sm:rounded-[48px] p-6 sm:p-10 my-0 sm:my-8 shadow-2xl relative min-h-full sm:min-h-0 transform-gpu", 
                isProcessing && "pointer-events-none"
              )}
            >
              <div className="flex items-center justify-between mb-6 sm:mb-10 sticky top-0 bg-surface z-10 pb-4 border-b border-primary/5 sm:border-none sm:static sm:pb-0">
                <h3 className="font-headline text-2xl sm:text-4xl italic text-primary">New Client Entry</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 sm:p-4 bg-primary/5 rounded-full"><span className="material-symbols-outlined text-2xl sm:text-4xl">close</span></button>
              </div>

              <form onSubmit={handleSaveCustomer} className="space-y-8 sm:space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 rounded-3xl bg-primary/5 border border-primary/10">
                  {[{label: 'Name', key: 'name', type: 'text'}, {label: 'Phone', key: 'phone', type: 'tel'}, {label: 'Total Bill (₹)', key: 'totalBill', type: 'number'}].map(f => (
                    <div key={f.key} className="space-y-1.5">
                      <label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-primary/40">{f.label}</label>
                      <input 
                        required={f.key!=='totalBill'} 
                        type={f.type} 
                        value={(newCustomer as any)[f.key]} 
                        onChange={e => setNewCustomer({...newCustomer, [f.key]: f.type==='number' ? Number(e.target.value) : e.target.value})} 
                        className="w-full bg-white border border-primary/10 rounded-xl p-3 sm:p-4 outline-none focus:ring-2 focus:ring-primary/20 text-sm sm:text-base" 
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                  <div className="space-y-4 sm:space-y-6">
                    <h4 className="font-headline text-xl sm:text-2xl italic text-primary border-b border-primary/10 pb-2">Blouse</h4>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {['uc', 'mc', 'waist', 'shoulder', 'armhole', 'shDart', 'dDart', 'htB', 'htF', 'neckB', 'neckF', 'slLn', 'slRnd'].map(k => (
                        <div key={k} className="flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl bg-primary/[0.02] border border-primary/5">
                          <label className="text-[9px] font-bold uppercase text-primary/40">{k}</label>
                          <input type="text" value={(newCustomer.measurements as any)[k]} onChange={e => setNewCustomer({...newCustomer, measurements: {...newCustomer.measurements, [k]: e.target.value}})} className="w-12 sm:w-16 bg-transparent text-right font-mono text-primary outline-none text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4 sm:space-y-6">
                    <h4 className="font-headline text-xl sm:text-2xl italic text-primary border-b border-primary/10 pb-2">Top & Bottom</h4>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {['topLength', 'waistIn', 'waistRd', 'hipIn', 'hipRd', 'seatIn', 'seatRd', 'topNeckB', 'topNeckF', 'bottomLn', 'thigh', 'knee', 'ankle', 'skirtLn', 'floorLn'].map(k => (
                        <div key={k} className="flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl bg-primary/[0.02] border border-primary/5">
                          <label className="text-[9px] font-bold uppercase text-primary/40">{k}</label>
                          <input type="text" value={(newCustomer.measurements as any)[k]} onChange={e => setNewCustomer({...newCustomer, measurements: {...newCustomer.measurements, [k]: e.target.value}})} className="w-12 sm:w-16 bg-transparent text-right font-mono text-primary outline-none text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-6 sm:pt-10 border-t border-primary/10 pb-10">
                  <div className="flex-1 space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-primary/40">Advance Received (₹)</label>
                    <input type="number" value={newCustomer.initialAmount} onChange={e => setNewCustomer({...newCustomer, initialAmount: Number(e.target.value)})} className="w-full bg-accent/5 border border-accent/20 rounded-2xl p-4 sm:p-6 text-2xl sm:text-3xl font-headline italic text-accent" />
                  </div>
                  <div className="flex-1 flex items-end">
                    <Button type="submit" disabled={isProcessing} className="w-full py-4 sm:py-6 rounded-2xl sm:rounded-3xl bg-primary text-white font-headline text-xl sm:text-2xl italic shadow-2xl">
                      {isProcessing ? "Saving..." : "Save Record"}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-surface/80 backdrop-blur-sm">
            <Card className="p-8 space-y-6 text-center shadow-2xl border border-error/20 max-w-sm">
              <span className="material-symbols-outlined text-error text-6xl">warning</span>
              <h3 className="font-headline text-2xl italic text-primary">Delete client?</h3>
              <div className="flex gap-4">
                <Button onClick={() => setShowDeleteConfirm(false)} variant="secondary" className="flex-1">No</Button>
                <Button onClick={handleDeleteCustomer} className="flex-1 bg-error text-white">Yes, Delete</Button>
              </div>
            </Card>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
