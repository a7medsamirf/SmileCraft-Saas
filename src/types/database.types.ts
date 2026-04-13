// =============================================================================
// SmileCraft CMS — Supabase Database Type Definitions
// Equivalent to what `supabase gen types typescript --project-id <id>` produces.
// Generated from prisma/schema.prisma (column names are camelCase per Prisma default).
// src/types/database.types.ts
//
// CHANGELOG (vs original):
//   [FIX]  appointments.Relationships — added missing staffId → users FK
//   [ADD]  payments table (invoicing & payment tracking)
//   [ADD]  staff_schedules table (working hours / availability)
//   [ADD]  medical_alerts table (uses the orphaned Severity enum)
//   [ADD]  clinical_cases.appointmentId FK (links encounter to its appointment)
//   [ADD]  PaymentMethod & PaymentStatus enums
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Main Database Type
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      // ── appointments ──────────────────────────────────────────────────────
      appointments: {
        Row: {
          id: string;
          clinicId: string;
          patientId: string;
          userId: string | null;
          staffId: string | null;
          /** ISO 8601 datetime string stored as full timestamp */
          date: string;
          /** HH:mm string, e.g. "09:30" */
          startTime: string;
          endTime: string | null;
          status: AppointmentStatus;
          type: string | null;
          notes: string | null;
          reason: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          clinicId: string;
          patientId: string;
          userId?: string | null;
          staffId?: string | null;
          date: string;
          startTime: string;
          endTime?: string | null;
          status?: AppointmentStatus;
          type?: string | null;
          notes?: string | null;
          reason?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          clinicId?: string;
          patientId?: string;
          userId?: string | null;
          staffId?: string | null;
          date?: string;
          startTime?: string;
          endTime?: string | null;
          status?: AppointmentStatus;
          type?: string | null;
          notes?: string | null;
          reason?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_clinicId_fkey";
            columns: ["clinicId"];
            isOneToOne: false;
            referencedRelation: "Clinic";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_patientId_fkey";
            columns: ["patientId"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          // [FIX] staffId was declared in Row but had no FK relationship defined.
          // Without this, joins on staffId silently return null instead of erroring.
          {
            foreignKeyName: "appointments_staffId_fkey";
            columns: ["staffId"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── patients ──────────────────────────────────────────────────────────
      patients: {
        Row: {
          id: string;
          clinicId: string;
          fileNumber: string;
          fullName: string;
          nationalId: string | null;
          phone: string;
          altPhone: string | null;
          email: string | null;
          dateOfBirth: string;
          gender: Gender;
          bloodGroup: string | null;
          city: string | null;
          address: string | null;
          job: string | null;
          notes: string | null;
          allergies: string | null;
          /** JSONB — Odontogram tooth-state map */
          mouthMap: Json | null;
          avatar: string | null;
          isActive: boolean;
          createdAt: string;
          updatedAt: string;
          emergencyName: string | null;
          emergencyRelationship: string | null;
          emergencyPhone: string | null;
        };
        Insert: {
          id?: string;
          clinicId: string;
          fileNumber: string;
          fullName: string;
          nationalId?: string | null;
          phone: string;
          altPhone?: string | null;
          email?: string | null;
          dateOfBirth: string;
          gender: Gender;
          bloodGroup?: string | null;
          city?: string | null;
          address?: string | null;
          job?: string | null;
          notes?: string | null;
          allergies?: string | null;
          mouthMap?: Json | null;
          avatar?: string | null;
          isActive?: boolean;
          createdAt?: string;
          updatedAt?: string;
          emergencyName?: string | null;
          emergencyRelationship?: string | null;
          emergencyPhone?: string | null;
        };
        Update: {
          id?: string;
          clinicId?: string;
          fileNumber?: string;
          fullName?: string;
          nationalId?: string | null;
          phone?: string;
          altPhone?: string | null;
          email?: string | null;
          dateOfBirth?: string;
          gender?: Gender;
          bloodGroup?: string | null;
          city?: string | null;
          address?: string | null;
          job?: string | null;
          notes?: string | null;
          allergies?: string | null;
          mouthMap?: Json | null;
          avatar?: string | null;
          isActive?: boolean;
          createdAt?: string;
          updatedAt?: string;
          emergencyName?: string | null;
          emergencyRelationship?: string | null;
          emergencyPhone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "patients_clinicId_fkey";
            columns: ["clinicId"];
            isOneToOne: false;
            referencedRelation: "Clinic";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── clinical_cases ────────────────────────────────────────────────────
      // One row = one clinical encounter for a specific tooth of a patient.
      // toothNumber uses the Universal Numbering System (1–32).
      clinical_cases: {
        Row: {
          id: string;
          clinicId: string;
          patientId: string;
          // [ADD] links this case back to the appointment that initiated it.
          // nullable because cases can also be created outside a scheduled appointment.
          appointmentId: string | null;
          /** Universal Numbering System: 1–32 */
          toothNumber: number;
          /** Mirrors ToothStatus enum (HEALTHY | CARIOUS | MISSING | CROWN | FILLING | ROOT_CANAL) */
          toothStatus: string;
          diagnosis: string | null;
          procedure: string | null;
          /** Machine-readable procedure key, e.g. "procedureRootCanal" */
          procedureKey: string | null;
          notes: string | null;
          /** Estimated or actual cost in EGP */
          estimatedCost: number;
          /** PLANNED | IN_PROGRESS | COMPLETED | CANCELLED */
          status: TreatmentStatus;
          /** ISO date string YYYY-MM-DD */
          sessionDate: string | null;
          completedAt: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          clinicId: string;
          patientId: string;
          appointmentId?: string | null;
          toothNumber: number;
          toothStatus?: string;
          diagnosis?: string | null;
          procedure?: string | null;
          procedureKey?: string | null;
          notes?: string | null;
          estimatedCost?: number;
          status?: TreatmentStatus;
          sessionDate?: string | null;
          completedAt?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          clinicId?: string;
          patientId?: string;
          appointmentId?: string | null;
          toothNumber?: number;
          toothStatus?: string;
          diagnosis?: string | null;
          procedure?: string | null;
          procedureKey?: string | null;
          notes?: string | null;
          estimatedCost?: number;
          status?: TreatmentStatus;
          sessionDate?: string | null;
          completedAt?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_cc_clinic";
            columns: ["clinicId"];
            isOneToOne: false;
            referencedRelation: "Clinic";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_cc_patient";
            columns: ["patientId"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          // [ADD] links clinical case to the appointment that triggered it
          {
            foreignKeyName: "fk_cc_appointment";
            columns: ["appointmentId"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── payments ──────────────────────────────────────────────────────────
      // [ADD] Tracks all financial transactions per patient per clinic.
      // A payment can be linked to a specific clinical_case (e.g. after a procedure)
      // or stand alone (e.g. deposit, refund, insurance settlement).
      payments: {
        Row: {
          id: string;
          clinicId: string;
          patientId: string;
          /** Optional link to a specific treatment case this payment covers */
          clinicalCaseId: string | null;
          /** Amount in EGP */
          amount: number;
          /** How the patient paid */
          paymentMethod: PaymentMethod;
          /** Current state of this payment record */
          status: PaymentStatus;
          /** Discount applied as a percentage (0–100) */
          discountPercent: number | null;
          /** Free-text receipt or invoice reference */
          referenceNumber: string | null;
          notes: string | null;
          /** Timestamp when the payment was actually collected */
          paidAt: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          clinicId: string;
          patientId: string;
          clinicalCaseId?: string | null;
          amount: number;
          paymentMethod: PaymentMethod;
          status?: PaymentStatus;
          discountPercent?: number | null;
          referenceNumber?: string | null;
          notes?: string | null;
          paidAt?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          clinicId?: string;
          patientId?: string;
          clinicalCaseId?: string | null;
          amount?: number;
          paymentMethod?: PaymentMethod;
          status?: PaymentStatus;
          discountPercent?: number | null;
          referenceNumber?: string | null;
          notes?: string | null;
          paidAt?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_clinicId_fkey";
            columns: ["clinicId"];
            isOneToOne: false;
            referencedRelation: "Clinic";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_patientId_fkey";
            columns: ["patientId"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_clinicalCaseId_fkey";
            columns: ["clinicalCaseId"];
            isOneToOne: false;
            referencedRelation: "clinical_cases";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── staff_schedules ───────────────────────────────────────────────────
      // [ADD] Defines when a staff member (doctor / assistant) is available.
      // Used to validate that an appointment doesn't conflict with their
      // off-days or outside working hours.
      // One row = one recurring weekly time block for one user.
      staff_schedules: {
        Row: {
          id: string;
          clinicId: string;
          /** The staff member this schedule belongs to */
          userId: string;
          /** 0 = Sunday … 6 = Saturday (ISO: 1 = Monday … 7 = Sunday) */
          dayOfWeek: number;
          /** HH:mm — start of the working block */
          startTime: string;
          /** HH:mm — end of the working block */
          endTime: string;
          /** Allow temporarily disabling a schedule row without deleting it */
          isActive: boolean;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          clinicId: string;
          userId: string;
          dayOfWeek: number;
          startTime: string;
          endTime: string;
          isActive?: boolean;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          clinicId?: string;
          userId?: string;
          dayOfWeek?: number;
          startTime?: string;
          endTime?: string;
          isActive?: boolean;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_schedules_clinicId_fkey";
            columns: ["clinicId"];
            isOneToOne: false;
            referencedRelation: "Clinic";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_schedules_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── medical_alerts ────────────────────────────────────────────────────
      // [ADD] Persistent warnings attached to a patient that clinical staff
      // must be aware of (e.g. drug allergies, bleeding disorders, heart conditions).
      // This table activates the orphaned Severity enum that was declared in the
      // original file but never referenced by any table.
      medical_alerts: {
        Row: {
          id: string;
          clinicId: string;
          patientId: string;
          /** Short label shown in the patient header, e.g. "Penicillin allergy" */
          title: string;
          /** Optional detailed description */
          description: string | null;
          severity: Severity;
          /** Set to false to dismiss/resolve the alert without deleting the record */
          isActive: boolean;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          clinicId: string;
          patientId: string;
          title: string;
          description?: string | null;
          severity?: Severity;
          isActive?: boolean;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          clinicId?: string;
          patientId?: string;
          title?: string;
          description?: string | null;
          severity?: Severity;
          isActive?: boolean;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "medical_alerts_clinicId_fkey";
            columns: ["clinicId"];
            isOneToOne: false;
            referencedRelation: "Clinic";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_alerts_patientId_fkey";
            columns: ["patientId"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── users ─────────────────────────────────────────────────────────────
      users: {
        Row: {
          id: string;
          email: string;
          password: string | null;
          fullName: string;
          phone: string | null;
          role: UserRole;
          avatar: string | null;
          isActive: boolean;
          clinicId: string;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          email: string;
          password?: string | null;
          fullName: string;
          phone?: string | null;
          role?: UserRole;
          avatar?: string | null;
          isActive?: boolean;
          clinicId: string;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password?: string | null;
          fullName?: string;
          phone?: string | null;
          role?: UserRole;
          avatar?: string | null;
          isActive?: boolean;
          clinicId?: string;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_clinicId_fkey";
            columns: ["clinicId"];
            isOneToOne: false;
            referencedRelation: "Clinic";
            referencedColumns: ["id"];
          },
        ];
      };

      // ── Clinic ────────────────────────────────────────────────────────────
      // NOTE: actual Postgres table name is "Clinic" (PascalCase — from Prisma).
      // All clinicId foreign keys on other tables reference this table.
      Clinic: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          logoUrl: string | null;
          subscription: string;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logoUrl?: string | null;
          subscription?: string;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logoUrl?: string | null;
          subscription?: string;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: Record<string, never>;

    Enums: {
      AppointmentStatus: AppointmentStatus;
      UserRole: UserRole;
      Gender: Gender;
      TreatmentStatus: TreatmentStatus;
      Severity: Severity;
      // [ADD]
      PaymentMethod: PaymentMethod;
      PaymentStatus: PaymentStatus;
    };

    CompositeTypes: Record<string, never>;
  };
}

// ---------------------------------------------------------------------------
// Enum string-literal types  (mirror the Prisma enums exactly)
// ---------------------------------------------------------------------------
export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type UserRole = "ADMIN" | "DOCTOR" | "RECEPTIONIST" | "ASSISTANT";
export type Gender = "MALE" | "FEMALE" | "OTHER";

export type TreatmentStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type Severity = "LOW" | "MEDIUM" | "HIGH";

// [ADD] How the patient settled the bill
export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "INSURANCE"
  | "OTHER";

// [ADD] Lifecycle of a payment record
export type PaymentStatus =
  | "PENDING"   // amount is due but not yet collected
  | "PAID"      // fully settled
  | "PARTIAL"   // patient paid part of the amount
  | "REFUNDED"  // money returned to patient
  | "CANCELLED";

// ---------------------------------------------------------------------------
// Convenience helpers — mirror the pattern of the official Supabase CLI output
// ---------------------------------------------------------------------------
export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never;
