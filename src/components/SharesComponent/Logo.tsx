import React, { useState } from 'react'
import Image from "next/image";

interface LogoProps {
  logoUrl?: string;
  logoUrlDark?: string;
  className?: string;
  width?: number;
  height?: number;
}

export const Logo = ({
  logoUrl,
  logoUrlDark,
  className = "",
  width = 100,
  height = 100
}: LogoProps) => {
  const [imgError, setImgError] = useState(false);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error("[Logo] Failed to load image:", e.currentTarget.src);
    setImgError(true);
  };

  return (
    <div className={className}>
      <Image
        src={logoUrlDark || "/assets/images/logo/logo-white.png"}
        alt="Clinic Logo Dark"
        width={width}
        height={height}
        className="hidden dark:block object-contain cms-logo"
        priority
        onError={handleImageError}
        unoptimized={imgError}
      />

      <Image
        src={logoUrl || "/assets/images/logo/logo-dark.png"}
        alt="Clinic Logo"
        width={width}
        height={height}
        className="dark:hidden object-contain cms-logo"
        priority
        onError={handleImageError}
        unoptimized={imgError}
      />
      
      {imgError && (
        <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-800 rounded">
          <span className="text-xs text-gray-500 dark:text-gray-400">Logo</span>
        </div>
      )}
    </div>
  )
}