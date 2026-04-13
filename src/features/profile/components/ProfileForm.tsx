"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { 
  User, Phone, Mail, Lock, Eye, EyeOff, 
  Building2, Save, Loader2, CheckCircle2, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProfileAction, updatePasswordAction } from "../actions";
import { toast } from "react-hot-toast";

interface ProfileFormProps {
  initialData: {
    fullName: string;
    phone: string;
    email: string;
    clinicName: string;
  };
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const t = useTranslations("Profile");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Profile Update State
  const [profileState, profileDispatch, isProfilePending] = useActionState(
    updateProfileAction,
    null
  );

  // Password Update State
  const [passwordState, passwordDispatch, isPasswordPending] = useActionState(
    updatePasswordAction,
    null
  );

  // ── Handle Success/Error Toasts ──────────────────────────────────────────
  useEffect(() => {
    if (profileState?.success) {
      toast.success(t("updateSuccess"));
    } else if (profileState?.error) {
      toast.error(profileState.error || t("updateError"));
    }
  }, [profileState, t]);

  useEffect(() => {
    if (passwordState?.success) {
      toast.success(t("updateSuccess"));
      // Clear password inputs? (browser might do this)
    } else if (passwordState?.error) {
      toast.error(passwordState.error || t("updateError"));
    }
  }, [passwordState, t]);

  const INPUT_BASE =
    "w-full rounded-xl px-4 py-3 pr-10 text-[13.5px] font-medium transition-all duration-200 " +
    "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 " +
    "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none placeholder:text-slate-400";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Left Column: Personal & Clinic Information ── */}
      <div className="lg:col-span-12 space-y-5">
        
        {/* Main Section Card */}
        <div className="glass-card overflow-hidden bg-white/50 dark:bg-slate-950/50 border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8 pb-8 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="h-20 w-20 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center">
               <User className="h-10 w-10 text-blue-600" />
            </div>
                        <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{t("title")}</h2>
              <p className="text-sm text-slate-500 font-medium">{t("subtitle")}</p>
            </div>
          </div>

          <form action={profileDispatch} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Profile Fields Group */}
              <div className="space-y-6">
                 <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
                   <User className="w-3.5 h-3.5" /> {t("personalInfo")}
                 </h3>
                 
                 {/* Full Name */}
                 <div className="space-y-2">
                   <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 px-1">{t("fullName")}</label>
                   <div className="relative group">
                     <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                       <User className="w-4 h-4" />
                     </span>
                     <input 
                       name="fullName" 
                       defaultValue={initialData.fullName} 
                       placeholder={t("fullName")}
                       className={INPUT_BASE}
                     />
                   </div>
                 </div>

                 {/* Phone */}
                 <div className="space-y-2">
                   <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 px-1">{t("phone")}</label>
                   <div className="relative group">
                     <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                       <Phone className="w-4 h-4" />
                     </span>
                     <input 
                       name="phone" 
                       defaultValue={initialData.phone} 
                       placeholder="010-XXXX-XXXX"
                       className={INPUT_BASE}
                     />
                   </div>
                 </div>

                 {/* Email (Read Only - change requires Auth flow) */}
                 <div className="space-y-2">
                   <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 px-1">{t("email")}</label>
                   <div className="relative group opacity-60">
                     <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                       <Mail className="w-4 h-4" />
                     </span>
                     <input 
                       value={initialData.email} 
                       disabled 
                       className={INPUT_BASE}
                     />
                   </div>
                 </div>
              </div>

              {/* Clinic Fields Group */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
                   <Building2 className="w-3.5 h-3.5" /> {t("clinicInfo")}
                 </h3>

                 {/* Clinic Name */}
                 <div className="space-y-2">
                   <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 px-1">{t("clinicName")}</label>
                   <div className="relative group">
                     <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                       <Building2 className="w-4 h-4" />
                     </span>
                     <input 
                       name="clinicName" 
                       defaultValue={initialData.clinicName} 
                       placeholder={t("clinicName")}
                       className={INPUT_BASE}
                     />
                   </div>
                 </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={isProfilePending}
                className={cn(
                  "flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm transition-all",
                  isProfilePending 
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95"
                )}
              >
                {isProfilePending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isProfilePending ? t("updating") : t("saveChanges")}
              </button>
            </div>
          </form>
        </div>

        {/* ── Security Section Card ── */}
        <div className="glass-card bg-white dark:bg-slate-950 border border-red-500/10 dark:border-red-500/5 rounded-3xl p-8">
          <div className="mb-8">
            <h3 className="text-[16px] font-black text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5 text-red-500" /> {t("security")}
            </h3>
            <p className="text-xs text-slate-500 font-medium tracking-tight opacity-70">
              {t("securityDescription")}
            </p>
          </div>

          <form action={passwordDispatch} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
               {/* New Password */}
               <div className="space-y-2">
                 <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 px-1">{t("newPassword")}</label>
                 <div className="relative group">
                   <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors pointer-events-none">
                     <Lock className="w-4 h-4" />
                   </span>
                   <input 
                     name="newPassword" 
                     type={showNewPw ? "text" : "password"}
                     placeholder={t("newPassword")}
                     className={INPUT_BASE}
                   />
                   <button 
                     type="button" 
                     onClick={() => setShowNewPw(!showNewPw)}
                     className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                   >
                     {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                   </button>
                 </div>
               </div>

               {/* Confirm New Password */}
               <div className="space-y-2">
                 <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 px-1">{t("confirmNewPassword")}</label>
                 <div className="relative group">
                   <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors pointer-events-none">
                     <Lock className="w-4 h-4" />
                   </span>
                   <input 
                     name="confirmNewPassword" 
                     type={showConfirmPw ? "text" : "password"}
                     placeholder={t("confirmNewPassword")}
                     className={INPUT_BASE}
                   />
                   <button 
                     type="button" 
                     onClick={() => setShowConfirmPw(!showConfirmPw)}
                     className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                   >
                     {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                   </button>
                 </div>
               </div>
              <div className="space-y-2 mt-6">
              <button 
                type="submit" 
                disabled={isPasswordPending}
                className={cn(
                  "flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm transition-all",
                  isPasswordPending 
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                    : "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 active:scale-95"
                )}
              >
                {isPasswordPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4 invisible absolute" />
                )}
                {isPasswordPending ? t("updating") : t("saveChanges")}
              </button>
            </div>
            </div>


          </form>
        </div>
      </div>
    
    </div>
  );
}

function ShieldCheck({ className }: { className?: string }) {
    return <Save className={className} />;
}
