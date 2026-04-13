# 💰 إضافة دفع كاش وطباعة الفاتورة - جدول الفواتير

## ✅ النتيجة النهائية

تم إضافة زرين جديدين لكل فاتورة في جدول الفواتير (Invoice History Table):

1. **💵 زر "دفع كاش"** - لتسجيل دفعة نقدية سريعة
2. **🖨️ زر "طباعة"** - لطباعة الفاتورة للمريض

---

## 🎯 المميزات الجديدة

### 1. زر دفع كاش (💰 Quick Cash Payment)

**المظهر:**
- زر أخضر صغير يظهر عند المرور على الصف (hover)
- أيقونة: `Wallet` 💼
- النص: "دفع"

**الوظائف:**
- يفتح نافذة منبثقة (Modal) أنيقة
- يعرض معلومات الفاتورة (المريض، الإجمالي، المدفوع، المتبقي)
- حقل إدخال المبلغ (يتحقق تلقائياً أنه لا يتجاوز المتبقي)
- حقل ملاحظات اختياري
- تحديث فوري للواجهة بعد الدفع (Optimistic UI)
- إشعار نجاح (Toast) يؤكد عملية الدفع

**التحقق من الصحة:**
- المبلغ يجب أن يكون > 0
- المبلغ يجب أن يكون ≤ الرصيد المتبقي
- التحقق من صحة الفاتورة في السيرفر
- التحقق من انتماء الفاتورة للعيادة الحالية (Multi-tenant safety)

**مثال:**
```
فاتورة بإجمالي: 1000 EGP
المدفوع:        400 EGP
المتبقي:        600 EGP

المستخدم يدخل: 600 EGP
النتيجة:
  ✅ تسجيل دفعة 600 EGP
  ✅ حالة الفاتورة تتغير إلى "خالص" (PAID)
  ✅ إشعار: "تم تسجيل دفعة 600 EGP بنجاح ✅"
```

---

### 2. زر طباعة الفاتورة (🖨️ Print Invoice)

**المظهر:**
- زر أزرق صغير يظهر عند المرور على الصف (hover)
- أيقونة: `Printer` 🖨️
- النص: "طباعة"

**الوظائف:**
- يفتح نافذة معاينة قبل الطباعة
- تصميم احترافي للفاتورة مناسب للطباعة
- معلومات العيادة (SmileCraft Dental Clinic)
- تفاصيل الفاتورة كاملة:
  - رقم الفاتورة
  - التاريخ
  - اسم المريض
  - الحالة (مسودة / خالص / دفع جزئي / إلخ)
  - الإجمالي
  - المدفوع
  - المتبقي
- زر "طباعة" يفتح نافذة الطباعة الخاصة بالمتصفح
- التصميم يتكيف مع الورق (Print-friendly CSS)

**مثال للفاتورة المطبوعة:**
```
╔══════════════════════════════════════════╗
║   SmileCraft Dental Clinic              ║
║           فاتورة طبية                    ║
╠══════════════════════════════════════════╣
║ رقم الفاتورة: #A1B2C3D                   ║
║ التاريخ: 11 أبريل 2026                   ║
║ المريض: أحمد محمد                         ║
║ الحالة: خالص ✅                           ║
╠══════════════════════════════════════════╣
║ البيان              │ المبلغ              ║
╠════════════════════╪═════════════════════╣
║ إجمالي الفاتورة     │ 1,000 EGP           ║
║ المدفوع            │ 1,000 EGP           ║
║ المتبقي            │ 0 EGP               ║
╠════════════════════╪═════════════════════╣
║ صافي الدفع         │ 1,000 EGP           ║
╚════════════════════╧═════════════════════╝

SmileCraft Dental Clinic — شكراً لثقتكم بنا
```

---

## 📁 الملفات المحدثة

### 1. ملفات جديدة

| الملف | الوصف |
|------|-------|
| `src/features/finance/components/QuickPaymentModal.tsx` | نافذة الدفع النقدي |
| `src/features/finance/components/InvoicePrintModal.tsx` | نافذة طباعة الفاتورة |

### 2. ملفات محدثة

| الملف | التغيير |
|------|---------|
| `src/features/finance/serverActions.ts` | إضافة `quickCashPaymentAction` |
| `src/features/finance/components/InvoiceHistoryTable.tsx` | إضافة الأزرار والنوافذ |
| `src/features/finance/index.ts` | تصدير المكونات الجديدة |

