


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."AppointmentStatus" AS ENUM (
    'SCHEDULED',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
);


ALTER TYPE "public"."AppointmentStatus" OWNER TO "postgres";


CREATE TYPE "public"."Gender" AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER'
);


ALTER TYPE "public"."Gender" OWNER TO "postgres";


CREATE TYPE "public"."InvoiceStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'PAID',
    'PARTIAL',
    'OVERDUE',
    'CANCELLED'
);


ALTER TYPE "public"."InvoiceStatus" OWNER TO "postgres";


CREATE TYPE "public"."PaymentMethod" AS ENUM (
    'CASH',
    'CARD',
    'WALLET',
    'BANK_TRANSFER',
    'INSURANCE'
);


ALTER TYPE "public"."PaymentMethod" OWNER TO "postgres";


CREATE TYPE "public"."PaymentType" AS ENUM (
    'PAYMENT',
    'REFUND',
    'ADJUSTMENT'
);


ALTER TYPE "public"."PaymentType" OWNER TO "postgres";


CREATE TYPE "public"."Priority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


ALTER TYPE "public"."Priority" OWNER TO "postgres";


CREATE TYPE "public"."Severity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE "public"."Severity" OWNER TO "postgres";


CREATE TYPE "public"."TreatmentStatus" AS ENUM (
    'PLANNED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE "public"."TreatmentStatus" OWNER TO "postgres";


CREATE TYPE "public"."UserRole" AS ENUM (
    'ADMIN',
    'DOCTOR',
    'RECEPTIONIST',
    'ASSISTANT'
);


ALTER TYPE "public"."UserRole" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Clinic" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "phone" "text",
    "email" "text",
    "logoUrl" "text",
    "subscription" "text" DEFAULT 'free'::"text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "faviconUrl" "text",
    "slotDuration" integer DEFAULT 30,
    "logoUrlDark" "text"
);


ALTER TABLE "public"."Clinic" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "text" NOT NULL,
    "patientId" "text" NOT NULL,
    "userId" "text",
    "date" timestamp(3) without time zone NOT NULL,
    "startTime" "text" NOT NULL,
    "endTime" "text",
    "status" "public"."AppointmentStatus" DEFAULT 'SCHEDULED'::"public"."AppointmentStatus" NOT NULL,
    "type" "text",
    "notes" "text",
    "reason" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "clinicId" "text" NOT NULL,
    "staffId" "text"
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "text" NOT NULL,
    "clinicId" "text" NOT NULL,
    "userId" "text",
    "action" "text" NOT NULL,
    "entityType" "text" NOT NULL,
    "entityId" "text" NOT NULL,
    "diff" "jsonb",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinic_business_hours" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "clinicId" "text" NOT NULL,
    "hours" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."clinic_business_hours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinic_notification_settings" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "clinicId" "text" NOT NULL,
    "smsEnabled" boolean DEFAULT true NOT NULL,
    "whatsappEnabled" boolean DEFAULT true NOT NULL,
    "emailEnabled" boolean DEFAULT false NOT NULL,
    "reminderTiming" integer DEFAULT 24 NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."clinic_notification_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinical_cases" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "clinicId" "text" NOT NULL,
    "patientId" "text" NOT NULL,
    "toothNumber" integer NOT NULL,
    "toothStatus" "text" DEFAULT 'HEALTHY'::"text" NOT NULL,
    "diagnosis" "text",
    "procedure" "text",
    "procedureKey" "text",
    "notes" "text",
    "estimatedCost" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'PLANNED'::"text" NOT NULL,
    "sessionDate" "date",
    "completedAt" timestamp(6) without time zone,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."clinical_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_alerts" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "clinicId" "text" NOT NULL,
    "itemId" "text" NOT NULL,
    "itemName" "text" NOT NULL,
    "type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "acknowledged" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."inventory_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "nameAr" "text",
    "code" "text" NOT NULL,
    "category" "text" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "unit" "text" NOT NULL,
    "minStock" integer DEFAULT 10 NOT NULL,
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "supplier" "text",
    "expiryDate" timestamp(3) without time zone,
    "location" "text",
    "notes" "text",
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "clinicId" "text" NOT NULL
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_transactions" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "clinicId" "text" NOT NULL,
    "itemId" "text" NOT NULL,
    "type" "text" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "reason" "text" DEFAULT ''::"text" NOT NULL,
    "performedBy" "text",
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."inventory_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "text" NOT NULL,
    "invoiceId" "text" NOT NULL,
    "treatmentId" "text",
    "description" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "total" numeric(10,2) NOT NULL
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "text" NOT NULL,
    "invoiceNumber" "text" NOT NULL,
    "patientId" "text" NOT NULL,
    "totalAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "paidAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "public"."InvoiceStatus" DEFAULT 'DRAFT'::"public"."InvoiceStatus" NOT NULL,
    "dueDate" timestamp(3) without time zone,
    "notes" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leave_requests" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "clinicId" "text" NOT NULL,
    "staffId" "text" NOT NULL,
    "type" "text" NOT NULL,
    "startDate" "date" NOT NULL,
    "endDate" "date" NOT NULL,
    "reason" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "requestedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedAt" timestamp(6) without time zone,
    "reviewedBy" "text"
);


