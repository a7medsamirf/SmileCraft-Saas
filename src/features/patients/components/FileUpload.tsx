"use client";

// =============================================================================
// SmileCraft CMS — File Upload Component
// Drag & drop + click to upload with preview
// =============================================================================

import { useState, useCallback, useRef } from "react";
import { useActionState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileImage, FileText, AlertCircle } from "lucide-react";
import { uploadFileAction } from "@/features/patients/fileUploadActions";
import { FileType, formatFileSize, FILE_TYPE_LABELS } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileUploadProps {
  patientId: string;
  fileType?: FileType;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface FilePreview {
  file: File;
  preview: string;
  type: FileType;
}

// ---------------------------------------------------------------------------
// Initial state for useActionState
// ---------------------------------------------------------------------------

type UploadState = {
  success: boolean;
  error?: string;
};

const initialState: UploadState = { success: false };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FileUpload({
  patientId,
  fileType = "image",
  onSuccess,
  onError,
}: FileUploadProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: UploadState, formData: FormData) => {
      const result = await uploadFileAction(formData);
      if (result.success) {
        setPreview(null);
        onSuccess?.();
      } else {
        onError?.(result.error ?? "فشل في رفع الملف");
      }
      return result;
    },
    initialState,
  );

  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(
    (file: File) => {
      // Validate file
      if (file.size > 10 * 1024 * 1024) {
        onError?.("حجم الملف كبير جداً. الحد الأقصى: 10MB");
        return;
      }

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setPreview({
            file,
            preview: reader.result as string,
            type: fileType,
          });
        };
        reader.readAsDataURL(file);
      } else {
        setPreview({ file, preview: "", type: fileType });
      }
    },
    [fileType, onError],
  );

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  // Remove preview
  const removePreview = useCallback(() => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // File icon based on type
  const FileIcon =
    preview?.type === "document" ? FileText : FileImage;

  return (
    <form action={formAction} className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        name="file"
        accept="image/*,.pdf,.doc,.docx"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Hidden fields */}
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="fileType" value={fileType} />

      {/* Drop zone / Upload area */}
      {!preview ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center
            transition-colors duration-200 cursor-pointer
            ${
              isDragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            strokeWidth={1.5}
          />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            اسحب الملف هنا أو انقر للاختيار
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            PNG, JPG, PDF, DOC (حد أقصى 10MB)
          </p>
        </motion.div>
      ) : (
        /* Preview */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          {/* Remove button */}
          <button
            type="button"
            onClick={removePreview}
            className="absolute top-2 right-2 z-10 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* File preview */}
          {preview.preview ? (
            <img
              src={preview.preview}
              alt={preview.file.name}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
              <FileIcon className="h-16 w-16 text-gray-400" strokeWidth={1.5} />
            </div>
          )}

          {/* File info */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {preview.file.name}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {FILE_TYPE_LABELS[preview.type]} • {formatFileSize(preview.file.size)}
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                جاهز للرفع
              </span>
            </div>
          </div>

          {/* Upload button */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  رفع الملف
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Error message */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2"
          >
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{state.error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
