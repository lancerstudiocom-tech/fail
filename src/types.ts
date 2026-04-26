export interface StudentCourse {
  id: string;
  studentId: string;
  courseName: string;
  amountPaid: number;
  receiptNo: string;
  date: string;
  paymentMethod?: string;
  createdAt: any;
}

export interface Student {
  id: string;
  name: string;
  phone?: string;
  courses: string[];
  totalFee: number;
  amountPaid: number;
  balance: number;
  createdAt: any;
}

export interface Course {
  id: string;
  name: string;
  duration: string;
  fee: number;
  createdAt: any;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  type: 'credit' | 'debit';
  method?: string;
  notes?: string;
  date: any;
}

export interface Inventory {
  id: string;
  name: string;
  totalQuantityBought: number;
  quantityRemaining: number;
  costPerItem: number;
  totalCost: number;
  createdAt: any;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  type: 'usage' | 'sale';
  quantity: number;
  sellingPrice?: number;
  profit?: number;
  date: any;
}

export interface Customer {
  id: string;
  billId: string;
  name: string;
  phone: string;
  notes?: string;
  status: 'Pending' | 'Completed' | 'Out for Delivery' | 'Received';
  totalBill: number;
  balance: number;
  receiptNo: string;
  deliveryDate: string;
  billUrl?: string;
  createdAt: any;
}

export interface Measurement {
  id: string;
  customerId?: string;
  studentId?: string;
  type: string;
  unit: 'in' | 'cm';
  chest?: string;
  waist?: string;
  hip?: string;
  shoulder?: string;
  sleeveLength?: string;
  length?: string;
  neck?: string;
  inseam?: string;
  thigh?: string;
  customFields?: { label: string; value: string }[];
  specialInstructions?: string;
  notes?: string;
  date: any;
}