ALTER TABLE "public"."leave_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_files" (
    "id" "text" NOT NULL,
    "patientId" "text" NOT NULL,
    "fileName" "text" NOT NULL,
    "fileUrl" "text" NOT NULL,
    "fileType" "text" NOT NULL,
    "size" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."media_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medical_histories" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "patientId" "text" NOT NULL,
    "condition" "text" NOT NULL,
    "value" "text",
    "severity" "public"."Severity" DEFAULT 'LOW'::"public"."Severity" NOT NULL,
    "notes" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."medical_histories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "text" NOT NULL,
    "userId" "text",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patients" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "fileNumber" "text" NOT NULL,
    "fullName" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "altPhone" "text",
    "email" "text",
    "dateOfBirth" timestamp(3) without time zone NOT NULL,
    "gender" "public"."Gender" NOT NULL,
    "bloodGroup" "text",
    "city" "text",
    "address" "text",
    "job" "text",
    "notes" "text",
    "allergies" "text",
    "mouthMap" "jsonb" DEFAULT '{}'::"jsonb",
    "avatar" "text",
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "clinicId" "text" NOT NULL,
    "nationalId" "text",
    "emergencyName" "text",
    "emergencyRelationship" "text",
    "emergencyPhone" "text",
    "treatmentHistory" "jsonb" DEFAULT '[]'::"jsonb",
    "currentMedications" "text",
    "deletedAt" timestamp(6) without time zone
);


ALTER TABLE "public"."patients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "text" NOT NULL,
    "patientId" "text" NOT NULL,
    "userId" "text",
    "amount" numeric(10,2) NOT NULL,
    "method" "public"."PaymentMethod" DEFAULT 'CASH'::"public"."PaymentMethod" NOT NULL,
    "type" "public"."PaymentType" DEFAULT 'PAYMENT'::"public"."PaymentType" NOT NULL,
    "notes" "text",
    "reference" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payroll_records" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "clinicId" "text" NOT NULL,
    "staffId" "text" NOT NULL,
    "month" "text" NOT NULL,
    "baseSalary" numeric(10,2) DEFAULT 0 NOT NULL,
    "bonuses" numeric(10,2) DEFAULT 0 NOT NULL,
    "deductions" numeric(10,2) DEFAULT 0 NOT NULL,
    "net" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "paidAt" timestamp(6) without time zone,
    "paymentMethod" "text",
    "note" "text",
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."payroll_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "nameAr" "text",
    "code" "text" NOT NULL,
    "category" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "duration" integer,
    "description" "text",
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "clinicId" "text" NOT NULL
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "text" NOT NULL,
    "userId" "text",
    "employeeCode" "text" NOT NULL,
    "fullName" "text" NOT NULL,
    "specialty" "text",
    "certification" "text",
    "phone" "text" NOT NULL,
    "email" "text" NOT NULL,
    "address" "text",
    "salary" numeric(10,2),
    "joinDate" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "clinicId" "text" NOT NULL,
    "role" "text" DEFAULT 'ASSISTANT'::"text" NOT NULL,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_schedules" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "clinicId" "text" NOT NULL,
    "staffId" "text" NOT NULL,
    "weekStart" "date" NOT NULL,
    "days" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "createdAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."staff_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."treatments" (
    "id" "text" NOT NULL,
    "patientId" "text" NOT NULL,
    "userId" "text",
    "toothNumber" "text",
    "surface" "text",
    "procedureType" "text" NOT NULL,
    "procedureName" "text" NOT NULL,
    "status" "public"."TreatmentStatus" DEFAULT 'PLANNED'::"public"."TreatmentStatus" NOT NULL,
    "priority" "public"."Priority" DEFAULT 'MEDIUM'::"public"."Priority" NOT NULL,
    "cost" numeric(10,2) DEFAULT 0 NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "notes" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "staffId" "text"
);


