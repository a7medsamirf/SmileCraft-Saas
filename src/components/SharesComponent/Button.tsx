import React from "react";
import Link from "next/link"; // لو شغال Next.js، لو React عادي استعمل 'react-router-dom'

interface ButtonProps {
  label: string;
  className?: string;
  variant?: "primary" | "secondary" | "DarkBtn" | "outline" | "brand" | "glass"; // ضفنا brand و glass
  size?: "sm" | "md" | "lg" | "xl";
  href?: string; // عشان لو حبيت تستخدمه كلينك
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  label,
  variant = "primary",
  size = "md",
  className = "",
  href,
  onClick,
}) => {
  // القاعدة الثابتة لكل الزراير
  const baseStyles = "font-semibold transition-all duration-300 inline-flex items-center justify-center text-center relative";

  const variantStyles = {
    primary: "bg-primary text-white rounded-full overflow-hidden group hover:bg-gradient-to-r hover:from-lime-400 hover:to-lime-400 hover:ring-2 hover:ring-offset-2 hover:ring-green-400 shadow-lg shadow-primary/30 relative",
    secondary: "bg-black dark:bg-white text-white dark:text-black rounded-full overflow-hidden group hover:ring-2 hover:ring-offset-2 hover:ring-green-400 relative",
    DarkBtn: "bg-gray-100 dark:bg-gray-800 border border-neutral-700 border-b-0 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-white relative",
    outline: "border border-white/10 bg-transparent rounded-xl relative",
    // الستايل الجديد بتاع Start Learning
    brand: "bg-[#4F7CFF] text-white rounded-xl shadow-lg shadow-[#4F7CFF]/25 hover:scale-105 hover:bg-[#3D6AE8] hover:shadow-xl hover:shadow-[#4F7CFF]/40 relative",
    // الستايل الجديد بتاع Explore Courses
    glass: "rounded-xl border dark:border-white/10 px-5 py-2.5 text-sm font-medium text-[#A0A7B5] transition-all duration-300 hover:border-[#4F7CFF] hover:text-[#4F7CFF] relative",
  };

  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-3 text-base",
    lg: "px-8 py-3.5 text-lg",
    xl: "px-8 py-3.5 text-sm", // نفس مقاس اللينكات اللي بعتها
  };

  const combinedClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  // لو فيه href، هنرجعه كلينك، لو مفيش هيفضل زرار عادي
  if (href) {
    return (
      <Link href={href} className={combinedClasses}>
        {label}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={combinedClasses}>
      <span className="relative">{label}</span>
    </button>
  );
};

export default Button;