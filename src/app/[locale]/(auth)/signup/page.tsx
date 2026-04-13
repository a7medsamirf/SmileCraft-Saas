"use client";

// =============================================================================
// SmileCraft CMS — Signup Page
// Same split-screen dark design — replaced react-hook-form with useActionState.
// =============================================================================

import { useActionState, useState } from "react";
import { useLocale } from "next-intl";
import {
  Building2, User, Phone, Mail, Lock,
  Eye, EyeOff, ArrowLeft, GitBranch,
  Stethoscope, CalendarPlus, BarChart3, ShieldCheck,
} from "lucide-react";
import { signupAction, type SignupState } from "./signupAction";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Logo } from "@/components/SharesComponent/Logo";

// ─── Keyframe animations ─────────────────────────────────────────────────────
function AuthStyles() {
  return (
    <style>{`
      @keyframes authFadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      @keyframes authGridPan { from{transform:translate(0,0)} to{transform:translate(60px,60px)} }
      @keyframes authFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      @keyframes authErrIn   { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      .auth-fade-up  { animation:authFadeUp  0.5s ease both; }
      .auth-float    { animation:authFloat   3s ease-in-out infinite; }
      .auth-grid-pan { animation:authGridPan 12s linear infinite; }
      .auth-err-in   { animation:authErrIn   0.3s ease both; }
    `}</style>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="auth-err-in mt-1.5 text-[11.5px] text-red-400 font-medium">{msg}</p>;
}

const INPUT_BASE =
  "w-full rounded-xl px-4 py-3 pr-10 text-[13.5px] font-medium text-white " +
  "bg-[#0D1B2E] border-[1.5px] outline-none transition-all duration-200 placeholder:text-slate-700";
const INPUT_OK  = "border-white/[0.07] hover:border-white/[0.12] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/[0.08]";
const INPUT_ERR = "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/10";

const initialState: SignupState = {};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState(signupAction, initialState);
  const [showPw,  setShowPw]  = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  const e = state?.errors ?? {};

  return (
    <>
      <AuthStyles />

      {/* ══════ LEFT PANEL ══════ */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[48%] flex-col justify-between p-10 relative overflow-hidden bg-[#0B1525]">
        <div className="absolute inset-0 opacity-[0.035] auth-grid-pan pointer-events-none"
          style={{ backgroundImage: "linear-gradient(rgb(37,99,235) 1px,transparent 1px),linear-gradient(90deg,rgb(37,99,235) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(rgba(37,99,235,0.08) 0%,transparent 65%)" }} />
        <div className="absolute top-0 inset-x-0 h-[2px]"
          style={{ background: "linear-gradient(90deg,transparent,#2563EB,transparent)" }} />

        <div className="relative z-10">
          <Logo className="w-32 sm:w-40 md:w-44 lg:w-60 h-auto object-contain" />
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-400 text-[12px] font-bold">١٤ يوم تجربة مجانية</span>
            </div>
            <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-4">
              أدِر عيادتك<br /><span className="text-blue-400">بكل احترافية</span>
            </h2>
            <p className="text-slate-500 text-[14px] font-medium leading-relaxed max-w-xs">
              انضم لأكثر من ٥٠٠ عيادة أسنان تثق بـ SmileCraft لإدارة مرضاها ومواعيدها وتقاريرها.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: <Stethoscope className="w-4 h-4 text-blue-400" />, text: "ملفات طبية شاملة لكل مريض" },
              { icon: <CalendarPlus className="w-4 h-4 text-blue-400" />, text: "جدولة مواعيد وتذكيرات تلقائية" },
              { icon: <BarChart3    className="w-4 h-4 text-blue-400" />, text: "تقارير وتحليلات الإيرادات" },
              { icon: <ShieldCheck  className="w-4 h-4 text-blue-400" />, text: "بياناتك محمية بتشفير كامل" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center shrink-0">
                  {f.icon}
                </div>
                <span className="text-slate-400 text-[13.5px] font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div />
      </div>

      {/* ══════ RIGHT PANEL ══════ */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12 relative overflow-y-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(rgba(37,99,235,0.15) 0%,transparent 70%)" }} />

        <div className="w-full max-w-[460px] relative z-10 py-8">
          <div className="lg:hidden mb-6 text-center">
            <Logo className="w-52 sm:w-44 md:w-44 lg:w-60 h-auto object-contain" />
          </div>

          <div className="auth-fade-up bg-[#0B1525] border border-white/[0.06] rounded-2xl p-7 sm:p-8 shadow-2xl shadow-black/40">

            {/* Header */}
            <div className="mb-7">
              <h1 className="text-[22px] font-black text-white mb-1.5">إنشاء حساب جديد</h1>
              <p className="text-[13.5px] text-slate-500 font-medium">
                لديك حساب بالفعل؟{" "}
                <Link href="/login" className="text-blue-400 font-bold hover:underline transition-colors">
                  تسجيل الدخول
                </Link>
              </p>
            </div>

            {/* ── Form ── */}
            <form action={formAction} noValidate>
              <input type="hidden" name="locale" value={locale} />

              <div className="space-y-4">

                {/* Clinic Name */}
                <div>
                  <label htmlFor="clinicName" className="block text-[12px] font-bold text-slate-400 mb-2 tracking-wide">اسم العيادة</label>
                  <div className="relative">
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"><Building2 className="w-4 h-4" /></span>
                    <input id="clinicName" name="clinicName" type="text" placeholder="مثال: عيادة SmileCraft للأسنان"
                      disabled={isPending}
                      className={cn(INPUT_BASE, e.clinicName ? INPUT_ERR : INPUT_OK, isPending && "opacity-50 cursor-not-allowed")} />
                  </div>
                  <FieldError msg={e.clinicName?.[0]} />
                </div>

                {/* Branch Name (Optional) */}
                <div>
                  <label htmlFor="branchName" className="block text-[12px] font-bold text-slate-400 mb-2 tracking-wide">
                    اسم الفرع <span className="text-slate-600 font-normal">(اختياري - الفرع الرئيسي سيتم إنشاؤه تلقائياً)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"><GitBranch className="w-4 h-4" /></span>
                    <input id="branchName" name="branchName" type="text" placeholder="مثال: فرع التحرير"
                      disabled={isPending}
                      className={cn(INPUT_BASE, e.branchName ? INPUT_ERR : INPUT_OK, isPending && "opacity-50 cursor-not-allowed")} />
                  </div>
                  <FieldError msg={e.branchName?.[0]} />
                </div>

                {/* Doctor Name */}
                <div>
                  <label htmlFor="doctorName" className="block text-[12px] font-bold text-slate-400 mb-2 tracking-wide">اسم الطبيب</label>
                  <div className="relative">
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"><User className="w-4 h-4" /></span>
                    <input id="doctorName" name="doctorName" type="text" placeholder="مثال: د. أحمد سمير"
                      disabled={isPending}
                      className={cn(INPUT_BASE, e.doctorName ? INPUT_ERR : INPUT_OK, isPending && "opacity-50 cursor-not-allowed")} />
                  </div>
                  <FieldError msg={e.doctorName?.[0]} />
                </div>

                {/* Phone + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-[12px] font-bold text-slate-400 mb-2 tracking-wide">رقم الهاتف</label>
                    <div className="relative">
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"><Phone className="w-4 h-4" /></span>
                      <input id="phone" name="phone" type="text" dir="ltr" placeholder="010-XXXX-XXXX"
                        disabled={isPending}
                        className={cn(INPUT_BASE, e.phone ? INPUT_ERR : INPUT_OK, isPending && "opacity-50 cursor-not-allowed")} />
                    </div>
                    <FieldError msg={e.phone?.[0]} />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-[12px] font-bold text-slate-400 mb-2 tracking-wide">البريد الإلكتروني</label>
                    <div className="relative">
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"><Mail className="w-4 h-4" /></span>
                      <input id="email" name="email" type="email" dir="ltr" placeholder="example@email.com" autoComplete="email"
                        disabled={isPending}
                        className={cn(INPUT_BASE, e.email ? INPUT_ERR : INPUT_OK, isPending && "opacity-50 cursor-not-allowed")} />
                    </div>
                    <FieldError msg={e.email?.[0]} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-[12px] font-bold text-slate-400 mb-2 tracking-wide">كلمة المرور</label>
                  <div className="relative">
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"><Lock className="w-4 h-4" /></span>
                    <input id="password" name="password" type={showPw ? "text" : "password"} dir="ltr"
                      placeholder="٨ أحرف على الأقل" autoComplete="new-password"
                      disabled={isPending}
                      className={cn(INPUT_BASE, "pl-12", e.password ? INPUT_ERR : INPUT_OK, isPending && "opacity-50 cursor-not-allowed")} />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FieldError msg={e.password?.[0]} />
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-[12px] font-bold text-slate-400 mb-2 tracking-wide">تأكيد كلمة المرور</label>
                  <div className="relative">
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"><Lock className="w-4 h-4" /></span>
                    <input id="confirmPassword" name="confirmPassword" type={showCpw ? "text" : "password"} dir="ltr"
                      placeholder="أعد كتابة كلمة المرور" autoComplete="new-password"
                      disabled={isPending}
                      className={cn(INPUT_BASE, "pl-12", e.confirmPassword ? INPUT_ERR : INPUT_OK, isPending && "opacity-50 cursor-not-allowed")} />
                    <button type="button" tabIndex={-1} onClick={() => setShowCpw(v => !v)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                      {showCpw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FieldError msg={e.confirmPassword?.[0]} />
                </div>

                {/* Form-level error */}
                {e.form?.[0] && (
                  <div className="auth-err-in p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-[12.5px] text-red-400 text-center font-medium">{e.form[0]}</p>
                  </div>
                )}

                {/* Success — email confirmation required */}
                {state?.successMessage && (
                  <div className="auth-err-in p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[12.5px] text-emerald-400 text-center font-medium flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      {state.successMessage}
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={isPending || !!state?.successMessage}
                  className={cn(
                    "w-full py-3.5 rounded-xl font-bold text-[14.5px] mt-1 transition-all duration-200 flex items-center justify-center gap-2.5",
                    isPending || state?.successMessage
                      ? "bg-blue-500/30 text-blue-200/40 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600 shadow-[0_8px_28px_rgba(37,99,235,0.3)] hover:-translate-y-0.5"
                  )}>
                  {isPending ? (
                    <span className="flex items-center gap-2 text-blue-200">
                      <span className="w-4 h-4 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
                      جارٍ إنشاء الحساب...
                    </span>
                  ) : (<>إنشاء حساب<ArrowLeft className="w-4 h-4" /></>)}
                </button>
              </div>
            </form>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 flex-wrap mt-6">
              {[{icon:"🔒",text:"بيانات مشفرة"},{icon:"✓",text:"بدون بطاقة"},{icon:"⚡",text:"30 يوم مجاناً"}].map(b => (
                <div key={b.text} className="flex items-center gap-1.5">
                  <span className="text-[12px]">{b.icon}</span>
                  <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-slate-700 text-[11.5px] font-medium mt-6">
            بالتسجيل، أنت توافق على{" "}
            <a href="#" className="text-blue-500/60 hover:text-blue-400 font-bold underline">شروط الخدمة</a>
            {" "}و{" "}
            <a href="#" className="text-blue-500/60 hover:text-blue-400 font-bold underline">سياسة الخصوصية</a>
          </p>
        </div>
      </div>
    </>
  );
}
