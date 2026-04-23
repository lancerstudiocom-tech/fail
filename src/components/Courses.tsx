import React, { useState, useEffect } from 'react';
import { Card, Button } from './ClayUI';
import { GraduationCap, Plus, Trash2, BookOpen, Check, X, CreditCard, Calendar, IndianRupee, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Course {
  id: string;
  name: string;
  duration: string;
  fee: number;
}

interface Student {
  id: string;
  name: string;
  courses: string[];
  totalFee: number;
  amountPaid: number;
  balance: number;
  initialAmount?: number;
}

interface Attendance {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  status: 'present' | 'absent';
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

export const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentCourses, setStudentCourses] = useState<StudentCourse[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const [showStudentSuccess, setShowStudentSuccess] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCourse, setNewCourse] = useState({
    name: '',
    duration: '',
    fee: 0
  });
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [newStudent, setNewStudent] = useState({
    name: '',
    courses: [] as string[],
    totalFee: 0,
    initialAmount: 0,
    amountPaid: 0
  });
  const [studentBalance, setStudentBalance] = useState(0);

  useEffect(() => {
    setStudentBalance(newStudent.totalFee - newStudent.initialAmount);
  }, [newStudent.totalFee, newStudent.initialAmount]);

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'Cash',
    date: new Date().toISOString().split('T')[0]
  });

  const loadData = () => {
    try {
      setCourses(JSON.parse(localStorage.getItem('tailor_courses') || '[]'));
      setStudents(JSON.parse(localStorage.getItem('tailor_students') || '[]'));
      setStudentCourses(JSON.parse(localStorage.getItem('tailor_student_courses') || '[]'));
      setAttendance(JSON.parse(localStorage.getItem('tailor_attendance') || '[]'));
    } catch (err) {
      console.error("Load error:", err);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = Date.now().toString();
      const record = { id, ...newCourse };
      const all = JSON.parse(localStorage.getItem('tailor_courses') || '[]');
      const updated = [...all, record];
      localStorage.setItem('tailor_courses', JSON.stringify(updated));
      setCourses(updated);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowAddModal(false);
        setNewCourse({ name: '', duration: '', fee: 0 });
      }, 1000);
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleEditCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    try {
      const all = JSON.parse(localStorage.getItem('tailor_courses') || '[]');
      const updated = all.map((c: Course) => c.id === editingCourse.id ? editingCourse : c);
      localStorage.setItem('tailor_courses', JSON.stringify(updated));
      setCourses(updated);
      setShowEditSuccess(true);
      setTimeout(() => {
        setShowEditSuccess(false);
        setShowEditModal(false);
        setEditingCourse(null);
      }, 1000);
    } catch (err) {
      console.error("Edit error:", err);
    }
  };

  const handleQuickAddStudent = (course: Course) => {
    setNewStudent({
      name: '',
      courses: [course.name],
      totalFee: course.fee,
      initialAmount: 0,
      amountPaid: 0
    });
    setShowAddStudentModal(true);
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const studentId = Date.now().toString();
      const studentRecord = {
        id: studentId,
        ...newStudent,
        amountPaid: newStudent.initialAmount,
        balance: newStudent.totalFee - newStudent.initialAmount,
        createdAt: new Date().toISOString()
      };

      const allStudents = JSON.parse(localStorage.getItem('tailor_students') || '[]');
      localStorage.setItem('tailor_students', JSON.stringify([...allStudents, studentRecord]));

      // Add to StudentCourses
      const allStudentCourses = JSON.parse(localStorage.getItem('tailor_student_courses') || '[]');
      const newEnrollments = newStudent.courses.map(cName => ({
        id: Date.now().toString() + Math.random(),
        studentId,
        courseName: cName,
        amountPaid: newStudent.initialAmount / newStudent.courses.length,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      }));
      localStorage.setItem('tailor_student_courses', JSON.stringify([...allStudentCourses, ...newEnrollments]));

      loadData();
      setShowStudentSuccess(true);
      setTimeout(() => {
        setShowStudentSuccess(false);
        setShowAddStudentModal(false);
        setNewStudent({ name: '', courses: [], totalFee: 0, initialAmount: 0, amountPaid: 0 });
      }, 1000);
    } catch (err) {
      console.error("Save student error:", err);
    }
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const paymentAmount = Number(paymentData.amount);
      const studentId = selectedStudent.id;

      // 1. Update Student
      const allStudents = JSON.parse(localStorage.getItem('tailor_students') || '[]');
      const updatedStudents = allStudents.map((s: any) => {
        if (s.id === studentId) {
          return {
            ...s,
            amountPaid: Number(s.amountPaid) + paymentAmount,
            balance: Number(s.balance) - paymentAmount
          };
        }
        return s;
      });
      localStorage.setItem('tailor_students', JSON.stringify(updatedStudents));

      // 2. Record Payment
      const allPayments = JSON.parse(localStorage.getItem('tailor_payments') || '[]');
      const newPayment = {
        id: Date.now().toString(),
        studentId,
        studentName: selectedStudent.name,
        amount: paymentAmount,
        type: 'credit',
        method: paymentData.method,
        date: paymentData.date,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('tailor_payments', JSON.stringify([...allPayments, newPayment]));

      loadData();
      setShowPaymentSuccess(true);
      setTimeout(() => {
        setShowPaymentSuccess(false);
        setShowPaymentModal(false);
        setPaymentData({
          amount: 0,
          method: 'Cash',
          date: new Date().toISOString().split('T')[0]
        });
        setSelectedStudent(updatedStudents.find((s: any) => s.id === studentId));
      }, 1000);
    } catch (err) {
      console.error("Payment error:", err);
    }
  };

  const deleteCourse = (id: string) => {
    try {
      const all = JSON.parse(localStorage.getItem('tailor_courses') || '[]');
      const updated = all.filter((c: any) => c.id !== id);
      localStorage.setItem('tailor_courses', JSON.stringify(updated));
      setCourses(updated);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const deleteStudent = (id: string) => {
    try {
      const all = JSON.parse(localStorage.getItem('tailor_students') || '[]');
      const updated = all.filter((s: any) => s.id !== id);
      localStorage.setItem('tailor_students', JSON.stringify(updated));
      
      setStudents(updated);
      setSelectedStudent(null);
      setStudentToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleMarkAttendance = (studentId: string, courseName: string, status: 'present' | 'absent') => {
    try {
      const all = JSON.parse(localStorage.getItem('tailor_attendance') || '[]');
      const dateToMark = selectedDate;
      const existingIndex = all.findIndex((a: any) => a.studentId === studentId && a.date === dateToMark);

      let updated;
      if (existingIndex > -1) {
        updated = [...all];
        updated[existingIndex].status = status;
      } else {
        updated = [...all, {
          id: Date.now().toString(),
          studentId,
          courseName,
          date: dateToMark,
          status
        }];
      }
      localStorage.setItem('tailor_attendance', JSON.stringify(updated));
      setAttendance(updated);
    } catch (err) {
      console.error("Attendance error:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToPDF = (course: Course, courseStudents: Student[]) => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(`Student Records: ${course.name}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Duration: ${course.duration} | Course Fee: INR ${course.fee}`, 14, 30);
    
    // Add table
    const tableColumn = ["ID", "Name", "Total Fee", "Amount Paid", "Balance"];
    const tableRows = courseStudents.map(student => [
      student.id.slice(-8).toUpperCase(),
      student.name,
      `INR ${student.totalFee}`,
      `INR ${student.amountPaid}`,
      `INR ${student.balance}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, // Primary-like color
      styles: { fontSize: 9 },
    });

    // Add summary
    const totalCollected = courseStudents.reduce((acc, s) => acc + s.amountPaid, 0);
    const totalOutstanding = courseStudents.reduce((acc, s) => acc + s.balance, 0);
    
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Collected: INR ${totalCollected}`, 14, finalY + 15);
    doc.text(`Total Outstanding: INR ${totalOutstanding}`, 14, finalY + 25);

    doc.save(`${course.name.replace(/\s+/g, '_')}_Records.pdf`);
  };

  return (
    <div className="p-4 md:p-6 space-y-8 pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="font-headline text-5xl text-primary italic leading-none tracking-tight">Curriculum</h2>
          <p className="label-caps text-[10px]">Academic Records & Course Management</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          variant="primary"
          className="w-full sm:w-auto px-10 py-5 rounded-full shadow-premium active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-xl">add_circle</span>
          Add New Course
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="p-6 glass-card flex flex-col gap-3">
          <p className="label-caps !text-[9px]">Total Courses</p>
          <p className="font-headline text-4xl text-primary italic">{courses.length}</p>
        </Card>
        <Card className="p-6 glass-card flex flex-col gap-3">
          <p className="label-caps !text-[9px]">Active Apprentices</p>
          <p className="font-headline text-4xl text-primary italic">{students.length}</p>
        </Card>
        <Card className="p-6 glass-card flex flex-col gap-3">
          <p className="label-caps !text-[9px]">Enrollments</p>
          <p className="font-headline text-4xl text-primary italic">{studentCourses.length}</p>
        </Card>
        <Card className="p-6 glass-card flex flex-col gap-3">
          <p className="label-caps !text-[9px]">Avg. Course Fee</p>
          <p className="font-headline text-4xl text-primary italic">
            ₹{courses.length ? Math.round(courses.reduce((acc, c) => acc + c.fee, 0) / courses.length) : 0}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {courses.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 glass-card bg-primary/5">
            <span className="material-symbols-outlined text-7xl text-primary/20 mb-4">
              school
            </span>
            <p className="label-caps !text-primary/40 uppercase tracking-[0.2em] font-bold">No courses listed yet</p>
          </div>
        ) : (
          courses.map((course) => {
            const courseStudents = students.filter(s => s.courses?.includes(course.name));
            const isExpanded = expandedCourse === course.id;

            return (
              <div key={course.id} className="glass-card flex flex-col group relative overflow-hidden transition-all duration-500">
                <div className="p-8 space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-full glass-card-inset bg-primary/5 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-2xl">school</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-headline text-2xl text-primary truncate italic">{course.name}</h4>
                        <p className="label-caps !text-primary/60">{course.duration}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right px-6 py-3 glass-card-inset bg-primary/5">
                      <p className="font-headline text-2xl text-primary italic leading-none">₹{course.fee}</p>
                      <p className="label-caps !text-[8px] !text-primary/40 mt-1">Tuition Fee</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-primary/5">
                    <Button 
                      onClick={() => handleQuickAddStudent(course)}
                      variant="secondary"
                      className="px-4 py-2 text-[10px] rounded-full"
                    >
                      <span className="material-symbols-outlined text-sm">person_add</span>
                      Enroll
                    </Button>
                    <Button 
                      onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                      variant={isExpanded ? 'primary' : 'secondary'}
                      className="px-4 py-2 text-[10px] rounded-full"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                      {courseStudents.length} Students
                    </Button>
                    <button 
                      onClick={() => {
                        setEditingCourse(course);
                        setShowEditModal(true);
                      }}
                      className="w-12 h-12 rounded-full glass-card bg-white text-primary/30 hover:text-primary transition-all"
                    >
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button 
                      onClick={() => deleteCourse(course.id)}
                      className="w-12 h-12 rounded-full glass-card bg-white text-primary/30 hover:text-error transition-all"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </div>

                {/* Enrolled Students Records */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-surface-container-lowest/50 border-t border-outline-variant/10"
                    >
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="label-caps !text-[8px] !text-primary/60">Apprentice Progress Records</h5>
                          <div className="flex gap-4 label-caps !text-[7px] !text-primary/40">
                            <span>Total Fee</span>
                            <span>Paid</span>
                            <span>Balance</span>
                          </div>
                        </div>

                        {courseStudents.length === 0 ? (
                          <p className="text-center py-4 font-label text-[10px] text-on-surface-variant/30 uppercase tracking-widest italic">No apprentices enrolled yet</p>
                        ) : (
                          <>
                            <div className="space-y-3">
                              {courseStudents.map((student) => (
                                <div 
                                  key={student.id} 
                                  onClick={() => setSelectedStudent(student)}
                                  className="flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant/5 hover:border-primary/20 transition-colors cursor-pointer group/row"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-[10px] font-bold text-primary group-hover/row:bg-primary group-hover/row:text-on-primary transition-colors">
                                      {student.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-body text-sm text-on-surface">{student.name}</span>
                                      <span className="font-mono text-[8px] text-on-surface-variant/30 uppercase tracking-tighter">ID: {student.id.slice(-8).toUpperCase()}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-right items-end sm:items-center">
                                    <div className="flex sm:block gap-2 items-center">
                                      <p className="sm:hidden font-label text-[8px] text-on-surface-variant/40 uppercase">Fee</p>
                                      <p className="font-label text-[10px] text-on-surface-variant/60">₹{student.totalFee}</p>
                                    </div>
                                    <div className="flex sm:block gap-2 items-center">
                                      <p className="sm:hidden font-label text-[8px] text-on-surface-variant/40 uppercase">Paid</p>
                                      <p className="font-label text-[10px] text-primary">₹{student.amountPaid}</p>
                                    </div>
                                    <div className="flex sm:block gap-2 items-center">
                                      <p className="sm:hidden font-label text-[8px] text-on-surface-variant/40 uppercase">Bal</p>
                                      <p className={`font-label text-[10px] ${student.balance > 0 ? 'text-error font-bold' : 'text-success'}`}>
                                        ₹{student.balance}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Course Summary */}
                            <div className="mt-6 pt-4 border-t border-outline-variant/10 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4">
                              <button 
                                onClick={() => exportToPDF(course, courseStudents)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-label text-[10px] uppercase tracking-widest hover:bg-primary/20 transition-all border border-primary/20"
                              >
                                <FileDown className="w-3 h-3" />
                                Export PDF
                              </button>
                              <div className="flex flex-col sm:flex-row justify-end gap-4 sm:gap-8">
                                <div className="text-right flex sm:block justify-between items-center">
                                  <p className="sm:hidden font-label text-[8px] text-on-surface-variant/40 uppercase tracking-widest">Total Collected</p>
                                  <p className="font-headline text-lg text-primary">₹{studentCourses.filter(sc => sc.courseName === course.name).reduce((acc, sc) => acc + sc.amountPaid, 0)}</p>
                                  <p className="hidden sm:block font-label text-[8px] text-on-surface-variant/40 uppercase tracking-widest">Total Collected</p>
                                </div>
                                <div className="text-right flex sm:block justify-between items-center">
                                  <p className="sm:hidden font-label text-[8px] text-on-surface-variant/40 uppercase tracking-widest">Total Outstanding</p>
                                  <p className="font-headline text-lg text-error">₹{courseStudents.reduce((acc, s) => acc + s.balance, 0)}</p>
                                  <p className="hidden sm:block font-label text-[8px] text-on-surface-variant/40 uppercase tracking-widest">Total Outstanding</p>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Student Detail Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="absolute inset-0 z-[120] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm">
            <motion.div 
              initial={false}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg glass-card p-6 sm:p-10 space-y-8 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setSelectedStudent(null)}
                className="absolute top-6 right-6 w-12 h-12 rounded-full glass-card bg-white flex items-center justify-center text-primary/40 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="flex items-center gap-8">
                <div className="w-24 h-24 rounded-full glass-card-inset bg-primary/5 flex items-center justify-center font-headline text-5xl text-primary italic">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div className="space-y-2">
                  <h3 className="font-headline text-4xl text-on-surface italic leading-tight">{selectedStudent.name}</h3>
                  <p className="font-label text-[10px] text-primary/40 uppercase tracking-[0.3em] font-bold">Apprentice Dossier</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-y border-primary/5">
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
                  <p className="font-mono text-xs text-primary/60 break-all">{selectedStudent.id}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-primary/5 pb-2">
                  <h4 className="font-label text-[10px] text-primary/40 uppercase tracking-[0.2em] font-bold">Attendance Tracking</h4>
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="font-mono text-[10px] bg-primary/5 border-none rounded px-2 py-1 outline-none text-black"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-body text-sm text-on-surface">Session Status</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleMarkAttendance(selectedStudent.id, selectedStudent.courses[0] || '', 'present')}
                      className={cn(
                        "px-4 py-2 rounded-full font-label text-[10px] uppercase tracking-widest transition-all",
                        attendance.find(a => a.studentId === selectedStudent.id && a.date === selectedDate)?.status === 'present'
                          ? "bg-success text-white shadow-lg"
                          : "bg-surface-container-low text-on-surface-variant/40 hover:bg-success/10 hover:text-success"
                      )}
                    >
                      Present
                    </button>
                    <button 
                      onClick={() => handleMarkAttendance(selectedStudent.id, selectedStudent.courses[0] || '', 'absent')}
                      className={cn(
                        "px-4 py-2 rounded-full font-label text-[10px] uppercase tracking-widest transition-all",
                        attendance.find(a => a.studentId === selectedStudent.id && a.date === selectedDate)?.status === 'absent'
                          ? "bg-error text-white shadow-lg"
                          : "bg-surface-container-low text-on-surface-variant/40 hover:bg-error/10 hover:text-error"
                      )}
                    >
                      Absent
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="font-label text-[8px] text-primary/40 uppercase tracking-widest font-bold">Recent History</p>
                  <div className="flex flex-wrap gap-2">
                    {attendance
                      .filter(a => a.studentId === selectedStudent.id)
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 7)
                      .map(record => (
                        <div 
                          key={record.id}
                          className={cn(
                            "px-2 py-1 rounded text-[8px] font-mono border",
                            record.status === 'present' 
                              ? "bg-success/5 border-success/20 text-success" 
                              : "bg-error/5 border-error/20 text-error"
                          )}
                        >
                          {record.date.split('-').slice(1).reverse().join('/')}: {record.status.charAt(0).toUpperCase()}
                        </div>
                      ))}
                    {attendance.filter(a => a.studentId === selectedStudent.id).length === 0 && (
                      <p className="font-label text-[8px] text-primary/20 italic">No attendance history yet</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="font-label text-[10px] text-primary/40 uppercase tracking-[0.2em] font-bold border-b border-primary/5 pb-2">Financial Statement</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="glass-card-inset bg-surface-container-low p-6">
                    <p className="font-label text-[8px] text-primary/40 uppercase tracking-widest mb-2 font-bold">Total Fee</p>
                    <p className="font-headline text-xl text-on-surface italic">₹{selectedStudent.totalFee}</p>
                  </div>
                  <div className="glass-card-inset bg-primary/5 p-6">
                    <p className="font-label text-[8px] text-primary/40 uppercase tracking-widest mb-2 font-bold">Paid</p>
                    <p className="font-headline text-xl text-primary italic">₹{selectedStudent.amountPaid}</p>
                  </div>
                  <div className="glass-card-inset bg-error/5 p-6">
                    <p className="font-label text-[8px] text-error/40 uppercase tracking-widest mb-2 font-bold">Balance</p>
                    <p className={cn(
                      "font-headline text-xl italic",
                      selectedStudent.balance > 0 ? "text-error" : "text-primary"
                    )}>₹{selectedStudent.balance}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-6">
                <div className="flex flex-wrap justify-start gap-4 w-full sm:w-auto">
                  <Button 
                    onClick={() => setShowPaymentModal(true)}
                    variant="primary"
                    className="px-6 py-3 text-[10px] rounded-full flex-1 sm:flex-none"
                  >
                    <span className="material-symbols-outlined text-sm">payments</span>
                    Add Payment
                  </Button>
                  <Button 
                    onClick={handlePrint}
                    variant="secondary"
                    className="px-6 py-3 text-[10px] rounded-full flex-1 sm:flex-none"
                  >
                    <span className="material-symbols-outlined text-sm">print</span>
                    Print
                  </Button>
                  <Button 
                    onClick={() => {
                      setStudentToDelete(selectedStudent.id);
                      setShowDeleteConfirm(true);
                    }}
                    variant="red"
                    className="px-6 py-3 text-[10px] rounded-full flex-1 sm:flex-none"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Delete
                  </Button>
                </div>
                <Button 
                  onClick={() => setSelectedStudent(null)}
                  variant="secondary"
                  className="w-full sm:w-auto px-10 py-4 text-xs rounded-full"
                >
                  Close Dossier
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedStudent && (
          <div className="absolute inset-0 z-[140] flex items-center justify-center p-4 sm:p-6 bg-black/30 backdrop-blur-sm">
            <motion.div 
              initial={false}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass-card p-8 sm:p-10 space-y-8 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <AnimatePresence>
                {showPaymentSuccess && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center gap-6"
                  >
                    <div className="w-24 h-24 rounded-full glass-card bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-5xl animate-bounce">check_circle</span>
                    </div>
                    <p className="font-headline text-2xl text-primary italic">Payment Recorded</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <h3 className="font-headline text-4xl text-primary italic">Record Payment</h3>
                <p className="font-label text-[10px] text-primary/40 uppercase tracking-[0.2em] font-bold">For {selectedStudent.name}</p>
              </div>

                <form onSubmit={handleRecordPayment} className="space-y-8">
                  {formError && (
                    <div className="p-4 bg-error/10 border border-error/20 rounded-2xl">
                      <p className="text-xs text-error text-center">{formError}</p>
                    </div>
                  )}
                  <div className="space-y-3">
                  <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/40 font-bold">₹</span>
                    <input 
                      required
                      type="number" 
                      value={paymentData.amount}
                      onChange={e => setPaymentData({...paymentData, amount: Number(e.target.value)})}
                      className="w-full input-premium pl-12"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Method</label>
                    <div className="relative">
                      <select 
                        value={paymentData.method}
                        onChange={e => setPaymentData({...paymentData, method: e.target.value})}
                        className="w-full input-premium appearance-none pr-10"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI / GPay</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Card">Card</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary/40 pointer-events-none">expand_more</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Date</label>
                    <input 
                      required
                      type="date" 
                      value={paymentData.date}
                      onChange={e => setPaymentData({...paymentData, date: e.target.value})}
                      className="w-full input-premium"
                    />
                  </div>
                </div>

                <div className="flex gap-6 pt-4">
                  <Button 
                    type="button" 
                    onClick={() => setShowPaymentModal(false)} 
                    variant="secondary"
                    className="flex-1 py-4 rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary"
                    className="flex-1 py-4 rounded-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                    ) : (
                      'Record Payment'
                    )}
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
          <div className="absolute inset-0 z-[130] flex items-center justify-center p-6 bg-surface">
            <motion.div 
              initial={false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm glass-card bg-white p-10 space-y-8 text-center"
            >
              <div className="w-24 h-24 rounded-full glass-card bg-error/10 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-error text-5xl">warning</span>
              </div>
              <div className="space-y-3">
                <h3 className="font-headline text-3xl text-on-surface italic">Delete Apprentice?</h3>
                <p className="font-body text-sm text-primary/60">This will permanently remove this student record from the atelier archives.</p>
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
                  onClick={() => studentToDelete && deleteStudent(studentToDelete)} 
                  variant="red"
                  className="flex-1 py-4 rounded-full"
                >
                  Confirm Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Course Modal */}
      <AnimatePresence>
        {showEditModal && editingCourse && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-surface">
            <motion.div 
              initial={false}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass-card bg-white p-8 sm:p-10 space-y-8 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <AnimatePresence>
                {showEditSuccess && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center gap-6"
                  >
                    <div className="w-24 h-24 rounded-full glass-card bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-5xl animate-bounce">check_circle</span>
                    </div>
                    <p className="font-headline text-2xl text-primary italic">Course Updated Successfully</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <h3 className="font-headline text-4xl text-primary italic">Edit Curriculum</h3>
                <p className="font-label text-[10px] text-primary/40 uppercase tracking-[0.3em] font-bold">Sumi Curriculum Management</p>
              </div>

              <form onSubmit={handleEditCourse} className="space-y-8">
                {formError && (
                  <div className="p-4 bg-error/10 border border-error/20 rounded-2xl">
                    <p className="text-xs text-error text-center">{formError}</p>
                  </div>
                )}
                <div className="space-y-3">
                  <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Curriculum Name</label>
                  <input 
                    required
                    type="text" 
                    value={editingCourse.name}
                    onChange={e => setEditingCourse({...editingCourse, name: e.target.value})}
                    className="w-full input-premium"
                    placeholder="e.g. Advanced Aari Work"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Duration</label>
                    <input 
                      required
                      type="text" 
                      value={editingCourse.duration}
                      onChange={e => setEditingCourse({...editingCourse, duration: e.target.value})}
                      className="w-full input-premium"
                      placeholder="e.g. 6 Months"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Fee (₹)</label>
                    <input 
                      required
                      type="number" 
                      value={editingCourse.fee}
                      onChange={e => setEditingCourse({...editingCourse, fee: Number(e.target.value)})}
                      className="w-full input-premium"
                    />
                  </div>
                </div>
                <div className="flex gap-6 pt-4">
                  <Button 
                    type="button" 
                    onClick={() => setShowEditModal(false)} 
                    variant="secondary"
                    className="flex-1 py-4 rounded-full"
                  >
                    Discard
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary"
                    className="flex-1 py-4 rounded-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                    ) : (
                      'Update Course'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Course Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-surface">
            <motion.div 
              initial={false}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass-card bg-white p-8 sm:p-10 space-y-8 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
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
                    <p className="font-headline text-2xl text-primary italic">Course Archived Successfully</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <h3 className="font-headline text-4xl text-primary italic">New Course Entry</h3>
                <p className="font-label text-[10px] text-primary/40 uppercase tracking-[0.3em] font-bold">Sumi Curriculum Management</p>
              </div>

              <form onSubmit={handleAddCourse} className="space-y-8">
                {formError && (
                  <div className="p-4 bg-error/10 border border-error/20 rounded-2xl">
                    <p className="text-xs text-error text-center">{formError}</p>
                  </div>
                )}
                <div className="space-y-3">
                  <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Curriculum Name</label>
                  <input 
                    required
                    type="text" 
                    value={newCourse.name}
                    onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                    className="w-full input-premium"
                    placeholder="e.g. Advanced Aari Work"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Duration</label>
                    <input 
                      required
                      type="text" 
                      value={newCourse.duration}
                      onChange={e => setNewCourse({...newCourse, duration: e.target.value})}
                      className="w-full input-premium"
                      placeholder="e.g. 6 Months"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Fee (₹)</label>
                    <input 
                      required
                      type="number" 
                      value={newCourse.fee}
                      onChange={e => setNewCourse({...newCourse, fee: Number(e.target.value)})}
                      className="w-full input-premium"
                    />
                  </div>
                </div>
                <div className="flex gap-6 pt-4">
                  <Button 
                    type="button" 
                    onClick={() => setShowAddModal(false)} 
                    variant="secondary"
                    className="flex-1 py-4 rounded-full"
                  >
                    Discard
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary"
                    className="flex-1 py-4 rounded-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                    ) : (
                      'Archive Course'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddStudentModal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-surface">
            <motion.div 
              initial={false}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass-card bg-white p-8 sm:p-10 space-y-8 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <AnimatePresence>
                {showStudentSuccess && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center gap-6"
                  >
                    <div className="w-24 h-24 rounded-full glass-card bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-5xl animate-bounce">check_circle</span>
                    </div>
                    <p className="font-headline text-2xl text-primary italic">Student Enrolled Successfully</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <h3 className="font-headline text-4xl text-primary italic">Quick Enrollment</h3>
                <p className="font-label text-[10px] text-primary/40 uppercase tracking-[0.2em] font-bold">Sumi Student Registration</p>
              </div>

              <form onSubmit={handleAddStudent} className="space-y-8">
                {formError && (
                  <div className="p-4 bg-error/10 border border-error/20 rounded-2xl">
                    <p className="text-xs text-error text-center">{formError}</p>
                  </div>
                )}
                <div className="space-y-3">
                  <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={newStudent.name}
                    onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                    className="w-full input-premium"
                    placeholder="Enter student name"
                  />
                </div>
                <div className="space-y-3">
                  <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Enrolled Course</label>
                  <input 
                    required
                    readOnly
                    type="text" 
                    value={newStudent.courses[0] || ''}
                    className="w-full input-premium opacity-60"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Total Amount (₹)</label>
                    <input 
                      required
                      type="number" 
                      value={newStudent.totalFee || ''}
                      onChange={e => setNewStudent({...newStudent, totalFee: Number(e.target.value)})}
                      className="w-full input-premium text-black dark:text-white dark:font-bold"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Initial Amount (₹)</label>
                    <input 
                      required
                      type="number" 
                      value={newStudent.initialAmount || ''}
                      onChange={e => setNewStudent({...newStudent, initialAmount: Number(e.target.value)})}
                      className="w-full input-premium text-black dark:text-white dark:font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="font-label text-[10px] text-primary/60 uppercase tracking-widest px-1 font-bold">Balance (₹)</label>
                  <input 
                    readOnly
                    type="number" 
                    value={studentBalance}
                    className="w-full input-premium text-black dark:text-white dark:font-bold opacity-60"
                  />
                </div>
                <div className="flex gap-6 pt-4">
                  <Button 
                    type="button" 
                    onClick={() => setShowAddStudentModal(false)} 
                    variant="secondary"
                    className="flex-1 py-4 rounded-full"
                  >
                    Discard
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary"
                    className="flex-1 py-4 rounded-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                    ) : (
                      'Enroll Student'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
