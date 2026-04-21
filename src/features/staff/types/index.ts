export type StaffRole = "DOCTOR" | "ASSISTANT" | "RECEPTIONIST" | "ADMIN";

export type LeaveType = "ANNUAL" | "SICK" | "EMERGENCY" | "UNPAID";

export type PermissionKey = 
  | "view_patients" 
  | "edit_records" 
  | "view_revenue" 
  | "delete_data"
  | "view_dashboard"
  | "view_clinical"
  | "view_assistant"
  | "view_calendar"
  | "view_appointments"
  | "view_staff"
  | "view_inventory"
  | "view_finance"
  | "view_branches"
  | "view_settings"
  | "view_schedule";

export interface StaffPermissions {
  view_patients?: boolean;
  edit_records?: boolean;
  view_revenue?: boolean;
  delete_data?: boolean;
  // Page visibility
  view_dashboard?: boolean;
  view_clinical?: boolean;
  view_assistant?: boolean;
  view_calendar?: boolean;
  view_appointments?: boolean;
  view_staff?: boolean;
  view_inventory?: boolean;
  view_finance?: boolean;
  view_branches?: boolean;
  view_settings?: boolean;
  view_schedule?: boolean;
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
  branchId?: string;
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