---

## 🔧 التفاصيل التقنية

### Server Action: `quickCashPaymentAction`

```typescript
export async function quickCashPaymentAction(payload: {
  invoiceId: string;
  amount: number;
  notes?: string;
}): Promise<{ success: boolean; payment: any; invoice: any }>
```

**المميزات:**
- ✅ التحقق من صحة البيانات باستخدام Zod
- ✅ التحقق من انتماء الفاتورة للعيادة (Multi-tenant safety)
- ✅ التحقق من أن المبلغ لا يتجاوز المتبقي
- ✅ معاملة واحدة (Transaction) لضمان سلامة البيانات:
  1. إنشاء سجل الدفع (Payment)
  2. تحديث المبلغ المدفوع (Invoice.paidAmount)
  3. تحديث حالة الفاتورة (Invoice.status)
- ✅ إعادة التحقق من المسار (revalidatePath) لتحديث الواجهة

**الحالات:**
```
if (totalPaid >= totalAmount) → status = "PAID"
if (totalPaid > 0 && < totalAmount) → status = "PARTIAL"
if (totalPaid === 0) → status = "DRAFT"
```

---

### QuickPaymentModal Component

**State Management:**
```typescript
const [amount, setAmount] = useState<string>(invoice.balance.toFixed(0));
const [notes, setNotes] = useState<string>("");
const [isPending, startTransition] = useTransition();
```

**Validation:**
```typescript
const isValid = enteredAmount > 0 && enteredAmount <= remainingBalance;
```

**Optimistic Update:**
```typescript
const handlePaymentSuccess = (updatedInvoice: Invoice) => {
  setInvoices((prev) =>
    prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv))
  );
};
```

---

### InvoicePrintModal Component

**Print Logic:**
```typescript
const handlePrint = () => {
  const printWindow = window.open("", "_blank");
  printWindow.document.write(/* Full HTML invoice */);
  printWindow.document.close();
  // Auto-print on load
  window.onload = function() { window.print(); };
};
```

**Print Styles:**
- CSS مخصص للطباعة (`@media print`)
- إخفاء العناصر غير الضرورية (`.no-print { display: none; }`)
- تنسيق احترافي للورق

---

## 🎨 التصميم

### الأزرار في الجدول

**Before:**
```
| #INV-001 | أحمد | 2026-04-11 | خالص | 1000 | 1000 | 0 |
```

**After:**
```
| #INV-001 | أحمد | 2026-04-11 | خالص | 1000 | 1000 | 0 | [💵 دفع] [🖨️ طباعة] |
```

**Behavior:**
- الأزرار تظهر فقط عند المرور على الصف (`opacity-0 group-hover:opacity-100`)
- زر "دفع" يظهر فقط لو فيه رصيد متبقي (`invoice.balance > 0`)
- زر "طباعة" يظهر دائماً

---

## 🧪 سيناريوهات الاستخدام

### ✅ Scenario 1: دفع كامل المبلغ

```
1. افتح صفحة Billing
2. ابحث عن فاتورة بها رصيد متبقي
3. مرر الماوس على الصف → يظهر زري "دفع" و "طباعة"
4. اضغط "دفع"
5. النافذة المنبثقة تفتح:
   - المبلغ معبأ تلقائياً (المتبقي)
   - اضغط "تأكيد الدفع"
6. النتيجة:
   ✅ إشعار: "تم تسجيل دفعة XXX EGP بنجاح ✅"
   ✅ حالة الفاتورة تتغير إلى "خالص"
   ✅ الرصيد يصبح 0
```

### ✅ Scenario 2: دفع جزئي

```
1. فاتورة بإجمالي 1000 EGP، مدفوع 400 EGP، متبقي 600 EGP
2. اضغط "دفع"
3. غيّر المبلغ إلى 300 EGP
4. اضغط "تأكيد الدفع"
5. النتيجة:
   ✅ تسجيل دفعة 300 EGP
   ✅ المدفوع الجديد: 700 EGP
   ✅ المتبقي الجديد: 300 EGP
   ✅ الحالة: "دفع جزئي"
```

### ✅ Scenario 3: طباعة الفاتورة

