import React, { useState, useEffect } from 'react';
import { useSupabase } from '../context/SupabaseContext';
import { Card, Button } from './ClayUI';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Plus, Trash2, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface InventoryItem {
  id: string;
  name: string;
  totalQuantityBought: number;
  quantityRemaining: number;
  costPerItem: number;
  totalCost: number;
  isPending?: boolean;
}

interface InventoryTransaction {
  id: string;
  itemId: string;
  type: 'usage' | 'sale';
  quantity: number;
  sellingPrice?: number;
  profit?: number;
  date: string;
}

export const Stock: React.FC = React.memo(() => {
  const { inventory: items, inventoryTransactions, addRecord, updateRecord, deleteRecord, loading: contextLoading } = useSupabase();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    totalQuantityBought: 0,
    costPerItem: 0
  });
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const record = {
        ...newItem,
        quantityRemaining: newItem.totalQuantityBought,
        totalCost: newItem.totalQuantityBought * newItem.costPerItem,
      };

      await addRecord('inventory', record);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowAddModal(false);
        setNewItem({
          name: '',
          totalQuantityBought: 0,
          costPerItem: 0
        });
      }, 1000);
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await deleteRecord('inventory', itemToDelete.id);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  const removeAllStock = async () => {
    try {
      await Promise.all(items.map(item => deleteRecord('inventory', item.id)));
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Purge Error:", error);
    }
  };

  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [usageAmount, setUsageAmount] = useState<string>('');
  const [usageType, setUsageType] = useState<'usage' | 'sale'>('usage');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [isRecordingUsage, setIsRecordingUsage] = useState(false);

  const handleUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !usageAmount) return;

    const amount = Number(usageAmount);
    const sPrice = Number(sellingPrice) || 0;

    setIsRecordingUsage(true);
    try {
      // 1. Update Inventory
      await updateRecord('inventory', selectedItem.id, {
        quantityRemaining: Number(selectedItem.quantityRemaining) - amount
      });

      // 2. Record Transaction
      const profit = usageType === 'sale' ? (sPrice - selectedItem.costPerItem) * amount : 0;
      await addRecord('inventory_transactions', {
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        type: usageType,
        quantity: amount,
        sellingPrice: usageType === 'sale' ? sPrice : null,
        profit,
        date: new Date().toISOString()
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowUsageModal(false);
        setSelectedItem(null);
        setUsageAmount('');
        setUsageType('usage');
        setSellingPrice('');
      }, 1000);
    } catch (err) {
      console.error("Usage error:", err);
    } finally {
      setIsRecordingUsage(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-10 pb-32 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <h2 className="font-headline text-4xl sm:text-5xl text-primary italic leading-none tracking-tight">Stock Management</h2>
          <p className="label-caps !text-primary/40 mt-1">Inventory Control & Resource Tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setShowAddModal(true)}
            variant="primary"
            className="px-8 py-4 rounded-full shadow-premium"
          >
            <Plus className="w-5 h-5" />
            New Stock
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="p-6 glass-card flex flex-col gap-3">
          <p className="label-caps !text-[9px]">Total Investment</p>
          <p className="font-headline text-2xl text-primary italic">₹{items.reduce((acc, i) => acc + i.totalCost, 0)}</p>
        </Card>
        <Card className="p-6 glass-card flex flex-col gap-3">
          <p className="label-caps !text-[9px]">Remaining Value</p>
          <p className="font-headline text-2xl text-primary italic">₹{items.reduce((acc, i) => acc + (i.quantityRemaining * i.costPerItem), 0)}</p>
        </Card>
        <Card className="p-6 glass-card flex flex-col gap-3">
          <p className="label-caps !text-[9px]">Low Stock Alert</p>
          <p className="font-headline text-2xl text-rose-600 italic">
            {items.filter(i => (i.quantityRemaining / i.totalQuantityBought) < 0.2).length} Items
          </p>
        </Card>
        <Card className="p-6 glass-card flex flex-col gap-3">
          <p className="label-caps !text-[9px]">Profit (Sales)</p>
          <p className="font-headline text-2xl text-emerald-600 italic">
            ₹{inventoryTransactions.reduce((acc: number, t: any) => acc + (t.profit || 0), 0)}
          </p>
        </Card>
      </div>

      {/* Stock List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-32 text-center opacity-40 px-6">
            <Package className="w-16 h-16 mb-4 text-primary" />
            <div className="max-w-[280px] mx-auto space-y-1">
              <p className="font-headline text-xl tracking-tight italic">No stock records</p>
              <p className="font-body text-sm">Add items to track your inventory</p>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="p-6 flex flex-col gap-4 glass-card transition-all hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-headline text-lg tracking-tight text-primary italic">{item.name}</h4>
                    <button 
                      onClick={() => {
                        setItemToDelete(item);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="font-mono text-[10px] text-pink-500 uppercase tracking-wider font-bold">₹{item.costPerItem} / unit</p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-headline text-2xl text-primary leading-none italic">{item.quantityRemaining}</p>
                  <p className="label-caps !text-[8px] mt-1">Remaining</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <p className="label-caps !text-[9px]">Stock Level</p>
                  <p className="font-mono text-[10px] text-primary/60 font-bold">{Math.round((item.quantityRemaining / item.totalQuantityBought) * 100)}%</p>
                </div>
                <div className="h-1.5 bg-primary/5 rounded-full overflow-hidden glass-card-inset">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.quantityRemaining / item.totalQuantityBought) * 100}%` }}
                    className={cn(
                      "h-full transition-all duration-1000",
                      (item.quantityRemaining / item.totalQuantityBought) < 0.2 ? "bg-rose-500" : "bg-primary"
                    )}
                  />
                </div>
              </div>

              <Button 
                onClick={() => {
                  setSelectedItem(item);
                  setShowUsageModal(true);
                }}
                variant="secondary"
                className="w-full mt-2 text-[10px] uppercase tracking-widest font-bold rounded-xl"
                disabled={item.isPending || item.quantityRemaining === 0}
              >
                Record Usage
              </Button>
            </Card>
          ))
        )}
      </div>

      {/* Usage Modal */}
      <AnimatePresence>
        {showUsageModal && selectedItem && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm glass-card p-8 relative overflow-hidden"
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
                        <Check className="text-white w-10 h-10" />
                      </div>
                      <p className="font-headline text-2xl tracking-tight text-primary italic">Usage Recorded</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col gap-1 mb-6">
                  <h3 className="font-headline text-3xl tracking-tight text-primary italic">Record Usage</h3>
                  <p className="label-caps !text-[10px]">{selectedItem.name}</p>
                </div>

                <form onSubmit={handleRecordUsage} className="flex flex-col gap-6">
                  <div className="flex p-1 bg-primary/5 rounded-2xl">
                    <button 
                      type="button"
                      onClick={() => setUsageType('usage')}
                      className={cn(
                        "flex-1 py-3 rounded-xl label-caps !text-[10px] transition-all",
                        usageType === 'usage' ? "bg-white text-primary shadow-sm" : "text-primary/40"
                      )}
                    >
                      Usage
                    </button>
                    <button 
                      type="button"
                      onClick={() => setUsageType('sale')}
                      className={cn(
                        "flex-1 py-3 rounded-xl label-caps !text-[10px] transition-all",
                        usageType === 'sale' ? "bg-white text-primary shadow-sm" : "text-primary/40"
                      )}
                    >
                      Sale
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="label-caps !text-[10px]">Quantity</label>
                    <div className="relative">
                      <input 
                        required
                        type="number" 
                        value={usageAmount}
                        onChange={e => setUsageAmount(e.target.value)}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all"
                        placeholder="0"
                        max={selectedItem.quantityRemaining}
                      />
                    </div>
                  </div>

                  {usageType === 'sale' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <label className="label-caps !text-[10px]">Selling Price (₹)</label>
                      <input 
                        required
                        type="number" 
                        value={sellingPrice}
                        onChange={e => setSellingPrice(e.target.value)}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all"
                        placeholder="0.00"
                      />
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button type="button" onClick={() => setShowUsageModal(false)} className="flex-1 py-4" variant="secondary">Cancel</Button>
                    <Button type="submit" className="flex-1 py-4" variant="primary" disabled={isRecordingUsage}>
                      {isRecordingUsage ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm'}
                    </Button>
                  </div>
                </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm glass-card p-8 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6 text-rose-500">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="font-headline text-2xl tracking-tight text-primary italic mb-2">Are you sure?</h3>
              <p className="font-body text-sm text-primary/60 mb-8 px-4 leading-relaxed">
                {itemToDelete 
                  ? `Do you really want to delete "${itemToDelete.name}"? This action cannot be undone.`
                  : "Do you really want to clear ALL stock items? This action cannot be undone."
                }
              </p>
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={itemToDelete ? handleDeleteItem : removeAllStock}
                  className="w-full bg-rose-500 text-white border-none py-5 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                >
                  Yes, Delete
                </Button>
                <Button 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setItemToDelete(null);
                  }}
                  variant="secondary"
                  className="w-full rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Stock Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card p-10 relative overflow-hidden"
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
                        <Check className="text-white w-10 h-10" />
                      </div>
                      <p className="font-headline text-2xl tracking-tight text-primary italic">Item Added</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col gap-1">
                  <h3 className="font-headline text-3xl tracking-tight text-primary italic">New Stock</h3>
                  <p className="font-label text-[10px] uppercase tracking-widest text-primary/40 font-bold">Inventory Entry</p>
                </div>

                <form onSubmit={handleAddItem} className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <label className="font-label text-[10px] uppercase tracking-widest text-primary/60 px-1 font-bold">Item Name</label>
                    <input 
                      required
                      type="text" 
                      value={newItem.name}
                      onChange={e => setNewItem({...newItem, name: e.target.value})}
                      className="w-full input-premium px-5 py-4 text-sm font-body outline-none transition-all text-primary placeholder:text-primary/20"
                      placeholder="e.g. Premium Silk Thread"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-label text-[10px] uppercase tracking-widest text-primary/60 px-1 font-bold">Quantity</label>
                      <input 
                        required
                        type="number" 
                        value={newItem.totalQuantityBought || ''}
                        onChange={e => setNewItem({...newItem, totalQuantityBought: Number(e.target.value)})}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all text-black"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-label text-[10px] uppercase tracking-widest text-primary/60 px-1 font-bold">Unit Cost (₹)</label>
                      <input 
                        required
                        type="number" 
                        value={newItem.costPerItem || ''}
                        onChange={e => setNewItem({...newItem, costPerItem: Number(e.target.value)})}
                        className="w-full input-premium px-5 py-4 text-sm font-mono outline-none transition-all text-black"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4" variant="secondary">Cancel</Button>
                    <Button type="submit" className="flex-1 py-4" variant="primary">Add Item</Button>
                  </div>
                </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
