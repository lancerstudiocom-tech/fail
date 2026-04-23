import React, { useState, useEffect, useRef } from 'react';
import { Card, Button } from './ClayUI';
import { Plus, Trash2, UserPlus, Search, Users, Camera, Image, X, Check, Loader2, FileDown, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scanReceiptLocal, parseOCRText } from '../services/ocrService';
import { detectColorLine } from '../services/geminiService';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { CameraStreamScanner } from './CameraStreamScanner';

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

export const Students: React.FC<StudentsProps> = ({ initialSelectedId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentPayments, setStudentPayments] = useState<Payment[]>([]);
  const [studentCourses, setStudentCourses] = useState<StudentCourse[]>([]);
  const [isFetchingPayments, setIsFetchingPayments] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const loadData = () => {
    setLoading(true);
    try {
      const stored = JSON.parse(localStorage.getItem('tailor_students') || '[]');
      setStudents(stored);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Listen for changes (simulated)
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Auto-calculate total fee when courses change
  useEffect(() => {
    if (isSaving) return; // Don't calculate while saving
    const sum = newStudent.courses.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
    if (sum !== newStudent.totalFee) {
      setNewStudent(prev => ({ ...prev, totalFee: sum }));
    }
  }, [newStudent.courses, isSaving]);

  const fetchPayments = (studentId: string) => {
    const allPayments = JSON.parse(localStorage.getItem('tailor_payments') || '[]');
    const filtered = allPayments.filter((p: any) => p.studentId === studentId);
    setStudentPayments(filtered.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  useEffect(() => {
    if (selectedStudent) {
      fetchPayments(selectedStudent.id);
      fetchStudentCourses(selectedStudent.id);
    } else {
      setStudentPayments([]);
      setPaymentAmount('');
      setStudentCourses([]);
    }
  }, [selectedStudent]);

  const fetchStudentCourses = (studentId: string) => {
    const allCourses = JSON.parse(localStorage.getItem('tailor_student_courses') || '[]');
    const filtered = allCourses.filter((c: any) => c.studentId === studentId);
    setStudentCourses(filtered);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !paymentAmount) return;

    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const paymentData = {
        id: Date.now().toString(),
        studentId: selectedStudent.id,
        amount: amount,
        type: 'credit',
        method: 'Cash',
        notes: 'Tuition Payment',
        date: new Date().toISOString()
      };

      // Update Payments
      const allPayments = JSON.parse(localStorage.getItem('tailor_payments') || '[]');
      const updatedPayments = [...allPayments, paymentData];
      localStorage.setItem('tailor_payments', JSON.stringify(updatedPayments));

      // Update Student
      const allStudents = JSON.parse(localStorage.getItem('tailor_students') || '[]');
      const updatedStudents = allStudents.map((s: any) => {
        if (s.id === selectedStudent.id) {
          return {
            ...s,
            amountPaid: s.amountPaid + amount,
            balance: s.balance - amount
          };
        }
        return s;
      });
      localStorage.setItem('tailor_students', JSON.stringify(updatedStudents));

      const updatedStudent = updatedStudents.find((s: any) => s.id === selectedStudent.id);
      setSelectedStudent(updatedStudent);
      setStudents(updatedStudents);
      
      fetchPayments(selectedStudent.id);
      setPaymentAmount('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Payment error:", error);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.courses?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

    // Kill OCR Loop
    setScannedData(data);
    setNewStudent({
      name: data.name || '',
      phone: data.phone || '',
      courses: data.courses || [],
      totalFee: data.totalAmount || 0,
      initialAmount: data.paidAmount || 0,
      amountPaid: data.paidAmount || 0,
      receiptNumber: data.receiptNumber || '',
      date: data.date || new Date().toISOString().split('T')[0],
      paymentMethod: data.paymentMethod || 'Cash',
      rawText: data.rawText || ''
    });
    
    setShowCamera(false);
    setShowReviewModal(true);
  };

  const [balance, setBalance] = useState(0);

  useEffect(() => {
    setBalance(newStudent.totalFee - newStudent.initialAmount);
  }, [newStudent.totalFee, newStudent.initialAmount]);

  const handleAddStudent = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!newStudent.name) {
      alert("Please enter a student name");
      return;
    }

    try {
      const totalFee = Number(newStudent.totalFee) || 0;
      const initialAmount = Number(newStudent.initialAmount) || 0;
      const balance = totalFee - initialAmount;
      const studentId = Date.now().toString();

      // 1. Save Student
      const newRecord = {
        id: studentId,
        name: newStudent.name,
        phone: newStudent.phone || 'N/A',
        courses: newStudent.courses.map(c => c.name),
        totalFee: totalFee,
        amountPaid: initialAmount,
        balance: balance,
        createdAt: new Date().toISOString()
      };

      const allStudents = JSON.parse(localStorage.getItem('tailor_students') || '[]');
      localStorage.setItem('tailor_students', JSON.stringify([...allStudents, newRecord]));

      // 2. Save Course Records
      const allCourseRecords = JSON.parse(localStorage.getItem('tailor_student_courses') || '[]');
      const newCourseRecords = newStudent.courses.map(course => ({
        id: Date.now().toString() + Math.random(),
        studentId,
        courseName: course.name,
        amountPaid: course.amount || 0,
        receiptNo: newStudent.receiptNumber || 'N/A',
        date: newStudent.date || new Date().toISOString().split('T')[0],
        paymentMethod: newStudent.paymentMethod || 'Cash',
        createdAt: new Date().toISOString()
      }));
      localStorage.setItem('tailor_student_courses', JSON.stringify([...allCourseRecords, ...newCourseRecords]));

      // 3. Save Payment Record
      if (initialAmount > 0) {
        const allPayments = JSON.parse(localStorage.getItem('tailor_payments') || '[]');
        const newPayment = {
          id: Date.now().toString() + Math.random(),
          studentId,
          amount: initialAmount,
          type: 'credit',
          method: newStudent.paymentMethod || 'Cash',
          notes: `Initial payment for: ${newStudent.courses.map(c => c.name).join(', ')}`,
          date: new Date().toISOString()
        };
        localStorage.setItem('tailor_payments', JSON.stringify([...allPayments, newPayment]));
      }

      setStudents([...allStudents, newRecord]);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        setShowAddModal(false);
        setShowReviewModal(false);
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
    }
  };

  const removeAllStudents = () => {
    try {
      localStorage.removeItem('tailor_students');
      localStorage.removeItem('tailor_payments');
      localStorage.removeItem('tailor_student_courses');
      setStudents([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Purge Error:", error);
    }
  };

  const deleteStudent = (id: string) => {
    try {
      const allStudents = JSON.parse(localStorage.getItem('tailor_students') || '[]');
      const updated = allStudents.filter((s: any) => s.id !== id);
      localStorage.setItem('tailor_students', JSON.stringify(updated));
      
      setStudents(updated);
      setSelectedStudent(null);
      setStudentToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
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

    autoTable(doc, {
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
              onClick={() => setShowAddModal(true)}
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
              className="glass-card p-6 sm:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-8 group relative overflow-hidden cursor-pointer hover:translate-y-[-4px] transition-all duration-300"
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

                <div className="grid grid-cols-3 gap-4 sm:gap-12 lg:gap-16 pt-6 lg:pt-0 border-t lg:border-t-0 border-primary/5">
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
                {student.id.startsWith('local-') && (
                  <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 shadow-sm">
                    <span className="material-symbols-outlined text-xs text-amber-500 animate-spin">sync</span>
                    <span className="text-[9px] text-amber-500 uppercase font-black tracking-widest">Syncing</span>
                  </div>
                )}
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

      {/* Floating Scan Button */}
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
          className="h-16 px-6 rounded-full shadow-2xl flex items-center justify-center gap-3 bg-white/40 backdrop-blur-xl text-primary transition-all hover:scale-110 active:scale-95 border border-white/60"
          disabled={isScanning}
          title="Upload Receipt Image"
        >
          <Image className="w-6 h-6 text-primary" />
          <span className="font-bold text-xs uppercase tracking-widest">Upload Bill</span>
        </Button>
        <Button 
          onClick={() => setShowCamera(true)}
          className="h-16 px-6 rounded-full shadow-2xl flex items-center justify-center gap-3 bg-white/40 backdrop-blur-xl text-primary transition-all hover:scale-110 active:scale-95 border border-white/60"
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
      </div>

      {/* Camera Stream Scanner */}
      {showCamera && (
        <CameraStreamScanner 
          onResult={handleStreamResult}
          onClose={() => setShowCamera(false)}
          isScanning={isScanning}
          type="student"
        />
      )}

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
              <p className="font-bold text-xs uppercase tracking-widest">Processing Archive Image...</p>
            </div>
          </motion.div>
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
                        <input 
                          required
                          type="text" 
                          value={course.name}
                          onChange={e => {
                            const updated = [...newStudent.courses];
                            updated[idx].name = e.target.value;
                            setNewStudent({...newStudent, courses: updated});
                          }}
                          className="flex-1 input-premium"
                          placeholder="e.g. Embroidery"
                        />
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
                    <p className="font-headline text-2xl text-primary italic">₹{selectedStudent.totalFees}</p>
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
                      studentCourses.map((sc) => (
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
                    {isFetchingPayments ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      </div>
                    ) : studentPayments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-32 glass-card bg-primary/5 border-dashed border-2 px-6">
                        <p className="label-caps !text-primary/40">No students found matching your search</p>
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
                    onClick={handlePrint}
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

      {/* OCR Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-surface">
            <motion.div 
              initial={false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card p-10 space-y-10 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
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

              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="font-headline text-4xl text-primary italic">Institute Student Enrollment</h3>
                  <p className="font-label text-[10px] text-primary/40 uppercase tracking-[0.2em] font-bold">Digital Analysis Complete</p>
                </div>
                <div className="px-4 py-2 glass-card bg-primary/5 text-primary text-[10px] font-label uppercase tracking-widest font-bold border border-primary/10">
                  OCR Detected
                </div>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Phone</label>
                    <input 
                      type="text" 
                      value={newStudent.phone}
                      onChange={e => setNewStudent({...newStudent, phone: e.target.value})}
                      className="w-full input-premium text-black dark:text-white dark:font-bold"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Payment Method</label>
                    <select 
                      value={newStudent.paymentMethod}
                      onChange={e => setNewStudent({...newStudent, paymentMethod: e.target.value})}
                      className="w-full input-premium text-black dark:text-white dark:font-bold"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Extracted Raw Text (Editable)</label>
                  <textarea 
                    value={newStudent.rawText}
                    onChange={e => {
                      const text = e.target.value;
                      const lines = text.split('\n');
                      const parsed = parseOCRText(lines);
                      setNewStudent({
                        ...newStudent,
                        ...parsed,
                        rawText: text
                      });
                    }}
                    className="w-full input-premium text-xs font-mono h-32 resize-none"
                    placeholder="Raw OCR text will appear here..."
                  />
                  <p className="text-[8px] text-primary/40 italic">Editing this text will automatically re-parse the fields below.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Detected Courses</label>
                  <div className="space-y-2">
                    {newStudent.courses.map((course, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input 
                          type="text" 
                          value={course.name}
                          onChange={e => {
                            const updated = [...newStudent.courses];
                            updated[idx].name = e.target.value;
                            setNewStudent({...newStudent, courses: updated});
                          }}
                          className="flex-1 input-premium text-black dark:text-white dark:font-bold"
                          placeholder="Course Name"
                        />
                        <input 
                          type="number" 
                          value={course.amount}
                          onChange={e => {
                            const updated = [...newStudent.courses];
                            updated[idx].amount = Number(e.target.value);
                            setNewStudent({...newStudent, courses: updated});
                          }}
                          className="w-24 input-premium text-black dark:text-white dark:font-bold"
                          placeholder="Amount"
                        />
                      </div>
                    ))}
                    <Button 
                      onClick={() => setNewStudent({...newStudent, courses: [...newStudent.courses, { name: '', amount: 0 }]})}
                      variant="secondary" 
                      className="w-full py-2 text-[10px] uppercase tracking-widest"
                    >
                      + Add Course
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Receipt No</label>
                    <input 
                      type="text" 
                      value={newStudent.receiptNumber}
                      onChange={e => setNewStudent({...newStudent, receiptNumber: e.target.value})}
                      className="w-full input-premium text-black dark:text-white dark:font-bold"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Date</label>
                    <input 
                      type="date" 
                      value={newStudent.date}
                      onChange={e => setNewStudent({...newStudent, date: e.target.value})}
                      className="w-full input-premium text-black dark:text-white dark:font-bold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Total Amount (₹)</label>
                    <input 
                      type="number" 
                      value={newStudent.totalFee || ''}
                      onChange={e => setNewStudent({...newStudent, totalFee: Number(e.target.value)})}
                      className="w-full input-premium text-black dark:text-white dark:font-bold"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Initial Amount (₹)</label>
                    <input 
                      type="number" 
                      value={newStudent.initialAmount || ''}
                      onChange={e => setNewStudent({...newStudent, initialAmount: Number(e.target.value)})}
                      className="w-full input-premium text-black dark:text-white dark:font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-primary font-bold uppercase tracking-widest text-[10px] opacity-70">Balance (₹)</label>
                  <input 
                    readOnly
                    type="number" 
                    value={balance}
                    className="w-full input-premium text-black dark:text-white dark:font-bold opacity-60"
                  />
                </div>
              </div>

              <div className="flex gap-6 pt-4">
                <Button onClick={() => setShowReviewModal(false)} variant="secondary" className="flex-1 py-4 rounded-full">Discard</Button>
                <Button onClick={() => handleAddStudent()} variant="primary" className="flex-1 py-4 rounded-full">Enroll Student</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
