'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import CustomButton from './ui/CustomButton';

interface PromoCardProps {
  title: string;
  subtitle: string;
  imageName: string; // سنمرر اسم الملف فقط هنا
  bgColor: string;
  locale?: string;
}

const PromoCard: React.FC<PromoCardProps> = ({
  title,
  subtitle,
  imageName,
  bgColor,
  locale = 'ar',
}) => {
  const t = useTranslations('common');
  const isRtl = locale === 'ar';

  // المسار بناءً على هيكلة ملفاتك
  const imagePath = `/assets/images/banner/${imageName}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className={`relative overflow-hidden rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-center justify-between min-h-[300px] ${bgColor}`}
    >
      <div className={`z-10 flex flex-col gap-2 ${isRtl ? 'text-right' : 'text-left'} md:w-1/2`}>
        <p className="text-[var(--color-gray-400)] text-sm md:text-base font-semibold">
          {subtitle}
        </p>
        <h2 className="text-[var(--color-secondary)] text-2xl md:text-4xl font-extrabold">
          {title}
        </h2>
        <div className="mt-4">
          <CustomButton 
            variant="secondary" 
            className="bg-transparent border-none !p-0 text-[var(--color-secondary)] hover:underline font-bold"
          >
            {t('shopNow')}
          </CustomButton>
        </div>
      </div>

      <div className="relative w-full h-[200px] md:h-[250px] mt-4 md:mt-0">
        <Image
          src={imagePath} // سيبحث تلقائياً داخل مجلد public
          alt={title}
          fill
          className="object-contain"
        />
      </div>
    </motion.div>
  );
};

export default PromoCard;