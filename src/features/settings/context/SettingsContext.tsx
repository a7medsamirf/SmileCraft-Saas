"use client";

import React, { createContext, useContext, useState, useOptimistic, useTransition, ReactNode } from "react";
import {
  DentalService,
  BusinessDay,
  ClinicInfo,
  NotificationSettings,
  InitialSettingsData
} from "../types";
import {
  updateServiceAction,
  saveBusinessHoursAction,
  updateClinicInfoAction,
  saveNotificationSettingsAction
} from "../serverActions";

const DEFAULT_HOURS: BusinessDay[] = [
  { day: "saturday", isOpen: true, start: "09:00", end: "17:00" },
  { day: "sunday", isOpen: true, start: "09:00", end: "17:00" },
  { day: "monday", isOpen: true, start: "09:00", end: "17:00" },
  { day: "tuesday", isOpen: true, start: "09:00", end: "17:00" },
  { day: "wednesday", isOpen: true, start: "09:00", end: "17:00" },
  { day: "thursday", isOpen: true, start: "09:00", end: "14:00" },
  { day: "friday", isOpen: false, start: "09:00", end: "17:00" },
];

interface SettingsContextType {
  services: DentalService[];
  hours: BusinessDay[];
  clinicInfo: ClinicInfo | null;
  notifications: NotificationSettings;
  updateServicePrice: (serviceId: string, newPrice: number) => void;
  updateBusinessHours: (updatedHours: BusinessDay[]) => Promise<void>;
  updateClinicInfo: (info: ClinicInfo) => Promise<void>;
  updateNotifications: (settings: NotificationSettings) => Promise<void>;
  isSaving: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({
  children,
  initialData
}: {
  children: ReactNode;
  initialData: InitialSettingsData;
}) {
  const [services, setServices] = useState<DentalService[]>(initialData.services);
  const [hours, setHours] = useState<BusinessDay[]>(
    initialData.hours.length > 0 ? initialData.hours : DEFAULT_HOURS
  );
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(initialData.clinicInfo);
  const [notifications, setNotifications] = useState<NotificationSettings>(initialData.notifications);

  const [isPending, startTransition] = useTransition();

  // Optimistic updates for services
  const [optimisticServices, addOptimisticService] = useOptimistic(
    services,
    (state: DentalService[], updatedService: DentalService) =>
      state.map((s) => (s.id === updatedService.id ? updatedService : s)),
  );

  const updateServicePrice = (serviceId: string, newPrice: number) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    const updated: DentalService = { ...service, price: newPrice };

    startTransition(async () => {
      addOptimisticService(updated);
      await updateServiceAction(serviceId, { price: newPrice });
      setServices((prev) => prev.map((s) => (s.id === serviceId ? updated : s)));
    });
  };

  const updateBusinessHours = (updatedHours: BusinessDay[]) => {
    return new Promise<void>((resolve, reject) => {
      setHours(updatedHours);
      startTransition(async () => {
        try {
          await saveBusinessHoursAction(updatedHours);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  const updateClinicInfo = (info: ClinicInfo) => {
    return new Promise<void>((resolve, reject) => {
      setClinicInfo(info);
      startTransition(async () => {
        try {
          await updateClinicInfoAction(info);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  const updateNotifications = (settings: NotificationSettings) => {
    return new Promise<void>((resolve, reject) => {
      setNotifications(settings);
      startTransition(async () => {
        try {
          await saveNotificationSettingsAction(settings);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        services: optimisticServices,
        hours,
        clinicInfo,
        notifications,
        updateServicePrice,
        updateBusinessHours,
        updateClinicInfo,
        updateNotifications,
        isSaving: isPending,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettingsContext must be used within a SettingsProvider");
  }
  return context;
}
