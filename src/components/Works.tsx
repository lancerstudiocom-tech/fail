import React, { useState, useEffect } from 'react';
import { Card, Button } from './ClayUI';
import { Briefcase, Clock, Check, Package, ChevronRight, AlertTriangle, Camera, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { CameraStreamScanner } from './CameraStreamScanner';
import { motion, AnimatePresence } from 'motion/react';

interface WorkOrder {
  id: string;
  name: string;
  status: 'Pending' | 'Completed' | 'Out for Delivery' | 'Received';
  totalBill: number;
  balance: number;
}

export const Works: React.FC = () => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [scanningOrder, setScanningOrder] = useState<WorkOrder | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');

  const loadData = () => {
    try {
      const customers = JSON.parse(localStorage.getItem('tailor_customers') || '[]');
      setOrders(customers);
    } catch (err) {
      console.error("Load error:", err);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const updateStatus = (orderId: string, newStatus: string) => {
    try {
      const all = JSON.parse(localStorage.getItem('tailor_customers') || '[]');
      const updated = all.map((c: any) => c.id === orderId ? { ...c, status: newStatus } : c);
      localStorage.setItem('tailor_customers', JSON.stringify(updated));
      setOrders(updated);
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  const handleScanResult = async (data: any) => {
    if (!data) return;
    
    if (data.isScanning !== undefined) {
      setIsScanning(data.isScanning);
      return;
    }

    if (!scanningOrder) return;

    const scannedTotal = data.amount || 0;
    
    // Logic: Compare scanned total with order total bill
    // And check if balance is 0
    if (scannedTotal === scanningOrder.totalBill && scanningOrder.balance === 0) {
      updateStatus(scanningOrder.id, 'Received');
      setShowCamera(false);
      setScanningOrder(null);
      setScanError(null);
    } else {
      let errorMsg = "";
      if (scannedTotal !== scanningOrder.totalBill) {
        errorMsg = `Bill Mismatch: Scanned ₹${scannedTotal} vs Order ₹${scanningOrder.totalBill}. `;
      }
      if (scanningOrder.balance > 0) {
        errorMsg += `Payment Pending: ₹${scanningOrder.balance} remaining. Cannot mark as Received.`;
      }
      setScanError(errorMsg);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'tailorsuite') {
      if (scanningOrder) {
        updateStatus(scanningOrder.id, 'Received');
        setShowCamera(false);
        setShowPasswordInput(false);
        setScanningOrder(null);
        setPassword('');
        setScanError(null);
      }
    } else {
      setScanError("Incorrect Password");
      setTimeout(() => setScanError(null), 3000);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-10 pb-32 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <h2 className="font-headline text-4xl sm:text-5xl text-primary italic leading-none tracking-tight">Works Pipeline</h2>
          <p className="label-caps text-[10px] uppercase tracking-[0.3em] font-bold">Live Analysis & Order Flow</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 glass-card bg-primary/5 border border-primary/10">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"></span>
          <span className="font-label text-[10px] text-primary/60 uppercase tracking-widest font-bold">Live Analysis</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {orders.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-32 glass-card bg-primary/5">
            <div className="w-24 h-24 rounded-full glass-card-inset bg-primary/5 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-5xl text-primary/20">inventory</span>
            </div>
            <p className="label-caps !text-primary/40 uppercase tracking-[0.2em] font-bold">No active orders in pipeline</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="glass-card p-8 space-y-8 relative overflow-hidden group hover:translate-y-[-4px] transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-headline text-2xl text-primary italic group-hover:not-italic transition-all">{order.name}</h4>
                    {order.status === 'Pending' && <Clock className="w-4 h-4 text-amber-500" />}
                    {order.status === 'Completed' && <Check className="w-4 h-4 text-primary" />}
                    {order.status === 'Received' && <Package className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <p className="font-mono text-[9px] text-primary/30 uppercase tracking-tighter">ID: {order.id.slice(0, 8)}</p>
                </div>
                <div className="text-right">
                  <p className="font-headline text-2xl text-primary">₹{order.totalBill}</p>
                </div>
              </div>

              {/* Status Pipeline */}
              <div className="flex items-center justify-between relative pt-6">
                {/* Connector Line */}
                <div className="absolute top-[calc(1.5rem+16px)] left-8 right-8 h-[2px] bg-primary/5 z-0"></div>
                
                <StatusStep 
                  active={order.status === 'Pending'} 
                  icon={<Clock className={cn("w-5 h-5", order.status === 'Pending' ? "text-amber-500" : "text-primary/20")} />} 
                  label="In Progress" 
                  onClick={() => {}}
                  disabled={order.status !== 'Pending'}
                  color="text-amber-500"
                />
                
                <StatusStep 
                  active={order.status === 'Completed'} 
                  icon={<Check className={cn("w-5 h-5", order.status === 'Completed' ? "text-primary" : "text-primary/20")} />} 
                  label="Completed" 
                  onClick={() => updateStatus(order.id, 'Completed')}
                  disabled={order.status === 'Completed' || order.status === 'Out for Delivery' || order.status === 'Received'}
                  color="text-primary"
                />

                <StatusStep 
                  active={order.status === 'Out for Delivery'} 
                  icon={<Camera className={cn("w-5 h-5", order.status === 'Out for Delivery' ? "text-purple-500" : "text-primary/20")} />} 
                  label="Clearance" 
                  onClick={() => {
                    setScanningOrder(order);
                    setShowCamera(true);
                  }}
                  disabled={order.status !== 'Completed'}
                  color="text-purple-500"
                />
                
                <StatusStep 
                  active={order.status === 'Received'} 
                  icon={<Package className={cn("w-5 h-5", order.status === 'Received' ? "text-emerald-500" : "text-primary/20")} />} 
                  label="Delivered" 
                  onClick={() => {}}
                  disabled={true}
                  color="text-emerald-500"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Camera Scanner for Final Clearance */}
      {showCamera && (
        <div className="fixed inset-0 z-[150] bg-black">
          <CameraStreamScanner 
            onResult={handleScanResult}
            onClose={() => {
              setShowCamera(false);
              setScanningOrder(null);
              setScanError(null);
              setShowPasswordInput(false);
              setPassword('');
            }}
            isScanning={isScanning}
            title="Final Bill Verification"
            subtitle="Scan the settled bill to unlock delivery"
          />
          
          {/* Password Approval Button */}
          <div className="absolute top-6 right-6 z-[200]">
            <Button 
              onClick={() => setShowPasswordInput(true)}
              variant="secondary"
              className="bg-white/10 backdrop-blur-md border-white/20 text-white px-6 py-3 rounded-full flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Password Approval
            </Button>
          </div>

          {/* Password Input Modal */}
          <AnimatePresence>
            {showPasswordInput && (
              <div className="absolute inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full max-w-sm glass-card p-10 space-y-8"
                >
                  <div className="space-y-2 text-center">
                    <h3 className="font-headline text-3xl text-primary italic">Clearance Approval</h3>
                    <p className="label-caps text-[10px] uppercase tracking-widest font-bold">Enter Institute Approval Password</p>
                  </div>
                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <input 
                      autoFocus
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••"
                      className="w-full input-premium text-center text-2xl tracking-[0.5em] text-primary"
                    />
                    <div className="flex gap-4">
                      <Button 
                        type="button"
                        onClick={() => {
                          setShowPasswordInput(false);
                          setPassword('');
                        }}
                        variant="secondary"
                        className="flex-1 py-4 rounded-full"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        variant="primary"
                        className="flex-1 py-4 rounded-full"
                      >
                        Approve
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
          
          {scanError && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm">
              <div className="bg-error text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-bold uppercase tracking-wider">{scanError}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface StatusStepProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
  disabled?: boolean;
}

const StatusStep: React.FC<StatusStepProps> = ({ active, icon, label, onClick, color, disabled }) => {
  return (
    <button 
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-4 z-10 group/step transition-all duration-300",
        disabled && !active && "opacity-20 cursor-not-allowed grayscale"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 glass-card",
        active 
          ? `bg-white ${color} scale-110 shadow-lg` 
          : "bg-primary/5 text-primary/20",
        !disabled && !active && "hover:bg-primary/10 hover:text-primary/40 hover:scale-105"
      )}>
        {icon}
      </div>
      <span className={cn(
        "font-label text-[8px] uppercase tracking-[0.2em] transition-colors duration-300 font-bold",
        active ? "text-primary" : "text-primary/20"
      )}>
        {label}
      </span>
    </button>
  );
};
