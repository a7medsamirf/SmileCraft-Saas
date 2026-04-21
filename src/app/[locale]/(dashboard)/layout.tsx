import { Sidebar } from "@/components/shared/Sidebar";
import { 
  resolveUserFullName, 
  resolveUserRole, 
  resolveUserStaffInfo, 
  resolveBranchId,
  resolveUserPermissions 
} from "@/lib/supabase-utils";
import { getClinicInfoAction } from "@/features/settings/serverActions";
import { DashboardBackground } from "@/components/shared/DashboardBackground";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userName, userRole, userStaffInfo, clinicInfo, currentBranchId, userPermissions] = await Promise.all([
    resolveUserFullName(),
    resolveUserRole(), // ✅ Get actual UserRole from users table
    resolveUserStaffInfo(),
    getClinicInfoAction(),
    resolveBranchId(),
    resolveUserPermissions(),
  ]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row scrollbar-gutter-stable">
      <Sidebar
        userName={userName}
        userRole={userRole} // ✅ Pass actual UserRole (ADMIN, DOCTOR, RECEPTIONIST, ASSISTANT)
        userPermissions={userPermissions}
        userSpecialty={userStaffInfo?.specialty}
        clinicName={clinicInfo?.name}
        clinicLogo={clinicInfo?.logoUrl}
        logoUrlDark={clinicInfo?.logoUrlDark}
        currentBranchId={currentBranchId}
      />
      <main className="flex-1 w-full overflow-x-hidden min-h-screen relative p-4 lg:p-8 bg-linear-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-50">
        <DashboardBackground />
        {children}
      </main>
    </div>
  );
}
