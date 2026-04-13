'use client';
import Link from 'next/link'
import {useTranslations} from 'next-intl';
import Button from '@/components/SharesComponent/Button';


const NotFound = () => {
 const t = useTranslations('NotFound');
 return (

      <div className="relative isolate px-6 pt-14 lg:px-8">
      <div className="flex justify-center mx-auto max-w-4xl py-32 sm:py-48 lg:py-56">
        <div className="grid min-h-full place-items-center  px-6 py-24 sm:py-32 lg:px-8">
            <div className="text-center">
              <p className="text-5xl font-semibold text-primary">404</p>
              <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-gray-900 dark:text-white sm:text-7xl">
              {t('title')}
              </h1>
              <p className="mt-6 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
              {t('description')}
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button className='px-5 py-2.5' label={t('GoHome')} variant="brand" size="sm" href="/ar" />
              </div>
            </div>
          </div>
          <div>
          
          </div>
          <div>
          
          </div>
      </div>
      </div>
 
);
};

export default NotFound