ALTER TABLE "public"."treatments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "password" "text",
    "fullName" "text" NOT NULL,
    "role" "public"."UserRole" DEFAULT 'RECEPTIONIST'::"public"."UserRole" NOT NULL,
    "avatar" "text",
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "clinicId" "text" NOT NULL,
    "phone" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."Clinic"
    ADD CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinic_business_hours"
    ADD CONSTRAINT "clinic_business_hours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinic_notification_settings"
    ADD CONSTRAINT "clinic_notification_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinical_cases"
    ADD CONSTRAINT "clinical_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_alerts"
    ADD CONSTRAINT "inventory_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_files"
    ADD CONSTRAINT "media_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_histories"
    ADD CONSTRAINT "medical_histories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payroll_records"
    ADD CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_schedules"
    ADD CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."treatments"
    ADD CONSTRAINT "treatments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "Clinic_email_key" ON "public"."Clinic" USING "btree" ("email");



CREATE INDEX "appointments_date_idx" ON "public"."appointments" USING "btree" ("date");



CREATE INDEX "appointments_patientId_idx" ON "public"."appointments" USING "btree" ("patientId");



CREATE INDEX "appointments_userId_idx" ON "public"."appointments" USING "btree" ("userId");



CREATE UNIQUE INDEX "clinic_business_hours_clinicId_key" ON "public"."clinic_business_hours" USING "btree" ("clinicId");



CREATE UNIQUE INDEX "clinic_notification_settings_clinicId_key" ON "public"."clinic_notification_settings" USING "btree" ("clinicId");



CREATE INDEX "idx_cc_clinic" ON "public"."clinical_cases" USING "btree" ("clinicId");



CREATE INDEX "idx_cc_patient" ON "public"."clinical_cases" USING "btree" ("patientId");



CREATE INDEX "idx_cc_patient_tooth" ON "public"."clinical_cases" USING "btree" ("patientId", "toothNumber");



CREATE INDEX "idx_lr_clinic" ON "public"."leave_requests" USING "btree" ("clinicId");



CREATE INDEX "idx_lr_staff" ON "public"."leave_requests" USING "btree" ("staffId");



CREATE INDEX "idx_lr_status" ON "public"."leave_requests" USING "btree" ("status");



CREATE INDEX "idx_pr_clinic" ON "public"."payroll_records" USING "btree" ("clinicId");



CREATE INDEX "idx_pr_month" ON "public"."payroll_records" USING "btree" ("month");



CREATE INDEX "idx_pr_staff" ON "public"."payroll_records" USING "btree" ("staffId");



CREATE INDEX "inventory_items_category_idx" ON "public"."inventory_items" USING "btree" ("category");



CREATE INDEX "inventory_items_code_idx" ON "public"."inventory_items" USING "btree" ("code");



CREATE UNIQUE INDEX "inventory_items_code_key" ON "public"."inventory_items" USING "btree" ("code");



CREATE INDEX "invoice_items_invoiceId_idx" ON "public"."invoice_items" USING "btree" ("invoiceId");



CREATE INDEX "invoices_invoiceNumber_idx" ON "public"."invoices" USING "btree" ("invoiceNumber");



CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "public"."invoices" USING "btree" ("invoiceNumber");



CREATE INDEX "invoices_patientId_idx" ON "public"."invoices" USING "btree" ("patientId");



CREATE INDEX "notifications_isRead_idx" ON "public"."notifications" USING "btree" ("isRead");



CREATE INDEX "notifications_userId_idx" ON "public"."notifications" USING "btree" ("userId");



CREATE INDEX "patients_fileNumber_idx" ON "public"."patients" USING "btree" ("fileNumber");



CREATE UNIQUE INDEX "patients_fileNumber_key" ON "public"."patients" USING "btree" ("fileNumber");



CREATE INDEX "patients_phone_idx" ON "public"."patients" USING "btree" ("phone");



CREATE INDEX "payments_createdAt_idx" ON "public"."payments" USING "btree" ("createdAt");



CREATE INDEX "payments_patientId_idx" ON "public"."payments" USING "btree" ("patientId");



CREATE INDEX "payments_userId_idx" ON "public"."payments" USING "btree" ("userId");



