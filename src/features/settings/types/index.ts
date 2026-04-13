export type ServiceCategory = "SURGERY" | "COSMETIC" | "PEDIATRICS" | "GENERAL";
export type ProcedureType = "TEETH_CLEANING" | "FILLING" | "EXTRACTION" | "ROOT_CANAL" | "CROWN" | "BRACES" | "BLEACHING" | "EXAMINATION" | "XRAY" | "OTHER";

export interface DentalService {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  duration: number; // in minutes
  procedureType: ProcedureType;
}

export type PermissionRole = "ADMIN" | "RECEPTIONIST" | "ACCOUNTANT";

export interface Permission {
  id: string;
  nameKey: string; // key in locale file
  roles: PermissionRole[];
}

export interface BusinessDay {
  day: string;
  isOpen: boolean;
  start: string;
  end: string;
}

export interface ClinicInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  slotDuration: number;
  logoUrl?: string;
  logoUrlDark?: string;
  faviconUrl?: string;
}

export interface NotificationSettings {
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  reminderTiming: number; // hours before
}

export interface ClinicSettings {
  services: DentalService[];
  businessHours: BusinessDay[];
  lastBackup: string | null;
  clinicInfo: ClinicInfo;
  notifications: NotificationSettings;
}

export interface InitialSettingsData {
  services: DentalService[];
  hours: BusinessDay[];
  clinicInfo: ClinicInfo | null;
  notifications: NotificationSettings;
}
