import { Suspense } from "react";
import AuditLogClient from "@/features/audit/components/AuditLogClient";

export default function AuditLogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <AuditLogClient />
    </Suspense>
  );
}
