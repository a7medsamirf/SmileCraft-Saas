"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import {
  GEMINI_API_URL,
  isGeminiApiKeyConfigured,
  type GeminiRequest,
} from "@/lib/gemini/types";

// =============================================================================
// Types
// =============================================================================

interface QueryIntent {
  queryType: "count" | "list" | "sum" | "avg";
  table:
    | "patients"
    | "appointments"
    | "treatments"
    | "clinical_cases"
    | "staff"
    | "inventory_items"
    | "payments"
    | "invoices";
  filters: {
    field: string;
    operator:
      | "equals"
      | "gt"
      | "lt"
      | "gte"
      | "lte"
      | "contains"
      | "date_equals"
      | "date_this_month"
      | "date_today"
      | "date_this_week"
      | "is_null";
    value: string | number | boolean | null;
  }[];
  joins: string[];
  selectFields: string[];
  limit?: number;
  orderBy?: { field: string; direction: "asc" | "desc" };
  explanation: string;
}

interface AnalysisResult {
  needsData: boolean;
  intent?: QueryIntent;
  directAnswer?: string;
}

export interface DataCard {
  type: "count" | "list" | "sum" | "table";
  label: string;
  value?: number | string;
  rows?: Record<string, unknown>[];
  columns?: string[];
  explanation: string;
}

export interface SmartMessageResult {
  success: boolean;
  response?: string;
  dataCards?: DataCard[];
  error?: string;
  waitTimeSeconds?: number;
}

// =============================================================================
// Database Schema Context (compact version for the analysis step)
// =============================================================================

const SCHEMA_CONTEXT = `
أنت محلل بيانات ذكي يعمل مع نظام SmileCraft CMS (نظام إدارة عيادات الأسنان).

## الجداول المتاحة:

### patients (المرضى)
أعمدة: id, fullName, phone, email, gender(MALE/FEMALE), city, isActive(bool), bloodGroup, allergies, createdAt, updatedAt
- فلتر deletedAt = null دائماً ⚠️

### appointments (المواعيد)
أعمدة: id, date(DateTime), startTime(string), endTime(string), status(SCHEDULED/CONFIRMED/COMPLETED/CANCELLED/NO_SHOW), type, notes, reason, createdAt
علاقات: patients(fullName,phone), staff(fullName,specialty)

### invoices (الفواتير)
أعمدة: id, invoiceNumber, totalAmount(Decimal), paidAmount(Decimal), status(DRAFT/SENT/PAID/PARTIAL/OVERDUE/CANCELLED), dueDate, createdAt
علاقات: patients(fullName)

### payments (المدفوعات)
أعمدة: id, amount(Decimal), method(CASH/CARD/WALLET/BANK_TRANSFER/INSURANCE), type(PAYMENT/REFUND/ADJUSTMENT), notes, createdAt
علاقات: patients(fullName)

### treatments (العلاجات)
أعمدة: id, toothNumber, procedureName, procedureType, status(PLANNED/IN_PROGRESS/COMPLETED/CANCELLED), priority(LOW/MEDIUM/HIGH/URGENT), cost(Decimal), completedAt, createdAt

### staff (الموظفين)  
أعمدة: id, fullName, specialty, phone, email, role, salary(Decimal), isActive(bool), joinDate

### inventory_items (المخزون)
أعمدة: id, name, nameAr, code, category, quantity(int), minStock(int), unit, price(Decimal), supplier, expiryDate, isActive(bool)

### clinical_cases (الحالات السريرية)
أعمدة: id, toothNumber(int), toothStatus, diagnosis, procedure, estimatedCost(Decimal), status, sessionDate

## قواعد مهمة:
- clinicId و branchId يتم إضافتهم تلقائياً
- للعلاقات: joins=["patient"] أو ["staff"] أو كليهما
- operators: equals, gt, lt, gte, lte, contains, date_today, date_this_month, date_this_week, is_null
`;

// =============================================================================
// Main Entry Point: Unified Smart Message Action
// =============================================================================

