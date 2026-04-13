"use client";

// =============================================================================
// SmileCraft CMS — Notification Settings Component
// Configure SMS/WhatsApp/Email notification preferences
// =============================================================================

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Mail,
  Smartphone,
  Clock,
  Save,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  getNotificationSettingsAction,
  updateNotificationSettingsAction,
  sendBulkRemindersAction,
} from "@/features/notifications/serverActions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationSettings {
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  reminderTiming: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationSettingsComponent() {
  const [settings, setSettings] = useState<NotificationSettings>({
    smsEnabled: true,
    whatsappEnabled: true,
    emailEnabled: false,
    reminderTiming: 24,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
  } | null>(null);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      const result = await getNotificationSettingsAction();
      if (result) {
        setSettings(result);
      }
    };
    loadSettings();
  }, []);

  // Handle toggle
  const handleToggle = (key: keyof NotificationSettings) => {
    if (key === "reminderTiming") return;
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaveStatus("idle");
  };

  // Handle timing change
  const handleTimingChange = (value: number) => {
    setSettings((prev) => ({ ...prev, reminderTiming: value }));
    setSaveStatus("idle");
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateNotificationSettingsAction(settings);
      if (result.success) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Send bulk reminders
  const handleSendReminders = async () => {
    if (
      !confirm(
        "هل أنت متأكد من إرسال تذكيرات لكل المواعيد القادمة؟ هذا الإجراء لا يمكن التراجع عنه.",
      )
    ) {
      return;
    }

    setIsSending(true);
    try {
      const result = await sendBulkRemindersAction();
      if (result.success) {
        setSendResult({
          sent: result.sent,
          failed: result.failed,
        });
      }
    } catch (error) {
      console.error("[NotificationSettings] Send reminders error:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          إعدادات الإشعارات
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          تحكم في كيفية إرسال تذكيرات المواعيد للمرضى
        </p>
      </div>

      {/* Notification Channels */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          قنوات الإشعارات
        </h3>

        {/* SMS */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${settings.smsEnabled ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-700"}`}
            >
              <Smartphone
                className={`h-5 w-5 ${settings.smsEnabled ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                رسائل SMS
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                إرسال تذكيرات عبر الرسائل النصية
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("smsEnabled")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.smsEnabled
                ? "bg-blue-600"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.smsEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* WhatsApp */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${settings.whatsappEnabled ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-700"}`}
            >
              <MessageSquare
                className={`h-5 w-5 ${settings.whatsappEnabled ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                واتساب
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                إرسال تذكيرات عبر واتساب
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("whatsappEnabled")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.whatsappEnabled
                ? "bg-blue-600"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.whatsappEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${settings.emailEnabled ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-700"}`}
            >
              <Mail
                className={`h-5 w-5 ${settings.emailEnabled ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                البريد الإلكتروني
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                إرسال تذكيرات عبر البريد الإلكتروني
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("emailEnabled")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.emailEnabled
                ? "bg-blue-600"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.emailEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Reminder Timing */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              وقت التذكير
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              إرسال التذكيرات قبل الموعد بـ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[6, 12, 24, 48].map((hours) => (
            <button
              key={hours}
              onClick={() => handleTimingChange(hours)}
              className={`py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                settings.reminderTiming === hours
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {hours === 6 && "٦ ساعات"}
              {hours === 12 && "١٢ ساعة"}
              {hours === 24 && "٢٤ ساعة"}
              {hours === 48 && "٤٨ ساعة"}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {saveStatus === "success" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-green-600 dark:text-green-400"
            >
              <Check className="h-4 w-4" />
              <span className="text-sm">تم الحفظ بنجاح</span>
            </motion.div>
          )}
          {saveStatus === "error" && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-red-600 dark:text-red-400"
            >
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">خطأ في الحفظ</span>
            </motion.div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
        >
          {isSaving ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <Save className="h-4 w-4" />
          )}
          حفظ الإعدادات
        </button>
      </div>

      {/* Bulk Reminders */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          إرسال تذكيرات الآن
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          إرسال تذكيرات لجميع المواعيد القادمة خلال الفترة المحددة
        </p>

        <button
          onClick={handleSendReminders}
          disabled={isSending}
          className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isSending ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
              />
              جاري الإرسال...
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4" />
              إرسال تذكيرات للمواعيد القادمة
            </>
          )}
        </button>

        {/* Send result */}
        {sendResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600 dark:text-green-400">
                ✓ تم إرسال: {sendResult.sent}
              </span>
              {sendResult.failed > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  ✗ فشل: {sendResult.failed}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Integration Notice */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              ملاحظة: يتطلب تكامل خارجي
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              إرسال SMS/WhatsApp/Email الفعلي يتطلب التكامل مع مزود خدمة (مثل
              Twilio, SendGrid). الإشعارات الحالية تُحفظ فقط في النظام.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
