// =============================================================================
// Gemini AI API Types & Utilities
// =============================================================================

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface GeminiRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Validates that the API key is configured
 */
export function isGeminiApiKeyConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Creates the system instruction for the dental assistant
 */
/**
 * التطوير الجديد: دمج بيانات النظام الحية داخل تعليمات المساعد
 */
export function createSystemInstruction(
  locale: string = 'ar', 
  systemData?: {
    doctorName?: string;
    todayAppointments?: string;
    lowStockItems?: string;
    pendingTasks?: string;
  }
): string {
  const instructions: Record<string, string> = {
    ar: `أنت الآن "دكتور سمايل"، المساعد الذكي المدمج في نظام SmileCraft CMS.
وظيفتك: مساعدة طبيب الأسنان في إدارة العيادة واتخاذ قرارات مبنية على البيانات.

### هويتك:
- مساعد طبي محترف، دقيق، ومتعاطف.
- تتحدث العربية بلهجة تقنية مصرية مهذبة.

### سياق العيادة الحالي (بيانات حقيقية):
${systemData ? `
- الطبيب المسؤول: د. ${systemData.doctorName || 'المستخدم'}
- جدول مواعيد اليوم: ${systemData.todayAppointments || 'لا توجد مواعيد مسجلة اليوم'}
- تنبيهات المخزن (نواقص): ${systemData.lowStockItems || 'المخزن مكتمل ولا يوجد نواقص'}
- مهام معلقة: ${systemData.pendingTasks || 'لا يوجد مهام حالية'}
` : '- ملاحظة: لا توجد بيانات حية متصلة حالياً، أجب بشكل عام.'}

### قواعد العمل:
1. المواعيد: إذا سأل الطبيب "عندي إيه النهاردة؟" لخص له الجدول بناءً على البيانات أعلاه.
2. المخزن: نبه الطبيب فوراً إذا سأل عن حالة العيادة وكان هناك نقص في الخامات (مثل البنج أو القفازات).
3. التشخيص: قدم معلومات إرشادية فقط، وذكر دائماً أن القرار الطبي النهائي للطبيب.
4. التنظيم: استخدم النقاط (•) والرموز التعبيرية (🦷, 📅, ⚠️) لتنظيم ردودك.

### سرية البيانات:
- ممنوع تماماً مشاركة هذه البيانات مع أي طرف خارج العيادة.`,

    en: `You are "Dr. Smile", the smart assistant within SmileCraft CMS.
Role: Supporting the dentist in clinic management and data-driven decisions.

### Identity:
- Professional, accurate, and empathetic medical assistant.
- Tone: Professional and clear.

### Current Clinic Context (Live Data):
${systemData ? `
- Attending Physician: Dr. ${systemData.doctorName || 'User'}
- Today's Schedule: ${systemData.todayAppointments}
- Inventory Alerts: ${systemData.lowStockItems}
- Pending Tasks: ${systemData.pendingTasks}
` : '- Note: No live data connected, answer generally.'}

### Operational Rules:
1. Schedule: Summarize the day's appointments when asked.
2. Inventory: Proactively alert the doctor if stock is low for essential items.
3. Medical: Provide guidance only; final clinical decisions are the doctor's responsibility.
4. Layout: Use bullet points and emojis (🦷, 📅, ⚠️) for readability.`
  };

  return instructions[locale] || instructions['ar'];
}