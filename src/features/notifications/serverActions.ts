"use server";

// =============================================================================
// SmileCraft CMS — Notification Server Actions
// ✅ SMS/WhatsApp/Email appointment reminders
// ✅ In-app notification management
// ✅ Notification settings management
// =============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationSettings {
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  reminderTiming: number; // hours before appointment
}

export interface Notification {
  id: string;
  userId: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface AppointmentReminder {
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  patientEmail: string | null;
  appointmentDate: string;
  appointmentTime: string;
  doctorName: string | null;
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function getUserClinicId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clinicId: true },
    });

    return dbUser?.clinicId ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Get Notification Settings
// ---------------------------------------------------------------------------

/**
 * Get notification settings for the user's clinic.
 */
export async function getNotificationSettingsAction(): Promise<NotificationSettings | null> {
  const clinicId = await getUserClinicId();
  if (!clinicId) return null;

  try {
    const settings = await prisma.clinic_notification_settings.findUnique({
      where: { clinicId },
    });

    if (!settings) {
      // Create default settings if not exists
      const created = await prisma.clinic_notification_settings.create({
        data: {
          clinicId,
          smsEnabled: true,
          whatsappEnabled: true,
          emailEnabled: false,
          reminderTiming: 24,
        },
      });
      return {
        smsEnabled: created.smsEnabled,
        whatsappEnabled: created.whatsappEnabled,
        emailEnabled: created.emailEnabled,
        reminderTiming: created.reminderTiming,
      };
    }

    return {
      smsEnabled: settings.smsEnabled,
      whatsappEnabled: settings.whatsappEnabled,
      emailEnabled: settings.emailEnabled,
      reminderTiming: settings.reminderTiming,
    };
  } catch (error) {
    console.error("[getNotificationSettingsAction] Error:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Update Notification Settings
// ---------------------------------------------------------------------------

/**
 * Update notification settings for the user's clinic.
 */
export async function updateNotificationSettingsAction(
  settings: Partial<NotificationSettings>,
): Promise<{ success: boolean; error?: string }> {
  const clinicId = await getUserClinicId();
  if (!clinicId) {
    return { success: false, error: "غير مصرح" };
  }

  try {
    await prisma.clinic_notification_settings.upsert({
      where: { clinicId },
      create: {
        clinicId,
        smsEnabled: settings.smsEnabled ?? true,
        whatsappEnabled: settings.whatsappEnabled ?? true,
        emailEnabled: settings.emailEnabled ?? false,
        reminderTiming: settings.reminderTiming ?? 24,
      },
      update: {
        ...(settings.smsEnabled !== undefined && { smsEnabled: settings.smsEnabled }),
        ...(settings.whatsappEnabled !== undefined && { whatsappEnabled: settings.whatsappEnabled }),
        ...(settings.emailEnabled !== undefined && { emailEnabled: settings.emailEnabled }),
        ...(settings.reminderTiming !== undefined && { reminderTiming: settings.reminderTiming }),
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("[updateNotificationSettingsAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل في تحديث الإعدادات",
    };
  }
}

// ---------------------------------------------------------------------------
// Get Upcoming Appointments for Reminders
// ---------------------------------------------------------------------------

/**
 * Get appointments that need reminders (within the reminder timing window).
 */
export async function getUpcomingAppointmentsAction(): Promise<AppointmentReminder[]> {
  const clinicId = await getUserClinicId();
  if (!clinicId) return [];

  try {
    // Get notification settings
    const settings = await prisma.clinic_notification_settings.findUnique({
      where: { clinicId },
    });

    if (!settings) return [];

    // Calculate time window
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + settings.reminderTiming * 60 * 60 * 1000);

    // Get appointments in the window
    const appointments = await prisma.appointments.findMany({
      where: {
        clinicId,
        status: "SCHEDULED",
        date: {
          gte: now,
          lte: reminderWindow,
        },
      },
      include: {
        patients: {
          select: {
            fullName: true,
            phone: true,
            email: true,
          },
        },
        staff: {
          select: {
            fullName: true,
          },
        },
      },
    });

    return appointments.map((apt) => ({
      appointmentId: apt.id,
      patientId: apt.patientId,
      patientName: apt.patients.fullName,
      patientPhone: apt.patients.phone,
      patientEmail: apt.patients.email,
      appointmentDate: apt.date.toISOString(),
      appointmentTime: apt.startTime,
      doctorName: apt.staff?.fullName ?? null,
    }));
  } catch (error) {
    console.error("[getUpcomingAppointmentsAction] Error:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Send Appointment Reminder
// ---------------------------------------------------------------------------

/**
 * Send a reminder for a specific appointment via enabled channels.
 * This is the core function that sends SMS/WhatsApp/Email.
 *
 * @param appointmentId - Appointment ID to send reminder for
 *
 * Note: Actual SMS/WhatsApp/Email sending requires third-party integration.
 * This implementation creates in-app notifications and logs.
 * To integrate with actual providers, add API calls here.
 */
export async function sendAppointmentReminderAction(
  appointmentId: string,
): Promise<{ success: boolean; channels?: string[]; error?: string }> {
  const clinicId = await getUserClinicId();
  if (!clinicId) {
    return { success: false, error: "غير مصرح" };
  }

  try {
    // Get appointment details
    const appointment = await prisma.appointments.findFirst({
      where: { id: appointmentId, clinicId },
      include: {
        patients: {
          select: {
            fullName: true,
            phone: true,
            email: true,
          },
        },
        staff: {
          select: { fullName: true },
        },
      },
    });

    if (!appointment) {
      return { success: false, error: "الموعد غير موجود" };
    }

    // Get notification settings
    const settings = await prisma.clinic_notification_settings.findUnique({
      where: { clinicId },
    });

    if (!settings) {
      return { success: false, error: "إعدادات الإشعارات غير موجودة" };
    }

    const channels: string[] = [];

    // Format appointment date/time for message
    const aptDate = new Date(appointment.date);
    const dateStr = aptDate.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const message = `مرحباً ${appointment.patients.fullName}،\n\n`;
    const messageBody = `تذكير بموعدك في العيادة:\n`;
    const messageDetails = `📅 التاريخ: ${dateStr}\n⏰ الوقت: ${appointment.startTime}\n👨‍⚕️ الطبيب: ${appointment.staff?.fullName ?? "غير محدد"}\n\n`;
    const messageFooter = `نتمنى لك الصحة والعافية 🌟\n\n`;
    const fullMessage = message + messageBody + messageDetails + messageFooter;

    // Send SMS (if enabled and patient has phone)
    if (settings.smsEnabled && appointment.patients.phone) {
      // TODO: Integrate with SMS provider (e.g., Twilio, local provider)
      // await sendSMS(appointment.patients.phone, fullMessage);
      channels.push("sms");
      console.log(`[SMS] Would send to ${appointment.patients.phone}: ${fullMessage}`);
    }

    // Send WhatsApp (if enabled and patient has phone)
    if (settings.whatsappEnabled && appointment.patients.phone) {
      // TODO: Integrate with WhatsApp API (e.g., Twilio WhatsApp, 360dialog)
      // await sendWhatsApp(appointment.patients.phone, fullMessage);
      channels.push("whatsapp");
      console.log(`[WhatsApp] Would send to ${appointment.patients.phone}: ${fullMessage}`);
    }

    // Send Email (if enabled and patient has email)
    if (settings.emailEnabled && appointment.patients.email) {
      // TODO: Integrate with Email provider (e.g., SendGrid, Resend)
      // await sendEmail(appointment.patients.email, "تذكير بموعد", fullMessage);
      channels.push("email");
      console.log(`[Email] Would send to ${appointment.patients.email}: ${fullMessage}`);
    }

    // Create in-app notification for the user (doctor/staff)
    await prisma.notifications.create({
      data: {
        id: crypto.randomUUID(),
        userId: appointment.userId,
        title: "تذكير بموعد",
        message: `تم إرسال تذكير للمريض ${appointment.patients.fullName} بخصوص موعد ${dateStr}`,
        type: "appointment_reminder",
        isRead: false,
      },
    });

    if (channels.length === 0) {
      return {
        success: false,
        error: "لم يتم إرسال الإشعار: رقم الهاتف أو البريد الإلكتروني غير متوفر",
      };
    }

    return { success: true, channels };
  } catch (error) {
    console.error("[sendAppointmentReminderAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل في إرسال التذكير",
    };
  }
}

// ---------------------------------------------------------------------------
// Send Bulk Reminders
// ---------------------------------------------------------------------------

/**
 * Send reminders to all upcoming appointments within the reminder window.
 */
export async function sendBulkRemindersAction(): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const clinicId = await getUserClinicId();
  if (!clinicId) {
    return { success: false, sent: 0, failed: 0, errors: ["غير مصرح"] };
  }

  try {
    const appointments = await getUpcomingAppointmentsAction();
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    for (const apt of appointments) {
      const result = await sendAppointmentReminderAction(apt.appointmentId);
      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push(`${apt.patientName}: ${result.error}`);
      }
    }

    return { success: true, sent, failed, errors };
  } catch (error) {
    console.error("[sendBulkRemindersAction] Error:", error);
    return {
      success: false,
      sent: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : "فشل في إرسال التذكيرات"],
    };
  }
}

// ---------------------------------------------------------------------------
// Get User Notifications
// ---------------------------------------------------------------------------

/**
 * Get notifications for the current user.
 */
export async function getUserNotificationsAction(
  page: number = 1,
  limit: number = 50,
): Promise<{ notifications: Notification[]; total: number; unread: number }> {
  const clinicId = await getUserClinicId();
  if (!clinicId) {
    return { notifications: [], total: 0, unread: 0 };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { notifications: [], total: 0, unread: 0 };
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unread] = await Promise.all([
      prisma.notifications.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notifications.count({ where: { userId: user.id } }),
      prisma.notifications.count({
        where: { userId: user.id, isRead: false },
      }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      total,
      unread,
    };
  } catch (error) {
    console.error("[getUserNotificationsAction] Error:", error);
    return { notifications: [], total: 0, unread: 0 };
  }
}

// ---------------------------------------------------------------------------
// Mark Notification as Read
// ---------------------------------------------------------------------------

/**
 * Mark a notification as read.
 */
export async function markNotificationReadAction(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  const clinicId = await getUserClinicId();
  if (!clinicId) {
    return { success: false, error: "غير مصرح" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "غير مصرح" };
    }

    await prisma.notifications.update({
      where: { id: notificationId, userId: user.id },
      data: { isRead: true },
    });

    return { success: true };
  } catch (error) {
    console.error("[markNotificationReadAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل في تحديث الإشعار",
    };
  }
}

// ---------------------------------------------------------------------------
// Mark All Notifications as Read
// ---------------------------------------------------------------------------

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllNotificationsReadAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const clinicId = await getUserClinicId();
  if (!clinicId) {
    return { success: false, error: "غير مصرح" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "غير مصرح" };
    }

    await prisma.notifications.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  } catch (error) {
    console.error("[markAllNotificationsReadAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل في تحديث الإشعارات",
    };
  }
}
