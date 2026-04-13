"use server";

// =============================================================================
// SmileCraft CMS — File Upload Server Actions
// ✅ Handles file uploads to Supabase Storage
// ✅ Creates media_files records in database
// ✅ Validates file size, type, and access control
// =============================================================================

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import {
  uploadFileToStorage,
  getPatientFiles,
  deleteFileFromStorage,
  FileType,
  FileUploadResult,
} from "@/lib/storage";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function getUserContext(): Promise<{
  user: any;
  clinicId: string | null;
  branchId: string | null;
} | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clinicId: true, branchId: true },
    });

    return {
      user,
      clinicId: dbUser?.clinicId ?? null,
      branchId: dbUser?.branchId ?? null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Upload File Action
// ---------------------------------------------------------------------------

/**
 * Upload a file to Supabase Storage for a patient.
 *
 * @param patientId - Patient ID
 * @param formData - FormData containing the file and fileType
 *
 * @returns FileUploadResult or error
 *
 * Usage from client:
 * ```ts
 * const formData = new FormData();
 * formData.append("file", file);
 * formData.append("fileType", "xray");
 * formData.append("patientId", patientId);
 * const result = await uploadFileAction(formData);
 * ```
 */
export async function uploadFileAction(
  formData: FormData,
): Promise<{ success: boolean; data?: FileUploadResult; error?: string }> {
  const userContext = await getUserContext();
  if (!userContext?.user) {
    return { success: false, error: "غير مصرح: يرجى تسجيل الدخول" };
  }

  // Check rate limit (10 uploads per minute)
  const rateLimit = await checkRateLimit("uploadFile", RATE_LIMITS.FILE_UPLOAD);
  if (!rateLimit.success) {
    return {
      success: false,
      error: "تم تجاوز الحد المسموح للرفع. يرجى المحاولة لاحقاً",
    };
  }

  try {
    const file = formData.get("file") as File | null;
    const patientId = formData.get("patientId") as string | null;
    const fileType = (formData.get("fileType") as FileType) ?? "image";

    if (!file) {
      return { success: false, error: "لم يتم اختيار ملف" };
    }

    if (!patientId) {
      return { success: false, error: "معرف المريض مطلوب" };
    }

    const result = await uploadFileToStorage(
      patientId,
      file,
      fileType,
      userContext.user.id,
    );

    revalidatePath(`/dashboard/patients/${patientId}`);
    revalidatePath("/dashboard/clinical");

    return { success: true, data: result };
  } catch (error) {
    console.error("[uploadFileAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل في رفع الملف",
    };
  }
}

// ---------------------------------------------------------------------------
// Get Patient Files Action
// ---------------------------------------------------------------------------

/**
 * Get all files for a patient.
 *
 * @param patientId - Patient ID
 * @param fileType - Optional filter by type
 */
export async function getPatientFilesAction(
  patientId: string,
  fileType?: FileType,
): Promise<{ success: boolean; files?: FileUploadResult[]; error?: string }> {
  const userContext = await getUserContext();
  if (!userContext?.clinicId) {
    return { success: false, error: "غير مصرح" };
  }

  try {
    const files = await getPatientFiles(
      patientId,
      userContext.clinicId,
      fileType,
    );

    return { success: true, files };
  } catch (error) {
    console.error("[getPatientFilesAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل في جلب الملفات",
    };
  }
}

// ---------------------------------------------------------------------------
// Delete File Action
// ---------------------------------------------------------------------------

/**
 * Delete a file from storage and database.
 *
 * @param fileId - Media file ID to delete
 */
export async function deleteFileAction(
  fileId: string,
): Promise<{ success: boolean; error?: string }> {
  const userContext = await getUserContext();
  if (!userContext?.user) {
    return { success: false, error: "غير مصرح" };
  }

  try {
    const result = await deleteFileFromStorage(fileId, userContext.user.id);

    if (!result.success) {
      return { success: false, error: result.message };
    }

    revalidatePath("/dashboard/patients");
    revalidatePath("/dashboard/clinical");

    return { success: true };
  } catch (error) {
    console.error("[deleteFileAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل في حذف الملف",
    };
  }
}
