"use client";

import { useMemo } from "react";
import { StaffPermissions, PermissionKey, StaffRole } from "../types";

/**
 * Hook to check staff permissions for page visibility and actions.
 */
export function usePermissions(
  userRole?: StaffRole | string | null,
  permissions?: StaffPermissions | Record<string, any> | null
) {
  const isSuperAdmin = userRole === "ADMIN";

  const checkPermission = useMemo(() => {
    return (key: PermissionKey): boolean => {
      // Super Admin always has all permissions
      if (isSuperAdmin) return true;
      
      // If no permissions object, default to false (safe)
      if (!permissions) return false;

      // Cast to any to access dynamic keys safely
      return !!(permissions as any)[key];
    };
  }, [isSuperAdmin, permissions]);

  return {
    isSuperAdmin,
    checkPermission,
    // Helper to check multiple permissions
    hasAnyPermission: (keys: PermissionKey[]) => isSuperAdmin || keys.some(key => checkPermission(key)),
    hasAllPermissions: (keys: PermissionKey[]) => isSuperAdmin || keys.every(key => checkPermission(key)),
  };
}
