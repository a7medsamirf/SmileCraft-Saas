"use client";

import React from "react";
import { MouthMap, ToothStatus } from "../types/odontogram";
import { ToothVisual } from "./ToothVisual";
import { useTranslations } from "next-intl";

interface OdontogramViewProps {
  mouthMap: MouthMap;
  teethWithCases?: Set<number>;
  odontogramOverrides?: Map<number, { fill: string; stroke: string }>;
  appointmentTeeth?: Array<{ toothNumber: number; procedureKey: string }>;
  procedureKeyToStatus?: Record<string, ToothStatus>;
  onStatusChange?: (id: number, newStatus: ToothStatus) => void;
  onCaseOpen?: (tooth: any) => void;
  onBookAppointment?: (tooth: any) => void;
}

export function OdontogramView({
  mouthMap,
  teethWithCases = new Set(),
  odontogramOverrides = new Map(),
  appointmentTeeth = [],
  procedureKeyToStatus = {},
  onStatusChange,
  onCaseOpen,
  onBookAppointment,
}: OdontogramViewProps) {
  const t = useTranslations("Clinical");

  const safeMap = Array.isArray(mouthMap) ? mouthMap : [];
  const upperTeeth = safeMap.filter((t) => t.id <= 16);
  const lowerTeeth = safeMap.filter((t) => t.id > 16);

  return (
    <div className="space-y-12">
      {/* Upper Arch */}
      <div>
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {upperTeeth.map((tooth) => (
            <ToothVisual
              key={tooth.id}
              tooth={tooth}
              onStatusChange={onStatusChange || (() => {})}
              onCaseOpen={onCaseOpen}
              onBookAppointment={onBookAppointment}
              colorOverride={odontogramOverrides.get(tooth.id)}
              hasClinicalCase={teethWithCases.has(tooth.id)}
              fromAppointment={
                !teethWithCases.has(tooth.id) &&
                appointmentTeeth.some(
                  (a) =>
                    a.toothNumber === tooth.id &&
                    !!procedureKeyToStatus[a.procedureKey],
                )
              }
            />
          ))}
        </div>
        <div className="mt-2 text-center text-[10px] font-bold text-blue-500 uppercase tracking-widest opacity-60">
          {t("upperArch")}
        </div>
      </div>

      {/* Lower Arch */}
      <div>
        <div className="flex flex-wrap flex-row-reverse justify-center gap-2 md:gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {lowerTeeth.map((tooth) => (
            <ToothVisual
              key={tooth.id}
              tooth={tooth}
              onStatusChange={onStatusChange || (() => {})}
              onCaseOpen={onCaseOpen}
              onBookAppointment={onBookAppointment}
              colorOverride={odontogramOverrides.get(tooth.id)}
              hasClinicalCase={teethWithCases.has(tooth.id)}
              fromAppointment={
                !teethWithCases.has(tooth.id) &&
                appointmentTeeth.some(
                  (a) =>
                    a.toothNumber === tooth.id &&
                    !!procedureKeyToStatus[a.procedureKey],
                )
              }
            />
          ))}
        </div>
        <div className="mt-2 text-center text-[10px] font-bold text-blue-500 uppercase tracking-widest opacity-60">
          {t("lowerArch")}
        </div>
      </div>
    </div>
  );
}
