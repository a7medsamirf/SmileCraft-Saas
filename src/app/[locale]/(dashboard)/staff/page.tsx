import React from "react";
import type { Metadata } from "next";
import { StaffClient } from "@/features/staff/components/StaffClient";
import { getStaffMembersAction } from "@/features/staff/serverActions";

export const metadata: Metadata = {
  title: "الموظفين | SmileCraft CMS",
};

export default async function StaffPage() {
  const initialStaff = await getStaffMembersAction();
  return <StaffClient initialStaff={initialStaff} />;
}
