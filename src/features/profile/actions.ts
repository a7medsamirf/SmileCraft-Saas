"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod validation schemas
// ---------------------------------------------------------------------------
const profileUpdateSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  phone: z.string().optional(),
  clinicName: z.string().min(2, "Clinic name must be at least 2 characters").max(200),
});

const passwordUpdateSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords do not match",
  path: ["confirmNewPassword"],
});

// ---------------------------------------------------------------------------
// Helper: get authenticated user with clinic context
// ---------------------------------------------------------------------------
async function getAuthenticatedUserWithClinic() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const publicUser = await prisma.users.findUnique({
    where: { id: user.id },
    select: { id: true, clinicId: true, email: true },
  });

  if (!publicUser) return null;

  return {
    authUserId: user.id,
    clinicId: publicUser.clinicId,
    email: publicUser.email,
  };
}

/**
 * Fetches the current user's profile and clinic information.
 */
export async function getProfileAction() {
  const userContext = await getAuthenticatedUserWithClinic();
  if (!userContext) return null;

  // Fetch user data from Prisma
  const user = await prisma.users.findUnique({
    where: { id: userContext.authUserId },
    select: {
      fullName: true,
      phone: true,
      email: true,
    },
  });

  // Fetch clinic data
  const clinic = await prisma.clinic.findUnique({
    where: { id: userContext.clinicId },
    select: { name: true },
  });

  return {
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    email: user?.email || userContext.email,
    clinicName: clinic?.name || "",
  };
}

/**
 * Updates the user's personal profile and clinic name.
 */
export async function updateProfileAction(_prevState: any, formData: FormData) {
  try {
    const userContext = await getAuthenticatedUserWithClinic();
    if (!userContext) {
      return { error: "Unauthorized" };
    }

    // Extract and validate form data
    const rawData = {
      fullName: formData.get("fullName") as string,
      phone: formData.get("phone") as string,
      clinicName: formData.get("clinicName") as string,
    };

    const validated = profileUpdateSchema.safeParse(rawData);
    if (!validated.success) {
      return { error: validated.error.flatten().formErrors[0] || "Invalid input" };
    }

    const { fullName, phone, clinicName } = validated.data;

    // 1. Update User record in DB via Prisma
    await prisma.users.update({
      where: { id: userContext.authUserId },
      data: { fullName, phone },
    });

    // 2. Update Clinic record in DB via Prisma
    await prisma.clinic.update({
      where: { id: userContext.clinicId },
      data: { name: clinicName },
    });

    // 3. Update Auth Metadata (raw_user_meta_data) via Supabase
    const supabase = await createClient();
    await supabase.auth.updateUser({
      data: { fullName, phone, clinicName },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("[updateProfileAction] Error:", error);
    return { error: "Failed to update profile. Please try again." };
  }
}

/**
 * Fetches the current user's basic info for the sidebar.
 * Lightweight version for navigation display.
 */
export async function getSidebarProfileAction() {
  const userContext = await getAuthenticatedUserWithClinic();
  if (!userContext) return null;

  // Fetch user data from Prisma
  const user = await prisma.users.findUnique({
    where: { id: userContext.authUserId },
    select: {
      fullName: true,
    },
  });

  // Fetch clinic data
  const clinic = await prisma.clinic.findUnique({
    where: { id: userContext.clinicId },
    select: { name: true },
  });

  return {
    fullName: user?.fullName || null,
    clinicName: clinic?.name || null,
  };
}

/**
 * Updates the user's password.
 */
export async function updatePasswordAction(_prevState: any, formData: FormData) {
  try {
    const userContext = await getAuthenticatedUserWithClinic();
    if (!userContext) {
      return { error: "Unauthorized" };
    }

    // Extract and validate form data
    const rawData = {
      newPassword: formData.get("newPassword") as string,
      confirmNewPassword: formData.get("confirmNewPassword") as string,
    };

    const validated = passwordUpdateSchema.safeParse(rawData);
    if (!validated.success) {
      return { error: validated.error.flatten().formErrors[0] || "Invalid input" };
    }

    const { newPassword } = validated.data;

    // Update password via Supabase Auth
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("[updatePasswordAction] Error:", error);
    return { error: "Failed to update password. Please try again." };
  }
}
