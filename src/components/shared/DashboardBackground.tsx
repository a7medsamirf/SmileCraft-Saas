"use client";

import { motion } from "framer-motion";

export function DashboardBackground() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-linear-to-br from-blue-600/20 via-transparent to-purple-600/10 dark:from-blue-900/40 dark:to-purple-900/20 pointer-events-none z-0"
    />
  );
}