```
1. افتح صفحة Billing
2. مرر الماوس على أي صف
3. اضغط "طباعة"
4. نافذة المعاينة تفتح بتصميم احترافي
5. اضغط زر "طباعة" في النافذة
6. المتصفح يفتح نافذة الطباعة
7. اختر الطابعة واضغط "Print"
```

### ✅ Scenario 4: محاولة دفع مبلغ أكبر من المتبقي

```
1. فاتورة متبقي 500 EGP
2. اضغط "دفع"
3. أدخل 600 EGP
4. النتيجة:
   ❌ رسالة خطأ: "المبلغ أكبر من الرصيد المتبقي"
   ❌ الزر "تأكيد الدفع" معطل (disabled)
```

---

## 🔐 الأمان

### Multi-Tenant Isolation
```typescript
// التحقق من انتماء الفاتورة للعيادة
const invoice = await prisma.invoice.findFirst({
  where: {
    id: payload.invoiceId,
    patients: { clinicId }  // ✅ Clinic scoping
  }
});
```

### Server-Side Validation
```typescript
const validation = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  notes: z.string().optional(),
}).safeParse(payload);
```

### Balance Check
```typescript
const balance = Number(invoice.totalAmount) - Number(invoice.paidAmount);
if (payload.amount > balance) {
  throw new Error("Payment amount exceeds remaining balance");
}
```

---

## 📊 التحديث التلقائي للواجهة

### Optimistic UI Update Flow

```
1. User clicks "دفع" → Modal opens
2. User enters amount → Clicks "تأكيد"
3. UI instantly updates (optimistic):
   - Invoice paidAmount increases
   - Balance decreases
   - Status updates if fully paid
4. Server Action runs in background
5. On success: Toast notification confirms
6. On error: Revert + show error message
```

### Cache Revalidation
```typescript
revalidatePath("/dashboard/billing");
revalidatePath("/dashboard/finance");
```

---

## 🚀 خطوات الاستخدام

### 1. افتح صفحة الحسابات
```
http://localhost:3000/ar/billing
```

### 2. ابحث عن الفاتورة
- استخدم حقل البحث للبحث برقم الفاتورة أو اسم المريض
- أو مرر في الجدول للعثور على الفاتورة

### 3. سجّل دفعة
- مرر الماوس على الصف
- اضغط زر "دفع" الأخضر
- أدخل المبلغ (أو اتركه معبأ تلقائياً)
- اضغط "تأكيد الدفع"

### 4. اطبع الفاتورة
- مرر الماوس على الصف
- اضغط زر "طباعة" الأزرق
- في نافذة المعاينة، اضغط "طباعة"
- اختر الطابعة

---

## ✅ Checklist الاختبار

- [x] TypeScript compilation passes
- [x] Production build succeeds
- [x] زر "دفع" يظهر فقط للفواتير ذات الرصيد المتبقي
- [x] زر "طباعة" يظهر لكل الفواتير
- [x] التحقق من المبلغ يعمل (Client + Server)
- [x] حالة الفاتورة تتحدث تلقائياً بعد الدفع الكامل
- [x] الإشعارات تظهر بشكل صحيح
- [x] الطباعة تعمل في المتصفح
- [x] التصميم احترافي للفاتورة المطبوعة
- [x] Multi-tenant safety (Clinic scoping)

---

## 🎯 الفوائد

### ✅ للمستخدمين
- سرعة تسجيل المدفوعات
- توفير الوقت في الطباعة
- واجهة سهلة الاستخدام
- تحديث فوري للبيانات

### ✅ للنظام
- أمان عالي (Server-side validation)
- معاملات آمنة (Transactions)
- عزل تام بين العيادات
- تحديث تلقائي للـ Cache

### ✅ للمرضى
- فواتير مطبوعة احترافية
- شفافие في المدفوعات
- إمكانية الدفع على دفعات

---

## 📚 الملفات المرجعية

- **Server Action:** `src/features/finance/serverActions.ts` (lines 476-567)
- **Payment Modal:** `src/features/finance/components/QuickPaymentModal.tsx`
- **Print Modal:** `src/features/finance/components/InvoicePrintModal.tsx`
- **Invoice Table:** `src/features/finance/components/InvoiceHistoryTable.tsx`
- **Types:** `src/features/finance/types/index.ts`

---

**الحالة:** ✅ جاهز للاستخدام  
**التاريخ:** 11 أبريل 2026  
**الإصدار:** v1.0
