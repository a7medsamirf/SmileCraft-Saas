'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'warning' | 'danger' | 'success' | 'info';
  isOutline?: boolean;
  isIconOnly?: boolean;
  showCartIcon?: boolean;
  showArrow?: boolean;
  locale?: string;
  children?: React.ReactNode;
}

const CustomButton: React.FC<ButtonProps> = ({
  variant = 'primary',
  isOutline = false,
  isIconOnly = false,
  showCartIcon = false,
  showArrow = false,
  className,
  children,
  locale = 'ar',
  disabled,
  ...props
}) => {
  const t = useTranslations('common');
  const isRtl = locale === 'ar';

  // استخدام المتغيرات اللي عرفناها في الـ SCSS
  const variants = {
    primary: isOutline ? "border-2 border-[var(--color-primary)] text-[var(--color-primary)] bg-transparent" : "bg-[var(--color-primary)] text-white disabled:opacity-50",
    secondary: isOutline ? "border-2 border-[var(--color-gray-200)] text-[var(--color-secondary)] bg-transparent" : "bg-[var(--color-secondary)] text-white disabled:bg-[var(--color-gray-100)]",
    warning: isOutline ? "border-2 border-[var(--color-warning)] text-[var(--color-warning)] bg-transparent" : "bg-[var(--color-warning)] text-white disabled:opacity-50",
    danger: "bg-[var(--color-danger)] text-white",
    success: "bg-[var(--color-success)] text-white",
    info: "bg-[var(--color-info)] text-white",
  };

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      disabled={disabled}
      className={cn(
        "relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all duration-300",
        variants[variant],
        isIconOnly && "p-2.5 w-10 h-10",
        className
      )}
      {...props}
    >
      {isIconOnly ? (
        <ShoppingCart size={20} />
      ) : (
        <>
          {showArrow && (isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />)}
          <span className="text-sm">{children || t('exploreMore')}</span>
          {showCartIcon && <ShoppingCart size={18} />}
        </>
      )}
    </motion.button>
  );
};

export default CustomButton;