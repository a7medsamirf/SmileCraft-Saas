'use client'
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LoadingOverlay = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [isRTL, setIsRTL] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.getAttribute("dir") === "rtl";
    }
    return false;
  });

  useEffect(() => {
     const dir = document.documentElement.getAttribute("dir");
     const currentRTL = dir === "rtl";
     queueMicrotask(() => {
       setIsRTL((prev) => (prev !== currentRTL ? currentRTL : prev));
     });

     if (showIntro) {
      document.body.style.overflow = "hidden";
    }

    const timer = setTimeout(() => {
      setShowIntro(false);
      document.body.style.overflow = "unset";
    }, 3000);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "unset";
    };
  }, [showIntro]);

    return (
        <AnimatePresence>
            {showIntro && (
                <motion.div
                    className="fixed inset-0 z-50"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Split Overlay */}
                    <div className="absolute inset-0 flex">
                        {/* Left Half */}
                        <motion.div
                            className="w-1/2 h-full bg-gray-950"
                            initial={{ x: 0 }}
                            animate={{ x: isRTL ? "100%" : "-100%" }}
                            transition={{ delay: 2, duration: 1 }}
                        />
                        {/* Right Half */}
                        <motion.div
                            className="w-1/2 h-full bg-gray-950"
                            initial={{ x: 0 }}
                            animate={{ x: isRTL ? "-100%" : "100%" }}
                            transition={{ delay: 2, duration: 1 }}
                        />
                    </div>

                    {/* Vertical Line Animation */}
                    <div className="absolute inset-0 flex justify-center items-center">
                        <motion.div
                            className="w-[2px] bg-primary absolute"
                            initial={{ height: 0 }}
                            animate={{ height: "100%", opacity: [0, 1, 1, 0] }}
                            transition={{ 
                                duration: 1.5,
                                opacity: { 
                                    times: [0, 0.2, 0.8, 1],
                                    duration: 1.5
                                }
                            }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LoadingOverlay;