export async function sendSmartMessageAction(
  message: string,
  locale: string = "ar",
  chatHistory: { role: string; content: string }[] = [],
): Promise<SmartMessageResult> {
  try {
    // 1. Validate API key
    if (!isGeminiApiKeyConfigured()) {
      return {
        success: false,
        error: "Gemini API key is not configured",
      };
    }

    // 2. Authenticate user and get clinic context
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clinicId: true, branchId: true, fullName: true, role: true },
    });

    if (!dbUser?.clinicId) {
      return { success: false, error: "No clinic found" };
    }

    const { clinicId, branchId, fullName: doctorName, role: userRole } = dbUser;

    // 3. Fetch live clinic summary for context
    const clinicSummary = await fetchClinicContext(clinicId, branchId, userRole);

    // 4. Step 1: Ask Gemini to analyze the question
    const analysis = await analyzeQuestion(message, locale, clinicSummary);

    if (!analysis.success) {
      return {
        success: false,
        error: analysis.error,
        waitTimeSeconds: analysis.waitTimeSeconds,
      };
    }

    const analysisResult = analysis.result!;

    // 5. If no data needed → return Gemini's direct answer
    if (!analysisResult.needsData || !analysisResult.intent) {
      // Generate a contextual response with clinic awareness
      const contextualResponse = await generateContextualResponse(
        message,
        locale,
        clinicSummary,
        doctorName,
        chatHistory,
      );

      return {
        success: true,
        response: contextualResponse.response || analysisResult.directAnswer || "",
      };
    }

    // 6. Execute Prisma query
    const queryResult = await executeQueryIntent(
      analysisResult.intent,
      clinicId,
      branchId,
      userRole
    );

    if (!queryResult.success) {
      return {
        success: false,
        error: `خطأ في جلب البيانات: ${queryResult.error}`,
      };
    }

    // 7. Build data cards for UI
    const dataCards = buildDataCards(analysisResult.intent, queryResult);

    // 8. Step 2: Send data to Gemini for natural language summary
    const summary = await generateDataSummary(
      message,
      locale,
      analysisResult.intent,
      queryResult,
      doctorName,
    );

    return {
      success: true,
      response: summary,
      dataCards,
    };
  } catch (error) {
    console.error("[sendSmartMessageAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Step 1: Analyze Question (Gemini decides if DB query is needed)
// =============================================================================

async function analyzeQuestion(
  question: string,
  locale: string,
  clinicSummary: string,
): Promise<{
  success: boolean;
  result?: AnalysisResult;
  error?: string;
  waitTimeSeconds?: number;
}> {
  const apiKey = process.env.GEMINI_API_KEY;

  const systemPrompt = `${SCHEMA_CONTEXT}

## مهمتك:
حلل سؤال المستخدم وقرر هل يحتاج جلب بيانات من قاعدة البيانات أم لا.

## سياق العيادة الحالي:
${clinicSummary}

## أعد JSON بالشكل التالي:

### إذا كان السؤال يحتاج بيانات (مثل: كم مريض؟ وريني المواعيد، إجمالي المدفوعات...):
\`\`\`json
{
  "needsData": true,
  "intent": {
    "queryType": "count|list|sum|avg",
    "table": "اسم الجدول",
    "filters": [{"field": "...", "operator": "...", "value": ...}],
    "joins": [],
    "selectFields": ["..."],
    "limit": 20,
    "orderBy": {"field": "...", "direction": "asc|desc"},
    "explanation": "شرح مختصر بالعربي"
  }
}
\`\`\`

### إذا كان السؤال عام ولا يحتاج بيانات (مثل: ما علاج التسوس؟ نصائح للمرضى...):
\`\`\`json
{
  "needsData": false,
  "directAnswer": "لا حاجة لاستعلام قاعدة البيانات"
}
\`\`\`

## أمثلة مهمة:

"كم عدد المرضى؟" →
\`\`\`json
{"needsData":true,"intent":{"queryType":"count","table":"patients","filters":[{"field":"isActive","operator":"equals","value":true}],"joins":[],"selectFields":[],"explanation":"عدد المرضى النشطين"}}
\`\`\`

"وريني مواعيد النهاردة" →
\`\`\`json
{"needsData":true,"intent":{"queryType":"list","table":"appointments","filters":[{"field":"date","operator":"date_today","value":null}],"joins":["patient"],"selectFields":["date","startTime","endTime","status","type","notes"],"orderBy":{"field":"startTime","direction":"asc"},"limit":50,"explanation":"مواعيد اليوم مع بيانات المرضى"}}
\`\`\`

"إجمالي المدفوعات الشهر ده" →
\`\`\`json
{"needsData":true,"intent":{"queryType":"sum","table":"payments","filters":[{"field":"createdAt","operator":"date_this_month","value":null}],"joins":[],"selectFields":["amount"],"explanation":"إجمالي المدفوعات هذا الشهر"}}
\`\`\`

"الفواتير اللي عليها مبالغ متبقية" →
\`\`\`json
{"needsData":true,"intent":{"queryType":"list","table":"invoices","filters":[{"field":"status","operator":"equals","value":"PARTIAL"}],"joins":["patient"],"selectFields":["invoiceNumber","totalAmount","paidAmount","status","createdAt"],"orderBy":{"field":"createdAt","direction":"desc"},"limit":20,"explanation":"الفواتير المدفوعة جزئياً"}}
\`\`\`

"ما هو علاج تسوس الأسنان؟" →
\`\`\`json
{"needsData":false,"directAnswer":"سؤال طبي عام"}
\`\`\`

"بيانات المريض أحمد" →
\`\`\`json
{"needsData":true,"intent":{"queryType":"list","table":"patients","filters":[{"field":"fullName","operator":"contains","value":"أحمد"},{"field":"isActive","operator":"equals","value":true}],"joins":[],"selectFields":["fullName","phone","email","gender","city","bloodGroup","createdAt"],"limit":10,"explanation":"البحث عن مريض باسم أحمد"}}
\`\`\`

## قواعد:
- أعد JSON فقط بدون أي نص إضافي
- لا تخترع أعمدة غير موجودة في الشرح
- للبحث بالاسم استخدم operator "contains"
- للتواريخ: استخدم date_today لليوم، date_this_month للشهر، date_this_week للأسبوع
`;

  const requestBody: GeminiRequest = {
    contents: [{ role: "user", parts: [{ text: question }] }],
    generationConfig: {
      temperature: 0.1,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const waitTimeSeconds = retryAfter ? parseInt(retryAfter) : 30;
    return {
      success: false,
      error: "تم تجاوز حد الاستخدام. يرجى الانتظار قليلاً.",
      waitTimeSeconds,
    };
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error("[analyzeQuestion] Gemini error:", response.status, errorData);
    return {
      success: false,
      error: `Gemini API error: ${response.status}`,
    };
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!responseText) {
    return { success: false, error: "Empty response from AI" };
  }

  // Parse JSON
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    const result: AnalysisResult = JSON.parse(jsonStr);

    if (typeof result.needsData !== "boolean") {
      return { success: false, error: "Invalid analysis response" };
    }

    return { success: true, result };
  } catch (e) {
    console.error("[analyzeQuestion] Parse error:", e, "Raw:", responseText);
    // If parsing fails, treat as non-data question
    return {
      success: true,
      result: { needsData: false, directAnswer: "general" },
    };
  }
}

// =============================================================================
// Generate Contextual Response (for non-data questions)
// =============================================================================

async function generateContextualResponse(
  message: string,
  locale: string,
  clinicSummary: string,
  doctorName: string,
  chatHistory: { role: string; content: string }[],
): Promise<{ response?: string; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  const langInstructions = locale === "ar"
    ? `أنت "دكتور سمايل"، المساعد الذكي في نظام SmileCraft CMS.
تتحدث العربية بلهجة مهنية مصرية مهذبة.
وظيفتك: مساعدة طبيب الأسنان في إدارة العيادة والإجابة على الاستفسارات الطبية.

### سياق العيادة الحالي:
- الطبيب: د. ${doctorName}
${clinicSummary}

### قواعد:
1. إذا سأل عن جدوله أو حالة العيادة، استخدم السياق أعلاه.
2. للأسئلة الطبية: قدم معلومات إرشادية وذكّر أن القرار النهائي للطبيب.
3. استخدم الرموز (🦷📅⚠️💊) والنقاط لتنظيم ردودك.
4. كن مختصراً ومفيداً.`
    : `You are "Dr. Smile", the smart assistant within SmileCraft CMS.
Role: Supporting the dentist in clinic management and medical inquiries.

### Current Clinic Context:
- Doctor: Dr. ${doctorName}
${clinicSummary}

### Rules:
1. If asked about schedule or clinic status, use the context above.
2. For medical questions: provide guidance only, remind that final decisions are the doctor's.
3. Use emojis (🦷📅⚠️💊) and bullet points for readability.
4. Be concise and helpful.`;

  // Build conversation history for context
  const geminiMessages = chatHistory.slice(-6).map((msg) => ({
    role: msg.role === "user" ? "user" as const : "model" as const,
    parts: [{ text: msg.content }],
  }));

  geminiMessages.push({ role: "user" as const, parts: [{ text: message }] });

  const requestBody: GeminiRequest = {
    contents: geminiMessages,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
    systemInstruction: { parts: [{ text: langInstructions }] },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    return { error: `API error: ${response.status}` };
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  return { response: text || "لم أتمكن من الرد. حاول مرة أخرى." };
}

// =============================================================================
// Generate Natural Language Summary from Fetched Data
// =============================================================================

async function generateDataSummary(
  originalQuestion: string,
  locale: string,
  intent: QueryIntent,
  queryResult: QueryResult,
  doctorName: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Serialize data for Gemini
  const dataStr = JSON.stringify(queryResult.data, null, 2);
  const count = queryResult.count ?? 0;

  const prompt = locale === "ar"
    ? `أنت "دكتور سمايل"، المساعد الذكي في نظام SmileCraft CMS.

الطبيب: د. ${doctorName}
سأل: "${originalQuestion}"

تم جلب البيانات التالية من قاعدة البيانات:
- نوع الاستعلام: ${intent.queryType}
- الجدول: ${intent.table}
- الشرح: ${intent.explanation}
- عدد النتائج: ${count}
- البيانات:
${dataStr}

## المطلوب:
لخص هذه البيانات بطريقة طبيعية ومفيدة للطبيب. استخدم:
- أرقام واضحة ومحددة
- رموز تعبيرية (📊📅🦷💰👥⚠️) لتنظيم الرد
- نبرة مهنية مصرية مهذبة
- إذا كانت قائمة، اعرض أهم التفاصيل
- إذا كان عدد أو إجمالي، اعرض الرقم بوضوح مع سياق
- لا تعرض JSON أو كود — فقط نص طبيعي مقروء
- اجعل الرد مختصر (3-8 أسطر كحد أقصى)`
    : `You are "Dr. Smile", the smart assistant in SmileCraft CMS.

Doctor: Dr. ${doctorName}
Asked: "${originalQuestion}"

Retrieved data from database:
- Query type: ${intent.queryType}
- Table: ${intent.table}
- Explanation: ${intent.explanation}
- Result count: ${count}
- Data:
${dataStr}

## Task:
Summarize this data in a natural, helpful way. Use:
- Clear numbers
- Emojis (📊📅🦷💰👥⚠️) for readability
- Professional tone
- For lists: highlight key details
- For counts/sums: present the number clearly with context
- No JSON or code — natural readable text only
- Keep it concise (3-8 lines max)`;

  const requestBody: GeminiRequest = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Fallback: return a basic summary
      return buildFallbackSummary(intent, queryResult, locale);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return text || buildFallbackSummary(intent, queryResult, locale);
  } catch {
    return buildFallbackSummary(intent, queryResult, locale);
  }
}

// =============================================================================
// Fallback Summary (when 2nd Gemini call fails)
// =============================================================================

function buildFallbackSummary(
  intent: QueryIntent,
  queryResult: QueryResult,
  locale: string,
): string {
  const count = queryResult.count ?? 0;
  const tableLabels: Record<string, { ar: string; en: string }> = {
    patients: { ar: "مريض", en: "patient(s)" },
    appointments: { ar: "موعد", en: "appointment(s)" },
    treatments: { ar: "علاج", en: "treatment(s)" },
    staff: { ar: "موظف", en: "staff member(s)" },
    inventory_items: { ar: "منتج", en: "item(s)" },
    payments: { ar: "عملية دفع", en: "payment(s)" },
    invoices: { ar: "فاتورة", en: "invoice(s)" },
    clinical_cases: { ar: "حالة سريرية", en: "clinical case(s)" },
  };

  const label = tableLabels[intent.table]?.[locale === "ar" ? "ar" : "en"] || intent.table;

  if (intent.queryType === "count") {
    return locale === "ar"
      ? `📊 النتيجة: **${count}** ${label}`
      : `📊 Result: **${count}** ${label}`;
  }
  if (intent.queryType === "sum") {
    const total = (queryResult.data as { total?: number })?.total ?? 0;
    return locale === "ar"
      ? `💰 الإجمالي: **${total.toLocaleString("ar-EG")}** ج.م`
      : `💰 Total: **${total.toLocaleString("en-US")}** EGP`;
  }
  if (intent.queryType === "list") {
    return locale === "ar"
      ? `📋 تم العثور على **${count}** ${label}`
      : `📋 Found **${count}** ${label}`;
  }
  return `${intent.explanation} — ${count} records`;
}

// =============================================================================
// Build Data Cards for UI Display
// =============================================================================

function buildDataCards(
  intent: QueryIntent,
  queryResult: QueryResult,
): DataCard[] {
  const cards: DataCard[] = [];

  if (intent.queryType === "count") {
    cards.push({
      type: "count",
      label: intent.explanation,
      value: queryResult.count ?? 0,
      explanation: intent.explanation,
    });
  } else if (intent.queryType === "sum" || intent.queryType === "avg") {
    const result = queryResult.data as { total?: number; average?: number };
    cards.push({
      type: "sum",
      label: intent.explanation,
      value: result.total ?? result.average ?? 0,
      explanation: `${intent.explanation} (${queryResult.count ?? 0} records)`,
    });
  } else if (intent.queryType === "list" && Array.isArray(queryResult.data)) {
    const rows = queryResult.data as Record<string, unknown>[];
    if (rows.length > 0) {
      cards.push({
        type: "table",
        label: intent.explanation,
        rows: rows.slice(0, 15),
        columns: Object.keys(rows[0]),
        explanation: `${intent.explanation} — ${queryResult.count} records`,
      });
    }
  }

  return cards;
}

// =============================================================================
// Execute Query Intent (Prisma)
// =============================================================================

interface QueryResult {
  success: boolean;
  data?: unknown;
  count?: number;
  error?: string;
}

async function executeQueryIntent(
  intent: QueryIntent,
  clinicId: string,
  branchId: string | null,
  userRole: string,
): Promise<QueryResult> {
  try {
    // Build base WHERE clause with tenant isolation
    const where: Record<string, unknown> = { clinicId };

    // Tables that have branchId (isolation applied for non-admins)
    const branchScopedTables = [
      "patients",
      "appointments",
      "clinical_cases",
      "inventory_items",
      "staff",
      "invoices",
      "payments"
    ];

    if (userRole !== "ADMIN" && branchId && branchScopedTables.includes(intent.table)) {
      where.branchId = branchId;
    }

    // Apply filters
    for (const filter of intent.filters) {
      switch (filter.operator) {
        case "equals":
          where[filter.field] = filter.value;
          break;
        case "gt":
          where[filter.field] = { gt: filter.value };
          break;
        case "lt":
          where[filter.field] = { lt: filter.value };
          break;
        case "gte":
          where[filter.field] = { gte: filter.value };
          break;
        case "lte":
          where[filter.field] = { lte: filter.value };
          break;
        case "contains":
          where[filter.field] = {
            contains: filter.value,
            mode: "insensitive",
          };
          break;
        case "date_today": {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          where[filter.field] = { gte: today, lt: tomorrow };
          break;
        }
        case "date_this_week": {
          const now = new Date();
          const dayOfWeek = now.getDay();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - dayOfWeek);
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 7);
          where[filter.field] = { gte: startOfWeek, lt: endOfWeek };
          break;
        }
        case "date_this_month": {
          const now2 = new Date();
          const firstDay = new Date(now2.getFullYear(), now2.getMonth(), 1);
          const lastDay = new Date(
            now2.getFullYear(),
            now2.getMonth() + 1,
            0,
            23,
            59,
            59,
          );
          where[filter.field] = { gte: firstDay, lte: lastDay };
          break;
        }
        case "is_null":
          where[filter.field] = null;
          break;
      }
    }

    // Soft-delete filter for patients
    if (intent.table === "patients") {
      where.deletedAt = null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaModel = (prisma as any)[intent.table];
    if (!prismaModel) {
      return { success: false, error: `Unknown table: ${intent.table}` };
    }

    let result: unknown;
    let count = 0;

    switch (intent.queryType) {
      case "count": {
        count = await prismaModel.count({ where });
        result = { total: count };
        break;
      }

      case "list": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queryOptions: any = {
          where,
          orderBy: intent.orderBy
            ? { [intent.orderBy.field]: intent.orderBy.direction }
            : undefined,
          take: intent.limit || 50,
        };

        // Handle joins/relations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const include: Record<string, any> = {};
        if (intent.joins.includes("patient")) {
          include.patients = { select: { fullName: true, phone: true } };
        }
        if (intent.joins.includes("staff")) {
          include.staff = {
            select: { fullName: true, specialty: true },
          };
        }
        if (Object.keys(include).length > 0) {
          queryOptions.include = include;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const records: any[] = await prismaModel.findMany(queryOptions);
        count = records.length;

        // Flatten for display
        result = records.map((record) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const flat: Record<string, any> = {};
          for (const field of intent.selectFields) {
            if (field.includes(".")) {
              const [relation, relField] = field.split(".");
              if (record[relation]) {
                flat[relField] = record[relation][relField];
              }
            } else {
              flat[field] = record[field];
            }
          }
          // Always add relation names if joined
          if (record.patients?.fullName && !flat.fullName) {
            flat.patientName = record.patients.fullName;
          }
          if (record.staff?.fullName && !flat.staffName) {
            flat.doctorName = record.staff.fullName;
          }
          return flat;
        });
        break;
      }

      case "sum": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sumRecords: any[] = await prismaModel.findMany({
          where,
          select: intent.selectFields.reduce(
            (acc: Record<string, boolean>, f: string) => {
              acc[f] = true;
              return acc;
            },
            {},
          ),
        });

        const sumField =
          intent.selectFields.find(
            (f) =>
              f.includes("amount") ||
              f.includes("cost") ||
              f.includes("price") ||
              f.includes("totalAmount"),
          ) || intent.selectFields[0];

        const total = sumRecords.reduce(
          (sum, r) => sum + Number(r[sumField] || 0),
          0,
        );
        count = sumRecords.length;
        result = { total: Number(total.toFixed(2)), count };
        break;
      }

      case "avg": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const avgRecords: any[] = await prismaModel.findMany({
          where,
          select: intent.selectFields.reduce(
            (acc: Record<string, boolean>, f: string) => {
              acc[f] = true;
              return acc;
            },
            {},
          ),
        });

        const avgField =
          intent.selectFields.find(
            (f) =>
              f.includes("amount") ||
              f.includes("cost") ||
              f.includes("price"),
          ) || intent.selectFields[0];

        const totalAvg = avgRecords.reduce(
          (sum, r) => sum + Number(r[avgField] || 0),
          0,
        );
        count = avgRecords.length;
        const avg = count > 0 ? totalAvg / count : 0;
        result = { average: Number(avg.toFixed(2)), count };
        break;
      }

      default:
        return { success: false, error: "Unknown query type" };
    }

    return { success: true, data: result, count };
  } catch (error) {
    console.error("[executeQueryIntent] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Database error",
    };
  }
}

