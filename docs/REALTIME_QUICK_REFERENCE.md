# 🚀 useSupabaseRealtime - دليل الاستخدام السريع

## 📋 ملخص سريع

تم إنشاء الـ Hook بنجاح وهو جاهز للاستخدام في مشروعك!

## ✅ ما تم إنجازه

### 1. **تحسين الـ Hook** (`src/hooks/useSupabaseRealtime.ts`)
- ✨ إضافة دعم الـ **Options API** للتحكم الأفضل
- 🎯 إضافة **Event Filtering** (INSERT, UPDATE, DELETE)
- 🛡️ تحسين **Error Handling** مع custom error callback
- 🔄 إضافة **Subscription status logging** للتتبع
- ⚡ تحسين **Cleanup** لمنع Memory Leaks
- 📝 تحسين **Type Safety** بشكل كامل

### 2. **تحديث Supabase Client** (`src/lib/supabase/client.ts`)
- 🔧 إضافة Database type للـ client للحصول على type safety كامل

### 3. **تطبيق عملي** (`DailyAgenda.tsx`)
- 💡 مثال حقيقي: صفحة المواعيد تتحدث فوراً عند إضافة موعد جديد
- 🔔 إشعارات Toast عند حدوث أخطاء

### 4. **توثيق شامل** (`docs/useSupabaseRealtime.md`)
- 📚 دليل كامل بالعربية والإنجليزية
- 💻 أمثلة عملية لكل حالة استخدام
- 🔍 قسم Troubleshooting

---

## 🎯 طريقة الاستخدام

### الطريقة 1: بسيطة (Callback)

```typescript
import { useSupabaseRealtime } from "@/hooks";

function MyComponent() {
  useSupabaseRealtime("appointments", ({ event, newRecord, oldRecord }) => {
    console.log(`حدث ${event}`, newRecord);
    // إعادة تحميل البيانات
  });
  
  return <div>...</div>;
}
```

### الطريقة 2: متقدمة (Options) - مستخدمة ✅

```typescript
import { useSupabaseRealtime } from "@/hooks";
import { useCallback } from "react";
import toast from "react-hot-toast";

function AppointmentsPage() {
  const handleAppointmentChange = useCallback(({ event, newRecord }) => {
    if (event === "INSERT") {
      toast.success("موعد جديد تم إضافته!");
    }
    // إعادة تحميل المواعيد
    refreshAppointments();
  }, []);

  useSupabaseRealtime("appointments", {
    onEvent: handleAppointmentChange,
    onError: (error) => {
      toast.error("فشل في التحديث المباشر");
    },
    eventFilter: ["INSERT", "UPDATE", "DELETE"], // أو "INSERT" فقط
    enabled: true, // يمكن إيقافه مؤقتاً
  });
  
  return <div>...</div>;
}
```

---

## 📊 أمثلة عملية من مشروعك

### ✅ المواعيد (Appointments) - مُطبق بالفعل
```typescript
// في DailyAgenda.tsx
useSupabaseRealtime("appointments", {
  onEvent: () => refreshAppointments(),
  onError: (error) => toast.error("فشل في تحديث البيانات مباشرة"),
});
```

**النتيجة**: عندما تضيف السكرتيرة موعد جديد → الدكتور يشوفه فوراً! 🎉

### 🏥 المرضى (Patients)
```typescript
useSupabaseRealtime("patients", {
  onEvent: ({ event, newRecord }) => {
    if (event === "INSERT") {
      toast.success(`مريض جديد: ${newRecord.fullName}`);
    }
    refreshPatients();
  },
});
```

### 💰 المدفوعات (Payments)
```typescript
useSupabaseRealtime("payments", {
  onEvent: ({ event, newRecord }) => {
    if (event === "INSERT") {
      toast.success(`دفعة جديدة: ${newRecord.amount} جنيه`);
      playPaymentSound();
    }
  },
  eventFilter: "INSERT", // فقط المدفوعات الجديدة
});
```

### 🦷 الحالات السريرية (Clinical Cases)
```typescript
useSupabaseRealtime("clinical_cases", {
  onEvent: () => refreshCases(),
  eventFilter: ["INSERT", "UPDATE"],
});
```

