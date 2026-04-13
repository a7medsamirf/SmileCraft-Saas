import React from "react";
import { PatientList } from "@/features/patients/components/PatientList";
import { PageTransition } from "@/components/ui/PageTransition";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "إدارة المرضى - العيادة",
  description: "نظام إدارة عيادة الأسنان - ملفات المرضى",
};

export default async function PatientsPage() {
  const t = await getTranslations("Patients");
  return (
    <PageTransition loadingText={t("title")}>
      <div className="w-full mx-auto pb-20">
        <PatientList />
      </div>
    </PageTransition>
  );
}
