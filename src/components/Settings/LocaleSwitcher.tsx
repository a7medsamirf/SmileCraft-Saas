"use client";
import {usePathname, useRouter} from "next/navigation";
import clsx from "clsx";

export default function LanguageSwitcher({currentLocale}: {currentLocale: string}) {
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = currentLocale === "en" ? "ar" : "en";
    router.push(`/${newLocale}${pathname.substring(3)}`);
  };

  return (
    <button
      className={clsx( "",
        currentLocale === "en" ? " text-black dark:text-white" : "text-black dark:text-white"
      )}
      onClick={toggleLocale}
    >
      {currentLocale === "en" ? "العربية" : "English"}
    </button>
  );
}
