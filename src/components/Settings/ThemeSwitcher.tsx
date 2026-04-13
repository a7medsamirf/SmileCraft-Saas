"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun , Moon  } from 'lucide-react';

const ThemeSwitcher = () => {
  
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  if (!mounted) return null; // Prevents hydration error

  return (
    <>

        <button
        className=""
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
        <span
          className={`block transition-transform duration-500 ease-in-out ${ resolvedTheme === 'dark' ? 'rotate-90' : 'rotate-0'}`}>
          {resolvedTheme === 'dark' ? (
            <Sun  className="text-yellow-400 size-5" />
          ) : (
            <Moon className="text-gray-600 size-5" />
          )}
        </span>
        </button>

    </>




  );


};

export default ThemeSwitcher;