---

## 🔧 إعداد Supabase Realtime

### 1. تفعيل Realtime من Supabase Dashboard
اذهب إلى: **Database → Replication** وفعّل الجداول:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
ALTER PUBLICATION supabase_realtime ADD TABLE clinical_cases;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE medical_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_schedules;
```

### 2. التحقق من التفعيل
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### 3. إعداد Row Level Security (RLS)
```sql
-- السماح للمستخدمين بقراءة المواعيد
CREATE POLICY "Users can view appointments"
ON appointments FOR SELECT
TO authenticated
USING (true);
```

---

## 🎨 المميزات التقنية

### ✅ Type Safety كامل
```typescript
// الـ newRecord ياخد الـ Type بتاع الجدول تلقائياً
useSupabaseRealtime("appointments", ({ newRecord }) => {
  if (newRecord) {
    console.log(newRecord.id);        // string ✅
    console.log(newRecord.status);    // AppointmentStatus ✅
    console.log(newRecord.date);      // string (ISO date) ✅
  }
});
```

### ✅ Cleanup تلقائي
- لما الكومبوننت يحصل له **unmount** → الـ subscription يتشال تلقائياً
- مفيش **Memory Leak**
- مفيش **duplicate channels**

### ✅ Event Filtering
```typescript
// كل الأحداث
eventFilter: "*" // أو احذفه

// حدث واحد
eventFilter: "INSERT"

// أحداث متعددة
eventFilter: ["INSERT", "UPDATE"]
```

### ✅ Enable/Disable
```typescript
const [isLive, setIsLive] = useState(true);

useSupabaseRealtime("appointments", {
  onEvent: handleEvent,
  enabled: isLive, // يمكن إيقافه مؤقتاً
});
```

---

## 📁 الملفات المحدثة

```
src/
├── hooks/
│   ├── useSupabaseRealtime.ts      ✅ الـ Hook الرئيسي (محدث)
│   └── index.ts                     ✅ التصدير (محدث)
├── lib/
│   └── supabase/
│       └── client.ts                ✅ إضافة Database type
├── features/
│   └── appointments/
│       └── components/
│           └── DailyAgenda.tsx      ✅ تطبيق عملي
└── types/
    └── database.types.ts            ✅ موجود (أنواع الجداول)

docs/
└── useSupabaseRealtime.md           ✅ توثيق كامل
```

---

## 🚨 Troubleshooting

### المشكلة: الأحداث مش بتوصل
**الحل:**
1. تأكد إن Realtime مفعل للجدول في Supabase Dashboard
2. تحقق من RLS policies
3. افتح console وشوف رسالة الاشتراك: `[useSupabaseRealtime] ✓ Subscribed to appointments`

### المشكلة: Type errors
**الحل:**
- تأكد إن اسم الجدول مكتوب صح (لازم يكون في `database.types.ts`)
- استخدم exact table name: `"appointments"` مش `"appointment"`

### المشكلة: Memory leak warnings
**الحل:**
- الـ Hook بيعمل cleanup تلقائي
- متعملش channels يدوي بره الـ Hook

---

## 💡 Best Practices

### ✅ اعلم كده
- استخدم `useCallback` للـ callback عشان تمنع re-subscriptions
- دومًا اعلم `onError` handler
- استخدم `eventFilter` عشان تقلل الـ callback calls
- Refetch من Server Actions مش من الـ payload مباشرة

### ❌ متعملش كده
- متعملش mutate للـ state مباشرة من realtime payload
- متسيبش errors من غير handling
- متعملش subscriptions في loops

---

## 📚 الملفات المرجعية

- **التوثيق الكامل**: `docs/useSupabaseRealtime.md`
- **التطبيق العملي**: `src/features/appointments/components/DailyAgenda.tsx`
- **الـ Hook**: `src/hooks/useSupabaseRealtime.ts`

---

## 🎉 جاهز للاستخدام!

الـ Hook شغال 100% ومطبق في صفحة المواعيد. 
لما السكرتيرة تضيف ميعاد → الدكتور يشوفه **فوراً** من غير Refresh! 🚀

أي استفسارات، راجع التوثيق أو اسأل مباشرة.