// =============================================================================
// Fetch Live Clinic Context (quick summary for Gemini)
// =============================================================================

async function fetchClinicContext(
  clinicId: string,
  branchId: string | null,
  userRole: string
): Promise<string> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Apply branch filter only for non-admins
    const branchFilter = (userRole !== "ADMIN" && branchId) ? { branchId } : {};

    // Run all queries in parallel
    const [
      todayAppointments,
      activePatients,
      pendingInvoices,
      lowStockItems,
      todayCompletedAppointments,
    ] = await Promise.all([
      // Today's appointments count
      prisma.appointments.count({
        where: {
          clinicId,
          ...branchFilter,
          date: { gte: today, lt: tomorrow },
        },
      }),

      // Active patients count
      prisma.patients.count({
        where: {
          clinicId,
          ...branchFilter,
          isActive: true,
          deletedAt: null,
        },
      }),

      // Pending/partial invoices count
      prisma.invoices.count({
        where: {
          clinicId,
          ...branchFilter,
          status: { in: ["DRAFT", "SENT", "PARTIAL", "OVERDUE"] },
        },
      }),

      // Low stock items
      prisma.inventory_items.count({
        where: {
          clinicId,
          ...branchFilter,
          isActive: true,
          quantity: { lte: 10 },
        },
      }).catch(() => 0),

      // Today's completed appointments
      prisma.appointments.count({
        where: {
          clinicId,
          ...branchFilter,
          date: { gte: today, lt: tomorrow },
          status: "COMPLETED",
        },
      }),
    ]);

    return `- مواعيد اليوم: ${todayAppointments} (مكتمل: ${todayCompletedAppointments})
- المرضى النشطين: ${activePatients}
- فواتير معلقة: ${pendingInvoices}
- أصناف مخزون منخفضة: ${lowStockItems}`;
  } catch (error) {
    console.error("[fetchClinicContext] Error:", error);
    return "- لا تتوفر بيانات العيادة حالياً";
  }
}
