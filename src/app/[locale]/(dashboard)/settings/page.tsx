import React from "react";
import { SettingsClient } from "@/features/settings/components/SettingsClient";
import { 
  getServicesAction, 
  getClinicInfoAction, 
  getBusinessHoursAction, 
  getNotificationSettingsAction 
} from "@/features/settings/serverActions";

export const metadata = {
  title: "الإعدادات | SmileCraft CMS",
};

export default async function SettingsPage() {
  const [services, clinicInfo, hours, notifications] = await Promise.all([
    getServicesAction(),
    getClinicInfoAction(),
    getBusinessHoursAction(),
    getNotificationSettingsAction(),
  ]);

  const initialData = {
    services,
    clinicInfo,
    hours,
    notifications,
  };

  return <SettingsClient initialData={initialData} />;
}
