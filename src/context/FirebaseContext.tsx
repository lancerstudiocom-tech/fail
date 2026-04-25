import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  getDocs, 
  query,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Student, 
  Course, 
  Payment, 
  Inventory, 
  Customer, 
  Measurement, 
  StudentCourse, 
  InventoryTransaction 
} from '../types';

interface DataContextType {
  loading: boolean;
  user: { displayName: string; email: string; photoURL?: string };
  students: Student[];
  courses: Course[];
  payments: Payment[];
  inventory: Inventory[];
  customers: Customer[];
  measurements: Measurement[];
  attendance: any[];
  studentCourses: StudentCourse[];
  inventoryTransactions: InventoryTransaction[];
  
  // CRUD Actions
  addRecord: (collectionName: string, data: any) => Promise<string>;
  updateRecord: (collectionName: string, id: string, data: any) => Promise<void>;
  deleteRecord: (collectionName: string, id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user] = useState({
    displayName: 'Sumi Institute User',
    email: 'guest@sumitailoring.com'
  });
  
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [studentCourses, setStudentCourses] = useState<StudentCourse[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);

  // Generic CRUD Helpers
  const addRecord = async (collectionName: string, data: any) => {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error adding to ${collectionName}:`, error);
      throw error;
    }
  };

  const updateRecord = async (collectionName: string, id: string, data: any) => {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      throw error;
    }
  };

  const deleteRecord = async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      console.error(`Error deleting from ${collectionName}:`, error);
      throw error;
    }
  };

  // Data Migration Logic
  const migrateFromLocalStorage = async () => {
    const collectionsToMigrate = [
      { localKey: 'tailor_students', firestoreKey: 'students' },
      { localKey: 'tailor_courses', firestoreKey: 'courses' },
      { localKey: 'tailor_payments', firestoreKey: 'payments' },
      { localKey: 'tailor_inventory', firestoreKey: 'inventory' },
      { localKey: 'tailor_customers', firestoreKey: 'customers' },
      { localKey: 'tailor_attendance', firestoreKey: 'attendance' },
      { localKey: 'tailor_student_courses', firestoreKey: 'student_courses' },
      { localKey: 'tailor_inventory_transactions', firestoreKey: 'inventory_transactions' },
      { localKey: 'tailor_measurement_history', firestoreKey: 'measurements' }
    ];

    for (const item of collectionsToMigrate) {
      try {
        const localDataRaw = localStorage.getItem(item.localKey);
        if (!localDataRaw) continue;
        
        const localData = JSON.parse(localDataRaw);
        if (localData.length > 0) {
          // Check if Firestore is empty for this collection
          const querySnapshot = await getDocs(query(collection(db, item.firestoreKey)));
          if (querySnapshot.empty) {
            console.log(`Migrating ${item.localKey} to Firestore ${item.firestoreKey}...`);
            const batch = writeBatch(db);
            localData.forEach((record: any) => {
              // Create a doc reference with the SAME ID if possible to preserve links, 
              // but Firestore IDs are usually strings. LocalStorage might have string IDs too.
              const newDocRef = doc(collection(db, item.firestoreKey));
              batch.set(newDocRef, {
                ...record,
                migratedFromLocal: true,
                createdAt: record.createdAt || Timestamp.now()
              });
            });
            await batch.commit();
            console.log(`Migration of ${item.firestoreKey} complete.`);
          }
        }
      } catch (err) {
        console.error(`Migration error for ${item.localKey}:`, err);
      }
    }
  };

  useEffect(() => {
    // 1. Run migration if needed
    migrateFromLocalStorage().catch(console.error);

    // 2. Set up real-time listeners
    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    const unsubCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    });

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inventory)));
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });

    const unsubMeasurements = onSnapshot(collection(db, 'measurements'), (snapshot) => {
      setMeasurements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Measurement)));
    });

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubStudentCourses = onSnapshot(collection(db, 'student_courses'), (snapshot) => {
      setStudentCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentCourse)));
    });

    const unsubInventoryTransactions = onSnapshot(collection(db, 'inventory_transactions'), (snapshot) => {
      setInventoryTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryTransaction)));
    });

    setLoading(false);

    return () => {
      unsubStudents();
      unsubCourses();
      unsubPayments();
      unsubInventory();
      unsubCustomers();
      unsubMeasurements();
      unsubAttendance();
      unsubStudentCourses();
      unsubInventoryTransactions();
    };
  }, []);

  return (
    <DataContext.Provider value={{ 
      loading, 
      user, 
      students, 
      courses, 
      payments, 
      inventory, 
      customers, 
      measurements,
      attendance,
      studentCourses,
      inventoryTransactions,
      addRecord,
      updateRecord,
      deleteRecord
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const useFirebase = useData;
export const FirebaseProvider = DataProvider;
