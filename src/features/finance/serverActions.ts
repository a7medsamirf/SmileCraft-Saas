"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { InvoiceStatus, PaymentMethod, PaymentType } from "./types";
import { z } from "zod";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";

// Validation schemas
const paymentSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID format"),
  amount: z.number().positive("Payment amount must be greater than 0"),
  method: z.enum(["CASH", "CARD", "WALLET", "BANK_TRANSFER", "INSURANCE"]),
  notes: z.string().max(500).optional(),
});

const invoiceFromCaseSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID format"),
  amount: z.number().positive("Invoice amount must be greater than 0"),
  procedure: z.string().min(1, "Procedure is required"),
  notes: z.string().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// Auth helper — returns clinicId, branchId and role (never throws)
// ---------------------------------------------------------------------------
async function getAuthContext(): Promise<{ 
  clinicId: string | null; 
  branchId: string | null; 
  role: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { clinicId: null, branchId: null, role: null };

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clinicId: true, branchId: true, role: true },
    });

    return {
      clinicId: dbUser?.clinicId ?? null,
      branchId: dbUser?.branchId ?? null,
      role: dbUser?.role ?? null,
    };
  } catch {
    return { clinicId: null, branchId: null, role: null };
  }
}

export async function getInvoicesAction(patientId?: string) {
  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) return [];

  const where: any = { clinicId };
  if (patientId) where.patientId = patientId;
  
  // Filter by branch if user has a branch selected AND is not ADMIN
  if (role !== "ADMIN" && branchId) {
    where.branchId = branchId;
  }

  const invoices = await prisma.invoices.findMany({
    where,
    include: {
      patients: {
        select: { fullName: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return invoices.map(inv => ({
    id: inv.id,
    patientId: inv.patientId,
    patientName: inv.patients.fullName,
    totalAmount: Number(inv.totalAmount),
    paidAmount: Number(inv.paidAmount),
    balance: Number(inv.totalAmount) - Number(inv.paidAmount),
    status: inv.status as InvoiceStatus,
    createdAt: inv.createdAt.toISOString()
  }));
}

export async function createPaymentAction(payload: {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  notes?: string;
}) {
  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) throw new Error("Clinic not configured");

  // Check rate limit (20 creates per minute)
  const rateLimit = await checkRateLimit("createPayment", RATE_LIMITS.MUTATION_CREATE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  // Server-side validation
  const validation = paymentSchema.safeParse(payload);
  if (!validation.success) {
    throw new Error(`Invalid payment data: ${validation.error.flatten().formErrors.join(", ")}`);
  }

  // 1. Verify invoice belongs to clinic and branch (if not admin)
  const invoiceWhere: any = { id: payload.invoiceId, clinicId };
  if (role !== "ADMIN" && branchId) {
    invoiceWhere.branchId = branchId;
  }

  const invoice = await prisma.invoices.findFirst({
    where: invoiceWhere
  });

  if (!invoice) throw new Error("Invoice not found");

  // 2. Create payment and update invoice in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payments.create({
      data: {
        id: crypto.randomUUID(),
        patientId: invoice.patientId,
        clinicId,
        branchId: invoice.branchId, // Link to same branch as invoice
        amount: payload.amount,
        method: payload.method as PaymentMethod,
        type: PaymentType.PAYMENT,
        notes: payload.notes,
        reference: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    const updatedInvoice = await tx.invoices.update({
      where: { id: payload.invoiceId },
      data: {
        paidAmount: {
          increment: payload.amount
        }
      }
    });

    // 3. Update invoice status based on new balance
    const totalPaid = Number(updatedInvoice.paidAmount);
    const totalAmount = Number(updatedInvoice.totalAmount);
    let newStatus: InvoiceStatus = InvoiceStatus.PARTIAL;
    if (totalPaid >= totalAmount) newStatus = InvoiceStatus.PAID;
    if (totalPaid === 0) newStatus = InvoiceStatus.DRAFT;

    const finalInvoice = await tx.invoices.update({
      where: { id: payload.invoiceId },
      data: { status: newStatus }
    });

    return { payment, invoice: finalInvoice };
  });

  // Revalidate only the specific paths that use invoice data
  revalidatePath("/dashboard/billing", "page");
  revalidatePath("/dashboard/finance", "page");

  // Audit log
  await auditCreate("payment", result.payment.id, {
    invoiceId: payload.invoiceId,
    amount: payload.amount,
    method: payload.method,
  });

  return result.payment;
}

export async function getFinanceStatsAction() {
  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) {
    return {
      dailyRevenue: 0,
      totalOutstanding: 0,
      monthlyTotal: 0,
      monthlyPaid: 0,
      monthlyInvoiceCount: 0,
      growthPercentage: 0,
      averageVisit: 0
    };
  }

  // Use local timezone consistently
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const wherePayments: any = { clinicId, type: "PAYMENT" };
  const whereInvoices: any = { clinicId };

  if (role !== "ADMIN" && branchId) {
    wherePayments.branchId = branchId;
    whereInvoices.branchId = branchId;
  }

  const [dailyRevenue, totalOutstanding, monthlyStats] = await Promise.all([
    // Daily revenue: payments created today
    prisma.payments.aggregate({
      where: {
        ...wherePayments,
        createdAt: { gte: startOfDay },
      },
      _sum: { amount: true }
    }),
    // Outstanding: unpaid invoices
    prisma.invoices.aggregate({
      where: {
        ...whereInvoices,
        status: { notIn: ["PAID", "CANCELLED"] }
      },
      _sum: {
        totalAmount: true,
        paidAmount: true
      }
    }),
    // Monthly stats
    prisma.invoices.aggregate({
      where: {
        ...whereInvoices,
        createdAt: { gte: startOfMonth }
      },
      _sum: {
        totalAmount: true,
        paidAmount: true
      },
      _count: true
    })
  ]);

  // Previous month for comparison
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);

  const prevMonthStats = await prisma.invoices.aggregate({
    where: {
      ...whereInvoices,
      createdAt: {
        gte: prevMonthStart,
        lt: startOfMonth
      }
    },
    _sum: {
      totalAmount: true
    }
  });

  const monthlyTotal = Number(monthlyStats._sum.totalAmount || 0);
  const prevMonthlyTotal = Number(prevMonthStats._sum.totalAmount || 0);
  const growthPercentage = prevMonthlyTotal > 0
    ? ((monthlyTotal - prevMonthlyTotal) / prevMonthlyTotal) * 100 
    : 0;

  const monthlyPaid = Number(monthlyStats._sum.paidAmount || 0);
  const averageVisit = monthlyStats._count > 0 ? monthlyPaid / monthlyStats._count : 0;

  return {
    dailyRevenue: Number(dailyRevenue._sum.amount || 0),
    totalOutstanding: Number(totalOutstanding._sum.totalAmount || 0) - Number(totalOutstanding._sum.paidAmount || 0),
    monthlyTotal,
    monthlyPaid,
    monthlyInvoiceCount: monthlyStats._count,
    growthPercentage: Math.round(growthPercentage * 100) / 100,
    averageVisit: Math.round(averageVisit * 100) / 100
  };
}

export async function createInvoiceFromCaseAction(payload: {
  patientId: string;
  amount: number;
  procedure: string;
  notes?: string;
}) {
  const { clinicId, branchId } = await getAuthContext();
  if (!clinicId) throw new Error("Clinic not configured");

  // Check rate limit (20 creates per minute)
  const rateLimit = await checkRateLimit("createInvoice", RATE_LIMITS.MUTATION_CREATE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  // Server-side validation
  const validation = invoiceFromCaseSchema.safeParse(payload);
  if (!validation.success) {
    throw new Error(`Invalid invoice data: ${validation.error.flatten().formErrors.join(", ")}`);
  }

  try {
    const invoice = await prisma.invoices.create({
      data: {
        id: crypto.randomUUID(),
        clinicId,
        branchId: branchId || null,
        patientId: payload.patientId,
        invoiceNumber: `INV-${Date.now()}`,
        totalAmount: payload.amount,
        paidAmount: 0,
        status: "DRAFT",
        notes: payload.notes || `Generated from procedure: ${payload.procedure}`,
        dueDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create invoice items separately
    await prisma.invoice_items.create({
      data: {
        id: crypto.randomUUID(),
        invoiceId: invoice.id,
        description: payload.procedure,
        unitPrice: payload.amount,
        total: payload.amount,
        quantity: 1,
        treatmentId: null,
      }
    });

    // Revalidate only the specific paths that use invoice data
    revalidatePath("/dashboard/billing", "page");
    revalidatePath("/dashboard/finance", "page");

    // Audit log
    await auditCreate("invoice", invoice.id, {
      patientId: payload.patientId,
      amount: payload.amount,
      procedure: payload.procedure,
    });

    return { success: true, invoiceId: invoice.id };
  } catch (err) {
    throw new Error(`Failed to create invoice: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

export async function getMonthlyRevenueDataAction() {
  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) return [];

  const now = new Date();
  const months = [];
  
  // Get last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      start: new Date(date.getFullYear(), date.getMonth(), 1),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
      label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    });
  }

  const where: any = { clinicId, status: { not: 'CANCELLED' } };
  if (role !== "ADMIN" && branchId) {
    where.branchId = branchId;
  }

  const revenueData = await Promise.all(
    months.map(async (month) => {
      const result = await prisma.invoices.aggregate({
        where: {
          ...where,
          createdAt: {
            gte: month.start,
            lt: month.end
          }
        },
        _sum: {
          paidAmount: true,
          totalAmount: true
        },
        _count: true
      });

      return {
        month: month.label,
        revenue: Number(result._sum.paidAmount || 0),
        totalInvoiced: Number(result._sum.totalAmount || 0),
        invoiceCount: result._count
      };
    })
  );

  return revenueData;
}

export async function getTopProceduresAction() {
  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) return [];

  const invoiceWhere: any = { clinicId };
  if (role !== "ADMIN" && branchId) {
    invoiceWhere.branchId = branchId;
  }

  // Get all invoice items with their treatments
  const invoiceItems = await prisma.invoice_items.findMany({
    where: {
      invoices: {
        ...invoiceWhere
      },
      treatmentId: {
        not: null
      }
    },
    include: {
      treatments: {
        select: {
          procedureName: true,
          procedureType: true
        }
      }
    },
    orderBy: {
      total: 'desc'
    },
    take: 100
  });

  // Aggregate by procedure type
  const procedureMap = new Map<string, { name: string, count: number, revenue: number }>();

  for (const item of invoiceItems) {
    if (!item.treatments) continue;

    const key = item.treatments.procedureType;
    const existing = procedureMap.get(key);

    if (existing) {
      existing.count += 1;
      existing.revenue += Number(item.total);
    } else {
      procedureMap.set(key, {
        name: item.treatments.procedureName,
        count: 1,
        revenue: Number(item.total)
      });
    }
  }

  // Convert to array and sort by revenue
  const topProcedures = Array.from(procedureMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return topProcedures;
}

export async function getTodayPaymentsAction(): Promise<{
  id: string;
  patientId: string;
  patientName: string;
  amount: number;
  method: string;
  notes: string | null;
  createdAt: string;
}[]> {
  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) return [];

  // Use local timezone consistently
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const where: any = { clinicId, type: "PAYMENT" };
  if (role !== "ADMIN" && branchId) {
    where.branchId = branchId;
  }

  const payments = await prisma.payments.findMany({
    where: {
      ...where,
      createdAt: { gte: startOfDay, lte: endOfDay }
    },
    include: {
      patients: { select: { fullName: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return payments.map((p) => ({
    id: p.id,
    patientId: p.patientId,
    patientName: p.patients.fullName,
    amount: Number(p.amount),
    method: p.method,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function getWeeklyRevenueDataAction() {
  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) {
    return {
      days: [],
      totalWeekly: 0,
      growthPercentage: 0
    };
  }

  const now = new Date();
  const days = [];

  // Get last 7 days (including today)
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayName = date.toLocaleDateString('ar-EG', { weekday: 'short' });

    days.push({
      start: date,
      end: nextDate,
      label: dayName,
      date: date.toISOString()
    });
  }

  const where: any = { clinicId, type: 'PAYMENT' };
  if (role !== "ADMIN" && branchId) {
    where.branchId = branchId;
  }

  const revenueData = await Promise.all(
    days.map(async (day) => {
      const result = await prisma.payments.aggregate({
        where: {
          ...where,
          createdAt: {
            gte: day.start,
            lt: day.end
          }
        },
        _sum: {
          amount: true
        },
        _count: true
      });

      return {
        day: day.label,
        date: day.date,
        revenue: Number(result._sum.amount || 0),
        transactionCount: result._count
      };
    })
  );

  // Calculate previous week's total for growth percentage
  const prevWeekStart = new Date(now);
  prevWeekStart.setDate(prevWeekStart.getDate() - 13);
  prevWeekStart.setHours(0, 0, 0, 0);

  const prevWeekEnd = new Date(prevWeekStart);
  prevWeekEnd.setDate(prevWeekEnd.getDate() + 7);

  const prevWeekStats = await prisma.payments.aggregate({
    where: {
      ...where,
      createdAt: {
        gte: prevWeekStart,
        lt: prevWeekEnd
      }
    },
    _sum: {
      amount: true
    }
  });

  const currentWeekTotal = revenueData.reduce((sum, day) => sum + day.revenue, 0);
  const prevWeekTotal = Number(prevWeekStats._sum.amount || 0);
  const growthPercentage = prevWeekTotal > 0
    ? ((currentWeekTotal - prevWeekTotal) / prevWeekTotal) * 100
    : 0;

  return {
    days: revenueData,
    totalWeekly: currentWeekTotal,
    growthPercentage: Math.round(growthPercentage * 100) / 100
  };
}

export async function quickCashPaymentAction(payload: {
  invoiceId: string;
  amount: number;
  notes?: string;
}): Promise<{ success: boolean; payment: any; invoice: any }> {
  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) throw new Error("Clinic not configured");

  // Server-side validation
  const validation = z.object({
    invoiceId: z.string().uuid(),
    amount: z.number().positive(),
    notes: z.string().optional(),
  }).safeParse(payload);

  if (!validation.success) {
    throw new Error("Invalid payment data");
  }

  // 1. Verify invoice belongs to clinic and branch
  const invoiceWhere: any = { id: payload.invoiceId, clinicId };
  if (role !== "ADMIN" && branchId) {
    invoiceWhere.branchId = branchId;
  }

  const invoice = await prisma.invoices.findFirst({
    where: invoiceWhere,
    include: {
      patients: { select: { fullName: true } }
    }
  });

  if (!invoice) throw new Error("Invoice not found");

  const balance = Number(invoice.totalAmount) - Number(invoice.paidAmount);
  if (payload.amount > balance) {
    throw new Error("Payment amount exceeds remaining balance");
  }

  // 2. Transaction: create payment + update invoice
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payments.create({
      data: {
        id: crypto.randomUUID(),
        clinicId,
        branchId: invoice.branchId,
        patientId: invoice.patientId,
        amount: payload.amount,
        method: PaymentMethod.CASH,
        type: PaymentType.PAYMENT,
        notes: payload.notes || "Cash payment",
        reference: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    const updatedInvoice = await tx.invoices.update({
      where: { id: payload.invoiceId },
      data: { paidAmount: { increment: payload.amount } }
    });

    // Update status
    const totalPaid = Number(updatedInvoice.paidAmount);
    const totalAmount = Number(updatedInvoice.totalAmount);
    let newStatus = InvoiceStatus.PARTIAL;
    if (totalPaid >= totalAmount) newStatus = InvoiceStatus.PAID;

    const finalInvoice = await tx.invoices.update({
      where: { id: payload.invoiceId },
      data: { status: newStatus }
    });

    return {
      payment: {
        id: payment.id,
        patientId: payment.patientId,
        amount: Number(payment.amount),
        method: payment.method,
        type: payment.type,
        notes: payment.notes,
        reference: payment.reference,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
      },
      invoice: {
        id: finalInvoice.id,
        patientId: finalInvoice.patientId,
        patientName: invoice.patients.fullName,
        totalAmount: Number(finalInvoice.totalAmount),
        paidAmount: Number(finalInvoice.paidAmount),
        balance: Number(finalInvoice.totalAmount) - Number(finalInvoice.paidAmount),
        status: finalInvoice.status as InvoiceStatus,
        createdAt: finalInvoice.createdAt.toISOString(),
        updatedAt: finalInvoice.updatedAt.toISOString(),
      }
    };
  });

  // Revalidate only the specific paths that use invoice data
  revalidatePath("/dashboard/billing", "page");
  revalidatePath("/dashboard/finance", "page");

  return { success: true, payment: result.payment, invoice: result.invoice };
}
