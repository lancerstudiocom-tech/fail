import React, { useState, useEffect } from 'react';
import { useSupabase } from '../context/SupabaseContext';
import { Card, Button } from './ClayUI';
import { Briefcase, Clock, Check, Package, ChevronRight, AlertTriangle, Camera, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import { FileText } from 'lucide-react';

interface WorkOrder {
  id: string;
  name: string;
  status: 'Pending' | 'Completed' | 'Out for Delivery' | 'Received';
  totalBill: number;
  balance: number;
}

export const Works: React.FC = React.memo(() => {
  const { customers: orders, updateRecord, loading: contextLoading } = useSupabase();
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateRecord('customers', orderId, { status: newStatus });
    } catch (err) {
      console.error("Update error:", err);
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
                <div className="absolute top-[calc(1.5rem+16px)] left-8 right-8 h-[2px] bg-primary/15 z-0"></div>
                
                <StatusStep 
                  active={order.status === 'Pending'} 
                  icon={<Clock className={cn("w-5 h-5", order.status === 'Pending' ? "text-amber-500" : "text-primary/20")} />} 
                  label="In Progress" 
                  onClick={() => updateStatus(order.id, 'Pending')}
                  disabled={order.status === 'Pending'}
                  color="text-amber-500"
                />
                
                <StatusStep 
                  active={order.status === 'Completed'} 
                  icon={<Check className={cn("w-5 h-5", order.status === 'Completed' ? "text-primary" : "text-primary/20")} />} 
                  label="Completed" 
                  onClick={() => updateStatus(order.id, 'Completed')}
                  disabled={order.status === 'Completed' || order.status === 'Received'}
                  color="text-primary"
                />
                
                <StatusStep 
                  active={order.status === 'Received'} 
                  icon={<Package className={cn("w-5 h-5", order.status === 'Received' ? "text-emerald-500" : "text-primary/20")} />} 
                  label="Delivered" 
                  onClick={() => updateStatus(order.id, 'Received')}
                  disabled={order.status !== 'Completed'}
                  color="text-emerald-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  onClick={async () => {
                    if (order.balance > 0) return;

                    // SMART DATE LOGIC
                    let currentReceiptNo = (order as any).receipt_no || "";
                    let [orderDate, deliveryDate] = currentReceiptNo.split(' | ');
                    let finalDeliveryDate = deliveryDate;

                    // If delivery date is TBD, set it to Today and update DB
                    if (!deliveryDate || deliveryDate === 'TBD') {
                      finalDeliveryDate = new Date().toLocaleDateString('en-GB');
                      const updatedReceiptNo = `${orderDate || new Date().toLocaleDateString('en-GB')} | ${finalDeliveryDate}`;
                      await updateRecord('customers', order.id, {
                        receipt_no: updatedReceiptNo
                      });
                    }

                    generateInvoicePDF({
                      invoiceNumber: `INV-${order.id.slice(0,8).toUpperCase()}`,
                      date: finalDeliveryDate, // Use the Delivery Date as the bill date
                      clientName: order.name,
                      projectName: "Tailoring Service",
                      projectId: order.id.slice(0,8).toUpperCase(),
                      items: [
                        { name: "Tailoring & Stitching", description: `Order Date: ${orderDate || 'N/A'}`, quantity: 1, unitPrice: order.totalBill, total: order.totalBill }
                      ],
                      subtotal: order.totalBill,
                      totalAmount: order.totalBill,
                      amountPaid: order.totalBill - order.balance,
                      balance: order.balance,
                      isPaid: order.balance === 0,
                      autoPrint: true
                    });
                  }}
                  variant={order.balance > 0 ? "secondary" : "secondary"}
                  disabled={order.balance > 0}
                  className={cn(
                    "flex-1 py-3 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all duration-300",
                    order.balance > 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/10"
                  )}
                >
                  {order.balance > 0 ? (
                    <>
                      <Lock className="w-3 h-3" />
                      Locked
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3" />
                      Invoice
                    </>
                  )}
                </Button>

                <Button 
                  onClick={() => {}} 
                  className="flex-1 py-3 text-[10px] uppercase tracking-widest font-bold"
                  variant="primary"
                >
                  Share
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
});

interface StatusStepProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
  disabled?: boolean;
}

const StatusStep: React.FC<StatusStepProps> = React.memo(({ active, icon, label, onClick, color, disabled }) => {
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
          : "bg-primary/5 text-primary/40",
        !disabled && !active && "hover:bg-primary/10 hover:text-primary/40 hover:scale-105"
      )}>
        {icon}
      </div>
      <span className={cn(
        "font-label text-[8px] uppercase tracking-[0.2em] transition-colors duration-300 font-bold text-center",
        active ? "text-primary" : "text-primary/60"
      )}>
        {label}
      </span>
    </button>
  );
});
