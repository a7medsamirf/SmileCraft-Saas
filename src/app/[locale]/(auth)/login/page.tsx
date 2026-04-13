"use client";

import { useActionState, useState } from "react";
import { useLocale } from "next-intl";
import { Mail, Lock, Eye, EyeOff, User, ArrowLeft } from "lucide-react";
import { loginAction, type LoginState } from "./loginAction";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Logo } from "@/components/SharesComponent/Logo";

function AuthStyles() {
  return (
    <style>{`
      @keyframes authFadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      @keyframes authGridPan { from { transform:translate(0,0); } to { transform:translate(60px,60px); } }
      @keyframes authFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
      @keyframes authErrIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
      .auth-fade-up { animation:authFadeUp 0.5s ease both; }
      .auth-float { animation:authFloat 3s ease-in-out infinite; }
      .auth-grid-pan { animation:authGridPan 12s linear infinite; }
      .auth-err-in { animation:authErrIn 0.3s ease both; }
    `}</style>
  );
}

const initialState: LoginState = {};

export default function LoginPage() {
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  const emailError    = state?.errors?.email?.[0];
  const passwordError = state?.errors?.password?.[0];
  const formError     = state?.errors?.form?.[0];

  return (
    <>
      <AuthStyles />

      {/* LEFT PANEL — Branding */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[48%] flex-col justify-between p-10 relative overflow-hidden bg-[#0B1525]">
        <div className="absolute inset-0 opacity-[0.035] auth-grid-pan pointer-events-none" style={{ backgroundImage: "linear-gradient(rgb(37,99,235) 1px,transparent 1px),linear-gradient(90deg,rgb(37,99,235) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full pointer-events-none" style={{ background: "radial-gradient(rgba(37,99,235,0.08) 0%,transparent 65%)" }} />
        <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: "linear-gradient(90deg,transparent,#2563EB,transparent)" }} />
        <div className="relative z-10">
          <Logo className="w-32 sm:w-40 md:w-44 lg:w-60 h-auto object-contain" />
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-400 text-[12px] font-bold">مرحباً بعودتك</span>
            </div>
            <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-4">
              عيادتك بانتظارك<br /><span className="text-blue-400">سجّل دخولك الآن</span>
            </h2>
            <p className="text-slate-500 text-[14px] font-medium leading-relaxed max-w-xs">استمر من حيث توقفت. مرضاك، مواعيدك، وتقاريرك في مكان واحد.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[{value:"+٥٠٠",label:"عيادة نشطة"},{value:"+٢٠٠ألف",label:"ملف مريض"},{value:"٩٩.٩٪",label:"وقت التشغيل"},{value:"٢٤/٧",label:"دعم فني"}].map((s) => (
              <div key={s.label} className="bg-[#0D1B2E] border border-blue-500/10 rounded-xl p-4">
                <div className="text-blue-400 text-[20px] font-black mb-0.5">{s.value}</div>
                <div className="text-slate-600 text-[11.5px] font-semibold">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div />
      </div>

      {/* RIGHT PANEL — Form */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 opacity-30 pointer-events-none" style={{ background: "radial-gradient(rgba(37,99,235,0.15) 0%,transparent 70%)" }} />
        <div className="w-full max-w-[420px] relative z-10">
          <div className="lg:hidden mb-6 text-center">
              <Logo className="w-52 sm:w-44 md:w-44 lg:w-60 h-auto object-contain" />
          </div>

          <div className="auth-fade-up bg-[#0B1525] border border-white/[0.06] rounded-2xl p-7 sm:p-8 shadow-2xl shadow-black/40">
            <div className="mb-7">
              <div className="auth-float w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
                <User className="w-[22px] h-[22px] text-blue-500" strokeWidth={2} />
              </div>
              <h1 className="text-[22px] font-black text-white mb-1.5">تسجيل الدخول</h1>
              <p className="text-[13.5px] text-slate-500 font-medium">SmileCraft CMS — نظام إدارة عيادة الأسنان</p>
            </div>

            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-[12px] font-bold text-amber-400">
                <span>تجريبي:</span><span dir="ltr">admin@smilecraft.com / password123</span>
              </div>
            </div>

            <form action={formAction} noValidate>
              <input type="hidden" name="locale" value={locale} />
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-[12px] font-bold text-slate-400 mb-2 tracking-wide">البريد الإلكتروني</label>
                  <div className="relative">
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"><Mail className="w-4 h-4" /></span>
                    <input id="email" name="email" type="email" placeholder="example@email.com" autoComplete="email" required disabled={isPending} dir="ltr"
                      className={cn("w-full rounded-xl px-4 py-3 pr-10 text-[13.5px] font-medium text-white bg-[#0D1B2E] border-[1.5px] outline-none transition-all duration-200 placeholder:text-slate-700",
                        emailError ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/10" : "border-white/[0.07] hover:border-white/[0.12] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/[0.08]",
                        isPending && "opacity-50 cursor-not-allowed")} />
                  </div>
                  {emailError && <p className="auth-err-in mt-1.5 text-[11.5px] font-medium text-red-400">{emailError}</p>}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-[12px] font-bold text-slate-400 tracking-wide">كلمة المرور</label>
                    <a href="#" className="text-[11.5px] text-blue-400 font-bold hover:underline">نسيت كلمة المرور؟</a>
                  </div>
                  <div className="relative">
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"><Lock className="w-4 h-4" /></span>
                    <input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="أدخل كلمة المرور" autoComplete="current-password" required minLength={6} disabled={isPending} dir="ltr"
                      className={cn("w-full rounded-xl px-4 py-3 pr-10 pl-12 text-[13.5px] font-medium text-white bg-[#0D1B2E] border-[1.5px] outline-none transition-all duration-200 placeholder:text-slate-700",
                        passwordError ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/10" : "border-white/[0.07] hover:border-white/[0.12] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/[0.08]",
                        isPending && "opacity-50 cursor-not-allowed")} />
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && <p className="auth-err-in mt-1.5 text-[11.5px] font-medium text-red-400">{passwordError}</p>}
                </div>

                {/* Remember me */}
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="remember" name="remember" className="w-4 h-4 rounded border-slate-700 bg-[#0D1B2E] text-blue-500 focus:ring-blue-500/30" />
                  <label htmlFor="remember" className="text-slate-500 text-[12px] font-medium cursor-pointer">تذكرني</label>
                </div>

                {formError && (
                  <div className="auth-err-in p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-[12.5px] text-red-400 text-center font-medium">{formError}</p>
                  </div>
                )}

                <button type="submit" disabled={isPending}
                  className={cn("w-full py-3.5 rounded-xl font-bold text-[14.5px] mt-1 transition-all duration-200 flex items-center justify-center gap-2.5",
                    isPending ? "bg-blue-500/30 text-blue-200/40 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600 shadow-[0_8px_28px_rgba(37,99,235,0.3)] hover:-translate-y-0.5")}>
                  {isPending ? (
                    <span className="flex items-center gap-2 text-blue-200">
                      <span className="w-4 h-4 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
                      جارٍ تسجيل الدخول...
                    </span>
                  ) : (<>تسجيل الدخول<ArrowLeft className="w-4 h-4" /></>)}
                </button>
              </div>
            </form>

            <div className="flex items-center justify-center gap-5 mt-6 flex-wrap">
              {[{icon:"🔒",text:"بيانات مشفرة"},{icon:"✓",text:"آمن ١٠٠٪"},{icon:"⚡",text:"وصول فوري"}].map(b => (
                <div key={b.text} className="flex items-center gap-1.5">
                  <span className="text-[12px]">{b.icon}</span>
                  <span className="text-[11.5px] text-slate-600 font-semibold">{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-slate-600 text-[13px] font-medium">
            لا تمتلك حساب؟{" "}<Link href="/signup" className="text-blue-400 hover:text-blue-300 font-bold">أنشئ حسابًا جديدًا</Link>
          </p>
          <p className="mt-4 text-center text-slate-700 text-[12px] font-medium">
            تواجه مشكلة في الدخول؟{" "}<a href="mailto:support@smilecraft.com" className="text-blue-400/70 hover:text-blue-400 font-bold">تواصل مع الدعم</a>
          </p>
        </div>
      </div>
    </>
  );
}
