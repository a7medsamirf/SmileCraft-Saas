"use client"; // Ensures this runs on the client side

import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { AnimatePresence } from "framer-motion";

// Suppress React 19's false-positive <script> tag warning from next-themes in development
// This is intentional behavior - next-themes uses a script tag to prevent theme flashing (FOUC)
// See: https://github.com/pacocoursey/next-themes#script-tag
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Encountered a script tag") ||
        args[0].includes("An optimistic state update occurred"))
    )
      return;
    origError.apply(console, args);
  };
}

export default function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      <AnimatePresence mode="wait">
        {children}
      </AnimatePresence>
      <Toaster position="top-center" reverseOrder={false}  toastOptions={{duration: 5000}}  />
    </ThemeProvider>
  );
}
