// =============================================================================
// SmileCraft CMS — Supabase Storage Utilities
// Type-safe helpers for file upload, download, and management.
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import prisma from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FileType = "image" | "xray" | "document" | "other";

export type FileUploadResult = {
  id: string;
  patientId: string;
  fileName: string;
  fileUrl: string;
  fileType: FileType;
  size: number;
  createdAt: string;
};

export type FileDeleteResult = {
  success: boolean;
  fileId: string;
  message?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Supabase Storage bucket name for patient files.
 * This bucket must be created in Supabase Dashboard or via migration.
 */
export const STORAGE_BUCKET = "patient-files";

/**
 * Maximum file size: 10MB
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Allowed file types per category
 */
export const ALLOWED_FILE_TYPES: Record<FileType, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  xray: ["image/jpeg", "image/png", "image/webp", "application/dicom"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  other: ["*/*"], // Fallback - use sparingly
};

/**
 * File type display names (for UI)
 */
export const FILE_TYPE_LABELS: Record<FileType, string> = {
  image: "صورة",
  xray: "أشعة",
  document: "مستند",
  other: "ملف",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine file type from MIME type
 */
function determineFileType(mimeType: string): FileType {
  if (mimeType.startsWith("image/")) {
    // Check if it might be an X-ray (we'll use a naming convention later)
    return "image";
  }
  if (mimeType === "application/pdf" || mimeType.includes("word")) {
    return "document";
  }
  return "other";
}

/**
 * Generate a unique file path for Supabase Storage.
 * Format: {patientId}/{fileType}/{timestamp}-{random}.{ext}
 */
function generateFilePath(
  patientId: string,
  fileType: FileType,
  fileName: string,
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const ext = fileName.split(".").pop() || "bin";
  return `${patientId}/${fileType}/${timestamp}-${random}.${ext}`;
}

/**
 * Get the file extension from a file name
 */
function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

// ---------------------------------------------------------------------------
// Server-side upload helper
// ---------------------------------------------------------------------------

/**
 * Upload a file to Supabase Storage and create a media_files record.
 *
 * @param patientId - Patient ID the file belongs to
 * @param file - File object (from FormData)
 * @param fileType - Type of file (image, xray, document)
 * @param userId - Authenticated user ID (for audit)
 *
 * @returns FileUploadResult with metadata
 *
 * @throws Error if upload fails, file too large, or invalid type
 */
export async function uploadFileToStorage(
  patientId: string,
  file: File,
  fileType: FileType,
  userId: string,
): Promise<FileUploadResult> {
  const supabase = await createClient();

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `حجم الملف كبير جداً. الحد الأقصى: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB`,
    );
  }

  // Validate file type
  const allowedTypes = ALLOWED_FILE_TYPES[fileType];
  if (
    !allowedTypes.includes("*/*") &&
    !allowedTypes.includes(file.type)
  ) {
    throw new Error(
      `نوع الملف غير مدعوم. الأنواع المسموحة: ${allowedTypes.join(", ")}`,
    );
  }

  // Verify patient belongs to user's clinic (security check)
  const patient = await prisma.patients.findFirst({
    where: {
      id: patientId,
      Clinic: {
        users: {
          some: {
            id: userId,
          },
        },
      },
    },
    select: { id: true, clinicId: true },
  });

  if (!patient) {
    throw new Error("غير مصرح: المريض غير موجود أو لا تملك صلاحية الوصول");
  }

  // Generate unique file path
  const filePath = generateFilePath(patientId, fileType, file.name);

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer();

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("[uploadFileToStorage] Supabase upload error:", uploadError);
    throw new Error(`فشل في رفع الملف: ${uploadError.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(uploadData.path);

  // Create media_files record
  const mediaFile = await prisma.media_files.create({
    data: {
      id: crypto.randomUUID(),
      patientId,
      fileName: file.name,
      fileUrl: publicUrl,
      fileType: file.type,
      size: file.size,
    },
  });

  console.log(
    `[uploadFileToStorage] ✓ Uploaded: ${file.name} (${(file.size / 1024).toFixed(1)}KB) → ${publicUrl}`,
  );

  return {
    id: mediaFile.id,
    patientId: mediaFile.patientId,
    fileName: mediaFile.fileName,
    fileUrl: mediaFile.fileUrl,
    fileType,
    size: mediaFile.size ?? 0,
    createdAt: mediaFile.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Server-side file list helper
// ---------------------------------------------------------------------------

/**
 * Get all files for a patient, filtered by type (optional).
 *
 * @param patientId - Patient ID
 * @param fileType - Optional filter by file type
 * @param clinicId - Clinic ID for access control
 *
 * @returns Array of file metadata
 */
export async function getPatientFiles(
  patientId: string,
  clinicId: string,
  fileType?: FileType,
): Promise<FileUploadResult[]> {
  // Verify patient belongs to clinic
  const patient = await prisma.patients.findFirst({
    where: {
      id: patientId,
      clinicId,
    },
    select: { id: true },
  });

  if (!patient) {
    throw new Error("غير مصرح: المريض غير موجود");
  }

  const where: any = { patientId };
  if (fileType) {
    where.fileType = fileType;
  }

  const files = await prisma.media_files.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return files.map((file) => ({
    id: file.id,
    patientId: file.patientId,
    fileName: file.fileName,
    fileUrl: file.fileUrl,
    fileType: determineFileType(file.fileType),
    size: file.size ?? 0,
    createdAt: file.createdAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Server-side file delete helper
// ---------------------------------------------------------------------------

/**
 * Delete a file from Supabase Storage and remove the media_files record.
 *
 * @param fileId - Media file ID
 * @param userId - Authenticated user ID (for access control)
 *
 * @returns FileDeleteResult with success status
 */
export async function deleteFileFromStorage(
  fileId: string,
  userId: string,
): Promise<FileDeleteResult> {
  const supabase = await createClient();

  // Find the file and verify access
  const mediaFile = await prisma.media_files.findFirst({
    where: {
      id: fileId,
      patients: {
        Clinic: {
          users: {
            some: {
              id: userId,
            },
          },
        },
      },
    },
    include: {
      patients: {
        select: { clinicId: true },
      },
    },
  });

  if (!mediaFile) {
    return {
      success: false,
      fileId,
      message: "الملف غير موجود أو لا تملك صلاحية الوصول",
    };
  }

  // Extract file path from URL
  // URL format: https://.../storage/v1/object/public/patient-files/{path}
  const urlParts = mediaFile.fileUrl.split("/patient-files/");
  if (urlParts.length < 2) {
    return {
      success: false,
      fileId,
      message: "رابط الملف غير صالح",
    };
  }
  const filePath = urlParts[1];

  // Delete from Supabase Storage
  const { error: deleteError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([filePath]);

  if (deleteError) {
    console.error("[deleteFileFromStorage] Supabase delete error:", deleteError);
    return {
      success: false,
      fileId,
      message: `فشل في حذف الملف: ${deleteError.message}`,
    };
  }

  // Delete from database
  await prisma.media_files.delete({
    where: { id: fileId },
  });

  console.log(`[deleteFileFromStorage] ✓ Deleted: ${mediaFile.fileName}`);

  return {
    success: true,
    fileId,
    message: "تم حذف الملف بنجاح",
  };
}

// ---------------------------------------------------------------------------
// Browser client helpers (for direct upload from client)
// ---------------------------------------------------------------------------

/**
 * Get a Supabase client for browser-side uploads.
 * Use this with signed URLs for direct-to-storage uploads.
 */
export function getBrowserStorageClient() {
  return createBrowserClient();
}

/**
 * Generate a signed URL for direct upload (bypasses server).
 * More efficient for large files.
 */
export async function generateSignedUploadUrl(
  patientId: string,
  fileType: FileType,
  fileName: string,
  userId: string,
): Promise<{ url: string; path: string }> {
  const supabase = await createClient();

  // Verify patient access
  const patient = await prisma.patients.findFirst({
    where: {
      id: patientId,
      Clinic: {
        users: {
          some: {
            id: userId,
          },
        },
      },
    },
    select: { id: true },
  });

  if (!patient) {
    throw new Error("غير مصرح");
  }

  const filePath = generateFilePath(patientId, fileType, fileName);

  // Create signed URL (valid for 60 seconds)
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(filePath);

  if (error) {
    throw new Error(`فشل في إنشاء رابط الرفع: ${error.message}`);
  }

  return {
    url: data.signedUrl,
    path: filePath,
  };
}

// ---------------------------------------------------------------------------
// File size formatting
// ---------------------------------------------------------------------------

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
