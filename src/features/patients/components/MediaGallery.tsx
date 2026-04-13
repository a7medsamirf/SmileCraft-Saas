"use client";

// =============================================================================
// SmileCraft CMS — Media Gallery Component
// Display, filter, and manage patient files (images, X-rays, documents)
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileImage,
  FileText,
  Trash2,
  Download,
  Filter,
  Eye,
  AlertCircle,
} from "lucide-react";
import {
  getPatientFilesAction,
  deleteFileAction,
} from "@/features/patients/fileUploadActions";
import { FileType, formatFileSize, FILE_TYPE_LABELS } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MediaFile {
  id: string;
  patientId: string;
  fileName: string;
  fileUrl: string;
  fileType: FileType;
  size: number;
  createdAt: string;
}

interface MediaGalleryProps {
  patientId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MediaGallery({ patientId }: MediaGalleryProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [filter, setFilter] = useState<FileType | "all">("all");
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch files
  const fetchFiles = useCallback(
    async (fileType?: FileType) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getPatientFilesAction(patientId, fileType);
        if (result.success) {
          setFiles(result.files ?? []);
        } else {
          setError(result.error ?? "فشل في جلب الملفات");
        }
      } catch (err) {
        setError("حدث خطأ غير متوقع");
        console.error("[MediaGallery] Error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [patientId],
  );

  // Initial fetch
  useEffect(() => {
    fetchFiles(filter !== "all" ? filter : undefined);
  }, [filter, fetchFiles]);

  // Handle file delete
  const handleDelete = async (fileId: string) => {
    if (
      !confirm(
        "هل أنت متأكد من حذف هذا الملف؟ لا يمكن التراجع عن هذا الإجراء.",
      )
    ) {
      return;
    }

    try {
      const result = await deleteFileAction(fileId);
      if (result.success) {
        // Refresh file list
        fetchFiles(filter !== "all" ? filter : undefined);
        if (selectedFile?.id === fileId) {
          setSelectedFile(null);
        }
      } else {
        alert(result.error ?? "فشل في حذف الملف");
      }
    } catch (err) {
      console.error("[MediaGallery] Delete error:", err);
      alert("حدث خطأ غير متوقع");
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // File icon
  const getFileIcon = (fileType: FileType) =>
    fileType === "document" ? FileText : FileImage;

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
        <Filter className="h-4 w-4 text-gray-400" />
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            filter === "all"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          الكل ({files.length})
        </button>
        {(["image", "xray", "document"] as FileType[]).map((type) => {
          const count = files.filter((f) => f.fileType === type).length;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === type
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {FILE_TYPE_LABELS[type]} ({count})
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"
          />
          <p className="text-sm text-gray-500">جاري التحميل...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && files.length === 0 && (
        <div className="text-center py-12">
          <FileImage className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            لا توجد ملفات بعد
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            ارفع صور أشعة أو مستندات طبية هنا
          </p>
        </div>
      )}

      {/* Files grid */}
      {!isLoading && files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {files.map((file) => {
              const FileIcon = getFileIcon(file.fileType);
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative rounded-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                    {file.fileType === "image" || file.fileType === "xray" ? (
                      <img
                        src={file.fileUrl}
                        alt={file.fileName}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setSelectedFile(file)}
                      />
                    ) : (
                      <div
                        className="cursor-pointer"
                        onClick={() => setSelectedFile(file)}
                      >
                        <FileIcon className="h-16 w-16 text-gray-400" strokeWidth={1.5} />
                      </div>
                    )}

                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedFile(file)}
                        className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                        title="عرض"
                      >
                        <Eye className="h-4 w-4 text-gray-700" />
                      </button>
                      <a
                        href={file.fileUrl}
                        download={file.fileName}
                        className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                        title="تحميل"
                      >
                        <Download className="h-4 w-4 text-gray-700" />
                      </a>
                      <button
                        onClick={() => handleDelete(file.id)}
                        
                        className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* File info */}
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.fileName}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(file.createdAt)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* File preview modal */}
      {selectedFile && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedFile(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-4xl max-h-[90vh] w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedFile(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
            >
              ×
            </button>

            {/* Preview */}
            <div className="p-6">
              {(selectedFile.fileType === "image" ||
                selectedFile.fileType === "xray") && (
                <img
                  src={selectedFile.fileUrl}
                  alt={selectedFile.fileName}
                  className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
                />
              )}
              {selectedFile.fileType === "document" && (
                <div className="flex flex-col items-center justify-center h-96 bg-gray-100 dark:bg-gray-900 rounded-lg">
                  <FileText className="h-24 w-24 text-gray-400 mb-4" strokeWidth={1.5} />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    معاينة المستندات غير متاحة
                  </p>
                  <a
                    href={selectedFile.fileUrl}
                    download={selectedFile.fileName}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    تحميل المستند
                  </a>
                </div>
              )}

              {/* File details */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedFile.fileName}
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">النوع:</span>{" "}
                    <span className="text-gray-900 dark:text-gray-100">
                      {FILE_TYPE_LABELS[selectedFile.fileType]}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">الحجم:</span>{" "}
                    <span className="text-gray-900 dark:text-gray-100">
                      {formatFileSize(selectedFile.size)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">التاريخ:</span>{" "}
                    <span className="text-gray-900 dark:text-gray-100">
                      {formatDate(selectedFile.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <a
                    href={selectedFile.fileUrl}
                    download={selectedFile.fileName}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    تحميل
                  </a>
                  <button
                    onClick={() => handleDelete(selectedFile.id)}
                    
                    className="py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
