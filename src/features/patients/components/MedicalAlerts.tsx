"use client";

import React, { useState } from "react";
import { AlertTriangle, Pencil, Save, X } from "lucide-react";
import { MedicalHistory } from "../types";
import { Button } from "@/components/ui/Button";

interface MedicalAlertsProps {
  history: MedicalHistory;
  onUpdateHistory?: (newHistory: MedicalHistory) => Promise<void>;
}

/** 
 * Checks if a condition string contains any of our critical keywords.
 * This is just for UI highlighting. Real apps might use condition ID codes.
 */
function isCriticalCondition(text: string) {
  const t = text.toLowerCase();
  return (
    t.includes("سكر") || t.includes("diabetes") ||
    t.includes("قلب") || t.includes("heart") ||
    t.includes("حساسية") || t.includes("allergy") ||
    t.includes("بنسلين") || t.includes("penicillin") ||
    t.includes("ضغط") || t.includes("hypertension")
  );
}

export function MedicalAlerts({ history, onUpdateHistory }: MedicalAlertsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(history.generalNotes || "");
  const [isSaving, setIsSaving] = useState(false);

  // Extract all critical flags for the big red banner
  const criticalConditions = history.conditions.filter((c) => isCriticalCondition(c.condition));
  const criticalAllergies = history.allergies.filter((a) => isCriticalCondition(a.allergen) || a.severity === "SEVERE");
  
  const hasCriticalAlerts = criticalConditions.length > 0 || criticalAllergies.length > 0;

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate network delay for React 19 seamless transitions
    await new Promise((resolve) => setTimeout(resolve, 400));
    
    if (onUpdateHistory) {
      await onUpdateHistory({
        ...history,
        generalNotes: editedNotes
      });
    }
    
    setIsEditing(false);
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. The Striking Warning Banner */}
      {hasCriticalAlerts && (
        <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-base font-bold text-red-800 dark:text-red-400">تحذيرات طبية هامة</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {criticalConditions.map((c, idx) => (
                <span key={`cond-${idx}`} className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 dark:bg-red-900/50 dark:text-red-300">
                  {c.condition}
                </span>
              ))}
              {criticalAllergies.map((a, idx) => (
                <span key={`allg-${idx}`} className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 dark:bg-red-900/50 dark:text-red-300">
                  حساسية: {a.allergen}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. In-place Editor Core Medical Info */}
      <div className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">التاريخ الطبي العام</h3>
          {!isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-slate-500 hover:text-blue-600 rounded-xl">
              <Pencil className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              تعديل
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving} className="text-slate-500 hover:text-red-600 rounded-xl">
                <X className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                إلغاء
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-sm">
                {isSaving ? "جاري الحفظ..." : (
                  <>
                    <Save className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                    حفظ التعديلات
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Display Mode vs Edit Mode */}
        {!isEditing ? (
          <div className="space-y-4">
            <div>
              <span className="block text-sm font-medium text-slate-500 dark:text-slate-400">ملاحظات الطبيب:</span>
              <p className="mt-1 text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {history.generalNotes || "لا توجد ملاحظات."}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 w-full">
               <div>
                 <span className="block text-sm font-medium text-slate-500 dark:text-slate-400">الأدوية الحالية:</span>
                 {history.currentMedications.length > 0 ? (
                    <ul className="mt-1 list-disc list-inside text-sm text-slate-700 dark:text-slate-300">
                      {history.currentMedications.map((med, i) => <li key={i}>{med}</li>)}
                    </ul>
                 ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">لا يوجد</span>
                 )}
               </div>
               <div>
                  <span className="block text-sm font-medium text-slate-500 dark:text-slate-400">فصيلة الدم:</span>
                  <span className="mt-1 inline-flex items-center justify-center rounded-lg bg-red-50 px-2.5 py-1 text-sm font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400" dir="ltr">
                    {history.bloodGroup}
                  </span>
               </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ملاحظات الطبيب (قابلة للتعديل):</label>
            <textarea 
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              className="w-full h-32 rounded-2xl border border-blue-200 bg-blue-50/30 p-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-blue-900/50 dark:bg-slate-900 dark:text-white transition-all"
              placeholder="اكتب أي ملاحظات طبية هامة أو تحديثات على حالة المريض هنا..."
            />
            <p className="mt-2 text-xs text-slate-500">تم تفعيل التعديل السريع (In-place Editing). اضغط حفظ لتحديث سجل المريض.</p>
          </div>
        )}
      </div>
    </div>
  );
}
