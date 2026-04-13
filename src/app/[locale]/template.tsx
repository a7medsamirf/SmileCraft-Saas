'use client'

import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

export default function Template({
   children
   }: {
     children: React.ReactNode 
    }) {
  const pathname = usePathname();
      
  return (
    <motion.div
          key={pathname}
          initial={{ y: 1, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ ease: 'easeInOut', duration: .75 }}
  >
    {children}
  </motion.div>
  )
}