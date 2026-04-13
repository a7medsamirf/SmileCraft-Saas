import React from "react";
import { BranchesClient } from "@/features/branches/components/BranchesClient";
import { getBranchesFullAction } from "@/features/branches/serverActions";

export const metadata = {
  title: "إدارة الفروع | SmileCraft CMS",
};

export default async function BranchesPage() {
  const branches = await getBranchesFullAction();

  return <BranchesClient initialBranches={branches} />;
}
