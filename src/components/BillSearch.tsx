import React, { useState } from 'react';
import { useSupabase } from '../context/SupabaseContext';
import { Card, Button } from './ClayUI';
import { Search, FileText, Printer, Download, User, Calendar, IndianRupee, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const BillSearch: React.FC = () => {
  const { customers } = useSupabase();
  const [searchId, setSearchId] = useState('');
  const [foundBill, setFoundBill] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (!searchId.trim()) return;
    
    // Clean the search string (remove # and INV- prefixes)
    const cleanId = searchId.trim().toUpperCase().replace(/^#/, '').replace(/^INV-/, '');
    
    const bill = customers.find(c => {
      const dbBillId = (c.billId || '').toUpperCase();
      const dbId = (c.id || '').toUpperCase();
      const dbName = (c.name || '').toLowerCase();
      const dbPhone = (c.phone || '');
      
      return (
        dbBillId === cleanId || 
        dbId.includes(cleanId) || 
        dbName.includes(searchId.toLowerCase()) ||
        dbPhone.includes(searchId)
      );
    });
    
    setFoundBill(bill);
    setHasSearched(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-8 pb-32 max-w-lg mx-auto min-h-[80vh]">
      {/* Header Section */}
      <div className="space-y-2">
        <h2 className="font-headline text-4xl italic text-primary">Bill Lookup</h2>
        <p className="label-caps !text-[10px] opacity-60 italic">Search certificates & receipts by Unique ID</p>
      </div>

      {/* Search Input Card */}
      <Card className="p-6 sm:p-8 bg-primary/[0.03] border-primary/10 rounded-[32px] shadow-premium relative overflow-hidden">
        <div className="flex flex-col gap-6">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Enter Bill ID (e.g. 101)"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-white border border-primary/10 pl-14 pr-6 py-5 rounded-3xl outline-none focus:ring-4 focus:ring-primary/10 transition-all text-lg font-headline italic"
            />
          </div>
          <Button 
            onClick={handleSearch}
            className="w-full py-5 rounded-3xl bg-primary text-white shadow-xl shadow-primary/30 font-headline text-xl italic flex items-center justify-center gap-3"
          >
            <Search className="w-5 h-5" />
            Find Record
          </Button>
        </div>
        
        {/* Background Decorative Element */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      </Card>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {hasSearched ? (
          foundBill ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {/* Original Saved Bill Preview */}
              {foundBill.billUrl ? (
                <div className="space-y-6">
                  <div className="aspect-[1/1.4] w-full bg-slate-100 rounded-[32px] overflow-hidden border border-primary/10 shadow-2xl relative group">
                    <iframe 
                      src={`${foundBill.billUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                      className="w-full h-full border-none"
                      title="Original Bill"
                    />
                    <div className="absolute inset-0 bg-transparent pointer-events-none group-hover:bg-primary/5 transition-colors" />
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      onClick={() => window.open(foundBill.billUrl, '_blank')}
                      className="flex-1 py-5 rounded-3xl bg-primary text-white flex items-center justify-center gap-3 font-headline text-xl italic"
                    >
                      <Printer className="w-5 h-5" />
                      Open Full Bill
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Professional Invoice Card (Fallback for older records) */}
                  <Card id="printable-bill" className="p-12 bg-white border border-slate-100 rounded-none shadow-2xl relative overflow-hidden print:shadow-none print:border-none print:p-8">
                    <div className="space-y-12">
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sumi Tailoring</h2>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Tailoring Institute | Premium ERP</p>
                        </div>
                        <div className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-green-100">
                          PAID
                        </div>
                      </div>

                      {/* Invoice Info */}
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-slate-800">Invoice</h3>
                        <p className="text-[11px] font-mono text-slate-500">#INV-{foundBill.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-400">Issued: {new Date(foundBill.createdAt).toLocaleDateString()}</p>
                      </div>

                      {/* Client & Project Info */}
                      <div className="grid grid-cols-2 gap-12">
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Client</p>
                          <p className="text-lg font-bold text-slate-900">{foundBill.name}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Project</p>
                          <p className="text-lg font-bold text-slate-900">Tailoring Service</p>
                          <p className="text-[10px] text-slate-400">ID: {foundBill.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>

                      {/* Service Details Table */}
                      <div className="space-y-4">
                        <div className="bg-slate-900 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest">
                          Service Details
                        </div>
                        <div className="px-4 space-y-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="text-[11px] font-bold text-slate-800">Tailoring & Stitching</p>
                              <p className="text-[9px] text-slate-400">Order Date: {new Date(foundBill.createdAt).toLocaleDateString()}</p>
                              <p className="text-[9px] text-slate-400">QTY: 1 @ ₹{foundBill.totalBill}</p>
                            </div>
                            <p className="text-[11px] font-bold text-slate-800">₹{foundBill.totalBill}.00</p>
                          </div>
                          
                          <div className="pt-4 border-t border-slate-100 flex justify-between">
                            <p className="text-[11px] font-bold text-slate-400">Subtotal</p>
                            <p className="text-[11px] font-bold text-slate-400">₹{foundBill.totalBill}.00</p>
                          </div>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="pt-8 border-t border-slate-100 flex justify-between items-end">
                        <div className="space-y-1">
                          <h4 className="text-xl font-black text-slate-900">Total Bill</h4>
                          <p className="text-[10px] text-slate-400 italic">Amount Paid: ₹{foundBill.totalBill - (foundBill.balance || 0)}.00</p>
                        </div>
                        <p className="text-3xl font-black text-slate-900">₹{foundBill.totalBill}.00</p>
                      </div>

                      {/* Footer */}
                      <div className="pt-20 text-center space-y-8">
                        <p className="text-[10px] text-slate-400 italic">"Thank you for choosing Sumi Tailoring. We craft excellence in every stitch."</p>
                        <div className="flex justify-center">
                          <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-300">S</div>
                        </div>
                        <p className="text-[8px] text-slate-300 uppercase tracking-widest font-bold">Authorized Master Tailor Signature</p>
                      </div>
                    </div>
                  </Card>

                  {/* Actions */}
                  <div className="flex gap-4 print:hidden">
                    <Button 
                      variant="secondary"
                      onClick={handlePrint}
                      className="flex-1 py-5 rounded-3xl flex items-center justify-center gap-3"
                    >
                      <Printer className="w-5 h-5" />
                      Print Preview
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 opacity-30"
            >
              <FileText className="w-20 h-20 mb-4 text-primary" />
              <p className="font-headline text-2xl italic">Record Not Found</p>
              <p className="label-caps !text-[9px] mt-2">Check the ID and try again</p>
            </motion.div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <FileText className="w-20 h-20 mb-4" />
            <p className="font-headline text-xl italic">Waiting for ID...</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
