'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {Badge} from '@/components/ui/badge';
import {useTranslations} from '@/contexts/LocaleContext';

interface ProductCardProps {
    product: {
        id: number;
        title: string;
        thumbnail: string;
        price: number;
        original_price?: number;
        icon?: string;
        sales?: number;
        slug?: string;
    };
}

export default function ProductCard({product}: ProductCardProps) {
    const {t} = useTranslations('ecommerce');

    const hasDiscount = product.original_price && product.original_price > product.price;
    const discountPercent = hasDiscount
        ? Math.round((1 - product.price / product.original_price!) * 100)
        : 0;

    return (
        <Link href={`/product/${product.id}/${encodeURIComponent(product.title)}`}
              className="group block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            {/* Image */}
            <div className="relative aspect-square bg-gray-50 overflow-hidden">
                {product.thumbnail ? (
                    <Image
                        src={product.thumbnail}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="m21 15-5-5L5 21"/>
                        </svg>
                    </div>
                )}
                {/* Badge */}
                {product.icon && (
                    <Badge variant="destructive" className="absolute top-2 left-2 text-xs">
                        {product.icon}
                    </Badge>
                )}
                {/* Discount badge */}
                {hasDiscount && (
                    <Badge variant="secondary" className="absolute top-2 right-2 text-xs bg-orange-100 text-orange-700">
                        -{discountPercent}%
                    </Badge>
                )}
            </div>

            {/* Info */}
            <div className="p-3">
                <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 min-h-[2.5rem]">
                    {product.title}
                </h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-red-500">
                        ¥{product.price}
                    </span>
                    {hasDiscount && (
                        <span className="text-xs text-gray-400 line-through">
                            ¥{product.original_price}
                        </span>
                    )}
                </div>
                {product.sales !== undefined && product.sales > 0 && (
                    <span className="text-xs text-gray-400 mt-1 block">
                        {t('product.sold')} {product.sales}
                    </span>
                )}
            </div>
        </Link>
    );
}
