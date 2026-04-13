// DEPRECATED: Use server actions from staff/serverActions.ts instead.
// This stub exists to prevent import errors in legacy code.

import {
  StaffMember,
  LeaveRequest,
  StaffSchedule,
  PayrollRecord,
} from "../types";

export const staffService = {
  getAllStaff: (): StaffMember[] => [],

  getStaffById: (_id: string): StaffMember | undefined => undefined,

  getStaffByRole: (_role: string): StaffMember[] => [],

  saveStaff: (_staff: StaffMember): void => {},

  deleteStaff: (_id: string): void => {},

  toggleStaffStatus: (_id: string): void => {},

  getAllLeaves: (): LeaveRequest[] => [],

  getLeavesByStaffId: (_staffId: string): LeaveRequest[] => [],

  submitLeaveRequest: (
    _leave: Omit<LeaveRequest, "id" | "status" | "requestedAt">,
  ): LeaveRequest => {
    throw new Error("Use createLeaveRequestAction from staff/serverActions.ts");
  },

  approveLeaveRequest: (_leaveId: string, _reviewedBy: string): void => {},

  rejectLeaveRequest: (_leaveId: string, _reviewedBy: string): void => {},

  getAllSchedules: (): StaffSchedule[] => [],

  getStaffSchedule: (
    _staffId: string,
    _weekStart: string,
  ): StaffSchedule | undefined => undefined,

  saveStaffSchedule: (_schedule: StaffSchedule): void => {},

  getAllPayrollRecords: (): PayrollRecord[] => [],

  getPayrollByStaffId: (_staffId: string): PayrollRecord[] => [],

  getPayrollByMonth: (_month: string): PayrollRecord[] => [],

  savePayrollRecord: (_record: PayrollRecord): void => {},

  generateMonthlyPayroll: (
    _month: string,
    _staffList?: StaffMember[],
  ): void => {},

  getPayrollSummary: (
    _staffId: string,
  ): {
    baseSalary: number;
    bonuses: number;
    deductions: number;
    net: number;
  } => ({
    baseSalary: 0,
    bonuses: 0,
    deductions: 0,
    net: 0,
  }),
};
