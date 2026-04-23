import React, { useState, useEffect } from 'react';
import { Card, Button } from './ClayUI';
import { motion, AnimatePresence } from 'motion/react';
import { Users, IndianRupee, AlertCircle, TrendingUp, Package, ChevronRight, Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardProps {
  onScanClick?: () => void;
  onStudentClick?: (student: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onScanClick, onStudentClick }) => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCoursesSold: 0,
    totalFeesCollected: 0,
    totalPendingAmount: 0,
    revenueThisMonth: 0,
    inventoryInvestment: 0,
    inventoryProfit: 0,
    lowStockCount: 0
  });
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      try {
        // 1. Students & Fees
        const students = JSON.parse(localStorage.getItem('tailor_students') || '[]');
        const totalStudents = students.length;
        const totalFeesCollected = students.reduce((acc: number, s: any) => acc + (Number(s.amountPaid) || 0), 0);
        const totalPendingAmount = students.reduce((acc: number, s: any) => acc + (Number(s.balance) || 0), 0);
        const pending = students.filter((s: any) => Number(s.balance) > 0).sort((a: any, b: any) => b.balance - a.balance);

        // 2. Courses Sold
        const courses = JSON.parse(localStorage.getItem('tailor_student_courses') || '[]');
        const totalCoursesSold = courses.length;

        // 3. Revenue This Month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const payments = JSON.parse(localStorage.getItem('tailor_payments') || '[]');
        const revenueThisMonth = payments.reduce((acc: number, p: any) => {
          const pDate = new Date(p.date).getTime();
          return pDate >= startOfMonth ? acc + (Number(p.amount) || 0) : acc;
        }, 0);

        // 4. Inventory
        const inventory = JSON.parse(localStorage.getItem('tailor_inventory') || '[]');
        const inventoryInvestment = inventory.reduce((acc: number, item: any) => acc + (Number(item.totalCost) || 0), 0);
        const lowStockCount = inventory.filter((item: any) => (Number(item.quantityRemaining) / Number(item.totalQuantityBought)) < 0.2).length;

        // 5. Inventory Profit
        const transactions = JSON.parse(localStorage.getItem('tailor_inventory_transactions') || '[]');
        const inventoryProfit = transactions.reduce((acc: number, t: any) => acc + (Number(t.profit) || 0), 0);

        setStats({
          totalStudents,
          totalCoursesSold,
          totalFeesCollected,
          totalPendingAmount,
          revenueThisMonth,
          inventoryInvestment,
          inventoryProfit,
          lowStockCount
        });
        setPendingStudents(pending);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-primary/10 border-t-primary animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col gap-10 px-6 pt-10 pb-32 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="font-headline text-4xl text-primary italic leading-none tracking-tight">Sumi Tailoring Institute</h2>
        <p className="label-caps text-[10px] uppercase tracking-[0.3em] font-bold">Business Performance Dashboard</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="glass-card p-8 flex flex-col gap-6 group hover:translate-y-[-5px]">
          <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-700 shadow-premium">
            <Users className="text-primary w-8 h-8" />
          </div>
          <div>
            <p className="font-headline text-5xl text-primary italic leading-none drop-shadow-sm">{stats.totalStudents}</p>
            <p className="label-caps mt-3">Students Enrolled</p>
          </div>
        </Card>

        <Card className="glass-card p-8 flex flex-col gap-6 group hover:translate-y-[-5px]">
          <div className="w-16 h-16 rounded-[1.5rem] bg-pink-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-700 shadow-premium">
            <IndianRupee className="text-pink-600 w-8 h-8" />
          </div>
          <div>
            <p className="font-headline text-5xl text-pink-600 italic leading-none drop-shadow-sm">₹{stats.totalFeesCollected}</p>
            <p className="label-caps mt-3">Gross Revenue</p>
          </div>
        </Card>

        <Card className="glass-card p-8 flex flex-col gap-6 group hover:translate-y-[-5px]">
          <div className="w-16 h-16 rounded-[1.5rem] bg-rose-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-700 shadow-premium">
            <AlertCircle className="text-rose-600 w-8 h-8" />
          </div>
          <div>
            <p className="font-headline text-5xl text-rose-600 italic leading-none drop-shadow-sm">₹{stats.totalPendingAmount}</p>
            <p className="label-caps mt-3">Outstandings</p>
          </div>
        </Card>

        <Card className="glass-card p-8 flex flex-col gap-6 group hover:translate-y-[-5px]">
          <div className="w-16 h-16 rounded-[1.5rem] bg-fuchsia-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-700 shadow-premium">
            <TrendingUp className="text-fuchsia-600 w-8 h-8" />
          </div>
          <div>
            <p className="font-headline text-5xl text-fuchsia-600 italic leading-none drop-shadow-sm">₹{stats.revenueThisMonth}</p>
            <p className="label-caps mt-3">Month Performance</p>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4">
        <Button 
          variant="primary" 
          className="btn-premium w-full py-6 flex items-center justify-between group"
          onClick={onScanClick}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
              <span className="material-symbols-outlined text-white text-2xl">center_focus_strong</span>
            </div>
            <div className="text-left">
              <p className="font-headline text-xl italic leading-none">Scan Quick Entry</p>
              <p className="label-caps text-white mt-1">Receipt to Record</p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-white/40" />
        </Button>
      </div>


      {/* Pending Students Section */}
      <div className="h-[2px] bg-primary/5 w-full"></div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-error w-5 h-5" />
            <h3 className="font-headline text-2xl text-primary italic">Pending Students</h3>
          </div>
          <p className="font-label text-[10px] text-primary uppercase tracking-widest font-bold">{pendingStudents.length} Records</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {pendingStudents.length === 0 ? (
            <div className="py-16 px-6 text-center glass-card bg-primary/5 border-dashed border-2 border-primary/10">
              <p className="label-caps !text-primary/40">All accounts settled</p>
            </div>
          ) : (
            pendingStudents.slice(0, 5).map((student) => (
              <div 
                key={student.id}
                onClick={() => onStudentClick?.(student)}
                className="glass-card p-6 flex items-center justify-between group cursor-pointer hover:border-primary/40 transition-all duration-500"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center font-headline text-2xl text-primary italic">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-headline text-xl text-primary italic leading-none">{student.name}</h4>
                    <p className="label-caps mt-2">{student.course}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-6">
                  <div>
                    <p className="font-headline text-2xl text-rose-500 italic leading-none">₹{student.balance}</p>
                    <p className="label-caps mt-1 text-rose-500/40">Balance</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-primary/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))
          )}
          {pendingStudents.length > 5 && (
            <p className="text-center font-label text-[9px] text-primary/40 uppercase tracking-widest font-bold pt-2">
              + {pendingStudents.length - 5} more pending records
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
