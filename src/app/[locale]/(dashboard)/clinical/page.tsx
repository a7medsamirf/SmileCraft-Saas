import React from "react";
import { ClinicalClient } from "@/features/clinical/components/ClinicalClient";
import { getPatientByIdAction } from "@/features/patients/serverActions";
import { getPatientClinicalDataAction } from "@/features/clinical/serverActions";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "العيادة | SmileCraft CMS",
};

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ patientId?: string }>;
}

export default async function ClinicalPage({ searchParams }: Props) {
  const { patientId } = await searchParams;

  let initialPatient = null;
  let initialClinicalData = null;
  let clinicId = "";

  // Get clinicId for realtime
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("clinicId")
      .eq("id", user.id)
      .single();
    clinicId = userData?.clinicId || "";
  }

  if (patientId) {
    console.log("[ClinicalPage] Loading patient data for patientId:", patientId);
    
    try {
      [initialPatient, initialClinicalData] = await Promise.all([
        getPatientByIdAction(patientId),
        getPatientClinicalDataAction(patientId),
      ]);
      
      if (!initialPatient) {
        console.error("[ClinicalPage] Patient not found or access denied for patientId:", patientId);
      } else {
        console.log("[ClinicalPage] Successfully loaded patient:", initialPatient.fullName);
      }
    } catch (error) {
      console.error("[ClinicalPage] Error loading patient data:", error);
    }
  }

  return (
    <ClinicalClient
      key={patientId || "no-patient"}
      initialPatient={initialPatient}
      initialClinicalData={initialClinicalData}
      clinicId={clinicId}
    />
  );
}
