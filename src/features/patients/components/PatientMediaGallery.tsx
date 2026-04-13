"use client";

import React, { useState, useMemo } from "react";
import { 
  PatientMedia, 
  PatientMediaType, 
  groupMediaByDate, 
  MEDIA_TYPE_LABELS 
} from "../types/media";
import { XRayViewer } from "./XRayViewer";
import { MediaUploader } from "./MediaUploader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { 
  MoreVertical, 
  Expand, 
  Calendar as CalendarIcon, 
  Image as ImageIcon,
  Plus,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PatientMediaGalleryProps {
  patientId: string;
  initialMedia?: PatientMedia[];
}

export function PatientMediaGallery({ patientId, initialMedia = [] }: PatientMediaGalleryProps) {
  const [media, setMedia] = useState<PatientMedia[]>(initialMedia);
  const [selectedMedia, setSelectedMedia] = useState<PatientMedia | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  // Example of how we might add some mock media if empty for demo
  React.useEffect(() => {
    if (media.length === 0) {
      setMedia([
        {
          id: "m1",
          patientId,
          type: PatientMediaType.PANORAMIC,
          url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=2070&auto=format&fit=crop",
          capturedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          notes: "أشعة بانوراما كاملة توضح حالة الفك العلوي والسفلي، يوجد التهاب بسيط في الضرس رقم 46."
        },
        {
          id: "m2",
          patientId,
          type: PatientMediaType.CLINICAL_PHOTO,
          url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2070&auto=format&fit=crop",
          capturedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          notes: "صورة عيادية قبل البدء في عملية التبييض."
        }
      ]);
    }
  }, [patientId]);

  const groupedMedia = useMemo(() => groupMediaByDate(media), [media]);
  const sortedDates = useMemo(() => Object.keys(groupedMedia).sort((a, b) => b.localeCompare(a)), [groupedMedia]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Gallery Header & Upload Toggle */}
      <div className="flex items-center justify-between">
         <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-500" />
            معرض الوسائط والملفات
         </h3>
         <Button 
            variant={showUploader ? "secondary" : "primary"}
            size="sm" 
            className="rounded-xl font-bold"
            onClick={() => setShowUploader(!showUploader)}
         >
            {showUploader ? <X className="h-4 w-4 ml-2" /> : <Plus className="h-4 w-4 ml-2" />}
            {showUploader ? "إغلاق الرفع" : "رفع ملفات جديدة"}
         </Button>
      </div>

      <AnimatePresence>
        {showUploader && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <MediaUploader />
            <div className="mt-4 border-b border-slate-100 dark:border-slate-800 pb-8" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grouped Media Grid */}
      {sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
           <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
           <p className="font-medium">لا توجد صور أو أشعة مسجلة لهذا المريض.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {sortedDates.map((dateString) => (
            <div key={dateString} className="space-y-4">
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <CalendarIcon className="h-3 w-3" />
                    {new Intl.DateTimeFormat("ar-EG", { dateStyle: "long" }).format(new Date(dateString))}
                  </div>
                  <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
               </div>

               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {groupedMedia[dateString].map((item) => (
                    <motion.div 
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      className="group glass-card relative aspect-square overflow-hidden cursor-pointer"
                      onClick={() => setSelectedMedia(item)}
                    >
                       <img 
                         src={item.url} 
                         alt={MEDIA_TYPE_LABELS[item.type].ar} 
                         className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                         loading="lazy"
                       />
                       
                       {/* Overlay Info */}
                       <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100 flex flex-col justify-end p-4">
                          <Badge variant="secondary" className="w-fit mb-2 text-[10px] bg-white/20 text-white backdrop-blur-md border-0">
                            {MEDIA_TYPE_LABELS[item.type].ar}
                          </Badge>
                          <div className="flex items-center justify-between text-white">
                             <span className="text-[10px] font-bold opacity-80">أنقر للعرض المكبر</span>
                             <Expand className="h-4 w-4" />
                          </div>
                       </div>
                    </motion.div>
                  ))}
               </div>
            </div>
          ))}
        </div>
      )}

      {/* X-Ray Viewer Instance */}
      {selectedMedia && (
        <XRayViewer 
          media={selectedMedia} 
          isOpen={!!selectedMedia} 
          onClose={() => setSelectedMedia(null)} 
        />
      )}
    </div>
  );
}
