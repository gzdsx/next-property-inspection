'use client';

import React from 'react';
import Link from 'next/link';
import {useTranslations} from '@/contexts/LocaleContext';

interface Category {
    id: number;
    name: string;
    slug: string;
    description?: string;
    children?: Category[];
}

interface FeaturedCategoriesProps {
    categories: Category[];
}

const colors = ['bg-blue-50 text-blue-700', 'bg-green-50 text-green-700', 'bg-purple-50 text-purple-700', 'bg-orange-50 text-orange-700', 'bg-pink-50 text-pink-700', 'bg-cyan-50 text-cyan-700', 'bg-indigo-50 text-indigo-700', 'bg-amber-50 text-amber-700'];

export default function FeaturedCategories({categories}: FeaturedCategoriesProps) {
    const {t} = useTranslations('ecommerce');
    if (categories.length === 0) return null;

    return (
        <section className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">{t('home.featuredCategories')}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                {categories.map((cat, i) => (
                    <Link key={cat.id} href={`/products?category=${cat.id}`}
                          className={`flex flex-col items-center justify-center rounded-xl p-4 ${colors[i % colors.length]} hover:shadow-md transition-all hover:-translate-y-0.5`}>
                        <span className="text-xs mb-1">{cat.name}</span>
                        <span className="text-sm font-medium">{cat.name}</span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
