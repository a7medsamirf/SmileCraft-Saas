"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  CloudUpload,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: "PENDING" | "UPLOADING" | "SUCCESS" | "ERROR";
  error?: string;
}

interface MediaUploaderProps {
  onUploadComplete?: (urls: string[]) => void;
  maxFiles?: number;
}

export function MediaUploader({
  onUploadComplete,
  maxFiles = 5,
}: MediaUploaderProps) {
  const [files, setFiles] = useState<UploadingFile[]>([]);

  const uploadFile = useCallback(async (uploadingFile: UploadingFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadingFile.id ? { ...f, status: "UPLOADING" } : f,
      ),
    );

    // Simulate upload progress (mocking FormData send to PHP/Laravel)
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 30);
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadingFile.id
              ? { ...f, progress: 100, status: "SUCCESS" }
              : f,
          ),
        );
      } else {
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadingFile.id ? { ...f, progress } : f)),
        );
      }
    }, 400);
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: "PENDING" as const,
      }));

      setFiles((prev) => [...prev, ...newFiles].slice(-maxFiles));

      // Simulate upload for each file immediately
      newFiles.forEach(uploadFile);
    },
    [maxFiles, uploadFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".png", ".jpg", ".webp"],
    },
    maxFiles,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove) URL.revokeObjectURL(fileToRemove.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  return (
    <div className="w-full space-y-5">
      {/* Dropzone Area */}
      <div
        {...getRootProps()}
        className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-900/30 ${
          isDragActive
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        }`}
      >
        <input {...getInputProps()} />

        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800 mb-4 transition-transform group-hover:scale-110">
          <CloudUpload
            className={`h-8 w-8 ${isDragActive ? "text-blue-500" : "text-slate-400"}`}
          />
        </div>

        <div className="text-center">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            إسقاط الصور هنا أو اضغط للاختيار
          </p>
          <p className="mt-1 text-xs text-slate-500">
            أشعة بانوراما، فوتوغرافية، أو أشعة صغيرة (JPG, PNG)
          </p>
        </div>

        {isDragActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-2 flex items-center justify-center rounded-2xl bg-blue-500/10 backdrop-blur-sm"
          >
            <p className="text-sm font-bold text-blue-600">
              أفلت الملفات الآن للرفع
            </p>
          </motion.div>
        )}
      </div>

      {/* Progress List */}
      <AnimatePresence>
        {files.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom duration-500">
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card flex items-center gap-4 p-3 shadow-sm"
              >
                {/* Thumbnail */}
                <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800">
                  <img
                    src={file.preview}
                    alt="preview"
                    className="h-full w-full object-cover"
                  />
                  {file.status === "UPLOADING" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-2"
                      dir="ltr"
                    >
                      {file.file.name}
                    </span>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Progress Bar Container */}
                  <div className="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${file.progress}%` }}
                      className={`h-full transition-all duration-300 ${
                        file.status === "SUCCESS"
                          ? "bg-emerald-500"
                          : "bg-blue-500"
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-medium text-slate-400">
                      {file.status === "SUCCESS"
                        ? "اكتمل الرفع"
                        : file.status === "ERROR"
                          ? "فشل الرفع"
                          : "جاري الرفع..."}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {file.progress}%
                    </span>
                  </div>
                </div>

                {file.status === "SUCCESS" && (
                  <div className="px-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
