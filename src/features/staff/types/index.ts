export type StaffRole = "DOCTOR" | "ASSISTANT" | "RECEPTIONIST" | "ACCOUNTANT";

export type LeaveType = "ANNUAL" | "SICK" | "EMERGENCY" | "UNPAID";

export type PermissionKey = "view_patients" | "edit_records" | "view_revenue" | "delete_data";

export interface StaffPermissions {
  view_patients?: boolean;
  edit_records?: boolean;
  view_revenue?: boolean;
  delete_data?: boolean;
}

export interface StaffMember {
  id: string;
  fullName: string;
  role: StaffRole;
  specialty?: string;
  certifications: string[];
  email: string;
  phone: string;
  joinDate: string;
  salary: number;
  isActive: boolean;
  avatarUrl?: string;
  permissions?: StaffPermissions;
  createLoginAccount?: boolean;
  password?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface StaffSchedule {
  staffId: string;
  weekStart: string;
  shifts: {
    date: string;
    startTime: string;
    endTime: string;
    isOnCall: boolean;
  }[];
}

export type PayrollStatus = "PENDING" | "PAID" | "CANCELLED";

export interface PayrollRecord {
  id: string;
  staffId: string;
  month: string; // YYYY-MM
  baseSalary: number;
  bonuses: number;
  deductions: number;
  net: number;
  status: PayrollStatus;
  paidAt?: string;
  paymentMethod?: "CASH" | "TRANSFER" | "CHECK";
  note?: string;
}
