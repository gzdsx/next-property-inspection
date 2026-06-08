'use client';

import React from 'react';
import Link from 'next/link';
import {useTranslations} from '@/contexts/LocaleContext';

export default function Footer() {
    const {t} = useTranslations('ecommerce');

    return (
        <footer className="bg-gray-900 text-gray-300 mt-auto">
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <h3 className="text-white text-xl font-bold mb-4">{t('brandName')}</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            {t('footer.description')}
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">{t('footer.quickLinks')}</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/" className="hover:text-white transition-colors">{t('header.home')}</Link></li>
                            <li><Link href="/products" className="hover:text-white transition-colors">{t('header.products')}</Link></li>
                        </ul>
                    </div>

                    {/* Customer Service */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">{t('footer.customerService')}</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/contact" className="hover:text-white transition-colors">{t('footer.contactUs')}</Link></li>
                            <li><Link href="/faq" className="hover:text-white transition-colors">{t('footer.faq')}</Link></li>
                            <li><Link href="/shipping" className="hover:text-white transition-colors">{t('footer.shippingPolicy')}</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">{t('footer.legal')}</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/terms" className="hover:text-white transition-colors">{t('footer.terms')}</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition-colors">{t('footer.privacy')}</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
                    <p>&copy; {new Date().getFullYear()} {t('brandName')}. {t('footer.rights')}</p>
                </div>
            </div>
        </footer>
    );
}
