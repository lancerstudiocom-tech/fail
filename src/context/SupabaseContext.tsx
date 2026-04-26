import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
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
  user: User | null;
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
  addRecord: (tableName: string, data: any) => Promise<string>;
  updateRecord: (tableName: string, id: string, data: any) => Promise<void>;
  deleteRecord: (tableName: string, id: string) => Promise<void>;
  uploadFile: (bucketName: string, path: string, file: Blob) => Promise<string>;
  logout: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const mapKeys = (obj: any, mapper: (s: string) => string) => {
  if (Array.isArray(obj)) return obj.map(v => mapKeys(v, mapper));
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key) => {
      acc[mapper(key)] = mapKeys(obj[key], mapper);
      return acc;
    }, {});
  }
  return obj;
};

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [studentCourses, setStudentCourses] = useState<StudentCourse[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);

  useEffect(() => {
    // 1. Auth Listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isFetching = React.useRef(false);

  const fetchData = React.useCallback(async (specificTable?: string) => {
    if (!user || isFetching.current) return;
    isFetching.current = true;
    
    try {
      const tables = specificTable ? [specificTable] : [
        'students', 'courses', 'payments', 'inventory', 
        'customers', 'measurements', 'attendance', 
        'student_courses', 'inventory_transactions'
      ];

      const results = await Promise.all(
        tables.map(table => supabase.from(table).select('*'))
      );

      results.forEach((result, index) => {
        const { data, error } = result;
        if (!error && data) {
          const table = tables[index];
          const camelData = mapKeys(data, toCamelCase);
          
          switch (table) {
            case 'students': setStudents(camelData); break;
            case 'courses': setCourses(camelData); break;
            case 'payments': setPayments(camelData); break;
            case 'inventory': setInventory(camelData); break;
            case 'customers': setCustomers(camelData); break;
            case 'measurements': setMeasurements(camelData); break;
            case 'attendance': setAttendance(camelData); break;
            case 'student_courses': setStudentCourses(camelData); break;
            case 'inventory_transactions': setInventoryTransactions(camelData); break;
          }
        }
      });
    } finally {
      isFetching.current = false;
    }
  }, [user]);

  const debouncedFetchData = React.useMemo(() => {
    const fetchers: Record<string, any> = {};
    
    return (tableName?: string) => {
      const key = tableName || 'all';
      if (fetchers[key]) clearTimeout(fetchers[key]);
      
      fetchers[key] = setTimeout(() => {
        fetchData(tableName);
        delete fetchers[key];
      }, 500);
    };
  }, [fetchData]);

  useEffect(() => {
    if (!user) return;

    fetchData();

    // Set up real-time subscriptions
    const tables = [
      'students', 'courses', 'payments', 'inventory', 
      'customers', 'measurements', 'attendance', 
      'student_courses', 'inventory_transactions'
    ];

    const channels = tables.map(table => 
      supabase.channel(`${table}_changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          debouncedFetchData(table);
        })
        .subscribe((status) => {
          // Subscription status handled silently
        })
    );

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user]);

  const ALLOWED_TABLES = [
    'students', 'courses', 'payments', 'inventory', 
    'customers', 'measurements', 'attendance', 
    'student_courses', 'inventory_transactions'
  ];

  const validateTable = (tableName: string) => {
    if (!ALLOWED_TABLES.includes(tableName)) {
      throw new Error(`Unauthorized table access: ${tableName}`);
    }
  };

  const addRecord = React.useCallback(async (tableName: string, record: any) => {
    validateTable(tableName);
    const { id: _, ...recordToSave } = record;
    
    // Security: Sanitize data
    const sanitizedData = Object.keys(recordToSave).reduce((acc: any, key) => {
      if (key === '__proto__' || key === 'constructor') return acc;
      acc[key] = recordToSave[key];
      return acc;
    }, {});

    const snakeData = mapKeys(sanitizedData, toSnakeCase);
    
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(snakeData)
      .select();

    if (error) {
      console.error(`[Supabase] Add Error (${tableName}):`, error);
      throw error;
    }
    
    // Optimistic Update: Refresh local state immediately
    await fetchData();
    
    return result?.[0]?.id;
  }, [fetchData]);

  const updateRecord = React.useCallback(async (tableName: string, id: string, data: any) => {
    validateTable(tableName);
    const { id: _, ...updateData } = data;
    
    // Security: Sanitize data
    const sanitizedData = Object.keys(updateData).reduce((acc: any, key) => {
      if (key === '__proto__' || key === 'constructor') return acc;
      acc[key] = updateData[key];
      return acc;
    }, {});

    const snakeData = mapKeys(sanitizedData, toSnakeCase);
    
    const { error } = await supabase
      .from(tableName)
      .update(snakeData)
      .eq('id', id);

    if (error) {
      console.error(`[Supabase] Update Error (${tableName}):`, error);
      throw error;
    }

    // Optimistic Update: Refresh local state immediately
    await fetchData();
  }, [fetchData]);

  const deleteRecord = React.useCallback(async (tableName: string, id: string) => {
    validateTable(tableName);
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[Supabase] Delete Error (${tableName}):`, error);
      throw error;
    }

    // Optimistic Update: Refresh local state immediately
    await fetchData();
  }, [fetchData]);

  const uploadFile = React.useCallback(async (bucketName: string, path: string, file: Blob) => {
    const { data, error } = await supabase.storage.from(bucketName).upload(path, file, {
      upsert: true,
      contentType: 'application/pdf'
    });

    if (error) {
      console.error(`[Supabase] Upload Error (${bucketName}):`, error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(path);
    return publicUrl;
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value = React.useMemo(() => ({
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
    deleteRecord,
    uploadFile,
    logout
  }), [
    loading, user, students, courses, payments, inventory, customers, measurements, 
    attendance, studentCourses, inventoryTransactions, addRecord, updateRecord, deleteRecord, uploadFile, logout
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a SupabaseProvider');
  }
  return context;
};

export const useSupabase = useData;
export const SupabaseProviderAlias = SupabaseProvider;
