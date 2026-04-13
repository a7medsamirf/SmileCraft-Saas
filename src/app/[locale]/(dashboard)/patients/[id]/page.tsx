import React from "react";
import { notFound } from "next/navigation";
import { ProfileLayout } from "@/features/patients/components/ProfileLayout";
import { getPatientByIdAction } from "@/features/patients/serverActions";

export const metadata = {
  title: "ملف المريض | SmileCraft CMS",
};

interface PatientProfilePageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function PatientProfilePage({
  params,
}: PatientProfilePageProps) {
  const { id } = await params;

  // Try DB first (Supabase), fall back to mock data automatically.
  // Never throws — returns null when the patient doesn't exist in either source.
  const patient = await getPatientByIdAction(id);

  if (!patient) {
    notFound();
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          ملف المريض
        </h1>
        <p className="text-sm text-slate-500">
          تفاصيل وسجلات العلاج للمريض المُحدد.
        </p>
      </div>
      <ProfileLayout patient={patient} />
    </div>
  );
}
