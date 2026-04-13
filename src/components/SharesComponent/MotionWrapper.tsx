import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

type AnimationType = "fadeInUp" | "scaleIn";

interface MotionWrapperProps {
  children: ReactNode;
  type?: AnimationType;
  className?: string;
  transition?: {
    duration?: number;
    delay?: number;
    [key: string]: unknown;
  };
}

const variants: Record<AnimationType, Variants> = {
  fadeInUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
};

const MotionWrapper = ({
  children,
  type = "fadeInUp",
  className = "",
  transition = { duration: 0.5 },
}: MotionWrapperProps) => {
  const variant = variants[type];
  console.log("MotionWrapper rendering with type:", type);
  return (
      <motion.div
      variants={variant}
      initial="hidden"
      whileInView="visible"
      transition={transition}
      viewport={{ once: true, amount: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default MotionWrapper;
