import React, { useState, useEffect, useRef } from 'react';
import { useSupabase } from '../context/SupabaseContext';
import { Card, Button } from './ClayUI';
import { Plus, Trash2, UserPlus, Search, Users, X, Check, Loader2, FileDown, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateReceiptId } from '../lib/utils';
import { cn } from '../lib/utils';

import { generateInvoicePDF } from '../utils/invoiceGenerator';
import { generateCertificatePDF } from '../utils/certificateGenerator';
import { FileText, Award } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  phone?: string;
  courses: string[];
  totalFee: number;
  amountPaid: number;
  balance: number;
  initialAmount?: number;
}

interface StudentCourse {
  id: string;
  studentId: string;
  courseName: string;
  amountPaid: number;
  receiptNo: string;
  date: string;
  paymentMethod?: string;
  createdAt: any;
}

interface Payment {
  id: string;
  studentId: string;
  amount: number;
  type: 'credit' | 'debit';
  method: string;
  notes: string;
  date: string;
}

interface StudentsProps {
  initialSelectedId?: string | null;
}

export const Students: React.FC<StudentsProps> = React.memo(({ initialSelectedId }) => {
  const { courses, students, payments, studentCourses, addRecord, updateRecord, deleteRecord, loading: contextLoading } = useSupabase();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentPayments, setStudentPayments] = useState<Payment[]>([]);
  const [currentStudentCourses, setCurrentStudentCourses] = useState<StudentCourse[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newStudent, setNewStudent] = useState({
    name: '',
    phone: '',
    courses: [] as { name: string; amount: number }[],
    totalFee: 0,
    initialAmount: 0,
    amountPaid: 0,
    receiptNumber: '',
    date: '',
    paymentMethod: '',
    rawText: ''
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedId) {
      const student = students.find(s => s.id === initialSelectedId);
      if (student) setSelectedStudent(student);
    }
  }, [initialSelectedId, students]);

  // Auto-calculate total fee when courses change
  useEffect(() => {
    if (isSaving) return; // Don't calculate while saving
    const sum = newStudent.courses.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
    if (sum !== newStudent.totalFee) {
      setNewStudent(prev => ({ ...prev, totalFee: sum }));
    }
  }, [newStudent.courses, isSaving]);

  useEffect(() => {
    if (selectedStudent) {
      const filteredPayments = payments
        .filter((p: any) => p.studentId === selectedStudent.id)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });
      setStudentPayments(filteredPayments as Payment[]);

      const filteredCourses = studentCourses.filter((c: any) => c.studentId === selectedStudent.id);
      setCurrentStudentCourses(filteredCourses);
    } else {
      setStudentPayments([]);
      setPaymentAmount('');
      setCurrentStudentCourses([]);
    }
  }, [selectedStudent, payments, studentCourses]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !paymentAmount) return;

    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsRecordingPayment(true);
    try {
      const receiptNo = generateReceiptId('PAY');
      const paymentData = {
        studentId: selectedStudent.id,
        amount: amount,
        type: 'credit',
        method: 'Cash',
        notes: 'Tuition Payment',
        date: new Date().toISOString(),
        receipt_no: receiptNo
      };

      // 1. Add Payment Record
      await addRecord('payments', paymentData);

      // 2. Update Student Record
      await updateRecord('students', selectedStudent.id, {
        amountPaid: (selectedStudent.amountPaid || 0) + amount,
        balance: (selectedStudent.balance || 0) - amount
      });

      setPaymentAmount('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone?.includes(searchQuery) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.courses?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const [balance, setBalance] = useState(0);

  useEffect(() => {
    setBalance(newStudent.totalFee - newStudent.initialAmount);
  }, [newStudent.totalFee, newStudent.initialAmount]);

  const handleAddStudent = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!newStudent.name) {
      alert("Please enter a student name");
      return;
    }

    // Check for duplicate name
    const isDuplicate = students.some(s => s.name?.toLowerCase().trim() === newStudent.name.toLowerCase().trim());
    if (isDuplicate) {
      const confirmed = window.confirm(`A student named "${newStudent.name}" already exists. Are you sure you want to save a duplicate record?`);
      if (!confirmed) {
        return;
      }
    }

    setIsSaving(true);
    try {
      const totalFee = Number(newStudent.totalFee) || 0;
      const initialAmount = Number(newStudent.initialAmount) || 0;
      const balanceValue = totalFee - initialAmount;
      const receiptNo = newStudent.receiptNumber || generateReceiptId('ST');

      // 1. Save Student
      const studentId = await addRecord('students', {
        name: newStudent.name,
        phone: newStudent.phone || 'N/A',
        courses: newStudent.courses.map(c => c.name),
        totalFee: totalFee,
        amountPaid: initialAmount,
        balance: balanceValue
      });

      // 2. Save Course Records
      for (const course of newStudent.courses) {
        await addRecord('student_courses', {
          studentId,
          courseName: course.name,
          amountPaid: course.amount || 0,
          receiptNo: newStudent.receiptNumber || 'N/A',
          date: newStudent.date || new Date().toISOString().split('T')[0],
          paymentMethod: newStudent.paymentMethod || 'Cash'
        });
      }

      // 3. Save Payment Record
      if (initialAmount > 0) {
        await addRecord('payments', {
          studentId,
          amount: initialAmount,
          type: 'credit',
          method: newStudent.paymentMethod || 'Cash',
          notes: `Initial payment for: ${newStudent.courses.map(c => c.name).join(', ')}`,
          date: new Date().toISOString(),
          receipt_no: receiptNo
        });
      }

      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        setShowAddModal(false);
        setNewStudent({ 
          name: '', 
          phone: '',
          courses: [], 
          totalFee: 0, 
          initialAmount: 0, 
          amountPaid: 0,
          receiptNumber: '',
          date: '',
          paymentMethod: '',
          rawText: ''
        });
      }, 1000);
    } catch (error: any) {
      console.error("Save Error:", error);
      alert("Error: Could not save record");
    } finally {
      setIsSaving(false);
    }
  };

  const removeAllStudents = async () => {
    try {
      await Promise.all(students.map(s => deleteRecord('students', s.id)));
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Purge Error:", error);
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      // 1. Delete all related payments to satisfy foreign key constraints
      const relatedPayments = payments.filter(p => p.studentId === id);
      for (const p of relatedPayments) {
        await deleteRecord('payments', p.id);
      }

      // 2. Delete all related course records
      const relatedCourses = studentCourses.filter(c => c.studentId === id);
      for (const c of relatedCourses) {
        await deleteRecord('student_courses', c.id);
      }

      // 3. Finally, delete the student record itself
      await deleteRecord('students', id);
      
      setSelectedStudent(null);
      setStudentToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error: any) {
      console.error("Delete Error:", error);
      alert("Failed to delete student: " + (error.message || "Please check your connection."));
      setShowDeleteConfirm(false);
    }
  };

  const exportToPDF = () => {
    const doc = new (window as any).jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(`Institute Records: Master Student Summary`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add table
    const tableColumn = ["ID", "Name", "Course", "Total Fee", "Paid", "Balance"];
    const tableRows = filteredStudents.map(student => [
      student.id.slice(-8).toUpperCase(),
      student.name,
      student.courses?.join(', ') || '',
      `INR ${student.totalFee}`,
      `INR ${student.amountPaid}`,
      `INR ${student.balance}`
    ]);

    (window as any).autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [255, 45, 120] }, // Brand Pink
      styles: { fontSize: 8 },
    });

    // Add summary
    const totalCollected = filteredStudents.reduce((acc, s) => acc + s.amountPaid, 0);
    const totalOutstanding = filteredStudents.reduce((acc, s) => acc + s.balance, 0);
    
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Collected: INR ${totalCollected}`, 14, finalY + 15);
    doc.text(`Total Outstanding: INR ${totalOutstanding}`, 14, finalY + 25);

    doc.save(`Institute_Records_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-10 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <h2 className="font-headline text-4xl sm:text-5xl text-primary italic leading-none tracking-tight">Student Records</h2>
          <p className="label-caps text-[10px] uppercase tracking-[0.3em] font-bold">Financial Records & Enrollment</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/40">search</span>
            <input 
              type="text"
              placeholder="Search Records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full input-premium pl-12 py-3"
            />
          </div>
          <div className="flex gap-4">
            <Button 
              onClick={() => setShowDeleteConfirm(true)}
              variant="secondary"
              className="w-12 h-12 rounded-full flex items-center justify-center p-0"
            >
              <span className="material-symbols-outlined text-xl">delete_sweep</span>
            </Button>
            <Button 
              onClick={() => {
                setNewStudent({
                  name: '',
                  phone: '',
                  courses: [],
                  totalFee: 0,
                  initialAmount: 0,
                  amountPaid: 0,
                  receiptNumber: '',
                  date: new Date().toISOString().split('T')[0],
                  paymentMethod: 'Cash',
                  rawText: ''
                });
                setShowAddModal(true);
              }}
              variant="primary"
              className="flex-1 sm:flex-none btn-premium"
            >
              <Plus className="w-5 h-5" />
              New Student
            </Button>
            <Button 
              onClick={exportToPDF}
              variant="secondary"
              className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-full"
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 glass-card bg-white/50 border-dashed border-2 px-6">
            <div className="w-24 h-24 rounded-full glass-card bg-primary/5 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-5xl text-primary/20">group</span>
            </div>
            <p className="font-label text-xs text-primary/40 uppercase tracking-[0.2em] font-bold text-center max-w-[280px]">No student records found</p>
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div 
              key={student.id} 
              onClick={() => setSelectedStudent(student)}
              className="glass-card p-6 sm:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-8 group relative overflow-hidden cursor-pointer hover:translate-y-[-2px] transition-all duration-200"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 w-full">
                <div className="flex items-center gap-6 sm:gap-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full glass-card bg-primary/5 flex items-center justify-center font-headline text-3xl sm:text-4xl text-primary italic shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div className="min-w-0 space-y-2 flex-1">
                    <h4 className="font-headline text-2xl sm:text-3xl text-primary leading-tight truncate group-hover:italic transition-all">{student.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                        <span className="material-symbols-outlined text-xs text-primary">school</span>
                        <p className="font-label text-[9px] text-primary/60 uppercase tracking-widest font-bold truncate max-w-[120px] sm:max-w-[150px]">
                          {student.courses?.join(', ') || ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs text-primary/60">fingerprint</span>
                        <p className="font-mono text-[9px] text-[#800033]/60 uppercase tracking-tighter">ID: {student.id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 sm:gap-12 lg:gap-16 pt-6 lg:pt-0">
                  <div className="text-left sm:text-right space-y-1">
                    <p className="font-headline text-lg sm:text-2xl text-[#800033]/60">₹{student.totalFee}</p>
                    <p className="font-label text-[8px] text-[#800033]/60 uppercase tracking-widest font-bold">Total</p>
                  </div>
                  <div className="text-center sm:text-right space-y-1">
                    <p className="font-headline text-lg sm:text-2xl text-primary">₹{student.amountPaid}</p>
                    <p className="font-label text-[8px] text-primary/40 uppercase tracking-widest font-bold">Paid</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className={cn(
                      "font-headline text-lg sm:text-2xl",
                      student.balance > 0 ? "text-error" : "text-primary"
                    )}>₹{student.balance}</p>
                    <p className="font-label text-[8px] text-primary/40 uppercase tracking-widest font-bold">Balance</p>
                  </div>
                </div>
              </div>

              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    generateInvoicePDF({
                      invoiceNumber: (student as any).receipt_no || `RCT-${student.id.slice(0,8).toUpperCase()}`,
                      date: new Date().toLocaleDateString(),
                      clientName: student.name,
                      projectName: "Tailoring Course Enrollment",
                      projectId: student.id.slice(0,8).toUpperCase(),
                      items: (student.courses || []).map(c => ({
                        name: c,
                        description: "Professional Tailoring Instruction",
                        quantity: 1,
                        unitPrice: student.totalFee / (student.courses?.length || 1),
                        total: student.totalFee / (student.courses?.length || 1)
                      })),
                      subtotal: student.totalFee,
                      totalAmount: student.totalFee,
                      amountPaid: student.amountPaid,
                      balance: student.balance,
                      isPaid: student.balance === 0,
                      autoPrint: true
                    });
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-primary/5 transition-colors"
                  title="Download Receipt"
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setStudentToDelete(student.id);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-error hover:bg-error/5 transition-colors"
                  title="Delete Student"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm glass-card p-10 space-y-8 text-center"
            >
              <div className="w-20 h-20 rounded-full glass-card bg-error/10 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-error text-4xl">warning</span>
              </div>
              <div className="space-y-3">
                <h3 className="font-headline text-3xl text-primary italic">
                  {studentToDelete ? 'Delete Student?' : 'Purge Records?'}
                </h3>
                <p className="font-body text-sm text-primary/60 leading-relaxed">
                  {studentToDelete 
                    ? 'This will permanently remove this student record from the institute archives.' 
                    : 'This will permanently remove all student data from the institute archives.'}
                </p>
              </div>
              <div className="flex gap-6">
                <Button 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setStudentToDelete(null);
                  }} 
                  variant="secondary"
                  className="flex-1 py-4 rounded-full"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => studentToDelete ? deleteStudent(studentToDelete) : removeAllStudents()} 
                  variant="red"
                  className="flex-1 py-4 rounded-full"
                >
                  Confirm {studentToDelete ? 'Delete' : 'Purge'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-lg glass-card p-6 sm:p-10 space-y-8 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <AnimatePresence>
                {showSuccess && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center gap-6"
                  >
                    <div className="w-24 h-24 rounded-full glass-card bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-5xl animate-bounce">check_circle</span>
                    </div>
                    <p className="font-headline text-2xl text-primary italic">Record Archived Successfully</p>
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
                <div className="space-y-1">
                  <h3 className="font-headline text-3xl text-primary italic">New Student Entry</h3>
                  <p className="label-caps text-[9px] uppercase tracking-[0.2em] font-bold">Institute Management</p>
                </div>
              </div>

              <form onSubmit={handleAddStudent} className="space-y-10 pt-4">
                {/* Name Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">person</span>
                    <label className="label-caps !text-primary">Student Information</label>
                  </div>
                  <input 
                    required
                    type="text" 
                    value={newStudent.name}
                    onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                    className="w-full input-premium bg-primary/5"
                    placeholder="Enter full name"
                  />
                </div>

                {/* Courses Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">school</span>
                    <label className="label-caps !text-primary">Enrolled Courses</label>
                  </div>
                  <div className="space-y-3 p-4 rounded-3xl bg-primary/5 border border-primary/10">
                    {/* Column Headers */}
                    <div className="flex gap-3 px-2">
                      <p className="flex-1 label-caps !text-primary/60">Course Name</p>
                      <p className="w-28 label-caps !text-primary/60">Fees (₹)</p>
                    </div>
                    
                    {newStudent.courses.map((course, idx) => (
                      <div key={idx} className="flex gap-3">
                        <select 
                          required
                          value={course.name}
                          onChange={e => {
                            const updated = [...newStudent.courses];
                            updated[idx].name = e.target.value;
                            // Automatically set the fee based on the selected course
                            const selectedCourse = courses.find(c => c.name === e.target.value);
                            if (selectedCourse) {
                              updated[idx].amount = selectedCourse.fee;
                            }
                            setNewStudent({...newStudent, courses: updated});
                          }}
                          className="flex-1 input-premium appearance-none bg-surface-container"
                        >
                          <option value="" disabled>Select Course</option>
                          {courses.map(c => (
                            <option key={c.id} value={c.name}>{c.name} - ₹{c.fee}</option>
                          ))}
                        </select>
                        <input 
                          required
                          type="number" 
                          value={course.amount || ''}
                          onChange={e => {
                            const updated = [...newStudent.courses];
                            updated[idx].amount = Number(e.target.value);
                            setNewStudent({...newStudent, courses: updated});
                          }}
                          className="w-28 input-premium"
                          placeholder="0.00"
                        />
                      </div>
                    ))}
                    <Button 
                      type="button"
                      onClick={() => setNewStudent({...newStudent, courses: [...newStudent.courses, { name: '', amount: 0 }]})}
                      variant="secondary" 
                      className="w-full py-3 text-[9px] uppercase tracking-widest opacity-60"
                    >
                      + Add Another Course
                    </Button>
                  </div>
                </div>

                {/* Financial Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary/40">payments</span>
                    <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Financial Details</label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="font-label text-[8px] text-primary/40 uppercase tracking-widest font-bold px-2">Total Fee (Auto)</p>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-mono font-bold">₹</span>
                        <input 
                          readOnly
                          type="number" 
                          value={newStudent.totalFee || ''}
                          className="w-full input-premium pl-10 py-4 text-sm font-mono outline-none bg-primary/5 opacity-80 cursor-not-allowed"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="font-label text-[8px] text-primary/40 uppercase tracking-widest font-bold px-2">Initial Pay</p>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-mono font-bold">₹</span>
                        <input 
                          required
                          type="number" 
                          value={newStudent.initialAmount || ''}
                          onChange={e => setNewStudent({...newStudent, initialAmount: Number(e.target.value)})}
                          className="w-full input-premium pl-10 py-4 text-sm font-mono outline-none"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance Summary */}
                <div className="glass-card bg-primary/10 border-primary/20 p-6 flex items-center justify-between">
                  <div>
                    <p className="font-label text-[8px] text-primary/60 uppercase tracking-[0.2em] font-bold">Remaining Balance</p>
                    <p className="font-headline text-3xl text-primary italic mt-1">₹ {balance}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 relative z-10">
                  <Button 
                    type="button" 
                    onClick={() => setShowAddModal(false)} 
                    variant="secondary" 
                    className="flex-1 py-5 rounded-full cursor-pointer hover:bg-primary/20 transition-all"
                  >
                    Discard
                  </Button>
                  <Button 
                    type="button" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleAddStudent();
                    }}
                    variant="primary" 
                    className="flex-1 py-5 rounded-full cursor-pointer shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
                  >
                    Archive Record
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Detail Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="absolute inset-0 z-[120] flex items-center justify-center p-6 bg-surface">
            <motion.div 
              initial={false}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg glass-card p-6 sm:p-10 space-y-8 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Back Button & Header */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-primary/40 hover:bg-primary/5 transition-colors border border-primary/10"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="space-y-1">
                  <h3 className="font-headline text-3xl text-primary italic leading-tight">{selectedStudent.name}</h3>
                  <p className="font-label text-[9px] text-primary/40 uppercase tracking-[0.3em] font-bold">Student Dossier</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-10 border-y border-primary/5">
                <div className="space-y-2">
                  <p className="font-label text-[10px] text-primary/40 uppercase tracking-widest font-bold">Enrolled Curriculum</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudent.courses?.map((c, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-primary/5 border border-primary/10 font-headline text-lg text-primary italic">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-label text-[10px] text-primary/40 uppercase tracking-widest font-bold">Archive Identity</p>
                  <p className="font-mono text-[10px] text-primary/60 break-all bg-primary/5 p-2 rounded-lg border border-primary/10">{selectedStudent.id}</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-primary/5 pb-3">
                  <h4 className="font-label text-[10px] text-primary/60 uppercase tracking-widest font-bold">Financial Statement</h4>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    <p className="label-caps !text-primary/40">Real-time Records</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="glass-card bg-primary/5 p-6 space-y-1">
                    <p className="label-caps !text-primary/40">Total Fees</p>
                    <p className="font-headline text-2xl text-primary italic">₹{selectedStudent.totalFee}</p>
                  </div>
                  <div className="glass-card bg-primary/5 p-6 space-y-1">
                    <p className="label-caps !text-primary/40">Paid</p>
                    <p className="font-headline text-2xl text-emerald-600 italic">₹{selectedStudent.amountPaid}</p>
                  </div>
                  <div className="glass-card bg-primary/5 p-6 space-y-1">
                    <p className="label-caps !text-primary/40">Balance</p>
                    <p className="font-headline text-2xl text-rose-600 italic">₹{selectedStudent.balance}</p>
                  </div>
                </div>

                {/* Record New Payment */}
                {selectedStudent.balance > 0 && (
                  <div className="glass-card bg-primary/5 p-8 space-y-6 border border-primary/10">
                    <div className="space-y-1">
                      <p className="label-caps !text-primary">Record New Payment</p>
                      <p className="font-body text-[10px] text-primary/40 italic">Add credit to student records</p>
                    </div>
                    <form onSubmit={handleRecordPayment} className="flex gap-4">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 font-headline">₹</span>
                        <input 
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="Amount"
                          className="w-full input-premium pl-10 py-3 text-sm"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        variant="primary" 
                        disabled={isRecordingPayment || !paymentAmount}
                        className="px-6 rounded-xl shadow-lg shadow-primary/20"
                      >
                        {isRecordingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Record'}
                      </Button>
                    </form>
                  </div>
                )}

                {/* Purchased Courses Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="label-caps !text-primary/60">Purchased Courses</h4>
                    <p className="label-caps !text-primary/40">{studentCourses.length} Records</p>
                  </div>
                  
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {studentCourses.length === 0 ? (
                      <div className="text-center py-10 glass-card bg-primary/5 border-dashed border">
                        <p className="label-caps !text-primary/30">No course records found</p>
                      </div>
                    ) : (
                      currentStudentCourses.map((sc) => (
                        <div key={sc.id} className="flex items-center justify-between p-4 glass-card bg-white/5 border border-primary/5 hover:border-primary/20 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-primary text-lg">school</span>
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-headline text-lg text-primary italic">{sc.courseName}</p>
                              <p className="label-caps !text-primary/40">
                                Receipt: {sc.receiptNo} • {sc.date}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-headline text-xl text-primary">₹{sc.amountPaid}</p>
                            <p className="label-caps !text-primary/60">{sc.paymentMethod}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Past Payments Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="label-caps !text-primary/60">Payment History</h4>
                    <p className="label-caps !text-primary/40">{studentPayments.length} Transactions</p>
                  </div>
                  
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {contextLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      </div>
                    ) : studentPayments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-32 glass-card bg-primary/5 border-dashed border-2 px-6">
                        <p className="label-caps !text-primary/40">No records found</p>
                      </div>
                    ) : (
                      studentPayments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 glass-card bg-white/5 border border-primary/5 hover:border-primary/20 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-primary text-lg">payments</span>
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-headline text-lg text-primary">₹{payment.amount}</p>
                              <p className="font-label text-[8px] text-primary/40 uppercase tracking-widest font-bold">
                                {new Date(payment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-label text-[8px] text-primary/60 uppercase tracking-widest font-bold">{payment.method}</p>
                            <p className="font-body text-[9px] text-primary/30 italic">{payment.notes}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-8 pt-6">
                <div className="flex gap-4 w-full sm:w-auto">
                  <Button 
                    onClick={() => generateInvoicePDF({
                      invoiceNumber: (selectedStudent as any).receipt_no || `RCT-${selectedStudent.id.slice(0,8).toUpperCase()}`,
                      date: new Date().toLocaleDateString(),
                      clientName: selectedStudent.name,
                      projectName: "Tailoring Course Enrollment",
                      projectId: selectedStudent.id.slice(0,8).toUpperCase(),
                      items: (selectedStudent.courses || []).map(c => ({
                        name: c,
                        description: "Professional Tailoring Instruction",
                        quantity: 1,
                        unitPrice: selectedStudent.totalFee / (selectedStudent.courses?.length || 1),
                        total: selectedStudent.totalFee / (selectedStudent.courses?.length || 1)
                      })),
                      subtotal: selectedStudent.totalFee,
                      totalAmount: selectedStudent.totalFee,
                      amountPaid: selectedStudent.amountPaid,
                      balance: selectedStudent.balance,
                      isPaid: selectedStudent.balance === 0,
                      autoPrint: true
                    })}
                    variant="secondary"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-full"
                  >
                    <span className="material-symbols-outlined text-sm">print</span>
                    Print
                  </Button>
                  <Button 
                    onClick={() => {
                      setStudentToDelete(selectedStudent.id);
                      setShowDeleteConfirm(true);
                    }}
                    variant="secondary"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-full text-error hover:bg-error/5"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Delete
                  </Button>
                  <Button 
                    onClick={() => {
                      if (selectedStudent.balance > 0) return;
                      generateCertificatePDF({
                        studentName: selectedStudent.name,
                        courseName: selectedStudent.courses?.join(', ') || "Tailoring Professional",
                        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
                        certificateId: `CERT-${new Date().getFullYear()}-${selectedStudent.id.slice(0,6).toUpperCase()}`,
                        duration: selectedStudent.courses?.map(cName => {
                          const course = courses.find(dbC => dbC.name === cName);
                          return course ? course.duration : '';
                        }).filter(d => d).join(' + ') || "Duration Not Specified",
                        instituteAddress: "Sumi Tailoring Institute, West Bengal • sumitailoring.com"
                      });
                    }}
                    variant={selectedStudent.balance > 0 ? "secondary" : "primary"}
                    disabled={selectedStudent.balance > 0}
                    className={cn(
                      "flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-3 rounded-full transition-all duration-500",
                      selectedStudent.balance > 0 
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" 
                        : "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 text-white"
                    )}
                  >
                    {selectedStudent.balance > 0 ? (
                      <span className="material-symbols-outlined text-sm">lock</span>
                    ) : (
                      <Award className="w-4 h-4" />
                    )}
                    {selectedStudent.balance > 0 ? "Account Not Settled" : "Download Certificate"}
                  </Button>
                </div>
                <Button 
                  onClick={() => setSelectedStudent(null)}
                  variant="primary"
                  className="w-full sm:w-auto px-10 py-4 rounded-full shadow-xl shadow-primary/20"
                >
                  Close Dossier
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
