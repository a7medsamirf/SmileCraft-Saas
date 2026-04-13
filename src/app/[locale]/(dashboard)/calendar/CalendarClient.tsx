"use client";

import React, { useState, useEffect } from "react";
import { CalendarContainer } from "@/features/appointments";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

interface CalendarClientProps {
  locale: string;
  title: string;
  summary: string;
  loadingText: string;
}

export function CalendarClient({
  locale,
  title,
  summary,
  loadingText,
}: CalendarClientProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Fake loading to ensure a smooth transition and visual feedback
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-700">
      {isLoading ? (
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 dark:text-purple-500" />
          <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
            {loadingText}
          </p>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                 <div className="p-3 rounded-2xl bg-blue-600/10 dark:bg-blue-500/10">
                   <CalendarIcon className="h-8 w-8 text-blue-600 dark:text-blue-500" />
               </div>
               
                {title}
              </h1>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                {summary}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <CalendarContainer locale={locale} />
          </div>
        </div>
      )}
    </div>
  );
}
