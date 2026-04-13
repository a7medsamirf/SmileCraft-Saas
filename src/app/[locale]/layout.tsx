import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import ThemeProviderWrapper from "@/components/Settings/ThemeProviderWrapper";
import { getTranslations , getMessages } from "next-intl/server";
import {notFound} from 'next/navigation';
import { getLangDir }  from 'rtl-detect';


// Google Font
import { El_Messiri , DM_Sans } from "next/font/google";

// Styles
import "../../../public/assets/sass/animate.css";
import "./globals.css";
import "../../../public/assets/sass/globals.css"; 

// Components
/* import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import LoadingOverlay from "@/components/Settings/LoadingOverlay";
import LandingNavbar from "@/components/Landing/LandingNavbar";
import LandingFooter from "@/components/Landing/LandingFooter";
import TransitionEffect from "@/components/Settings/TransitionEffect"; */

// Font setup
const elMessiri = El_Messiri({
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-elMessiri',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dmSans',
});

import { getClinicInfoAction } from "@/features/settings/serverActions";

// Metadata
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const clinicInfo = await getClinicInfoAction();
  
  const clinicName = clinicInfo?.name || "SmileCraft CMS";
  
  return {
    title: {
      default: `${clinicName} | Dental Clinic Management System`,
      template: `%s | ${clinicName}`
    },
    description: "Dental Clinic Management System",
    icons: {
      icon: clinicInfo?.faviconUrl || '/assets/images/logo/favicon.ico',
    },
  }
}

// Layout Component
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const direction = getLangDir(locale);


  // Ensure that the incoming `locale` is valid

  // Validate locale
  if (!["en", "ar"].includes(locale)) return notFound();

  const messages = await getMessages();

  
  return (
    <html
        lang={locale}
        dir={direction} // Sets the correct text direction (ltr or rtl)
        className={`${locale === 'ar' ? elMessiri.variable : dmSans.variable}`} // Apply the correct font variable
        suppressHydrationWarning
    >
                       
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans text-left rtl:text-right">
        <ThemeProviderWrapper>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
