import React, { createContext, useContext, useState, useEffect } from 'react';

interface DataContextType {
  loading: boolean;
  user: { displayName: string; email: string; photoURL?: string };
  students: any[];
  courses: any[];
  payments: any[];
  inventory: any[];
  customers: any[];
  measurements: any[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user] = useState({
    displayName: 'Sumi Institute User',
    email: 'guest@sumitailoring.com'
  });
  
  const [data, setData] = useState({
    students: [],
    courses: [],
    payments: [],
    inventory: [],
    customers: [],
    measurements: []
  });

  const loadAllData = () => {
    try {
      setData({
        students: JSON.parse(localStorage.getItem('tailor_students') || '[]'),
        courses: JSON.parse(localStorage.getItem('tailor_courses') || '[]'),
        payments: JSON.parse(localStorage.getItem('tailor_payments') || '[]'),
        inventory: JSON.parse(localStorage.getItem('tailor_inventory') || '[]'),
        customers: JSON.parse(localStorage.getItem('tailor_customers') || '[]'),
        measurements: JSON.parse(localStorage.getItem('tailor_measurement_history') || '[]')
      });
    } catch (err) {
      console.error("Context Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    window.addEventListener('storage', loadAllData);
    return () => window.removeEventListener('storage', loadAllData);
  }, []);

  return (
    <DataContext.Provider value={{ loading, user, ...data }}>
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

// Maintain backward compatibility for files still importing useFirebase
export const useFirebase = useData;
export const FirebaseProvider = DataProvider;
