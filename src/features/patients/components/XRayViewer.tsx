"use client";

import React, { useCallback, useRef, useState } from "react";
import QuickPinchZoom, { make3dTransformValue } from "react-quick-pinch-zoom";
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useLocale } from "next-intl";
import { PatientMedia, MEDIA_TYPE_LABELS } from "../types/media";

interface XRayViewerProps {
  media: PatientMedia;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
}

export function XRayViewer({ media, isOpen, onClose, onDownload }: XRayViewerProps) {
  const locale = useLocale();
  const imgRef = useRef<HTMLImageElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const onUpdate = useCallback(({ x, y, scale }: { x: number; y: number; scale: number }) => {
    const value = make3dTransformValue({ x, y, scale });
    if (imgRef.current) {
      imgRef.current.style.setProperty("transform", value);
    }
  }, []);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Basic fallback download
      const link = document.createElement("a");
      link.href = media.url;
      link.download = `patient-media-${media.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-100 flex flex-col bg-slate-950/95 backdrop-blur-xl transition-all duration-500"
      >
        {/* Header Controls */}
        <div className="flex h-16 w-full items-center justify-between border-b border-white/10 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
             <button 
               onClick={onClose}
               className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-all"
             >
               <X className="h-6 w-6" />
             </button>
             <div className="hidden md:block">
               <h3 className="text-sm font-bold text-white">
                 {MEDIA_TYPE_LABELS[media.type].ar}
               </h3>
               <p className="text-[10px] text-white/50">
                 {new Intl.DateTimeFormat("ar-EG", { dateStyle: "long" }).format(new Date(media.capturedAt))}
               </p>
             </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowInfo(!showInfo)}
                className="text-white/70 hover:bg-white/10 hover:text-white"
            >
              <Info className="h-5 w-5" />
            </Button>
            <div className="mx-2 h-6 w-px bg-white/10" />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDownload}
              className="text-white/70 hover:bg-white/10 hover:text-white"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleFullScreen}
              className="text-white/70 hover:bg-white/10 hover:text-white"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Viewer Area */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          <QuickPinchZoom onUpdate={onUpdate} containerProps={{ className: "w-full h-full flex items-center justify-center" }}>
            <img 
              ref={imgRef}
              src={media.url} 
              alt={`توصيف الأشعة: ${media.notes || "لا يوجد"}`}
              className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl transition-all duration-300 pointer-events-none"
              loading="lazy"
            />
          </QuickPinchZoom>

          {/* Info Panel Overlay */}
          <AnimatePresence>
            {showInfo && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute right-6 top-6 w-72 rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-2xl shadow-2xl"
              >
                <h4 className="mb-2 text-sm font-bold text-white underline decoration-blue-500/50 underline-offset-4">
                  {locale === "ar" ? "تفاصيل الأشعة" : "Image Details"}
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/40">
                      {locale === "ar" ? "نوع الصورة" : "Image Type"}
                    </label>
                    <p className="text-sm font-medium text-white">{MEDIA_TYPE_LABELS[media.type][locale as "ar" | "en"]}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/40">
                      {locale === "ar" ? "تاريخ الالتقاط" : "Captured Date"}
                    </label>
                    <p className="text-sm font-medium text-white">
                      {new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "full" }).format(new Date(media.capturedAt))}
                    </p>
                  </div>
                  {media.notes && (
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-white/40">
                        {locale === "ar" ? "ملاحظات التشخيص" : "Clinical Notes"}
                      </label>
                      <p className="text-xs leading-relaxed text-white/70">{media.notes}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Shortcuts Toast */}
          <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/10 bg-black/40 px-6 py-3 backdrop-blur-xl">
             <div className="flex items-center gap-3 text-white/50 text-[10px] font-bold">
                <span className="rounded border border-white/20 px-1.5 py-0.5">Pinch</span> Zoom
                <span className="mx-2 opacity-50">•</span>
                <span className="rounded border border-white/20 px-1.5 py-0.5">Drag</span> Pan
             </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