CREATE INDEX "services_category_idx" ON "public"."services" USING "btree" ("category");



CREATE UNIQUE INDEX "services_code_key" ON "public"."services" USING "btree" ("code");



CREATE INDEX "staff_employeeCode_idx" ON "public"."staff" USING "btree" ("employeeCode");



CREATE UNIQUE INDEX "staff_employeeCode_key" ON "public"."staff" USING "btree" ("employeeCode");



CREATE UNIQUE INDEX "staff_schedules_staffId_weekStart_key" ON "public"."staff_schedules" USING "btree" ("staffId", "weekStart");



CREATE UNIQUE INDEX "staff_userId_key" ON "public"."staff" USING "btree" ("userId");



CREATE INDEX "treatments_patientId_idx" ON "public"."treatments" USING "btree" ("patientId");



CREATE INDEX "treatments_status_idx" ON "public"."treatments" USING "btree" ("status");



CREATE UNIQUE INDEX "uq_pr_staff_month" ON "public"."payroll_records" USING "btree" ("staffId", "month");



CREATE UNIQUE INDEX "users_email_key" ON "public"."users" USING "btree" ("email");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clinic_business_hours"
    ADD CONSTRAINT "clinic_business_hours_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinic_notification_settings"
    ADD CONSTRAINT "clinic_notification_settings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinical_cases"
    ADD CONSTRAINT "fk_cc_clinic" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinical_cases"
    ADD CONSTRAINT "fk_cc_patient" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "fk_lr_clinic" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "fk_lr_staff" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payroll_records"
    ADD CONSTRAINT "fk_pr_clinic" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payroll_records"
    ADD CONSTRAINT "fk_pr_staff" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_alerts"
    ADD CONSTRAINT "inventory_alerts_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_alerts"
    ADD CONSTRAINT "inventory_alerts_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "public"."treatments"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_files"
    ADD CONSTRAINT "media_files_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_histories"
    ADD CONSTRAINT "medical_histories_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_schedules"
    ADD CONSTRAINT "staff_schedules_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_schedules"
    ADD CONSTRAINT "staff_schedules_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."treatments"
    ADD CONSTRAINT "treatments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."treatments"
    ADD CONSTRAINT "treatments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."treatments"
    ADD CONSTRAINT "treatments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "public"."Clinic"("id") ON UPDATE CASCADE ON DELETE RESTRICT;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."appointments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."clinical_cases";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."inventory_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."invoices";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."patients";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."payments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."treatments";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."Clinic" TO "anon";
GRANT ALL ON TABLE "public"."Clinic" TO "authenticated";
GRANT ALL ON TABLE "public"."Clinic" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."clinic_business_hours" TO "anon";
GRANT ALL ON TABLE "public"."clinic_business_hours" TO "authenticated";
GRANT ALL ON TABLE "public"."clinic_business_hours" TO "service_role";



GRANT ALL ON TABLE "public"."clinic_notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."clinic_notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."clinic_notification_settings" TO "service_role";



GRANT ALL ON TABLE "public"."clinical_cases" TO "anon";
GRANT ALL ON TABLE "public"."clinical_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."clinical_cases" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_alerts" TO "anon";
GRANT ALL ON TABLE "public"."inventory_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_transactions" TO "anon";
GRANT ALL ON TABLE "public"."inventory_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."leave_requests" TO "anon";
GRANT ALL ON TABLE "public"."leave_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_requests" TO "service_role";



GRANT ALL ON TABLE "public"."media_files" TO "anon";
GRANT ALL ON TABLE "public"."media_files" TO "authenticated";
GRANT ALL ON TABLE "public"."media_files" TO "service_role";



GRANT ALL ON TABLE "public"."medical_histories" TO "anon";
GRANT ALL ON TABLE "public"."medical_histories" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_histories" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."patients" TO "anon";
GRANT ALL ON TABLE "public"."patients" TO "authenticated";
GRANT ALL ON TABLE "public"."patients" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."payroll_records" TO "anon";
GRANT ALL ON TABLE "public"."payroll_records" TO "authenticated";
GRANT ALL ON TABLE "public"."payroll_records" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON TABLE "public"."staff_schedules" TO "anon";
GRANT ALL ON TABLE "public"."staff_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."treatments" TO "anon";
GRANT ALL ON TABLE "public"."treatments" TO "authenticated";
GRANT ALL ON TABLE "public"."treatments" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


