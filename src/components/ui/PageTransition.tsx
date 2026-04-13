"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface PageTransitionProps {
  children: React.ReactNode;
  loadingText?: string;
  delay?: number;
  isLoading?: boolean;
}

export function PageTransition({
  children,
  loadingText = "Loading...",
  delay = 400,
  isLoading: externalLoading,
}: PageTransitionProps) {
  const [internalLoading, setInternalLoading] = useState(true);

  // Fake loading to ensure a smooth transition and visual feedback
  useEffect(() => {
    const timer = setTimeout(() => {
      setInternalLoading(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const activeLoading = externalLoading !== undefined ? externalLoading : internalLoading;

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-700">
      {activeLoading ? (
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 dark:text-purple-500" />
          <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
            {loadingText}
          </p>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">{children}</div>
      )}
    </div>
  );
}
