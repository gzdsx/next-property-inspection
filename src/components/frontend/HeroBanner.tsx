'use client';

import React from 'react';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {ShoppingCart} from 'lucide-react';
import {useTranslations} from '@/contexts/LocaleContext';

export default function HeroBanner() {
    const {t} = useTranslations('ecommerce');

    return (
        <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
                <div className="max-w-2xl">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                        {t('home.heroTitle')}
                    </h1>
                    <p className="text-lg md:text-xl text-blue-100 mb-8">
                        {t('home.heroSubtitle')}
                    </p>
                    <Link href="/products">
                        <Button size="lg"
                                className="h-12 px-8 text-base font-semibold bg-white text-blue-700 hover:bg-gray-100">
                            <ShoppingCart size={18}/>
                            {t('home.shopNow')}
                        </Button>
                    </Link>
                </div>
            </div>
            {/* Decorative shape */}
            <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 60L1440 60L1440 0C1440 0 1080 60 720 60C360 60 0 0 0 0L0 60Z"
                          fill="white"/>
                </svg>
            </div>
        </section>
    );
}
