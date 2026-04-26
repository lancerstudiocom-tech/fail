import React, { useState, useEffect } from 'react';
import { Card, Button } from './ClayUI';
import { motion, AnimatePresence } from 'motion/react';
import { Users, IndianRupee, AlertCircle, TrendingUp, Package, ChevronRight, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSupabase } from '../context/SupabaseContext';

interface DashboardProps {
  onStudentClick?: (student: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = React.memo(({ onStudentClick }) => {
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

  const { students, studentCourses, payments, inventory, inventoryTransactions } = useSupabase();

  useEffect(() => {
    const calculateStats = () => {
      setStats({
        totalStudents: students.length,
        totalCoursesSold: studentCourses.length,
        totalFeesCollected: 0,
        totalPendingAmount: 0,
        revenueThisMonth: 0,
        inventoryInvestment: 0,
        inventoryProfit: 0,
        lowStockCount: 0
      });
      setPendingStudents([]);
    };
    calculateStats();
  }, [students, studentCourses, payments, inventory, inventoryTransactions]);

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-primary/10 border-t-primary animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col gap-6 px-4 pt-6 pb-32 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="font-headline text-4xl text-primary italic leading-none tracking-tight">Sumi Tailoring Institute</h2>
        <p className="label-caps text-[10px] uppercase tracking-[0.3em] font-bold">Business Performance Dashboard</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="glass-card p-5 flex flex-col gap-4 group hover:translate-y-[-5px]">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-700 shadow-premium">
            <Users className="text-primary w-6 h-6" />
          </div>
          <div>
            <p className="font-headline text-3xl text-primary italic leading-none drop-shadow-sm">{stats.totalStudents}</p>
            <p className="label-caps mt-2 text-[8px]">Students</p>
          </div>
        </Card>

        <Card className="glass-card p-5 flex flex-col gap-4 group hover:translate-y-[-5px]">
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-700 shadow-premium">
            <IndianRupee className="text-pink-600 w-6 h-6" />
          </div>
          <div>
            <p className="font-headline text-3xl text-pink-600 italic leading-none drop-shadow-sm">₹{stats.totalFeesCollected}</p>
            <p className="label-caps mt-2 text-[8px]">Revenue</p>
          </div>
        </Card>

        <Card className="glass-card p-5 flex flex-col gap-4 group hover:translate-y-[-5px]">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-700 shadow-premium">
            <AlertCircle className="text-rose-600 w-6 h-6" />
          </div>
          <div>
            <p className="font-headline text-3xl text-rose-600 italic leading-none drop-shadow-sm">₹{stats.totalPendingAmount}</p>
            <p className="label-caps mt-2 text-[8px]">Outstandings</p>
          </div>
        </Card>

        <Card className="glass-card p-5 flex flex-col gap-4 group hover:translate-y-[-5px]">
          <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-700 shadow-premium">
            <TrendingUp className="text-fuchsia-600 w-6 h-6" />
          </div>
          <div>
            <p className="font-headline text-3xl text-fuchsia-600 italic leading-none drop-shadow-sm">₹{stats.revenueThisMonth}</p>
            <p className="label-caps mt-2 text-[8px]">Performance</p>
          </div>
        </Card>
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
});
